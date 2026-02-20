from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import asyncio

from app.models.backup_schedule import BackupSchedule
from app.models.database_connection import DatabaseConnection
from app.models.backup import Backup, BackupStatus
from app.utils.backup_manager import BackupManager
from app.core.database import async_engine


class BackupSchedulerManager:
    """Manage scheduled backups"""
    
    @staticmethod
    async def execute_scheduled_backup(schedule_id: int):
        """Execute a scheduled backup job"""
        print(f"⏰ Running scheduled backup for schedule_id={schedule_id}")
        
        async with AsyncSession(async_engine) as db:
            try:
                
                result = await db.execute(
                    select(BackupSchedule).where(BackupSchedule.id == schedule_id)
                )
                schedule = result.scalar_one_or_none()
                
                if not schedule or not schedule.is_active:
                    print(f"⚠️ Schedule {schedule_id} not found or inactive")
                    return
                
                
                connection_id = schedule.database_connection_id
                schedule_name = schedule.schedule_name
                retention_count = schedule.retention_count
                
                
                result = await db.execute(
                    select(DatabaseConnection).where(
                        DatabaseConnection.id == connection_id
                    )
                )
                db_conn = result.scalar_one_or_none()
                
                if not db_conn:
                    print(f"❌ Database connection not found for schedule {schedule_id}")
                    return
                
                
                db_host = db_conn.host
                db_port = db_conn.port
                db_username = db_conn.username
                db_password = db_conn.password
                db_name = db_conn.database_name
                db_type = db_conn.db_type.value.lower()
                
                
                backup = Backup(
                    database_connection_id=connection_id,
                    filename="pending",
                    file_path="pending",
                    status=BackupStatus.IN_PROGRESS,
                    started_at=datetime.now(),
                    created_by=f"scheduler_{schedule_name}"
                )
                db.add(backup)
                await db.commit()
                await db.refresh(backup)
                
                
                backup_id = backup.id
                
            except Exception as e:
                print(f"❌ Error preparing scheduled backup: {str(e)}")
                import traceback
                traceback.print_exc()
                return
        
        
        try:
            
            connection_config = {
                'connection_id': connection_id,
                'host': db_host,
                'port': db_port,
                'username': db_username,
                'password': db_password,
                'database_name': db_name
            }
            
            
            result_data = None
            
            if db_type == 'mysql':
                result_data = await BackupManager.backup_mysql(connection_config)
            elif db_type == 'postgresql':
                result_data = await BackupManager.backup_postgresql(connection_config)
            elif db_type == 'mongodb':
                result_data = await BackupManager.backup_mongodb(connection_config)
            elif db_type == 'sqlite':
                result_data = await BackupManager.backup_sqlite(connection_config)
            
            
            async with AsyncSession(async_engine) as db:
                result = await db.execute(
                    select(Backup).where(Backup.id == backup_id)
                )
                backup = result.scalar_one_or_none()
                
                if not backup:
                    print(f"❌ Backup record {backup_id} not found")
                    return
                
                
                if result_data and result_data.get('success'):
                    backup.status = BackupStatus.COMPLETED
                    backup.filename = result_data['filename']
                    backup.file_path = result_data['file_path']
                    backup.file_size_mb = result_data['file_size_mb']
                    backup.duration_seconds = result_data['duration_seconds']
                    backup.completed_at = datetime.now()
                    
                    print(f"✅ Scheduled backup completed: {backup.filename}")
                else:
                    backup.status = BackupStatus.FAILED
                    backup.error_message = result_data.get('error_message', 'Unknown error') if result_data else 'Backup failed'
                    backup.completed_at = datetime.now()
                    
                    print(f"❌ Scheduled backup failed: {backup.error_message}")
                
                await db.commit()
                
                
                result = await db.execute(
                    select(BackupSchedule).where(BackupSchedule.id == schedule_id)
                )
                schedule = result.scalar_one_or_none()
                if schedule:
                    schedule.last_run_at = datetime.now()
                    schedule.last_backup_id = backup_id  
                    await db.commit()
                
                
                await BackupSchedulerManager.cleanup_old_backups(
                    db, connection_id, retention_count
                )
                
        except Exception as e:
            print(f"❌ Error executing scheduled backup: {str(e)}")
            import traceback
            traceback.print_exc()
            
            
            async with AsyncSession(async_engine) as db:
                result = await db.execute(
                    select(Backup).where(Backup.id == backup_id)
                )
                backup = result.scalar_one_or_none()
                if backup:
                    backup.status = BackupStatus.FAILED
                    backup.error_message = str(e)
                    backup.completed_at = datetime.now()
                    await db.commit()
    
    @staticmethod
    async def cleanup_old_backups(db: AsyncSession, connection_id: int, retention_count: int):
        """Delete old backups beyond retention count"""
        try:
            
            result = await db.execute(
                select(Backup)
                .where(Backup.database_connection_id == connection_id)
                .where(Backup.status == BackupStatus.COMPLETED)
                .order_by(Backup.created_at.desc())
            )
            backups = result.scalars().all()
            
            
            if len(backups) > retention_count:
                import os
                for backup in backups[retention_count:]:
                    
                    if os.path.exists(backup.file_path):
                        os.remove(backup.file_path)
                    
                    
                    await db.delete(backup)
                
                await db.commit()
                print(f"🗑️ Cleaned up {len(backups) - retention_count} old backups")
        
        except Exception as e:
            print(f"⚠️ Error cleaning up old backups: {str(e)}")
    
    @staticmethod
    def build_cron_trigger(schedule: BackupSchedule) -> Optional[CronTrigger]:
        """Build APScheduler CronTrigger from schedule config"""
        try:
            if schedule.schedule_type == 'custom' and schedule.cron_expression:
                
                return CronTrigger.from_crontab(schedule.cron_expression)
            
            elif schedule.schedule_type == 'hourly':
                return CronTrigger(minute=schedule.minute or 0)
            
            elif schedule.schedule_type == 'daily':
                return CronTrigger(
                    hour=schedule.hour or 0,
                    minute=schedule.minute or 0
                )
            
            elif schedule.schedule_type == 'weekly':
                return CronTrigger(
                    day_of_week=schedule.day_of_week or 'mon',
                    hour=schedule.hour or 0,
                    minute=schedule.minute or 0
                )
            
            elif schedule.schedule_type == 'monthly':
                return CronTrigger(
                    day=schedule.day_of_month or 1,
                    hour=schedule.hour or 0,
                    minute=schedule.minute or 0
                )
            
            return None
        
        except Exception as e:
            print(f"❌ Error building cron trigger: {str(e)}")
            return None