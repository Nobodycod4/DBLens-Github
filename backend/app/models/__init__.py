"""
Models package - Import all models here to ensure proper relationship resolution

Import order matters! Base classes and independent models first, then models with relationships.
"""

from app.models.base import Base

from app.models.user import User, UserRole
from app.models.session import Session
from app.models.api_key import APIKey
from app.models.database_connection import DatabaseConnection, DatabaseType

from app.models.audit_log import AuditLog
from app.models.backup import Backup
from app.models.backup_schedule import BackupSchedule
from app.models.health_metric import HealthMetric
from app.models.health_monitor import HealthMonitor
from app.models.migration import Migration, MigrationTemplate, MigrationSchedule, MigrationStatus, MigrationType
from app.models.snapshot import Snapshot

from app.models.rbac import (
    Role,
    RolePermission,
    UserRoleAssignment,
    AVAILABLE_PERMISSIONS,
    PERMISSION_CATEGORIES,
    DEFAULT_ROLES,
)

from app.models.organization import Organization, UserOrganization, OrgRole

from app.models.app_setting import AppSetting

from app.models.connection_access import ConnectionAccess

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Session",
    "APIKey",
    "DatabaseConnection",
    "DatabaseType",
    "AuditLog",
    "Backup",
    "BackupSchedule",
    "HealthMetric",
    "HealthMonitor",
    "Migration",
    "MigrationTemplate",
    "MigrationSchedule",
    "MigrationStatus",
    "MigrationType",
    "Snapshot",
    "Role",
    "RolePermission",
    "UserRoleAssignment",
    "AVAILABLE_PERMISSIONS",
    "PERMISSION_CATEGORIES",
    "DEFAULT_ROLES",
    "Organization",
    "UserOrganization",
    "OrgRole",
    "AppSetting",
    "ConnectionAccess",
]