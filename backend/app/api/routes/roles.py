"""
Role-Based Access Control (RBAC) API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple
from pydantic import BaseModel

from app.core.database import get_db
from app.models.rbac import (
    Role, RolePermission, UserRoleAssignment,
    AVAILABLE_PERMISSIONS, PERMISSION_CATEGORIES, DEFAULT_ROLES,
    ROLE_HIERARCHY, get_role_level, can_manage_role,
)
from app.models.user import User
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


def _safe_role_value(role) -> str:
    """Get role string from enum or raw value; avoid AttributeError."""
    if role is None:
        return "user"
    if hasattr(role, "value"):
        return getattr(role, "value", "user") or "user"
    return str(role) if role else "user"


class RoleCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    color: str = "#3B82F6"
    permissions: List[str] = []


class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class PermissionUpdate(BaseModel):
    permissions: List[str]


class UserRoleAssign(BaseModel):
    user_id: int
    role_id: int
    scope_type: Optional[str] = None
    scope_id: Optional[int] = None


async def get_user_highest_role(user: User, db: AsyncSession) -> Tuple[str, int]:
    """Get the user's highest role name and level"""
    result = await db.execute(
        select(UserRoleAssignment)
        .options(selectinload(UserRoleAssignment.role))
        .where(UserRoleAssignment.user_id == user.id)
    )
    assignments = result.scalars().all()
    
    highest_role = "guest"
    highest_level = 0
    
    for assignment in assignments:
        if assignment.role and assignment.role.is_active:
            role_level = get_role_level(assignment.role.name)
            if role_level > highest_level:
                highest_level = role_level
                highest_role = assignment.role.name
    
    if user.role:
        legacy_role = user.role.value.lower() if user.role.value else ""
        legacy_level = get_role_level(legacy_role)
        if legacy_level > highest_level:
            highest_level = legacy_level
            highest_role = legacy_role
    
    return highest_role, highest_level


async def require_admin(current_user: User, db: AsyncSession) -> str:
    """Require admin or super_admin role. Returns the user's highest role name."""
    highest_role, highest_level = await get_user_highest_role(current_user, db)
    
    if highest_level >= 80:
        return highest_role
    
    result = await db.execute(
        select(UserRoleAssignment)
        .options(selectinload(UserRoleAssignment.role).selectinload(Role.permissions))
        .where(UserRoleAssignment.user_id == current_user.id)
    )
    assignments = result.scalars().all()
    
    for assignment in assignments:
        if assignment.role:
            for perm in assignment.role.permissions:
                if perm.permission_key in ["admin.users", "admin.roles", "admin.system"]:
                    return highest_role
    
    raise HTTPException(status_code=403, detail="Admin access required")


async def require_super_admin(current_user: User, db: AsyncSession) -> str:
    """Require super_admin role for sensitive operations."""
    highest_role, highest_level = await get_user_highest_role(current_user, db)
    
    if highest_level >= 100 or highest_role.lower() == "super_admin":
        return highest_role
    
    result = await db.execute(
        select(UserRoleAssignment)
        .options(selectinload(UserRoleAssignment.role).selectinload(Role.permissions))
        .where(UserRoleAssignment.user_id == current_user.id)
    )
    assignments = result.scalars().all()
    
    for assignment in assignments:
        if assignment.role:
            for perm in assignment.role.permissions:
                if perm.permission_key == "admin.roles":
                    return highest_role
    
    raise HTTPException(status_code=403, detail="Super Admin access required for this operation")


@router.get("/permissions")
async def get_available_permissions(current_user: User = Depends(get_current_user)):
    return {"permissions": AVAILABLE_PERMISSIONS, "categories": PERMISSION_CATEGORIES}


@router.get("/hierarchy")
async def get_role_hierarchy(current_user: User = Depends(get_current_user)):
    """Get the role hierarchy levels"""
    return {
        "hierarchy": ROLE_HIERARCHY,
        "roles": [
            {"name": name, "level": level, **DEFAULT_ROLES.get(name, {})}
            for name, level in sorted(ROLE_HIERARCHY.items(), key=lambda x: -x[1])
        ]
    }


@router.get("/my-permissions")
async def get_my_permissions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current user's permissions - must be before /{role_id} to avoid route conflict"""
    result = await db.execute(
        select(UserRoleAssignment)
        .options(selectinload(UserRoleAssignment.role).selectinload(Role.permissions))
        .where(UserRoleAssignment.user_id == current_user.id)
    )
    assignments = result.scalars().all()
    
    permissions = set()
    roles = []
    highest_role = "guest"
    highest_level = 0
    
    for assignment in assignments:
        if assignment.role and assignment.role.is_active:
            role_level = get_role_level(assignment.role.name)
            roles.append({
                "id": assignment.role.id,
                "name": assignment.role.name,
                "display_name": assignment.role.display_name,
                "color": assignment.role.color,
                "level": role_level
            })
            for perm in assignment.role.permissions:
                permissions.add(perm.permission_key)
            
            if role_level > highest_level:
                highest_level = role_level
                highest_role = assignment.role.name
    
    if current_user.role is not None:
        raw = getattr(current_user.role, "value", None) or getattr(current_user.role, "name", None) or str(current_user.role)
        legacy_role = (raw or "").lower()
        if legacy_role == "superadmin":
            legacy_role = "super_admin"
        legacy_level = get_role_level(legacy_role)
        if legacy_level > highest_level:
            highest_level = legacy_level
            highest_role = legacy_role
        if legacy_role == "admin":
            for perm in DEFAULT_ROLES.get("admin", {}).get("permissions", []):
                permissions.add(perm)
        elif legacy_role == "super_admin":
            for perm in AVAILABLE_PERMISSIONS.keys():
                permissions.add(perm)
            highest_level = 100
            highest_role = "super_admin"
        elif legacy_role == "user":
            for perm in DEFAULT_ROLES.get("developer", {}).get("permissions", []):
                permissions.add(perm)
        elif legacy_role == "viewer":
            for perm in DEFAULT_ROLES.get("viewer", {}).get("permissions", []):
                permissions.add(perm)
        elif legacy_role == "analyst":
            for perm in DEFAULT_ROLES.get("analyst", {}).get("permissions", []):
                permissions.add(perm)
        elif legacy_role == "guest":
            for perm in DEFAULT_ROLES.get("guest", {}).get("permissions", []):
                permissions.add(perm)
    
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "roles": roles,
        "permissions": list(permissions),
        "highest_role": highest_role,
        "highest_level": highest_level,
        "is_super_admin": highest_role == "super_admin" or highest_level >= 100,
        "is_admin": highest_level >= 80,
        "can_manage_roles": "admin.roles" in permissions or highest_level >= 100
    }


@router.get("/")
async def list_roles(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).order_by(Role.is_system.desc(), Role.name)
    )
    roles = result.scalars().all()
    return [r.to_dict(include_permissions=True) for r in roles]


@router.post("/")
async def create_role(data: RoleCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_super_admin(current_user, db)
    
    existing = await db.execute(select(Role).where(Role.name == data.name.lower().replace(" ", "_")))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role name already exists")
    
    admin_only_perms = ["admin.roles", "admin.system"]
    has_admin_perms = [p for p in data.permissions if p in admin_only_perms]
    if has_admin_perms:
        highest_role, _ = await get_user_highest_role(current_user, db)
        if highest_role != "super_admin":
            raise HTTPException(
                status_code=403, 
                detail=f"Only Super Admin can grant these permissions: {has_admin_perms}"
            )
    
    invalid_perms = [p for p in data.permissions if p not in AVAILABLE_PERMISSIONS]
    if invalid_perms:
        raise HTTPException(status_code=400, detail=f"Invalid permissions: {invalid_perms}")
    
    role = Role(
        name=data.name.lower().replace(" ", "_"),
        display_name=data.display_name,
        description=data.description,
        color=data.color,
        is_system=False,
        created_by_id=current_user.id
    )
    db.add(role)
    await db.flush()
    
    for perm_key in data.permissions:
        perm = RolePermission(role_id=role.id, permission_key=perm_key, granted_by_id=current_user.id)
        db.add(perm)
    
    await db.commit()
    await db.refresh(role)
    return {"message": "Role created", "role": role.to_dict()}


@router.get("/user-list")
async def list_users_with_roles(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List all users with their role assignments. Non-admins get only their own user."""
    try:
        await require_admin(current_user, db)
    except HTTPException:
        try:
            role_str = _safe_role_value(current_user.role)
            return [{
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "full_name": current_user.full_name,
                "is_active": current_user.is_active,
                "role": role_str,
                "legacy_role": role_str,
                "roles": [],
                "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            }]
        except Exception as e:
            print(f"Error serializing current user for /roles/user-list: {e}")
            raise HTTPException(status_code=500, detail="Failed to load user data")

    try:
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        users = result.scalars().all()
        user_data = []
        for user in users:
            try:
                roles_result = await db.execute(
                    select(UserRoleAssignment)
                    .options(selectinload(UserRoleAssignment.role))
                    .where(UserRoleAssignment.user_id == user.id)
                )
                assignments = roles_result.scalars().all()
                roles_list = [
                    {"id": a.role.id, "name": a.role.name, "display_name": a.role.display_name, "color": a.role.color}
                    for a in assignments if a.role
                ]
            except Exception:
                roles_list = []
            role_str = _safe_role_value(user.role)
            user_data.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "role": role_str,
                "legacy_role": role_str,
                "roles": roles_list,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            })
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{role_id}")
async def get_role(role_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role.to_dict(include_permissions=True)


@router.put("/{role_id}")
async def update_role(role_id: int, data: RoleUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_role = await require_super_admin(current_user, db)
    
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.name == "super_admin" and user_role != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin role")
    
    if not can_manage_role(user_role, role.name):
        raise HTTPException(status_code=403, detail=f"Cannot modify {role.display_name} role - insufficient privileges")
    
    if data.display_name is not None:
        role.display_name = data.display_name
    if data.description is not None:
        role.description = data.description
    if data.color is not None:
        role.color = data.color
    if data.is_active is not None:
        if role.name == "super_admin" and data.is_active == False:
            raise HTTPException(status_code=403, detail="Cannot deactivate Super Admin role")
        role.is_active = data.is_active
    
    await db.commit()
    return {"message": "Role updated"}


@router.put("/{role_id}/permissions")
async def update_role_permissions(role_id: int, data: PermissionUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_role = await require_super_admin(current_user, db)
    
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.name == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin permissions")
    
    if not can_manage_role(user_role, role.name):
        raise HTTPException(status_code=403, detail=f"Cannot modify {role.display_name} permissions - insufficient privileges")
    
    admin_only_perms = ["admin.roles", "admin.system"]
    has_admin_perms = [p for p in data.permissions if p in admin_only_perms]
    if has_admin_perms and user_role != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail=f"Only Super Admin can grant these permissions: {has_admin_perms}"
        )
    
    invalid_perms = [p for p in data.permissions if p not in AVAILABLE_PERMISSIONS]
    if invalid_perms:
        raise HTTPException(status_code=400, detail=f"Invalid permissions: {invalid_perms}")
    
    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    
    for perm_key in data.permissions:
        perm = RolePermission(role_id=role_id, permission_key=perm_key, granted_by_id=current_user.id)
        db.add(perm)
    
    await db.commit()
    return {"message": "Permissions updated", "permissions": data.permissions}


@router.delete("/{role_id}")
async def delete_role(role_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_role = await require_super_admin(current_user, db)
    
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system role")
    
    if role.name == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete Super Admin role")
    
    if not can_manage_role(user_role, role.name):
        raise HTTPException(status_code=403, detail=f"Cannot delete {role.display_name} role - insufficient privileges")
    
    await db.delete(role)
    await db.commit()
    return {"message": "Role deleted"}


@router.get("/users/{user_id}/roles")
async def get_user_roles(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user_id != current_user.id:
        await require_admin(current_user, db)
    
    result = await db.execute(
        select(UserRoleAssignment).options(selectinload(UserRoleAssignment.role)).where(UserRoleAssignment.user_id == user_id)
    )
    assignments = result.scalars().all()
    return [a.to_dict() for a in assignments]


@router.post("/assign")
async def assign_role(data: UserRoleAssign, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_role = await require_admin(current_user, db)
    
    user_result = await db.execute(select(User).where(User.id == data.user_id))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role_result = await db.execute(select(Role).where(Role.id == data.role_id))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if not can_manage_role(user_role, role.name):
        raise HTTPException(
            status_code=403, 
            detail=f"Cannot assign {role.display_name} role - you can only assign roles lower than your own"
        )
    
    if role.name == "super_admin" and user_role != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can assign Super Admin role")
    
    existing = await db.execute(
        select(UserRoleAssignment).where(
            UserRoleAssignment.user_id == data.user_id,
            UserRoleAssignment.role_id == data.role_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role already assigned")
    
    assignment = UserRoleAssignment(
        user_id=data.user_id, role_id=data.role_id,
        scope_type=data.scope_type, scope_id=data.scope_id,
        assigned_by_id=current_user.id
    )
    db.add(assignment)
    await db.commit()
    return {"message": "Role assigned"}


@router.delete("/assignments/{assignment_id}")
async def remove_role_assignment(assignment_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_admin(current_user, db)
    result = await db.execute(delete(UserRoleAssignment).where(UserRoleAssignment.id == assignment_id))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Role assignment removed"}


@router.post("/init-defaults")
async def initialize_default_roles(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_admin(current_user, db)
    
    created = []
    for role_name, role_data in DEFAULT_ROLES.items():
        existing = await db.execute(select(Role).where(Role.name == role_name))
        if existing.scalar_one_or_none():
            continue
        
        role = Role(
            name=role_name,
            display_name=role_data["display_name"],
            description=role_data["description"],
            color=role_data["color"],
            is_system=True,
            created_by_id=current_user.id
        )
        db.add(role)
        await db.flush()
        
        for perm_key in role_data["permissions"]:
            perm = RolePermission(role_id=role.id, permission_key=perm_key, granted_by_id=current_user.id)
            db.add(perm)
        
        created.append(role_name)
    
    await db.commit()
    return {"message": f"Created {len(created)} default roles", "created": created}
