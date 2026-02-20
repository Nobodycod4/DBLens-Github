"""
Role-Based Access Control (RBAC) Models
Dynamic roles and permissions that admins can configure
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


ROLE_HIERARCHY = {
    "super_admin": 100,  # Can do everything, manage all roles
    "admin": 80,         # Can manage users and most roles (except super_admin)
    "developer": 60,     # Full DB access, no admin
    "user": 60,          # Legacy UserRole.USER = same level as developer
    "analyst": 40,       # Read + query
    "viewer": 20,        # Read-only
    "guest": 0,          # Minimal access
}


def get_role_level(role_name: str) -> int:
    """Get the hierarchy level of a role (case-insensitive)"""
    if not role_name:
        return 0
    return ROLE_HIERARCHY.get(role_name.lower(), 0)


def can_manage_role(manager_role: str, target_role: str) -> bool:
    """Check if manager_role can manage target_role based on hierarchy"""
    manager_role = manager_role.lower() if manager_role else ""
    target_role = target_role.lower() if target_role else ""
    
    manager_level = get_role_level(manager_role)
    target_level = get_role_level(target_role)
    
    if manager_role == "super_admin":
        return True
    
    if manager_role == "admin" and target_role != "super_admin":
        return True
    
    return manager_level > target_level


AVAILABLE_PERMISSIONS = {
    "dashboard.view": "View Dashboard",
    
    "connections.view": "View Connections",
    "connections.create": "Create Connections",
    "connections.edit": "Edit Connections",
    "connections.delete": "Delete Connections",
    "connections.test": "Test Connections",
    
    "schema.view": "View Schema",
    "schema.diagram": "View Schema Diagram",
    
    "query.execute": "Execute Queries",
    "query.save": "Save Queries",
    
    "monitoring.view": "View Monitoring",
    "monitoring.configure": "Configure Monitoring Alerts",
    
    "audit.view": "View Audit Logs",
    "audit.export": "Export Audit Logs",
    
    "backups.view": "View Backups",
    "backups.create": "Create Backups",
    "backups.restore": "Restore Backups",
    "backups.delete": "Delete Backups",
    "backups.download": "Download Backups",
    
    "schedules.view": "View Schedules",
    "schedules.create": "Create Schedules",
    "schedules.edit": "Edit Schedules",
    "schedules.delete": "Delete Schedules",
    
    "migrations.view": "View Migrations",
    "migrations.execute": "Execute Migrations",
    
    "snapshots.view": "View Snapshots",
    "snapshots.create": "Create Snapshots",
    "snapshots.restore": "Restore Snapshots",
    "snapshots.delete": "Delete Snapshots",
    
    "documentation.view": "View Documentation",
    "documentation.edit": "Edit Documentation",
    
    "performance.view": "View Performance Analysis",
    
    "teams.view": "View Teams",
    "teams.create": "Create Teams",
    "teams.manage": "Manage Team Members",
    
    "system.health": "View System Health",
    "system.pool": "View Connection Pool",
    
    "settings.view": "View Settings",
    "settings.edit": "Edit Profile",
    
    "admin.users": "Manage Users",
    "admin.roles": "Manage Roles",
    "admin.system": "System Administration",
}

PERMISSION_CATEGORIES = {
    "Dashboard": ["dashboard.view"],
    "Connections": ["connections.view", "connections.create", "connections.edit", "connections.delete", "connections.test"],
    "Schema": ["schema.view", "schema.diagram"],
    "Query": ["query.execute", "query.save"],
    "Monitoring": ["monitoring.view", "monitoring.configure"],
    "Audit Logs": ["audit.view", "audit.export"],
    "Backups": ["backups.view", "backups.create", "backups.restore", "backups.delete", "backups.download"],
    "Schedules": ["schedules.view", "schedules.create", "schedules.edit", "schedules.delete"],
    "Migrations": ["migrations.view", "migrations.execute"],
    "Snapshots": ["snapshots.view", "snapshots.create", "snapshots.restore", "snapshots.delete"],
    "Documentation": ["documentation.view", "documentation.edit"],
    "Performance": ["performance.view"],
    "Teams": ["teams.view", "teams.create", "teams.manage"],
    "System": ["system.health", "system.pool"],
    "Settings": ["settings.view", "settings.edit"],
    "Administration": ["admin.users", "admin.roles", "admin.system"],
}


class Role(Base):
    """Custom roles that can be assigned to users"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    is_system = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    color = Column(String(20), default="#3B82F6", nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    user_roles = relationship("UserRoleAssignment", back_populates="role", cascade="all, delete-orphan")
    
    def to_dict(self, include_permissions=False):
        result = {
            "id": self.id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "is_system": self.is_system,
            "is_active": self.is_active,
            "color": self.color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_permissions:
            try:
                result["permissions"] = [p.permission_key for p in self.permissions]
            except Exception:
                result["permissions"] = []
        return result


class RolePermission(Base):
    """Permissions assigned to a role"""
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_key', name='unique_role_permission'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_key = Column(String(100), nullable=False, index=True)
    
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    granted_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    role = relationship("Role", back_populates="permissions")


class UserRoleAssignment(Base):
    """Assigns roles to users"""
    __tablename__ = "user_role_assignments"
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', name='unique_user_role'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    
    scope_type = Column(String(50), nullable=True)
    scope_id = Column(Integer, nullable=True)
    
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", foreign_keys=[user_id], backref="role_assignments")
    role = relationship("Role", back_populates="user_roles")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role_id": self.role_id,
            "role_name": self.role.name if self.role else None,
            "role_display_name": self.role.display_name if self.role else None,
            "scope_type": self.scope_type,
            "scope_id": self.scope_id,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


DEFAULT_ROLES = {
    "super_admin": {
        "display_name": "Super Admin",
        "description": "Full access to all features including role management",
        "color": "#DC2626",  # Red - highest privilege
        "level": 100,
        "permissions": list(AVAILABLE_PERMISSIONS.keys())  # ALL permissions
    },
    "admin": {
        "display_name": "Administrator",
        "description": "Administrative access with user management (cannot manage Super Admin)",
        "color": "#F59E0B",  # Amber
        "level": 80,
        "permissions": [
            "dashboard.view",
            "connections.view", "connections.create", "connections.edit", "connections.delete", "connections.test",
            "schema.view", "schema.diagram",
            "query.execute", "query.save",
            "monitoring.view", "monitoring.configure",
            "audit.view", "audit.export",
            "backups.view", "backups.create", "backups.restore", "backups.delete", "backups.download",
            "schedules.view", "schedules.create", "schedules.edit", "schedules.delete",
            "migrations.view", "migrations.execute",
            "snapshots.view", "snapshots.create", "snapshots.restore", "snapshots.delete",
            "documentation.view", "documentation.edit",
            "performance.view",
            "teams.view", "teams.create", "teams.manage",
            "system.health", "system.pool",
            "settings.view", "settings.edit",
            "admin.users",
        ]
    },
    "developer": {
        "display_name": "Developer",
        "description": "Full access to database operations, no admin access",
        "color": "#3B82F6",  # Blue
        "level": 60,
        "permissions": [
            "dashboard.view",
            "connections.view", "connections.create", "connections.edit", "connections.test",
            "schema.view", "schema.diagram",
            "query.execute", "query.save",
            "monitoring.view",
            "audit.view",
            "backups.view", "backups.create",
            "schedules.view", "schedules.create",
            "migrations.view", "migrations.execute",
            "snapshots.view", "snapshots.create",
            "documentation.view", "documentation.edit",
            "performance.view",
            "teams.view",
            "system.health",
            "settings.view", "settings.edit",
        ]
    },
    "analyst": {
        "display_name": "Analyst",
        "description": "Read-only access with query execution capability",
        "color": "#8B5CF6",  # Purple
        "level": 40,
        "permissions": [
            "dashboard.view",
            "connections.view",
            "schema.view", "schema.diagram",
            "query.execute",
            "monitoring.view",
            "audit.view",
            "backups.view",
            "documentation.view",
            "performance.view",
            "settings.view",
        ]
    },
    "viewer": {
        "display_name": "Viewer",
        "description": "Read-only access to view data",
        "color": "#6B7280",  # Gray
        "level": 20,
        "permissions": [
            "dashboard.view",
            "connections.view",
            "schema.view",
            "monitoring.view",
            "audit.view",
            "documentation.view",
            "settings.view",
        ]
    },
}
