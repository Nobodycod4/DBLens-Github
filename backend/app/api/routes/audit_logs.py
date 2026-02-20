from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.models.database_connection import DatabaseConnection
from app.utils.db_log_parser import DBLogParser
from app.utils.org_scope import get_current_org_id, get_connection_ids_for_org, get_user_ids_for_org

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    source: str 
    user_id: Optional[str]
    user_email: Optional[str]
    action_type: str
    resource_type: str
    resource_id: Optional[str]
    resource_name: Optional[str]
    action_description: Optional[str]
    changes_made: Optional[dict]
    query_executed: Optional[str]
    success: str
    error_message: Optional[str]
    timestamp: datetime
    duration_ms: Optional[int]
    database_connection_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int


@router.get("/", response_model=AuditLogListResponse)
async def get_audit_logs(
    skip: int = Query(0, ge=0, le=500),
    limit: int = Query(100, ge=0, le=500),
    action_type: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None,
    success: Optional[str] = None,
    source: Optional[str] = None,
    database_connection_id: Optional[int] = None,
    days: int = Query(default=30, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    org_user_ids_str = {str(uid) for uid in await get_user_ids_for_org(db, org_id)}
    cutoff_date = datetime.now() - timedelta(days=days)
    base = select(AuditLog).where(AuditLog.timestamp >= cutoff_date)
    if connection_ids_in_org and org_user_ids_str:
        base = base.where(
            (AuditLog.database_connection_id.in_(connection_ids_in_org))
            | (
                AuditLog.database_connection_id.is_(None)
                & AuditLog.user_id.in_(org_user_ids_str)
            )
        )
    elif connection_ids_in_org:
        base = base.where(AuditLog.database_connection_id.in_(connection_ids_in_org))
    elif org_user_ids_str:
        base = base.where(
            AuditLog.database_connection_id.is_(None),
            AuditLog.user_id.in_(org_user_ids_str),
        )
    else:
        base = base.where(1 == 0)
    if action_type:
        base = base.where(AuditLog.action_type == action_type)
    if resource_type:
        base = base.where(AuditLog.resource_type == resource_type)
    if user_id:
        base = base.where(AuditLog.user_id == user_id)
    if success:
        base = base.where(AuditLog.success == success)
    if source:
        base = base.where(AuditLog.source == source)
    if database_connection_id:
        base = base.where(AuditLog.database_connection_id == database_connection_id)

    count_q = select(func.count(AuditLog.id)).where(AuditLog.timestamp >= cutoff_date)
    if connection_ids_in_org and org_user_ids_str:
        count_q = count_q.where(
            (AuditLog.database_connection_id.in_(connection_ids_in_org))
            | (
                AuditLog.database_connection_id.is_(None)
                & AuditLog.user_id.in_(org_user_ids_str)
            )
        )
    elif connection_ids_in_org:
        count_q = count_q.where(AuditLog.database_connection_id.in_(connection_ids_in_org))
    elif org_user_ids_str:
        count_q = count_q.where(
            AuditLog.database_connection_id.is_(None),
            AuditLog.user_id.in_(org_user_ids_str),
        )
    else:
        count_q = count_q.where(1 == 0)
    if action_type:
        count_q = count_q.where(AuditLog.action_type == action_type)
    if resource_type:
        count_q = count_q.where(AuditLog.resource_type == resource_type)
    if user_id:
        count_q = count_q.where(AuditLog.user_id == user_id)
    if success:
        count_q = count_q.where(AuditLog.success == success)
    if source:
        count_q = count_q.where(AuditLog.source == source)
    if database_connection_id:
        count_q = count_q.where(AuditLog.database_connection_id == database_connection_id)
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    query = base.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return AuditLogListResponse(items=logs, total=total)

@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    result = await db.execute(
        select(AuditLog).where(AuditLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    org_user_ids_str = {str(uid) for uid in await get_user_ids_for_org(db, org_id)}
    if log.database_connection_id is not None:
        if log.database_connection_id not in connection_ids_in_org:
            raise HTTPException(status_code=404, detail="Audit log not found")
    else:
        if log.user_id not in org_user_ids_str:
            raise HTTPException(status_code=404, detail="Audit log not found")
    return log

@router.get("/stats/summary")
async def get_audit_stats(
    days: int = Query(default=7, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
    org_user_ids_str = {str(uid) for uid in await get_user_ids_for_org(db, org_id)}
    cutoff_date = datetime.now() - timedelta(days=days)
    base = select(AuditLog).where(AuditLog.timestamp >= cutoff_date)
    if connection_ids_in_org and org_user_ids_str:
        base = base.where(
            (AuditLog.database_connection_id.in_(connection_ids_in_org))
            | (
                AuditLog.database_connection_id.is_(None)
                & AuditLog.user_id.in_(org_user_ids_str)
            )
        )
    elif connection_ids_in_org:
        base = base.where(AuditLog.database_connection_id.in_(connection_ids_in_org))
    elif org_user_ids_str:
        base = base.where(
            AuditLog.database_connection_id.is_(None),
            AuditLog.user_id.in_(org_user_ids_str),
        )
    else:
        base = base.where(1 == 0)
    result = await db.execute(base)
    logs = result.scalars().all()
    
    
    total_actions = len(logs)
    
    by_action_type = {}
    by_resource_type = {}
    by_status = {"success": 0, "failed": 0}
    
    for log in logs:
        
        by_action_type[log.action_type] = by_action_type.get(log.action_type, 0) + 1
        
        
        by_resource_type[log.resource_type] = by_resource_type.get(log.resource_type, 0) + 1
        
        
        if log.success == "success":
            by_status["success"] += 1
        else:
            by_status["failed"] += 1
    
    return {
        "total_actions": total_actions,
        "by_action_type": by_action_type,
        "by_resource_type": by_resource_type,
        "by_status": by_status,
        "date_range_days": days
    }

@router.post("/import/{connection_id}")
async def import_database_logs(
    connection_id: int,
    limit: int = Query(default=100, description="Number of logs to import"),
    db: AsyncSession = Depends(get_db)
):
    
    
    
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    db_type = connection.db_type.value.lower()
    
    
    if db_type in ['mysql', 'MYSQL']:
        result = await DBLogParser.parse_mysql_general_log(
            db=db,
            connection_id=connection.id,
            db_type=db_type,
            host=connection.host,
            port=connection.port,
            database=connection.database_name,
            username=connection.username,
            password=connection.password,
            ssl_enabled=connection.ssl_enabled,
            limit=limit
        )
    elif db_type in ['postgresql', 'POSTGRESQL']:
        result = await DBLogParser.parse_postgresql_log(
            db=db,
            connection_id=connection.id,
            db_type=db_type,
            host=connection.host,
            port=connection.port,
            database=connection.database_name,
            username=connection.username,
            password=connection.password,
            ssl_enabled=connection.ssl_enabled,
            limit=limit
        )
    elif db_type in ['mongodb', 'MONGODB']:  
        result = await DBLogParser.parse_mongodb_log(
            db=db,
            connection_id=connection.id,
            db_type=db_type,
            host=connection.host,
            port=connection.port,
            database=connection.database_name,
            username=connection.username,
            password=connection.password,
            ssl_enabled=connection.ssl_enabled,
            limit=limit
        )
    elif db_type in ['sqlite', 'SQLITE']:  
        result = await DBLogParser.parse_sqlite_log(
            db=db,
            connection_id=connection.id,
            db_type=db_type,
            host=connection.host,
            port=connection.port,
            database=connection.database_name,
            username=connection.username,
            password=connection.password,
            ssl_enabled=connection.ssl_enabled,
            limit=limit
        )
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"Log import not supported for {db_type}"
        )
    
    return result