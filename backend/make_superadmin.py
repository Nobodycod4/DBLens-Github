"""
One-off script: Ensure user Aathi with password gowcod4 exists as super_admin with all permissions.
Run from backend: python make_superadmin.py
"""
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.rbac import (
    Role,
    RolePermission,
    UserRoleAssignment,
    DEFAULT_ROLES,
    AVAILABLE_PERMISSIONS,
)
from app.utils.security import hash_password
from app.models.user import UserRole


async def ensure_default_roles(db):
    """Create default roles (including super_admin) if they don't exist."""
    for role_name, role_data in DEFAULT_ROLES.items():
        r = await db.execute(select(Role).where(Role.name == role_name))
        if r.scalar_one_or_none():
            continue
        role = Role(
            name=role_name,
            display_name=role_data["display_name"],
            description=role_data.get("description"),
            color=role_data.get("color", "#3B82F6"),
            is_system=True,
        )
        db.add(role)
        await db.flush()
        for perm_key in role_data.get("permissions", list(AVAILABLE_PERMISSIONS.keys())):
            db.add(RolePermission(role_id=role.id, permission_key=perm_key))
        print(f"  Created role: {role_name}")


async def main():
    async with AsyncSessionLocal() as db:
        await ensure_default_roles(db)
        await db.commit()

        result = await db.execute(select(User).where(User.username == "Aathi"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                username="Aathi",
                email="aathi@dblens.local",
                password_hash=hash_password("gowcod4"),
                full_name="Aathi",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()
            print("Created user: Aathi (password: gowcod4)")
        else:
            user.password_hash = hash_password("gowcod4")
            user.role = UserRole.SUPER_ADMIN
            user.is_active = True
            user.is_verified = True
            print("Updated user Aathi: password gowcod4, role super_admin")

        await db.commit()
        await db.refresh(user)

        r = await db.execute(select(Role).where(Role.name == "super_admin"))
        super_role = r.scalar_one_or_none()
        if super_role:
            existing = await db.execute(
                select(UserRoleAssignment).where(
                    UserRoleAssignment.user_id == user.id,
                    UserRoleAssignment.role_id == super_role.id,
                )
            )
            if not existing.scalar_one_or_none():
                db.add(
                    UserRoleAssignment(
                        user_id=user.id,
                        role_id=super_role.id,
                        assigned_by_id=user.id,
                    )
                )
                await db.commit()
                print("Assigned RBAC role 'Super Admin' (all permissions) to Aathi.")
        else:
            print("Note: RBAC role super_admin not found; user has legacy SUPER_ADMIN role only.")

    print("Done. Log in with username: Aathi, password: gowcod4")


if __name__ == "__main__":
    asyncio.run(main())
