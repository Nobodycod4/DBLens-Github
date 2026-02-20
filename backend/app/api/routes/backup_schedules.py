from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.core.database import get_db
from app.models.backup_schedule import BackupSchedule
from app.models.database_connection import DatabaseConnection
from app.utils.backup_scheduler import BackupSchedulerManager
from app.utils.org_scope import get_current_org_id, get_connection_ids_for_org, require_connection_in_org

router = APIRouter()

class BackupScheduleCreate(BaseModel):
    database_connection_id: int
    schedule_name: str
    schedule_type: str  
    cron_expression: Optional[str] = None
    hour: Optional[int] = None
    minute: Optional[int] = None
    day_of_week: Optional[str] = None
    day_of_month: Optional[int] = None
    retention_count: int = 7
    is_active: bool = True

class BackupScheduleUpdate(BaseModel):
    schedule_name: Optional[str] = None
    schedule_type: Optional[str] = None
    cron_expression: Optional[str] = None
    hour: Optional[int] = None
    minute: Optional[int] = None
    day_of_week: Optional[str] = None
    day_of_month: Optional[int] = None
    retention_count: Optional[int] = None
    is_active: Optional[bool] = None

class BackupScheduleResponse(BaseModel):
    id: int
    database_connection_id: int
    schedule_name: str
    schedule_type: str
    cron_expression: Optional[str]
    hour: Optional[int]
    minute: Optional[int]
    day_of_week: Optional[str]
    day_of_month: Optional[int]
    retention_count: int
    is_active: bool
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    last_backup_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[BackupScheduleResponse])
async def list_schedules(
    connection_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """List backup schedules for the current org only."""
    try:
        connection_ids_in_org = await get_connection_ids_for_org(db, org_id)
        if not connection_ids_in_org:
            return []
        query = select(BackupSchedule).where(
            BackupSchedule.database_connection_id.in_(connection_ids_in_org)
        )
        if connection_id:
            if connection_id not in connection_ids_in_org:
                return []
            query = query.where(BackupSchedule.database_connection_id == connection_id)
        result = await db.execute(query.order_by(BackupSchedule.created_at.desc()))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{schedule_id}", response_model=BackupScheduleResponse)
async def get_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Get a specific backup schedule (must be in current org)."""
    result = await db.execute(
        select(BackupSchedule).where(BackupSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    await require_connection_in_org(db, schedule.database_connection_id, org_id)
    return schedule


@router.post("/", response_model=BackupScheduleResponse)
async def create_schedule(
    schedule_data: BackupScheduleCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    try:
        await require_connection_in_org(db, schedule_data.database_connection_id, org_id)
        result = await db.execute(
            select(DatabaseConnection).where(
                DatabaseConnection.id == schedule_data.database_connection_id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Database connection not found")
        
        
        schedule = BackupSchedule(**schedule_data.model_dump())
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        
        
        from app.main import scheduler
        trigger = BackupSchedulerManager.build_cron_trigger(schedule)
        
        if trigger:
            scheduler.add_job(
                BackupSchedulerManager.execute_scheduled_backup,
                trigger=trigger,
                args=[schedule.id],
                id=f"backup_schedule_{schedule.id}",
                replace_existing=True
            )
            
            
            schedule.next_run_at = trigger.get_next_fire_time(None, datetime.now())
            await db.commit()
            await db.refresh(schedule)
        
        return schedule
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{schedule_id}", response_model=BackupScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_update: BackupScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Update a backup schedule (must be in current org)."""
    try:
        result = await db.execute(
            select(BackupSchedule).where(BackupSchedule.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        await require_connection_in_org(db, schedule.database_connection_id, org_id)
        
        
        update_data = schedule_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(schedule, field, value)
        
        await db.commit()
        await db.refresh(schedule)
        
        
        from app.main import scheduler
        trigger = BackupSchedulerManager.build_cron_trigger(schedule)
        
        if trigger and schedule.is_active:
            scheduler.add_job(
                BackupSchedulerManager.execute_scheduled_backup,
                trigger=trigger,
                args=[schedule.id],
                id=f"backup_schedule_{schedule.id}",
                replace_existing=True
            )
            schedule.next_run_at = trigger.get_next_fire_time(None, datetime.now())
        elif not schedule.is_active:
            
            try:
                scheduler.remove_job(f"backup_schedule_{schedule.id}")
                schedule.next_run_at = None
            except:
                pass
        
        await db.commit()
        await db.refresh(schedule)
        
        return schedule
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Delete a backup schedule (must be in current org)."""
    try:
        result = await db.execute(
            select(BackupSchedule).where(BackupSchedule.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        await require_connection_in_org(db, schedule.database_connection_id, org_id)
        
        
        from app.main import scheduler
        try:
            scheduler.remove_job(f"backup_schedule_{schedule.id}")
        except:
            pass
        
        
        await db.delete(schedule)
        await db.commit()
        
        return {"success": True, "message": "Schedule deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{schedule_id}/run-now")
async def run_schedule_now(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    """Manually trigger a scheduled backup immediately (schedule must be in current org)."""
    try:
        result = await db.execute(
            select(BackupSchedule).where(BackupSchedule.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        await require_connection_in_org(db, schedule.database_connection_id, org_id)
        
        
        import asyncio
        asyncio.create_task(BackupSchedulerManager.execute_scheduled_backup(schedule_id))
        
        return {"success": True, "message": "Backup started"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))