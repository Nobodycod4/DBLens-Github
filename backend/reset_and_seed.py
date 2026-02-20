"""
Reset all user/org data and seed a single user with org.
- Deletes all users, organizations, connections, backups, migrations, etc.
- Creates default RBAC roles.
- Creates user: Aathithyan / gowcod4 (Super Admin)
- Creates org: Chennai (slug chennai), user as owner.
- Assigns RBAC super_admin role to the user.

Run from backend: python reset_and_seed.py
"""
import asyncio
from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.organization import Organization, UserOrganization, OrgRole
from app.models.rbac import (
    Role,
    RolePermission,
    UserRoleAssignment,
    DEFAULT_ROLES,
    AVAILABLE_PERMISSIONS,
)
from app.utils.security import hash_password


DELETE_TABLES_ORDER = [
    "migration_schedules",  # refs migration_templates
    "migrations",           # refs templates, schedules, database_connections
    "snapshots",            # refs database_connections, migrations
    "migration_templates",  # refs database_connections
    "backup_schedules",     # refs database_connections
    "backups",              # refs database_connections
    "health_metrics",       # refs database_connections
    "audit_logs",           # refs database_connections (optional)
    "database_connections", # refs users
    "user_role_assignments",# refs users, roles
    "role_permissions",     # refs roles
    "user_organizations",   # refs users, organizations
    "organizations",        # refs users (created_by_id)
    "roles",                # refs users (created_by_id)
    "sessions",             # refs users
    "api_keys",             # refs users
    "users",
]


async def wipe_all_data(session):
    """Delete all rows from user/org-related tables in safe order."""
    for table in DELETE_TABLES_ORDER:
        try:
            await session.execute(text(f"DELETE FROM {table}"))
            print(f"  Cleared: {table}")
        except Exception as e:
            print(f"  Skip {table}: {e}")
    await session.commit()


async def ensure_default_roles(session):
    """Create default RBAC roles (super_admin, admin, developer, etc.) with permissions."""
    for role_name, role_data in DEFAULT_ROLES.items():
        role = Role(
            name=role_name,
            display_name=role_data["display_name"],
            description=role_data.get("description"),
            color=role_data.get("color", "#3B82F6"),
            is_system=True,
        )
        session.add(role)
        await session.flush()
        perms = role_data.get("permissions")
        if perms is None:
            perms = list(AVAILABLE_PERMISSIONS.keys())
        for perm_key in perms:
            session.add(RolePermission(role_id=role.id, permission_key=perm_key))
        print(f"  Created role: {role_name}")
    await session.commit()


async def main():
    print("Resetting all user and org data...")
    async with AsyncSessionLocal() as session:
        await wipe_all_data(session)

    print("Creating default RBAC roles...")
    async with AsyncSessionLocal() as session:
        await ensure_default_roles(session)

    print("Seeding user Aathithyan and org Chennai...")
    async with AsyncSessionLocal() as session:
        user = User(
            username="Aathithyan",
            email="aathithyan@dblens.local",
            password_hash=hash_password("gowcod4"),
            full_name="Aathithyan",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.flush()
        print("  Created user: Aathithyan (password: gowcod4)")

        org = Organization(
            name="Chennai",
            slug="chennai",
            description="Chennai organization",
            created_by_id=user.id,
        )
        session.add(org)
        await session.flush()
        print("  Created org: Chennai (slug: chennai)")

        session.add(UserOrganization(user_id=user.id, organization_id=org.id, role=OrgRole.OWNER))
        print("  Added Aathithyan as owner of Chennai")

        r = await session.execute(select(Role).where(Role.name == "super_admin"))
        super_role = r.scalar_one_or_none()
        if super_role:
            session.add(
                UserRoleAssignment(
                    user_id=user.id,
                    role_id=super_role.id,
                    assigned_by_id=user.id,
                )
            )
            print("  Assigned RBAC role 'Super Admin' (all permissions) to Aathithyan")

        await session.commit()

    print("")
    print("Done. You can log in with:")
    print("  Username: Aathithyan")
    print("  Password: gowcod4")
    print("  Org: Chennai (selected by default)")


if __name__ == "__main__":
    asyncio.run(main())
