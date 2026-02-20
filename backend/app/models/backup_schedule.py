from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from .base import Base

class BackupSchedule(Base):
    __tablename__ = "backup_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    database_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False, index=True)
    
    schedule_name = Column(String(255), nullable=False)
    schedule_type = Column(String(50), nullable=False)  
    cron_expression = Column(String(100), nullable=True)  
    
    hour = Column(Integer, nullable=True)  
    minute = Column(Integer, nullable=True)  
    day_of_week = Column(String(20), nullable=True)  
    day_of_month = Column(Integer, nullable=True)  
    
    retention_count = Column(Integer, default=7)  
    
    is_active = Column(Boolean, default=True, index=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    last_backup_id = Column(Integer, nullable=True)
    
    created_by = Column(String(255), default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<BackupSchedule(name='{self.schedule_name}', type='{self.schedule_type}')>"