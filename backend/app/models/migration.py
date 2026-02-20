from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import enum


class MigrationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class MigrationType(str, enum.Enum):
    FULL = "full"
    INCREMENTAL = "incremental"
    SCHEMA_ONLY = "schema_only"


class Migration(Base):
    __tablename__ = "migrations"
    id = Column(Integer, primary_key=True, index=True)
    source_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False, index=True)
    target_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False, index=True)
    migration_name = Column(String(255), nullable=False)
    selected_tables = Column(JSON, nullable=False)  
    status = Column(Enum(MigrationStatus), default=MigrationStatus.PENDING, index=True)
    migration_type = Column(Enum(MigrationType), default=MigrationType.FULL)
    progress_percentage = Column(Float, default=0.0)
    current_step = Column(String(255), nullable=True)  
    total_tables = Column(Integer, default=0)
    completed_tables = Column(Integer, default=0)
    total_rows = Column(Integer, default=0)
    migrated_rows = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    success_message = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    migration_log = Column(JSON, nullable=True)
    
    is_dry_run = Column(Boolean, default=False)
    dry_run_results = Column(JSON, nullable=True)
    transformation_rules = Column(JSON, nullable=True)
    filter_conditions = Column(JSON, nullable=True)
    last_sync_timestamp = Column(DateTime(timezone=True), nullable=True)
    template_id = Column(Integer, ForeignKey("migration_templates.id"), nullable=True)
    schedule_id = Column(Integer, ForeignKey("migration_schedules.id"), nullable=True)
    can_rollback = Column(Boolean, default=True)
    rollback_snapshot_id = Column(Integer, nullable=True)
    webhook_url = Column(String(500), nullable=True)
    notify_on_complete = Column(Boolean, default=False)
    notify_on_failure = Column(Boolean, default=True)
    
    created_by = Column(String(255), default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Migration(name='{self.migration_name}', status='{self.status}')>"


class MigrationTemplate(Base):
    """Saved migration configurations for reuse"""
    __tablename__ = "migration_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    source_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=True)
    target_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=True)
    target_db_type = Column(String(50), nullable=True)
    selected_tables = Column(JSON, nullable=True)
    transformation_rules = Column(JSON, nullable=True)
    filter_conditions = Column(JSON, nullable=True)
    drop_if_exists = Column(Boolean, default=True)
    migration_type = Column(Enum(MigrationType), default=MigrationType.FULL)
    webhook_url = Column(String(500), nullable=True)
    notify_on_complete = Column(Boolean, default=False)
    notify_on_failure = Column(Boolean, default=True)
    
    created_by = Column(String(255), default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "source_connection_id": self.source_connection_id,
            "target_connection_id": self.target_connection_id,
            "target_db_type": self.target_db_type,
            "selected_tables": self.selected_tables,
            "transformation_rules": self.transformation_rules,
            "filter_conditions": self.filter_conditions,
            "drop_if_exists": self.drop_if_exists,
            "migration_type": self.migration_type.value if self.migration_type else "full",
            "webhook_url": self.webhook_url,
            "notify_on_complete": self.notify_on_complete,
            "notify_on_failure": self.notify_on_failure,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MigrationSchedule(Base):
    """Scheduled migrations (like backup schedules)"""
    __tablename__ = "migration_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    template_id = Column(Integer, ForeignKey("migration_templates.id"), nullable=False)
    
    is_active = Column(Boolean, default=True)
    schedule_type = Column(String(50), default="daily")  # hourly, daily, weekly, monthly, cron
    cron_expression = Column(String(100), nullable=True)
    hour = Column(Integer, default=0)
    minute = Column(Integer, default=0)
    day_of_week = Column(Integer, nullable=True)
    day_of_month = Column(Integer, nullable=True)
    
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    last_migration_id = Column(Integer, nullable=True)
    last_status = Column(String(50), nullable=True)
    run_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    
    created_by = Column(String(255), default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    template = relationship("MigrationTemplate", backref="schedules", foreign_keys=[template_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "template_id": self.template_id,
            "is_active": self.is_active,
            "schedule_type": self.schedule_type,
            "cron_expression": self.cron_expression,
            "hour": self.hour,
            "minute": self.minute,
            "day_of_week": self.day_of_week,
            "day_of_month": self.day_of_month,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "last_status": self.last_status,
            "run_count": self.run_count,
            "failure_count": self.failure_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }