import os
import tempfile
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.utils.org_scope import get_current_org_id, require_connection_in_org

logger = get_logger(__name__)
from app.models.backup import Backup, BackupStatus
from app.models.database_connection import DatabaseConnection
from app.utils.backup_encryption import decrypt_backup_bytes, is_encrypted_path
from app.utils.backup_manager import BackupManager

router = APIRouter()


class BackupResponse(BaseModel):
    id: int
    database_connection_id: int
    filename: str
    file_size_mb: Optional[float] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class BackupListResponse(BaseModel):
    items: List[BackupResponse]
    total: int


@router.post("/{connection_id}/create")
async def create_backup(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Create a new backup for a database connection (must be in current org)."""
    try:
        await require_connection_in_org(db, connection_id, org_id)
        result = await db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
        )
        db_conn = result.scalar_one_or_none()
        if not db_conn:
            raise HTTPException(status_code=404, detail="Database connection not found")
        
        
        backup = Backup(
            database_connection_id=connection_id,
            filename="pending",
            file_path="pending",
            status=BackupStatus.IN_PROGRESS,
            started_at=datetime.now()
        )
        db.add(backup)
        await db.commit()
        await db.refresh(backup)
        
        
        connection_config = {
            'connection_id': connection_id,
            'host': db_conn.host,
            'port': db_conn.port,
            'username': db_conn.username,
            'password': db_conn.password,
            'database_name': db_conn.database_name
        }
        
        
        db_type = db_conn.db_type.value.lower()
        
        result_data = None
        if db_type == 'mysql':
            result_data = await BackupManager.backup_mysql(connection_config)
        elif db_type == 'postgresql':
            result_data = await BackupManager.backup_postgresql(connection_config)
        elif db_type == 'mongodb':
            result_data = await BackupManager.backup_mongodb(connection_config)
        elif db_type == 'sqlite':
            result_data = await BackupManager.backup_sqlite(connection_config)
        else:
            backup.status = BackupStatus.FAILED
            backup.error_message = f"Unsupported database type: {db_type}"
            backup.completed_at = datetime.now()
            await db.commit()
            raise HTTPException(status_code=400, detail=f"Backups not supported for {db_type}")
        
        
        if result_data and result_data.get('success'):
            backup.status = BackupStatus.COMPLETED
            backup.filename = result_data['filename']
            backup.file_path = result_data['file_path']
            backup.file_size_mb = result_data['file_size_mb']
            backup.duration_seconds = result_data['duration_seconds']
            backup.completed_at = datetime.now()
        else:
            backup.status = BackupStatus.FAILED
            backup.error_message = result_data.get('error_message', 'Unknown error') if result_data else 'Backup failed'
            backup.completed_at = datetime.now()
        
        await db.commit()
        await db.refresh(backup)
        
        if backup.status == BackupStatus.FAILED:
            raise HTTPException(status_code=500, detail=backup.error_message)
        
        return {
            "id": backup.id,
            "database_connection_id": backup.database_connection_id,
            "filename": backup.filename,
            "file_size_mb": backup.file_size_mb,
            "status": backup.status.value,
            "duration_seconds": backup.duration_seconds,
            "created_at": backup.created_at.isoformat(),
            "completed_at": backup.completed_at.isoformat() if backup.completed_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating backup: %s", e)
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}") from e


@router.get("/{connection_id}/list", response_model=BackupListResponse)
async def list_backups(
    connection_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """List backups for a database connection (must be in current org) with pagination."""
    try:
        await require_connection_in_org(db, connection_id, org_id)
        count_q = select(func.count(Backup.id)).where(Backup.database_connection_id == connection_id)
        total_result = await db.execute(count_q)
        total = total_result.scalar() or 0
        result = await db.execute(
            select(Backup)
            .where(Backup.database_connection_id == connection_id)
            .order_by(Backup.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        backups = result.scalars().all()
        return BackupListResponse(items=backups, total=total)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/download/{backup_id}")
async def download_backup(
    backup_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Download a backup file (decrypts on the fly if encrypted). Backup must belong to current org."""
    try:
        result = await db.execute(
            select(Backup).where(Backup.id == backup_id)
        )
        backup = result.scalar_one_or_none()
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
        await require_connection_in_org(db, backup.database_connection_id, org_id)

        if not os.path.exists(backup.file_path):
            raise HTTPException(status_code=404, detail="Backup file not found on disk")

        if is_encrypted_path(backup.file_path):
            decrypted = decrypt_backup_bytes(backup.file_path)
            download_filename = backup.filename.replace(".enc", "") if backup.filename.endswith(".enc") else backup.filename
            return StreamingResponse(
                iter([decrypted]),
                media_type="application/gzip",
                headers={"Content-Disposition": f'attachment; filename="{download_filename}"'},
            )
        return FileResponse(
            path=backup.file_path,
            filename=backup.filename,
            media_type="application/gzip",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{backup_id}")
async def delete_backup(
    backup_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Delete a backup (must belong to current org)."""
    try:
        result = await db.execute(
            select(Backup).where(Backup.id == backup_id)
        )
        backup = result.scalar_one_or_none()
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
        await require_connection_in_org(db, backup.database_connection_id, org_id)
        
        
        if os.path.exists(backup.file_path):
            os.remove(backup.file_path)
        
        
        await db.delete(backup)
        await db.commit()
        
        return {"success": True, "message": "Backup deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting backup: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/restore/{backup_id}")
async def restore_backup(
    backup_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Restore database from backup (decrypts to temp file if encrypted). Backup must belong to current org."""
    try:
        result = await db.execute(
            select(Backup).where(Backup.id == backup_id)
        )
        backup = result.scalar_one_or_none()
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
        await require_connection_in_org(db, backup.database_connection_id, org_id)

        if not os.path.exists(backup.file_path):
            raise HTTPException(status_code=404, detail="Backup file not found on disk")

        result = await db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == backup.database_connection_id)
        )
        db_conn = result.scalar_one_or_none()

        if not db_conn:
            raise HTTPException(status_code=404, detail="Database connection not found")

        connection_config = {
            "host": db_conn.host,
            "port": db_conn.port,
            "username": db_conn.username,
            "password": db_conn.password,
            "database_name": db_conn.database_name,
        }
        db_type = db_conn.db_type.value.lower()

        restore_path = backup.file_path
        temp_path = None
        if is_encrypted_path(backup.file_path):
            from app.utils.backup_encryption import decrypt_backup_to_file
            fd, temp_path = tempfile.mkstemp(suffix=".sql.gz")
            os.close(fd)
            try:
                decrypt_backup_to_file(backup.file_path, temp_path)
                restore_path = temp_path
            except Exception as e:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
                raise HTTPException(status_code=500, detail=f"Decrypt failed: {e}") from e

        try:
            if db_type == "mysql":
                result_data = await BackupManager.restore_mysql(restore_path, connection_config)
            elif db_type == "postgresql":
                result_data = await BackupManager.restore_postgresql(restore_path, connection_config)
            elif db_type == "mongodb":
                result_data = await BackupManager.restore_mongodb(restore_path, connection_config)
            elif db_type == "sqlite":
                result_data = await BackupManager.restore_sqlite(restore_path, connection_config)
            else:
                raise HTTPException(status_code=400, detail=f"Restore not supported for {db_type}")

            if not result_data or not result_data.get("success"):
                error_msg = result_data.get("error_message", "Restore failed") if result_data else "Restore failed"
                raise HTTPException(status_code=500, detail=error_msg)

            return {
                "success": True,
                "message": "Database restored successfully",
                "duration_seconds": result_data.get("duration_seconds"),
            }
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}") from e