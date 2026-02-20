from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import asyncio
import httpx

import re
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.database_connection import DatabaseConnection, DatabaseType
from app.models.user import User
from app.middleware.auth_middleware import get_current_user
from app.utils.org_scope import get_current_org_id, get_connection_ids_for_org

logger = get_logger(__name__)
from app.models.migration import (
    Migration, MigrationStatus, MigrationType,
    MigrationTemplate, MigrationSchedule
)
from app.utils.migration_engine import MigrationEngine
from app.utils.schema_inspector import SchemaInspector
from app.models.snapshot import Snapshot, SnapshotStatus, SnapshotType
from app.utils.snapshot_manager import SnapshotManager

router = APIRouter()

CANCEL_REQUESTS: Dict[int, bool] = {}



class TransformationRule(BaseModel):
    table_name: str
    column_name: str
    transformation: str
    new_name: Optional[str] = None
    target_type: Optional[str] = None
    mask_pattern: Optional[str] = None
    custom_sql: Optional[str] = None


class FilterCondition(BaseModel):
    table_name: str
    where_clause: str
    timestamp_column: Optional[str] = None


class MigrationCreate(BaseModel):
    migration_name: str
    source_connection_id: int
    target_connection_id: int
    selected_tables: List[str]
    drop_if_exists: bool = True
    migration_type: str = "full"  # full, incremental, schema_only
    is_dry_run: bool = False
    transformation_rules: Optional[List[TransformationRule]] = None
    filter_conditions: Optional[List[FilterCondition]] = None
    webhook_url: Optional[str] = None
    notify_on_complete: bool = False
    notify_on_failure: bool = True
    template_id: Optional[int] = None


class MigrationResponse(BaseModel):
    id: int
    migration_name: str
    source_connection_id: int
    target_connection_id: int
    status: str
    migration_type: Optional[str] = "full"
    progress_percentage: float
    current_step: Optional[str]
    total_tables: int
    completed_tables: int
    total_rows: int
    migrated_rows: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    error_message: Optional[str]
    is_dry_run: Optional[bool] = False
    dry_run_results: Optional[Dict] = None
    can_rollback: Optional[bool] = True
    created_at: datetime
    
    class Config:
        from_attributes = True


class MigrationListResponse(BaseModel):
    items: List[MigrationResponse]
    total: int


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_connection_id: Optional[int] = None
    target_connection_id: Optional[int] = None
    target_db_type: Optional[str] = None
    selected_tables: Optional[List[str]] = None
    transformation_rules: Optional[List[Dict]] = None
    filter_conditions: Optional[List[Dict]] = None
    drop_if_exists: bool = True
    migration_type: str = "full"
    webhook_url: Optional[str] = None


class ScheduleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template_id: int
    schedule_type: str = "daily"  # hourly, daily, weekly, monthly
    hour: int = 0
    minute: int = 0
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    is_active: bool = True


class CloneRequest(BaseModel):
    source_connection_id: int
    new_database_name: str
    target_db_type: str
    target_host: Optional[str] = None
    target_port: Optional[int] = None
    target_username: Optional[str] = None
    target_password: Optional[str] = None


class MigrationCreateNewTarget(BaseModel):
    """Create a migration by creating a new target DB (no pre-existing target)."""
    source_connection_id: int
    target_db_type: str
    migration_name: str
    selected_tables: List[str]
    suffix: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    drop_if_exists: bool = True
    migration_type: str = "full"
    is_dry_run: bool = False
    webhook_url: Optional[str] = None
    notify_on_complete: bool = False
    notify_on_failure: bool = True


def _sanitize_db_name_for_target(name: str) -> str:
    """Sanitize source DB name for use in target name (alphanumeric + underscore)."""
    s = re.sub(r"[^a-zA-Z0-9_]", "_", name)
    return s[:64].strip("_") or "db"



def _migration_to_response(migration) -> dict:
    """Build a JSON-serializable response from a Migration ORM object (handles Enum fields)."""
    return {
        "id": migration.id,
        "migration_name": migration.migration_name,
        "source_connection_id": migration.source_connection_id,
        "target_connection_id": migration.target_connection_id,
        "status": migration.status.value if hasattr(migration.status, "value") else str(migration.status),
        "migration_type": migration.migration_type.value if hasattr(migration.migration_type, "value") else str(migration.migration_type or "full"),
        "progress_percentage": float(migration.progress_percentage or 0),
        "current_step": migration.current_step,
        "total_tables": migration.total_tables or 0,
        "completed_tables": migration.completed_tables or 0,
        "total_rows": migration.total_rows or 0,
        "migrated_rows": migration.migrated_rows or 0,
        "started_at": migration.started_at,
        "completed_at": migration.completed_at,
        "duration_seconds": migration.duration_seconds,
        "error_message": migration.error_message,
        "is_dry_run": migration.is_dry_run or False,
        "dry_run_results": migration.dry_run_results,
        "can_rollback": migration.can_rollback if migration.can_rollback is not None else True,
        "created_at": migration.created_at,
    }


@router.post("/create-new-target", response_model=MigrationResponse)
async def create_migration_new_target(
    body: MigrationCreateNewTarget,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create and start a migration by creating a new target database.
    Target DB name: migrated_<source_db_name>_<suffix> (suffix = timestamp if not provided).
    Uses default DB credentials from app settings if username/password not provided.
    """
    from app.api.routes.app_settings import get_default_db_credentials_async
    from app.utils.database_connector import DatabaseConnector
    from app.core.config import settings
    from app.models.connection_access import ConnectionAccess

    try:
        source_result = await db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == body.source_connection_id)
        )
        source_conn = source_result.scalar_one_or_none()
        if not source_conn:
            raise HTTPException(status_code=404, detail="Source connection not found")
        if source_conn.user_id != current_user.id:
            access = await db.execute(
                select(ConnectionAccess).where(
                    ConnectionAccess.connection_id == body.source_connection_id,
                    ConnectionAccess.user_id == current_user.id,
                )
            )
            if not access.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Source connection not found")
        if not body.selected_tables:
            raise HTTPException(status_code=400, detail="selected_tables cannot be empty")

        source_db_name = source_conn.database_name
        if source_conn.db_type == DatabaseType.SQLITE and "/" in source_db_name:
            import os
            source_db_name = os.path.splitext(os.path.basename(source_db_name))[0]
        base_name = _sanitize_db_name_for_target(source_db_name)
        suffix = body.suffix or datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        target_db_name = f"migrated_{base_name}_{suffix}"

        use_username = (body.username or "").strip()
        use_password = body.password
        if not use_username or not use_password:
            default_user, default_pass = await get_default_db_credentials_async(db)
            if not default_user or not default_pass:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "CREDENTIALS_REQUIRED",
                        "message": "Default DB credentials not set. Please provide username and password.",
                    },
                )
            use_username = default_user
            use_password = default_pass

        creation_result = await DatabaseConnector.create_database(
            db_type=body.target_db_type,
            database_name=target_db_name,
            username=use_username,
            password=use_password,
            storage_path=settings.DB_STORAGE_PATH or "./dblens_databases",
        )
        if not creation_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=creation_result.get("message", "Failed to create target database"),
            )

        conn_details = creation_result.get("connection_details") or {}
        target_conn = DatabaseConnection(
            user_id=current_user.id,
            name=f"migrated_{base_name}_{suffix}",
            db_type=DatabaseType(body.target_db_type),
            host=conn_details.get("host", "localhost"),
            port=int(conn_details.get("port", 0) or 0),
            database_name=conn_details.get("database", target_db_name),
            username=conn_details.get("username", use_username),
            password=conn_details.get("password", use_password),
            is_active=True,
            is_self_hosted=True,
            connection_status="connected",
        )
        db.add(target_conn)
        await db.commit()
        await db.refresh(target_conn)

        migration = Migration(
            migration_name=body.migration_name,
            source_connection_id=source_conn.id,
            target_connection_id=target_conn.id,
            selected_tables=body.selected_tables,
            status=MigrationStatus.PENDING,
            migration_type=MigrationType(body.migration_type),
            total_tables=len(body.selected_tables),
            is_dry_run=body.is_dry_run,
            webhook_url=body.webhook_url,
            notify_on_complete=body.notify_on_complete,
            notify_on_failure=body.notify_on_failure,
        )
        db.add(migration)
        await db.commit()
        await db.refresh(migration)

        background_tasks.add_task(
            run_migration_job,
            migration.id,
            source_conn.id,
            target_conn.id,
            body.selected_tables,
            body.drop_if_exists,
            body.is_dry_run,
            body.migration_type,
        )
        return _migration_to_response(migration)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create_new_target migration failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"message": str(e)},
        )


@router.post("/", response_model=MigrationResponse)
async def create_migration(
    migration_data: MigrationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Create and start a new migration job"""
    
    source_result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == migration_data.source_connection_id
        )
    )
    source_conn = source_result.scalar_one_or_none()
    
    target_result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == migration_data.target_connection_id
        )
    )
    target_conn = target_result.scalar_one_or_none()
    
    if not source_conn:
        raise HTTPException(status_code=404, detail="Source connection not found")
    if not target_conn:
        raise HTTPException(status_code=404, detail="Target connection not found")
    
    if source_conn.id == target_conn.id:
        raise HTTPException(status_code=400, detail="Source and target cannot be the same")
    
    migration = Migration(
        migration_name=migration_data.migration_name,
        source_connection_id=migration_data.source_connection_id,
        target_connection_id=migration_data.target_connection_id,
        selected_tables=migration_data.selected_tables,
        status=MigrationStatus.PENDING,
        migration_type=MigrationType(migration_data.migration_type),
        total_tables=len(migration_data.selected_tables),
        is_dry_run=migration_data.is_dry_run,
        transformation_rules=[r.dict() for r in migration_data.transformation_rules] if migration_data.transformation_rules else None,
        filter_conditions=[f.dict() for f in migration_data.filter_conditions] if migration_data.filter_conditions else None,
        webhook_url=migration_data.webhook_url,
        notify_on_complete=migration_data.notify_on_complete,
        notify_on_failure=migration_data.notify_on_failure,
        template_id=migration_data.template_id
    )
    
    db.add(migration)
    await db.commit()
    await db.refresh(migration)
    
    background_tasks.add_task(
        run_migration_job,
        migration.id,
        source_conn.id,
        target_conn.id,
        migration_data.selected_tables,
        migration_data.drop_if_exists,
        migration_data.is_dry_run,
        migration_data.migration_type
    )
    
    return migration


@router.get("/", response_model=MigrationListResponse)
async def list_migrations(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """List migrations in the current org only (source and target connection must be in org)."""
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    if not connection_ids_in_org:
        return MigrationListResponse(items=[], total=0)
    base = select(Migration).where(
        Migration.source_connection_id.in_(connection_ids_in_org),
        Migration.target_connection_id.in_(connection_ids_in_org),
    )
    if status:
        base = base.where(Migration.status == MigrationStatus(status))
    count_q = select(func.count(Migration.id)).where(
        Migration.source_connection_id.in_(connection_ids_in_org),
        Migration.target_connection_id.in_(connection_ids_in_org),
    )
    if status:
        count_q = count_q.where(Migration.status == MigrationStatus(status))
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0
    result = await db.execute(
        base.order_by(Migration.created_at.desc()).offset(skip).limit(limit)
    )
    migrations = result.scalars().all()
    return MigrationListResponse(items=migrations, total=total)


def _migration_in_org(connection_ids_in_org: set[int], migration: Migration) -> bool:
    return (
        migration.source_connection_id in connection_ids_in_org
        and migration.target_connection_id in connection_ids_in_org
    )


@router.get("/{migration_id}", response_model=MigrationResponse)
async def get_migration(
    migration_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Get migration details (migration must be in current org)."""
    result = await db.execute(
        select(Migration).where(Migration.id == migration_id)
    )
    migration = result.scalar_one_or_none()
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    if not _migration_in_org(connection_ids_in_org, migration):
        raise HTTPException(status_code=404, detail="Migration not found")
    return migration


@router.get("/{migration_id}/logs")
async def get_migration_logs(
    migration_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Get migration logs (migration must be in current org)."""
    result = await db.execute(
        select(Migration).where(Migration.id == migration_id)
    )
    migration = result.scalar_one_or_none()
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    if not _migration_in_org(connection_ids_in_org, migration):
        raise HTTPException(status_code=404, detail="Migration not found")
    return {
        "migration_id": migration.id,
        "status": migration.status.value if hasattr(migration.status, "value") else str(migration.status),
        "logs": migration.migration_log or [],
        "current_step": migration.current_step,
        "progress_percentage": migration.progress_percentage,
    }



@router.post("/{migration_id}/cancel")
async def cancel_migration(
    migration_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Cancel an in-progress migration (migration must be in current org)."""
    result = await db.execute(
        select(Migration).where(Migration.id == migration_id)
    )
    migration = result.scalar_one_or_none()
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    if not _migration_in_org(connection_ids_in_org, migration):
        raise HTTPException(status_code=404, detail="Migration not found")
    
    if migration.status != MigrationStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel migration with status: {migration.status.value}"
        )
    
    CANCEL_REQUESTS[migration_id] = True
    
    migration.status = MigrationStatus.CANCELLED
    migration.current_step = "Cancellation requested..."
    migration.completed_at = datetime.now()
    if migration.started_at:
        migration.duration_seconds = (migration.completed_at - migration.started_at).total_seconds()
    
    await db.commit()
    
    return {"message": "Migration cancellation requested", "migration_id": migration_id}


@router.post("/{migration_id}/rollback")
async def rollback_migration(
    migration_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Rollback a completed migration (migration must be in current org)."""
    result = await db.execute(
        select(Migration).where(Migration.id == migration_id)
    )
    migration = result.scalar_one_or_none()
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    if not _migration_in_org(connection_ids_in_org, migration):
        raise HTTPException(status_code=404, detail="Migration not found")
    
    if migration.status not in [MigrationStatus.COMPLETED, MigrationStatus.FAILED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot rollback migration with status: {migration.status.value}"
        )
    
    if not migration.can_rollback:
        raise HTTPException(status_code=400, detail="This migration cannot be rolled back")
    
    snapshot_result = await db.execute(
        select(Snapshot).where(
            and_(
                Snapshot.related_migration_id == migration_id,
                Snapshot.snapshot_type == SnapshotType.PRE_MIGRATION,
                Snapshot.status == SnapshotStatus.COMPLETED
            )
        )
    )
    snapshot = snapshot_result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(
            status_code=400, 
            detail="No pre-migration snapshot found. Rollback not possible."
        )
    
    target_result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == migration.target_connection_id
        )
    )
    target_conn = target_result.scalar_one_or_none()
    
    if not target_conn:
        raise HTTPException(status_code=404, detail="Target connection not found")
    
    background_tasks.add_task(
        run_rollback_job,
        migration.id,
        snapshot.id,
        target_conn
    )
    
    migration.status = MigrationStatus.IN_PROGRESS
    migration.current_step = "Rollback in progress..."
    await db.commit()
    
    return {
        "message": "Rollback started",
        "migration_id": migration_id,
        "snapshot_id": snapshot.id
    }



@router.post("/preview")
async def preview_migration(
    migration_data: MigrationCreate,
    db: AsyncSession = Depends(get_db)
):
    """Preview migration without executing - dry run"""
    
    source_result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == migration_data.source_connection_id
        )
    )
    source_conn = source_result.scalar_one_or_none()
    
    target_result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == migration_data.target_connection_id
        )
    )
    target_conn = target_result.scalar_one_or_none()
    
    if not source_conn or not target_conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    source_schema = await SchemaInspector.get_schema(
        db_type=source_conn.db_type.value,
        host=source_conn.host,
        port=source_conn.port,
        database=source_conn.database_name,
        username=source_conn.username,
        password=source_conn.password,
        ssl_enabled=source_conn.ssl_enabled
    )
    
    target_schema = await SchemaInspector.get_schema(
        db_type=target_conn.db_type.value,
        host=target_conn.host,
        port=target_conn.port,
        database=target_conn.database_name,
        username=target_conn.username,
        password=target_conn.password,
        ssl_enabled=target_conn.ssl_enabled
    )
    
    preview = {
        "source": {
            "db_type": source_conn.db_type.value,
            "database": source_conn.database_name,
            "tables": []
        },
        "target": {
            "db_type": target_conn.db_type.value,
            "database": target_conn.database_name,
            "existing_tables": [],
            "tables_to_drop": []
        },
        "migration_plan": {
            "tables_to_create": [],
            "total_rows": 0,
            "estimated_size_mb": 0,
            "transformations": [],
            "warnings": [],
            "schema_changes": []
        }
    }
    
    source_tables = {t["name"]: t for t in source_schema.get("tables", [])}
    target_tables = {t["name"]: t for t in target_schema.get("tables", [])}
    
    for table_name in migration_data.selected_tables:
        source_table = source_tables.get(table_name)
        if source_table:
            row_count = source_table.get("row_count", 0)
            preview["source"]["tables"].append({
                "name": table_name,
                "columns": len(source_table.get("columns", [])),
                "row_count": row_count,
                "foreign_keys": len(source_table.get("foreign_keys", []))
            })
            preview["migration_plan"]["total_rows"] += row_count
            preview["migration_plan"]["tables_to_create"].append(table_name)
            
            if table_name in target_tables:
                preview["target"]["tables_to_drop"].append(table_name)
                preview["migration_plan"]["warnings"].append(
                    f"Table '{table_name}' exists in target and will be dropped"
                )
    
    preview["target"]["existing_tables"] = list(target_tables.keys())
    
    if migration_data.transformation_rules:
        for rule in migration_data.transformation_rules:
            preview["migration_plan"]["transformations"].append({
                "table": rule.table_name,
                "column": rule.column_name,
                "action": rule.transformation,
                "details": rule.new_name or rule.target_type or rule.mask_pattern
            })
    
    return preview


@router.get("/source/{connection_id}/tables")
async def get_source_tables(
    connection_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get list of tables from source database for migration"""
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    schema = await SchemaInspector.get_schema(
        db_type=connection.db_type.value,
        host=connection.host,
        port=connection.port,
        database=connection.database_name,
        username=connection.username,
        password=connection.password,
        ssl_enabled=connection.ssl_enabled
    )
    
    if not schema.get("success"):
        raise HTTPException(status_code=500, detail="Failed to fetch schema")
    
    SQLITE_INTERNAL_TABLES = {'sqlite_sequence', 'sqlite_stat1', 'sqlite_stat2', 
                              'sqlite_stat3', 'sqlite_stat4', 'sqlite_master'}
    
    tables = []
    for table in schema.get("tables", []):
        if table["name"] in SQLITE_INTERNAL_TABLES:
            continue
        
        tables.append({
            "name": table["name"],
            "row_count": table.get("row_count", 0),
            "has_foreign_keys": len(table.get("foreign_keys", [])) > 0,
            "foreign_keys": table.get("foreign_keys", []),
            "columns": table.get("columns", [])
        })
    
    return {
        "database_name": schema.get("database_name"),
        "database_type": schema.get("database_type"),
        "tables": tables
    }



@router.get("/templates/")
async def list_templates(db: AsyncSession = Depends(get_db)):
    """List all migration templates"""
    result = await db.execute(
        select(MigrationTemplate).order_by(MigrationTemplate.created_at.desc())
    )
    templates = result.scalars().all()
    return [t.to_dict() for t in templates]


@router.post("/templates/")
async def create_template(
    template_data: TemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new migration template"""
    existing = await db.execute(
        select(MigrationTemplate).where(MigrationTemplate.name == template_data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Template name already exists")
    
    template = MigrationTemplate(
        name=template_data.name,
        description=template_data.description,
        source_connection_id=template_data.source_connection_id,
        target_connection_id=template_data.target_connection_id,
        target_db_type=template_data.target_db_type,
        selected_tables=template_data.selected_tables,
        transformation_rules=template_data.transformation_rules,
        filter_conditions=template_data.filter_conditions,
        drop_if_exists=template_data.drop_if_exists,
        migration_type=MigrationType(template_data.migration_type),
        webhook_url=template_data.webhook_url
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    return {"message": "Template created", "template": template.to_dict()}


@router.get("/templates/{template_id}")
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a migration template"""
    result = await db.execute(
        select(MigrationTemplate).where(MigrationTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template.to_dict()


@router.delete("/templates/{template_id}")
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a migration template"""
    result = await db.execute(
        select(MigrationTemplate).where(MigrationTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.delete(template)
    await db.commit()
    
    return {"message": "Template deleted"}


@router.post("/templates/{template_id}/run")
async def run_template(
    template_id: int,
    background_tasks: BackgroundTasks,
    migration_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Run a migration from template"""
    result = await db.execute(
        select(MigrationTemplate).where(MigrationTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if not template.source_connection_id or not template.target_connection_id:
        raise HTTPException(status_code=400, detail="Template must have source and target connections")
    
    migration_create = MigrationCreate(
        migration_name=migration_name or f"{template.name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        source_connection_id=template.source_connection_id,
        target_connection_id=template.target_connection_id,
        selected_tables=template.selected_tables or [],
        drop_if_exists=template.drop_if_exists,
        migration_type=template.migration_type.value,
        webhook_url=template.webhook_url,
        notify_on_complete=template.notify_on_complete,
        notify_on_failure=template.notify_on_failure,
        template_id=template_id
    )
    
    return await create_migration(migration_create, background_tasks, db)



@router.get("/schedules/")
async def list_schedules(db: AsyncSession = Depends(get_db)):
    """List all migration schedules"""
    result = await db.execute(
        select(MigrationSchedule).order_by(MigrationSchedule.created_at.desc())
    )
    schedules = result.scalars().all()
    return [s.to_dict() for s in schedules]


@router.post("/schedules/")
async def create_schedule(
    schedule_data: ScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new migration schedule"""
    template_result = await db.execute(
        select(MigrationTemplate).where(MigrationTemplate.id == schedule_data.template_id)
    )
    if not template_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Template not found")
    
    schedule = MigrationSchedule(
        name=schedule_data.name,
        description=schedule_data.description,
        template_id=schedule_data.template_id,
        schedule_type=schedule_data.schedule_type,
        hour=schedule_data.hour,
        minute=schedule_data.minute,
        day_of_week=schedule_data.day_of_week,
        day_of_month=schedule_data.day_of_month,
        is_active=schedule_data.is_active
    )
    
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    
    return {"message": "Schedule created", "schedule": schedule.to_dict()}


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a migration schedule"""
    result = await db.execute(
        select(MigrationSchedule).where(MigrationSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    await db.delete(schedule)
    await db.commit()
    
    return {"message": "Schedule deleted"}


@router.post("/schedules/{schedule_id}/toggle")
async def toggle_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle schedule active status"""
    result = await db.execute(
        select(MigrationSchedule).where(MigrationSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    schedule.is_active = not schedule.is_active
    await db.commit()
    
    return {"message": f"Schedule {'activated' if schedule.is_active else 'deactivated'}", "is_active": schedule.is_active}



@router.post("/clone")
async def clone_database(
    clone_data: CloneRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Clone entire database to a new database"""
    
    source_result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == clone_data.source_connection_id
        )
    )
    source_conn = source_result.scalar_one_or_none()
    
    if not source_conn:
        raise HTTPException(status_code=404, detail="Source connection not found")
    
    from app.models.database_connection import DatabaseType
    
    target_conn = DatabaseConnection(
        name=f"Clone of {source_conn.name}",
        db_type=DatabaseType(clone_data.target_db_type),
        host=clone_data.target_host or source_conn.host,
        port=clone_data.target_port or source_conn.port,
        database_name=clone_data.new_database_name,
        username=clone_data.target_username or source_conn.username,
        password=clone_data.target_password or source_conn.password,
        ssl_enabled=source_conn.ssl_enabled,
        is_active=True
    )
    
    db.add(target_conn)
    await db.commit()
    await db.refresh(target_conn)
    
    source_schema = await SchemaInspector.get_schema(
        db_type=source_conn.db_type.value,
        host=source_conn.host,
        port=source_conn.port,
        database=source_conn.database_name,
        username=source_conn.username,
        password=source_conn.password,
        ssl_enabled=source_conn.ssl_enabled
    )
    
    all_tables = [t["name"] for t in source_schema.get("tables", [])]
    
    migration = Migration(
        migration_name=f"Clone: {source_conn.database_name} → {clone_data.new_database_name}",
        source_connection_id=source_conn.id,
        target_connection_id=target_conn.id,
        selected_tables=all_tables,
        status=MigrationStatus.PENDING,
        migration_type=MigrationType.FULL,
        total_tables=len(all_tables)
    )
    
    db.add(migration)
    await db.commit()
    await db.refresh(migration)
    
    background_tasks.add_task(
        run_migration_job,
        migration.id,
        source_conn.id,
        target_conn.id,
        all_tables,
        True,
        False,
        "full"
    )
    
    return {
        "message": "Database clone started",
        "migration_id": migration.id,
        "target_connection_id": target_conn.id
    }



async def run_migration_job(
    migration_id: int,
    source_connection_id: int,
    target_connection_id: int,
    selected_tables: List[str],
    drop_if_exists: bool,
    is_dry_run: bool = False,
    migration_type: str = "full"
):
    """Run migration in background with automatic pre-migration snapshot.
    Loads source/target connections inside the job to avoid detached instance errors."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Migration).where(Migration.id == migration_id)
        )
        migration = result.scalar_one_or_none()

        if not migration:
            return

        src_result = await db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == source_connection_id)
        )
        target_result = await db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == target_connection_id)
        )
        source_conn = src_result.scalar_one_or_none()
        target_conn = target_result.scalar_one_or_none()
        if not source_conn or not target_conn:
            migration.status = MigrationStatus.FAILED
            migration.error_message = "Source or target connection not found"
            await db.commit()
            return

        snapshot = None
        
        try:
            migration.status = MigrationStatus.IN_PROGRESS
            migration.current_step = "Creating pre-migration snapshot..."
            migration.progress_percentage = 5
            migration.started_at = datetime.now()
            await db.commit()
            
            if CANCEL_REQUESTS.get(migration_id):
                del CANCEL_REQUESTS[migration_id]
                migration.status = MigrationStatus.CANCELLED
                migration.current_step = "Cancelled by user"
                await db.commit()
                return
            
            if not is_dry_run:
                snapshot = Snapshot(
                    database_connection_id=target_conn.id,
                    snapshot_name=f"Pre-migration: {migration.migration_name}",
                    snapshot_type=SnapshotType.PRE_MIGRATION,
                    description=f"Automatic snapshot before migration from {source_conn.db_type.value} to {target_conn.db_type.value}",
                    status=SnapshotStatus.IN_PROGRESS,
                    started_at=datetime.now(),
                    file_path="",
                    related_migration_id=migration_id,
                    created_by="system"
                )
                
                db.add(snapshot)
                await db.commit()
                await db.refresh(snapshot)
                
                migration.rollback_snapshot_id = snapshot.id
                await db.commit()
                
                target_snapshot_config = {
                    "connection_id": target_conn.id,
                    "db_type": target_conn.db_type.value,
                    "host": target_conn.host,
                    "port": target_conn.port,
                    "database_name": target_conn.database_name,
                    "username": target_conn.username,
                    "password": target_conn.password,
                    "ssl_enabled": target_conn.ssl_enabled
                }
                
                snapshot_result = await SnapshotManager.create_snapshot(
                    connection_config=target_snapshot_config,
                    snapshot_type="full",
                    progress_callback=None
                )
                
                if snapshot_result['success']:
                    snapshot.status = SnapshotStatus.COMPLETED
                    snapshot.file_path = snapshot_result['file_path']
                    snapshot.file_size_mb = snapshot_result['file_size_mb']
                    snapshot.duration_seconds = snapshot_result['duration_seconds']
                    snapshot.schema_metadata = snapshot_result['schema_metadata']
                    snapshot.table_count = snapshot_result['schema_metadata'].get('table_count', 0)
                    snapshot.total_rows = snapshot_result['schema_metadata'].get('total_rows', 0)
                    snapshot.completed_at = datetime.now()
                    await db.commit()
                    
                    migration.current_step = "✓ Pre-migration snapshot completed"
                    migration.progress_percentage = 10
                    await db.commit()
                else:
                    snapshot.status = SnapshotStatus.FAILED
                    snapshot.error_message = snapshot_result.get('error', 'Unknown error')
                    snapshot.completed_at = datetime.now()
                    migration.can_rollback = False
                    await db.commit()
                    
                    migration.current_step = "⚠️ Snapshot failed, continuing migration..."
                    migration.progress_percentage = 10
                    await db.commit()
        
        except Exception as snapshot_error:
            logger.warning("Pre-migration snapshot failed: %s", snapshot_error)
            
            if snapshot:
                snapshot.status = SnapshotStatus.FAILED
                snapshot.error_message = str(snapshot_error)
                snapshot.completed_at = datetime.now()
                await db.commit()
            
            migration.can_rollback = False
            migration.current_step = "⚠️ Snapshot failed, continuing migration..."
            migration.progress_percentage = 10
            await db.commit()
        
        async def update_progress(percentage: float, step: str):
            if CANCEL_REQUESTS.get(migration_id):
                del CANCEL_REQUESTS[migration_id]
                raise Exception("Migration cancelled by user")
            
            adjusted_percentage = 10 + (percentage * 0.9)
            migration.progress_percentage = adjusted_percentage
            migration.current_step = step
            log_line = f"[{datetime.utcnow().strftime('%H:%M:%S')}] {step}"
            migration.migration_log = list(migration.migration_log or []) + [log_line]
            await db.commit()
        
        try:
            source_config = {
                "db_type": source_conn.db_type.value,
                "host": source_conn.host,
                "port": source_conn.port,
                "database_name": source_conn.database_name,
                "username": source_conn.username,
                "password": source_conn.password,
                "ssl_enabled": source_conn.ssl_enabled,
                "database_path": source_conn.host if source_conn.db_type.value == "sqlite" else None
            }
            
            target_config = {
                "db_type": target_conn.db_type.value,
                "host": target_conn.host,
                "port": target_conn.port,
                "database_name": target_conn.database_name,
                "username": target_conn.username,
                "password": target_conn.password,
                "ssl_enabled": target_conn.ssl_enabled,
                "database_path": target_conn.host if target_conn.db_type.value == "sqlite" else None
            }
            
            engine = MigrationEngine(source_config, target_config)
            result = await engine.migrate(
                selected_tables=selected_tables,
                drop_if_exists=drop_if_exists,
                progress_callback=update_progress
            )
            
            if result["success"]:
                migration.status = MigrationStatus.COMPLETED
                migration.success_message = result["message"]
                migration.total_tables = result["statistics"]["total_tables"]
                migration.migrated_rows = result["statistics"]["total_rows"]
                migration.completed_tables = result["statistics"]["total_tables"]
            else:
                migration.status = MigrationStatus.FAILED
                migration.error_message = result.get("error")
            
            migration.completed_at = datetime.now()
            migration.duration_seconds = (
                migration.completed_at - migration.started_at
            ).total_seconds()
            existing_log = migration.migration_log or []
            migration.migration_log = existing_log + result.get("migration_log", [])
            migration.progress_percentage = 100.0 if result["success"] else migration.progress_percentage
            
            await db.commit()
            
            await send_notification(migration, db)
        
        except Exception as e:
            migration.status = MigrationStatus.FAILED
            migration.error_message = str(e)
            migration.completed_at = datetime.now()
            if migration.started_at:
                migration.duration_seconds = (
                    migration.completed_at - migration.started_at
                ).total_seconds()
            await db.commit()

            await send_notification(migration, db)


async def run_rollback_job(
    migration_id: int,
    snapshot_id: int,
    target_conn: DatabaseConnection
):
    """Run rollback using pre-migration snapshot"""
    from app.core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Migration).where(Migration.id == migration_id)
        )
        migration = result.scalar_one_or_none()
        
        snapshot_result = await db.execute(
            select(Snapshot).where(Snapshot.id == snapshot_id)
        )
        snapshot = snapshot_result.scalar_one_or_none()
        
        if not migration or not snapshot:
            return
        
        try:
            migration.current_step = "Restoring from snapshot..."
            migration.progress_percentage = 20
            await db.commit()
            
            restore_config = {
                "connection_id": target_conn.id,
                "db_type": target_conn.db_type.value,
                "host": target_conn.host,
                "port": target_conn.port,
                "database_name": target_conn.database_name,
                "username": target_conn.username,
                "password": target_conn.password,
                "ssl_enabled": target_conn.ssl_enabled
            }
            
            restore_result = await SnapshotManager.restore_snapshot(
                connection_config=restore_config,
                snapshot_file_path=snapshot.file_path,
                progress_callback=None
            )
            
            if restore_result['success']:
                migration.status = MigrationStatus.ROLLED_BACK
                migration.current_step = "Rollback completed successfully"
                migration.progress_percentage = 100
            else:
                migration.status = MigrationStatus.FAILED
                migration.error_message = f"Rollback failed: {restore_result.get('error')}"
            
            await db.commit()
            
        except Exception as e:
            migration.status = MigrationStatus.FAILED
            migration.error_message = f"Rollback failed: {str(e)}"
            await db.commit()


async def send_notification(migration: Migration, db: AsyncSession):
    """Send webhook notification for migration status"""
    if not migration.webhook_url:
        return
    
    should_notify = (
        (migration.status == MigrationStatus.COMPLETED and migration.notify_on_complete) or
        (migration.status == MigrationStatus.FAILED and migration.notify_on_failure)
    )
    
    if not should_notify:
        return
    
    try:
        payload = {
            "event": "migration_completed" if migration.status == MigrationStatus.COMPLETED else "migration_failed",
            "migration_id": migration.id,
            "migration_name": migration.migration_name,
            "status": migration.status.value,
            "duration_seconds": migration.duration_seconds,
            "migrated_rows": migration.migrated_rows,
            "error_message": migration.error_message,
            "completed_at": migration.completed_at.isoformat() if migration.completed_at else None
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(
                migration.webhook_url,
                json=payload,
                timeout=10.0
            )
    except Exception as e:
        logger.warning("Failed to send webhook notification: %s", e)
