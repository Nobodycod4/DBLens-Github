from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime
import os

from app.core.database import get_db
from app.models.snapshot import Snapshot, SnapshotStatus, SnapshotType
from app.models.database_connection import DatabaseConnection
from app.utils.snapshot_manager import SnapshotManager
from app.utils.audit_logger import AuditLogger
from pydantic import BaseModel

router = APIRouter()

class SnapshotCreate(BaseModel):
    database_connection_id: int
    snapshot_name: str
    snapshot_type: str = "full"  
    description: Optional[str] = None

class SnapshotResponse(BaseModel):
    id: int
    database_connection_id: int
    snapshot_name: str
    snapshot_type: str
    description: Optional[str]
    file_size_mb: Optional[float]
    table_count: int
    total_rows: int
    status: str
    progress_percentage: float
    is_active_snapshot: bool
    restored_count: int
    last_restored_at: Optional[datetime]
    created_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    
    class Config:
        from_attributes = True

class SnapshotCompareRequest(BaseModel):
    snapshot1_id: int
    snapshot2_id: int

async def create_snapshot_task(
    snapshot_id: int,
    connection_config: dict,
    snapshot_type: str,
    db_session: AsyncSession
):
    """Background task to create snapshot"""
    try:
        
        result = await db_session.execute(
            select(Snapshot).where(Snapshot.id == snapshot_id)
        )
        snapshot = result.scalar_one_or_none()
        
        if not snapshot:
            return
        
        snapshot.status = SnapshotStatus.IN_PROGRESS
        snapshot.started_at = datetime.now()
        await db_session.commit()
        
        async def progress_callback(percentage: float, step: str):
            snapshot.progress_percentage = percentage
            await db_session.commit()
        
        result = await SnapshotManager.create_snapshot(
            connection_config,
            snapshot_type,
            progress_callback
        )
        
        if result['success']:
            snapshot.status = SnapshotStatus.COMPLETED
            snapshot.file_path = result['file_path']
            snapshot.file_size_mb = result['file_size_mb']
            snapshot.duration_seconds = result['duration_seconds']
            snapshot.schema_metadata = result['schema_metadata']
            snapshot.table_count = result['schema_metadata'].get('table_count', 0)
            snapshot.total_rows = result['schema_metadata'].get('total_rows', 0)
            snapshot.completed_at = datetime.now()
            snapshot.progress_percentage = 100
        else:
            snapshot.status = SnapshotStatus.FAILED
            snapshot.error_message = result['error_message']
        
        await db_session.commit()
        
        await AuditLogger.log(
            db=db_session,
            performed_by="system",
            action_type="CREATE_SNAPSHOT",
            resource_type="snapshot",
            resource_id=str(snapshot.id),
            resource_name=snapshot.snapshot_name,
            success=result['success'],
            action_description=f"Created snapshot: {snapshot.snapshot_name}",
            database_connection_id=connection_config['connection_id']
        )
        
    except Exception as e:
        print(f"Snapshot creation failed: {e}")
        if snapshot:
            snapshot.status = SnapshotStatus.FAILED
            snapshot.error_message = str(e)
            await db_session.commit()


async def restore_snapshot_task(
    snapshot_id: int,
    connection_config: dict,
    snapshot_path: str,
    db_session: AsyncSession
):
    """Background task to restore snapshot"""
    try:
        result = await db_session.execute(
            select(Snapshot).where(Snapshot.id == snapshot_id)
        )
        snapshot = result.scalar_one_or_none()
        
        if not snapshot:
            return
        
        async def progress_callback(percentage: float, step: str):
            pass 
        
        result = await SnapshotManager.restore_snapshot(
            snapshot_path,
            connection_config,
            progress_callback
        )
        
        if result['success']:
            await db_session.execute(
                Snapshot.__table__.update().where(
                    Snapshot.database_connection_id == snapshot.database_connection_id
                ).values(is_active_snapshot=False)
            )
            
            snapshot.is_active_snapshot = True
            snapshot.restored_count += 1
            snapshot.last_restored_at = datetime.now()
            await db_session.commit()
        

        await AuditLogger.log(
            db=db_session,
            performed_by="system",
            action_type="RESTORE_SNAPSHOT",
            resource_type="snapshot",
            resource_id=str(snapshot.id),
            resource_name=snapshot.snapshot_name,
            success=result['success'],
            action_description=f"Restored snapshot: {snapshot.snapshot_name}",
            database_connection_id=connection_config['connection_id']
        )
        
    except Exception as e:
        print(f"Snapshot restore failed: {e}")

@router.post("/", response_model=SnapshotResponse)
async def create_snapshot(
    snapshot_data: SnapshotCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Create a new snapshot"""
    
    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == snapshot_data.database_connection_id
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    snapshot = Snapshot(
        database_connection_id=snapshot_data.database_connection_id,
        snapshot_name=snapshot_data.snapshot_name,
        snapshot_type=SnapshotType(snapshot_data.snapshot_type),
        description=snapshot_data.description,
        status=SnapshotStatus.PENDING,
        file_path="",  
        created_by="user"
    )
    
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    
    connection_config = {
        "connection_id": connection.id,
        "db_type": connection.db_type,
        "host": connection.host,
        "port": connection.port,
        "database_name": connection.database_name,
        "username": connection.username,
        "password": connection.password,
        "ssl_enabled": connection.ssl_enabled
    }
    
    background_tasks.add_task(
        create_snapshot_task,
        snapshot.id,
        connection_config,
        snapshot_data.snapshot_type,
        db
    )
    
    return snapshot

@router.get("/connection/{connection_id}", response_model=List[SnapshotResponse])
async def list_snapshots(
    connection_id: int,
    db: AsyncSession = Depends(get_db)
):
    """List all snapshots for a database connection"""
    
    result = await db.execute(
        select(Snapshot)
        .where(Snapshot.database_connection_id == connection_id)
        .order_by(Snapshot.created_at.desc())
    )
    
    snapshots = result.scalars().all()
    return snapshots

@router.get("/{snapshot_id}", response_model=SnapshotResponse)
async def get_snapshot(
    snapshot_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get snapshot by ID"""
    
    result = await db.execute(
        select(Snapshot).where(Snapshot.id == snapshot_id)
    )
    
    snapshot = result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return snapshot

@router.post("/{snapshot_id}/restore")
async def restore_snapshot(
    snapshot_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Restore database from snapshot"""
    
    result = await db.execute(
        select(Snapshot).where(Snapshot.id == snapshot_id)
    )
    snapshot = result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    if snapshot.status != SnapshotStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Snapshot is not ready for restore")
    
    if not os.path.exists(snapshot.file_path):
        raise HTTPException(status_code=404, detail="Snapshot file not found")
    
    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == snapshot.database_connection_id
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    connection_config = {
        "connection_id": connection.id,
        "db_type": connection.db_type,
        "host": connection.host,
        "port": connection.port,
        "database_name": connection.database_name,
        "username": connection.username,
        "password": connection.password,
        "ssl_enabled": connection.ssl_enabled
    }
    
    background_tasks.add_task(
        restore_snapshot_task,
        snapshot.id,
        connection_config,
        snapshot.file_path,
        db
    )
    
    return {
        "success": True,
        "message": f"Restore started for snapshot: {snapshot.snapshot_name}"
    }

@router.delete("/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a snapshot"""
    
    result = await db.execute(
        select(Snapshot).where(Snapshot.id == snapshot_id)
    )
    snapshot = result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    if os.path.exists(snapshot.file_path):
        os.remove(snapshot.file_path)
    
    await db.delete(snapshot)
    await db.commit()
    
    await AuditLogger.log(
        db=db,
        user_id="user",
        action_type="DELETE_SNAPSHOT",
        resource_type="snapshot",
        resource_id=str(snapshot_id),
        resource_name=snapshot.snapshot_name,
        success=True,
        action_description=f"Deleted snapshot: {snapshot.snapshot_name}",
        database_connection_id=snapshot.database_connection_id
    )
    
    return {"success": True, "message": "Snapshot deleted"}

@router.post("/compare", response_model=dict)
async def compare_snapshots(
    compare_data: SnapshotCompareRequest,
    db: AsyncSession = Depends(get_db)
):
    """Compare two snapshots and return differences"""
    
    result = await db.execute(
        select(Snapshot).where(
            Snapshot.id.in_([compare_data.snapshot1_id, compare_data.snapshot2_id])
        )
    )
    snapshots = result.scalars().all()
    
    if len(snapshots) != 2:
        raise HTTPException(status_code=404, detail="One or both snapshots not found")
    
    snapshot1 = next(s for s in snapshots if s.id == compare_data.snapshot1_id)
    snapshot2 = next(s for s in snapshots if s.id == compare_data.snapshot2_id)
    
    comparison = await SnapshotManager.compare_snapshots(
        snapshot1.schema_metadata or {},
        snapshot2.schema_metadata or {}
    )
    
    return {
        "snapshot1": {
            "id": snapshot1.id,
            "name": snapshot1.snapshot_name,
            "created_at": snapshot1.created_at.isoformat(),
            "table_count": snapshot1.table_count,
            "total_rows": snapshot1.total_rows
        },
        "snapshot2": {
            "id": snapshot2.id,
            "name": snapshot2.snapshot_name,
            "created_at": snapshot2.created_at.isoformat(),
            "table_count": snapshot2.table_count,
            "total_rows": snapshot2.total_rows
        },
        "comparison": comparison
    }