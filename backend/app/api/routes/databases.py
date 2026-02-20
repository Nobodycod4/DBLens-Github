from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.utils.database_connector import DatabaseConnector
from datetime import datetime
from app.core.database import get_db
from app.models.database_connection import DatabaseConnection
from app.api.schemas import (
    DatabaseConnectionCreate,
    DatabaseConnectionUpdate,
    DatabaseConnectionResponse,
    DatabaseConnectionWithAccess,
    ConnectionSharedWithUser,
    ConnectionSharedWithGrant,
)
from sqlalchemy import select
from app.utils.schema_inspector import SchemaInspector
from app.api.schemas import SchemaResponse
from app.utils.query_executor import QueryExecutor
from app.api.schemas import QueryRequest, QueryResponse
from app.utils.audit_logger import AuditLogger
from sqlalchemy import delete, or_, update
from app.middleware.auth_middleware import get_current_user
from app.utils.org_scope import get_current_org_id, get_connection_ids_for_org, require_connection_in_org
from app.models.user import User
from app.models.backup import Backup
from app.models.health_metric import HealthMetric
from app.models.audit_log import AuditLog
from app.models.snapshot import Snapshot
from app.models.backup_schedule import BackupSchedule
from app.models.migration import Migration, MigrationTemplate
from app.models.connection_access import ConnectionAccess

router = APIRouter()


@router.get("/", response_model=List[DatabaseConnectionWithAccess])
async def list_databases(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """List database connections in the current org that the user owns or has been granted access to."""
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    if not connection_ids_in_org:
        return []
    owned = await db.execute(
        select(DatabaseConnection)
        .where(
            DatabaseConnection.user_id == current_user.id,
            DatabaseConnection.id.in_(connection_ids_in_org),
        )
        .order_by(DatabaseConnection.created_at.desc())
    )
    owned_list = owned.scalars().all()
    shared = await db.execute(
        select(DatabaseConnection)
        .join(ConnectionAccess, ConnectionAccess.connection_id == DatabaseConnection.id)
        .where(
            ConnectionAccess.user_id == current_user.id,
            DatabaseConnection.user_id != current_user.id,
            DatabaseConnection.id.in_(connection_ids_in_org),
        )
        .order_by(DatabaseConnection.created_at.desc())
    )
    shared_list = shared.scalars().all()
    out = []
    seen_ids = set()
    for c in owned_list:
        if c.id not in seen_ids:
            seen_ids.add(c.id)
            out.append(DatabaseConnectionWithAccess(**DatabaseConnectionResponse.model_validate(c).model_dump(), access_type="owner"))
    for c in shared_list:
        if c.id not in seen_ids:
            seen_ids.add(c.id)
            out.append(DatabaseConnectionWithAccess(**DatabaseConnectionResponse.model_validate(c).model_dump(), access_type="shared"))
    out.sort(key=lambda x: x.created_at, reverse=True)
    return out[skip : skip + limit]


@router.get("/{database_id}", response_model=DatabaseConnectionResponse)
async def get_database(
    database_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Get a specific database connection by ID. Must be in current org; allowed for owner or users with shared access."""
    await require_connection_in_org(db, database_id, org_id)
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == database_id)
    )
    database = result.scalar_one_or_none()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database with ID {database_id} not found",
        )
    if database.user_id != current_user.id:
        has_access = await db.execute(
            select(ConnectionAccess).where(
                ConnectionAccess.connection_id == database_id,
                ConnectionAccess.user_id == current_user.id,
            )
        )
        if not has_access.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return database


def _require_connection_owner(connection: DatabaseConnection, current_user: User) -> None:
    """Raise 403 if current user is not the connection owner."""
    if connection.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the connection owner can manage access",
        )


@router.get("/{database_id}/shared-with", response_model=List[ConnectionSharedWithUser])
async def list_shared_with(
    database_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List users who have access to this connection. Owner only."""
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == database_id)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    _require_connection_owner(connection, current_user)
    rows = await db.execute(
        select(ConnectionAccess.user_id, User.username, ConnectionAccess.role)
        .join(User, User.id == ConnectionAccess.user_id)
        .where(ConnectionAccess.connection_id == database_id)
    )
    return [ConnectionSharedWithUser(user_id=u, username=n, role=r) for u, n, r in rows.all()]


@router.post("/{database_id}/shared-with", response_model=ConnectionSharedWithUser, status_code=status.HTTP_201_CREATED)
async def grant_shared_with(
    database_id: int,
    body: ConnectionSharedWithGrant,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Grant an app user access to this connection. Owner only."""
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == database_id)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    _require_connection_owner(connection, current_user)
    if body.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot share with yourself")
    existing = await db.execute(
        select(ConnectionAccess).where(
            ConnectionAccess.connection_id == database_id,
            ConnectionAccess.user_id == body.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already has access")
    access = ConnectionAccess(
        connection_id=database_id,
        user_id=body.user_id,
        role=body.role or "use",
        granted_by=current_user.id,
    )
    db.add(access)
    await db.commit()
    await db.refresh(access)
    uname = await db.get(User, body.user_id)
    return ConnectionSharedWithUser(
        user_id=body.user_id,
        username=uname.username if uname else "",
        role=access.role,
    )


@router.delete("/{database_id}/shared-with/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_shared_with(
    database_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a user's access to this connection. Owner only."""
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == database_id)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    _require_connection_owner(connection, current_user)
    await db.execute(
        delete(ConnectionAccess).where(
            ConnectionAccess.connection_id == database_id,
            ConnectionAccess.user_id == user_id,
        )
    )
    await db.commit()
    return None


@router.post("/", response_model=DatabaseConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_database(
    database: DatabaseConnectionCreate,
    current_user: User = Depends(get_current_user),  
    db: AsyncSession = Depends(get_db)
):
    """Create a new database connection"""
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.name == database.name)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database with name '{database.name}' already exists"
        )
    
    connection_data = database.model_dump(exclude={'created_by'}) 
    connection_data['user_id'] = current_user.id

    db_connection = DatabaseConnection(**connection_data)
    db.add(db_connection)

    await db.commit()
    await db.refresh(db_connection)
    
    
    await AuditLogger.log(
        db=db,
        performed_by=current_user.username, 
        action_type="CREATE",
        resource_type="database_connection",
        resource_id=str(db_connection.id),
        resource_name=db_connection.name,
        action_description=f"Created new {db_connection.db_type} connection",
        changes_made=database.model_dump(),
        database_connection_id=db_connection.id,
        success=True
    )
    
    return db_connection

@router.post("/create-new", response_model=DatabaseConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_database(
    db_type: str,
    database_name: str,
    username: Optional[str] = None,
    password: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a brand new database instance. Uses default DB credentials from app settings
    if username/password not provided; if defaults are not set, returns 400 CREDENTIALS_REQUIRED.
    """
    from app.core.config import settings
    from app.api.routes.app_settings import get_default_db_credentials_async

    use_username = username and username.strip()
    use_password = password if password is not None else None
    if not use_username or not use_password:
        default_user, default_pass = await get_default_db_credentials_async(db)
        if not default_user or not default_pass:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "CREDENTIALS_REQUIRED",
                    "message": "Default DB credentials not set. Please provide username and password.",
                },
            )
        use_username = default_user
        use_password = default_pass

    creation_result = await DatabaseConnector.create_database(
        db_type=db_type,
        database_name=database_name,
        username=use_username,
        password=use_password,
        storage_path=settings.DB_STORAGE_PATH
    )
    
    if not creation_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=creation_result["message"]
        )
    
    conn_details = creation_result["connection_details"]
    db_connection = DatabaseConnection(
        user_id=current_user.id,
        name=f"{db_type}_{database_name}",
        db_type=db_type,
        host=conn_details["host"],
        port=conn_details["port"],
        database_name=conn_details["database"],
        username=conn_details["username"],
        password=conn_details["password"],
        is_self_hosted=True,
        connection_status="connected"
    )
    
    db.add(db_connection)
    await db.commit()
    await db.refresh(db_connection)
    
    await AuditLogger.log(
        db=db,
        performed_by="system",
        action_type="CREATE",
        resource_type="database_provision",
        resource_id=str(db_connection.id),
        resource_name=db_connection.name,
        action_description=f"Provisioned new {db_type} database '{database_name}'",
        changes_made=creation_result,
        database_connection_id=db_connection.id,
        success=True
    )
    
    return db_connection

@router.put("/{database_id}", response_model=DatabaseConnectionResponse)
async def update_database(
    database_id: int,
    database_update: DatabaseConnectionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a database connection"""
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == database_id)
    )
    db_connection = result.scalar_one_or_none()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database with ID {database_id} not found"
        )
    

    old_values = {
        "name": db_connection.name,
        "db_type": db_connection.db_type.value,
        "host": db_connection.host,
        "port": db_connection.port,
        "database_name": db_connection.database_name,
    }
    
    update_data = database_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_connection, field, value)
    
    await db.commit()
    await db.refresh(db_connection)
    
    
    await AuditLogger.log(
        db=db,
        performed_by="system",
        action_type="UPDATE",
        resource_type="database_connection",
        resource_id=str(db_connection.id),
        resource_name=db_connection.name,
        action_description=f"Updated connection '{db_connection.name}'",
        changes_made={
            "before": old_values,
            "after": update_data
        },
        database_connection_id=db_connection.id,
        success=True
    )
    
    return db_connection


@router.delete("/{database_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database(
    database_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a database connection"""
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == database_id)
    )
    db_connection = result.scalar_one_or_none()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database with ID {database_id} not found"
        )

    subq = select(Migration.id).where(
        or_(
            Migration.source_connection_id == database_id,
            Migration.target_connection_id == database_id,
        )
    )
    await db.execute(update(Snapshot).where(Snapshot.related_migration_id.in_(subq)).values(related_migration_id=None))
    await db.execute(
        delete(Migration).where(
            or_(
                Migration.source_connection_id == database_id,
                Migration.target_connection_id == database_id,
            )
        )
    )
    await db.execute(
        update(MigrationTemplate).where(MigrationTemplate.source_connection_id == database_id).values(source_connection_id=None)
    )
    await db.execute(
        update(MigrationTemplate).where(MigrationTemplate.target_connection_id == database_id).values(target_connection_id=None)
    )
    await db.execute(delete(BackupSchedule).where(BackupSchedule.database_connection_id == database_id))
    await db.execute(delete(Snapshot).where(Snapshot.database_connection_id == database_id))
    await db.execute(delete(Backup).where(Backup.database_connection_id == database_id))
    await db.execute(delete(HealthMetric).where(HealthMetric.database_connection_id == database_id))
    await db.execute(delete(AuditLog).where(AuditLog.database_connection_id == database_id))

    await db.delete(db_connection)
    await db.commit()

    return None

@router.post("/{connection_id}/test")
async def test_database_connection(
    connection_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Test if a database connection works"""
    
    
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    
    test_result = await DatabaseConnector.test_connection(
        db_type=connection.db_type,
        host=connection.host,
        port=connection.port,
        database=connection.database_name,
        username=connection.username,
        password=connection.password,
        ssl_enabled=connection.ssl_enabled,
        
    )
    
    
    connection.connection_status = "connected" if test_result["success"] else "failed"
    connection.last_tested_at = datetime.now()
    await db.commit()
    
    
    await AuditLogger.log(
        db=db,
        performed_by="system",
        action_type="TEST",
        resource_type="database_connection",
        resource_id=str(connection.id),
        resource_name=connection.name,
        action_description=f"Tested connection to '{connection.name}'",
        success=test_result["success"],
        error_message=test_result.get("message") if not test_result["success"] else None,
        database_connection_id=connection.id,
    )
    
    return test_result

@router.get("/{connection_id}/schema", response_model=SchemaResponse)
async def get_database_schema(
    connection_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get complete schema for a database connection"""
    
    
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    
    schema_result = await SchemaInspector.get_schema(
        db_type=connection.db_type,
        host=connection.host,
        port=connection.port,
        database=connection.database_name,
        username=connection.username,
        password=connection.password,
        ssl_enabled=connection.ssl_enabled
    )
    
    
    await AuditLogger.log(
        db=db,
        performed_by="system",
        action_type="VIEW",
        resource_type="schema",
        resource_id=str(connection.id),
        resource_name=connection.name,
        action_description=f"Viewed schema for '{connection.name}'",
        changes_made={
            "tables_count": len(schema_result.get("tables", [])),
            "database": connection.database_name
        },
        database_connection_id=connection.id,
        success=schema_result.get("success", True),
    )
    
    return schema_result

@router.post("/{connection_id}/query", response_model=QueryResponse)
async def execute_query(
    connection_id: int,
    query_request: QueryRequest,
    db: AsyncSession = Depends(get_db)
):
    """Execute a SELECT query on a database connection"""
    
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    query_result = await QueryExecutor.execute_query(
        db_type=connection.db_type,
        host=connection.host,
        port=connection.port,
        database=connection.database_name,
        query=query_request.query,
        username=connection.username,
        password=connection.password,
        ssl_enabled=connection.ssl_enabled,
        limit=query_request.limit
    )
    
    await AuditLogger.log(
        db=db,
        performed_by="system",
        action_type="QUERY",
        resource_type="query_execution",
        resource_id=str(connection.id),
        resource_name=connection.name,
        action_description=f"Executed query on '{connection.name}'",
        query_executed=query_request.query,
        changes_made={
            "rows_returned": query_result.get("row_count", 0),
            "execution_time_ms": query_result.get("execution_time_ms", 0)
        },
        database_connection_id=connection.id,
        success=query_result.get("success", True),
        error_message=query_result.get("error") if not query_result.get("success") else None,
    )
    
    return query_result


@router.post("/{connection_id}/execute")
async def execute_write_query(
    connection_id: int,
    query_request: QueryRequest,
    confirm: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute INSERT, UPDATE, DELETE, or DDL queries on a database connection.
    Requires confirmation for destructive operations.
    """
    
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    query_upper = query_request.query.strip().upper()
    
    if query_upper.startswith("SELECT"):
        query_type = "SELECT"
    elif query_upper.startswith("INSERT"):
        query_type = "INSERT"
    elif query_upper.startswith("UPDATE"):
        query_type = "UPDATE"
    elif query_upper.startswith("DELETE"):
        query_type = "DELETE"
    elif query_upper.startswith("DROP"):
        query_type = "DROP"
    elif query_upper.startswith("TRUNCATE"):
        query_type = "TRUNCATE"
    elif query_upper.startswith("ALTER"):
        query_type = "ALTER"
    elif query_upper.startswith("CREATE"):
        query_type = "CREATE"
    else:
        query_type = "OTHER"
    
    destructive_operations = ["DELETE", "DROP", "TRUNCATE", "UPDATE"]
    if query_type in destructive_operations and not confirm:
        return {
            "success": False,
            "requires_confirmation": True,
            "query_type": query_type,
            "message": f"This is a {query_type} operation which can modify or delete data. Set confirm=true to execute.",
            "warning": "This action cannot be undone. Make sure you have a backup."
        }
    
    query_result = await QueryExecutor.execute_write_query(
        db_type=connection.db_type,
        host=connection.host,
        port=connection.port,
        database=connection.database_name,
        query=query_request.query,
        username=connection.username,
        password=connection.password,
        ssl_enabled=connection.ssl_enabled
    )
    
    await AuditLogger.log(
        db=db,
        performed_by=current_user.username,
        action_type=query_type,
        resource_type="query_execution",
        resource_id=str(connection.id),
        resource_name=connection.name,
        action_description=f"Executed {query_type} query on '{connection.name}'",
        query_executed=query_request.query,
        changes_made={
            "query_type": query_type,
            "rows_affected": query_result.get("rows_affected", 0),
            "execution_time_ms": query_result.get("execution_time_ms", 0)
        },
        database_connection_id=connection.id,
        success=query_result.get("success", True),
        error_message=query_result.get("error") if not query_result.get("success") else None,
    )
    
    return query_result

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Get dashboard statistics for database connections in the current org only."""
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    if not connection_ids_in_org:
        from datetime import datetime
        return {
            "total_connections": 0,
            "active_connections": 0,
            "recently_tested": 0,
            "by_type": {},
            "by_status": {},
            "connections": [],
        }
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id.in_(connection_ids_in_org))
    )
    connections = result.scalars().all()
    total_connections = len(connections)
    by_type = {}
    for conn in connections:
        db_type = conn.db_type.value
        by_type[db_type] = by_type.get(db_type, 0) + 1
    by_status = {}
    for conn in connections:
        st = conn.connection_status
        by_status[st] = by_status.get(st, 0) + 1
    active_connections = sum(1 for conn in connections if conn.is_active)
    from datetime import datetime, timedelta
    now = datetime.now()
    recently_tested = sum(
        1 for conn in connections
        if conn.last_tested_at
        and (now - (conn.last_tested_at.replace(tzinfo=None) if getattr(conn.last_tested_at, "tzinfo", None) else conn.last_tested_at)) < timedelta(hours=24)
    )
    return {
        "total_connections": total_connections,
        "active_connections": active_connections,
        "recently_tested": recently_tested,
        "by_type": by_type,
        "by_status": by_status,
        "connections": [
            {
                "id": conn.id,
                "name": conn.name,
                "type": conn.db_type.value,
                "status": conn.connection_status,
                "last_tested": conn.last_tested_at.isoformat() if conn.last_tested_at else None
            }
            for conn in connections
        ]
    }