"""Connection sharing: which app users have access to which connections."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

from app.models.base import Base


class ConnectionAccess(Base):
    __tablename__ = "connection_access"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("database_connections.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="use", nullable=False)  # view | use
    granted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("connection_id", "user_id", name="uq_connection_access_connection_user"),)
