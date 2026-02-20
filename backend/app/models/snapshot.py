"""
Snapshot Model - Database snapshots for point-in-time recovery
Place this file at: backend/app/models/snapshot.py
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, JSON, Boolean
from sqlalchemy.sql import func
from .base import Base
import enum


class SnapshotType(str, enum.Enum):
    FULL = "full"  # Schema + Data
    SCHEMA_ONLY = "schema_only"  # Just schema
    PRE_MIGRATION = "pre_migration"  # Auto-created before migration
    MANUAL = "manual"  # User-created


class SnapshotStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Snapshot(Base):
    __tablename__ = "snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    database_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False, index=True)
    
    snapshot_name = Column(String(255), nullable=False)
    snapshot_type = Column(Enum(SnapshotType), default=SnapshotType.MANUAL, index=True)
    description = Column(Text, nullable=True)
    
    file_path = Column(Text, nullable=False)
    file_size_mb = Column(Float, nullable=True)
    compressed = Column(Boolean, default=True)
    
    schema_metadata = Column(JSON, nullable=True)
    table_count = Column(Integer, default=0)
    total_rows = Column(Integer, default=0)
    
    status = Column(Enum(SnapshotStatus), default=SnapshotStatus.PENDING, index=True)
    progress_percentage = Column(Float, default=0.0)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    
    is_active_snapshot = Column(Boolean, default=False)
    restored_count = Column(Integer, default=0)
    last_restored_at = Column(DateTime(timezone=True), nullable=True)
    
    related_migration_id = Column(Integer, ForeignKey("migrations.id"), nullable=True)
    
    error_message = Column(Text, nullable=True)
    
    created_by = Column(String(255), default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Snapshot(name='{self.snapshot_name}', type='{self.snapshot_type}', status='{self.status}')>"