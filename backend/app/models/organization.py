"""
Organization and membership models for multi-tenant org layer.
Users belong to one or more organizations; each has a role within the org.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class OrgRole(str, enum.Enum):
    """Role of a user within an organization."""
    OWNER = "owner"    # Full control, can delete org and manage members
    ADMIN = "admin"    # Can manage members and org settings
    MEMBER = "member"  # Standard member


class Organization(Base):
    """Organization (tenant) that users can belong to."""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    created_by = relationship("User", back_populates="created_organizations", foreign_keys="Organization.created_by_id")
    memberships = relationship("UserOrganization", back_populates="organization", cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by_id": self.created_by_id,
        }


class UserOrganization(Base):
    """Many-to-many: user membership in an organization with a role."""
    __tablename__ = "user_organizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SQLEnum(OrgRole), default=OrgRole.MEMBER, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="organization_memberships", lazy="select")
    organization = relationship("Organization", back_populates="memberships", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "organization_id": self.organization_id,
            "role": self.role.value,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }
