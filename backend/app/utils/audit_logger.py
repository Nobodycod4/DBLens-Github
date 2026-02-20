from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from typing import Optional, Dict, Any, Union
from datetime import datetime


class AuditLogger:
    """Utility class for logging audit events"""
    
    @staticmethod
    async def log(
        db: AsyncSession,
        action_type: str,
        resource_type: str,
        user_id: Optional[int] = None,
        success: Union[bool, str] = True,
        source: str = "dblens",
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        action_description: Optional[str] = None,
        changes_made: Optional[Dict[str, Any]] = None,
        query_executed: Optional[str] = None,
        error_message: Optional[str] = None,
        database_connection_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        performed_by: Optional[str] = None,
    ):
        """
        Log an audit event
        
        Args:
            db: Database session
            action_type: Type of action (CREATE, UPDATE, DELETE, etc.)
            resource_type: Type of resource (database_connection, backup, etc.)
            user_id: User ID (integer, optional) - for authenticated users
            success: Success status (bool or "success"/"failed" string)
            source: "dblens" for app actions, "database" for native DB logs
            performed_by: Legacy field for "system" or username strings
            ... (rest of args)
        """
        if isinstance(success, bool):
            success_str = "success" if success else "failed"
        else:
            success_str = success
        
        if user_id is not None:
            user_id_value = str(user_id)
        else:
            user_id_value = performed_by if performed_by else "system"
        
        audit_log = AuditLog(
            source=source,
            user_id=user_id_value,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            action_description=action_description,
            changes_made=changes_made,
            query_executed=query_executed,
            success=success_str,
            error_message=error_message,
            database_connection_id=database_connection_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        db.add(audit_log)
        await db.commit()
        
        return audit_log