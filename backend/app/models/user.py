from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class UserRole(str, enum.Enum):
    """User role enumeration - hierarchy from highest to lowest"""
    SUPER_ADMIN = "super_admin"  # Full system control, can manage all roles
    ADMIN = "admin"              # Administrative access, user management
    USER = "user"                # Standard user (developer level)
    VIEWER = "viewer"            # Read-only access


class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    full_name = Column(String(255), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    database_connections = relationship("DatabaseConnection", back_populates="owner", cascade="all, delete-orphan", lazy="select")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan", lazy="select")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan", lazy="select")
    organization_memberships = relationship("UserOrganization", back_populates="user", cascade="all, delete-orphan", lazy="select")
    created_organizations = relationship("Organization", back_populates="created_by", foreign_keys="Organization.created_by_id", lazy="select")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"
    
    def to_dict(self):
        """Convert user to dictionary (exclude password_hash)"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role.value,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
        }