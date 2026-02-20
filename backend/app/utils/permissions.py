"""
Permission checking utilities for RBAC
"""
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.models.rbac import Role, RolePermission, UserRoleAssignment, DEFAULT_ROLES
from app.models.user import User
from app.middleware.auth_middleware import get_current_user


async def get_user_permissions(user: User, db: AsyncSession) -> set:
    """Get all permissions for a user from their assigned roles"""
    result = await db.execute(
        select(UserRoleAssignment)
        .options(selectinload(UserRoleAssignment.role).selectinload(Role.permissions))
        .where(UserRoleAssignment.user_id == user.id)
    )
    assignments = result.scalars().all()
    
    permissions = set()
    
    for assignment in assignments:
        if assignment.role and assignment.role.is_active:
            for perm in assignment.role.permissions:
                permissions.add(perm.permission_key)
    
    if user.role:
        legacy_role = user.role.value
        if legacy_role in DEFAULT_ROLES:
            for perm in DEFAULT_ROLES[legacy_role].get("permissions", []):
                permissions.add(perm)
        if legacy_role == "admin":
            for perm in DEFAULT_ROLES.get("admin", {}).get("permissions", []):
                permissions.add(perm)
    
    return permissions


async def check_permission(user: User, db: AsyncSession, required_permission: str) -> bool:
    """Check if user has a specific permission"""
    permissions = await get_user_permissions(user, db)
    return required_permission in permissions


class PermissionChecker:
    """Dependency class for checking permissions in route handlers"""
    
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        has_permission = await check_permission(current_user, db, self.required_permission)
        
        if not has_permission:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Required: {self.required_permission}"
            )
        
        return True
