from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class Session(Base):
    """Session model for tracking active JWT tokens"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    jti = Column(String(255), unique=True, nullable=False, index=True)
    token_type = Column(String(20), default="access", nullable=False)  # access or refresh
    
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", back_populates="sessions", lazy="select")
    
    def __repr__(self):
        return f"<Session(id={self.id}, user_id={self.user_id}, jti='{self.jti[:8]}...', type='{self.token_type}')>"
    
    @property
    def is_revoked(self):
        """Check if session is revoked"""
        return self.revoked_at is not None
    
    @property
    def is_expired(self):
        """Check if session is expired"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_valid(self):
        """Check if session is valid (not revoked and not expired)"""
        return not self.is_revoked and not self.is_expired