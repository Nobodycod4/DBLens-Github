from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class APIKey(Base):
    """API Key model for programmatic access"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    key_name = Column(String(100), nullable=False)
    key_prefix = Column(String(20), nullable=False, index=True)
    key_hash = Column(String(255), nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", back_populates="api_keys", lazy="select")
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.key_name}', prefix='{self.key_prefix}', user_id={self.user_id})>"
    
    @property
    def is_valid(self):
        """Check if API key is valid"""
        from datetime import datetime, timezone
        
        if not self.is_active or self.revoked_at:
            return False
        
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        
        return True
    
    def to_dict(self, include_key=False):
        """Convert to dictionary (exclude key_hash unless explicitly requested)"""
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "key_name": self.key_name,
            "key_prefix": self.key_prefix,
            "is_active": self.is_active,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "usage_count": self.usage_count,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
        }
        
        if include_key:
            data["key_hash"] = self.key_hash
        
        return data