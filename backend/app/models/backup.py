from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from .base import Base
import enum


class BackupStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Backup(Base):
    __tablename__ = "backups"
    
    id = Column(Integer, primary_key=True, index=True)
    database_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size_mb = Column(Float, nullable=True)
    status = Column(Enum(BackupStatus), default=BackupStatus.PENDING, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    backup_type = Column(String(50), default="full")  
    compression_enabled = Column(Integer, default=1)  
    error_message = Column(Text, nullable=True)
    created_by = Column(String(255), default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now())