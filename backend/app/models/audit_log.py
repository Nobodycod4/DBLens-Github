from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from app.models.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), default="dblens", nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    user_email = Column(String(255), nullable=True)
    action_type = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=True, index=True)
    resource_name = Column(String(255), nullable=True)
    action_description = Column(Text, nullable=True)
    changes_made = Column(JSON, nullable=True)
    query_executed = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    success = Column(String(20), default="success")
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    duration_ms = Column(Integer, nullable=True)
    database_connection_id = Column(Integer, ForeignKey('database_connections.id', ondelete='SET NULL'), nullable=True)

    def __repr__(self):
        return f"<AuditLog(source={self.source}, user={self.user_id}, action={self.action_type})>"