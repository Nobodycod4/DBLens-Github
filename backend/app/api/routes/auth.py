from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.session import Session
from app.models.organization import Organization, UserOrganization, OrgRole
from app.utils.security import (
    hash_password,
    verify_password,
    validate_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    decode_token_unsafe
)
from app.middleware.auth_middleware import get_current_user, get_current_admin_user
from app.utils.audit_logger import AuditLogger


HARDCODED_USERNAME = "Aathithyan"
HARDCODED_PASSWORD = "gowcod4"

router = APIRouter()



class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    created_at: str
    last_login_at: Optional[str]



@router.get("/setup-status")
async def check_setup_status(db: AsyncSession = Depends(get_db)):
    """
    Check if initial setup is required (no users exist).
    Returns whether setup is needed and if super admin exists.
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    has_users = len(users) > 0
    has_super_admin = any(u.role.value == "super_admin" for u in users) if has_users else False
    
    return {
        "setup_required": not has_users,
        "has_users": has_users,
        "has_super_admin": has_super_admin,
        "user_count": len(users)
    }



@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account (Signup).
    
    - New signups are Super Admin by default (they get their own workspace org).
    - Creates a default workspace org for the new user.
    """
    result = await db.execute(select(User))
    existing_users = result.scalars().all()
    is_first_user = len(existing_users) == 0

    is_valid, error_msg = validate_password(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )
    
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )
    
    user_role = UserRole.SUPER_ADMIN if hasattr(UserRole, 'SUPER_ADMIN') else UserRole.ADMIN

    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=user_role,
        is_verified=True,
        last_login_at=datetime.now(timezone.utc)
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)

    default_name = f"{user.username}'s Workspace"
    slug_base = default_name.lower().replace(" ", "-")[:80]
    slug = slug_base or f"user-{user.id}"
    org = Organization(name=default_name, slug=slug, description="Default workspace", created_by_id=user.id)
    db.add(org)
    await db.flush()
    db.add(UserOrganization(user_id=user.id, organization_id=org.id, role=OrgRole.OWNER))
    await db.commit()
    await db.refresh(user)
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    access_payload = decode_token_unsafe(access_token)
    refresh_payload = decode_token_unsafe(refresh_token)
    
    access_session = Session(
        user_id=user.id,
        jti=access_payload["jti"],
        token_type="access",
        expires_at=datetime.fromtimestamp(access_payload["exp"], tz=timezone.utc),
        user_agent=http_request.headers.get("user-agent"),
        ip_address=http_request.client.host if http_request.client else None
    )
    
    refresh_session = Session(
        user_id=user.id,
        jti=refresh_payload["jti"],
        token_type="refresh",
        expires_at=datetime.fromtimestamp(refresh_payload["exp"], tz=timezone.utc),
        user_agent=http_request.headers.get("user-agent"),
        ip_address=http_request.client.host if http_request.client else None
    )
    
    db.add(access_session)
    db.add(refresh_session)
    await db.commit()
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
    }
    
    await AuditLogger.log(
        db=db,
        action_type="REGISTER",
        resource_type="user",
        user_id=user.id,
        success=True,
        resource_id=str(user.id),
        resource_name=user.username,
        action_description=f"User '{user.username}' registered successfully"
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 3600,  # 1 hour in seconds
        "user": user_dict
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with username and password
    
    - Verifies credentials (including hardcoded Aathithyan/gowcod4)
    - Returns JWT access and refresh tokens
    - Creates session records
    """
    if request.username.strip() == HARDCODED_USERNAME and request.password == HARDCODED_PASSWORD:
        result = await db.execute(select(User).where(User.username == HARDCODED_USERNAME))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                username=HARDCODED_USERNAME,
                email="aathithyan@dblens.local",
                password_hash=hash_password(HARDCODED_PASSWORD),
                full_name="Aathithyan",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            org_result = await db.execute(select(Organization).limit(1))
            first_org = org_result.scalar_one_or_none()
            if first_org:
                existing = await db.execute(
                    select(UserOrganization).where(
                        UserOrganization.user_id == user.id,
                        UserOrganization.organization_id == first_org.id,
                    )
                )
                if not existing.scalar_one_or_none():
                    db.add(UserOrganization(user_id=user.id, organization_id=first_org.id, role=OrgRole.OWNER))
                    await db.commit()
    else:
        result = await db.execute(select(User).where(User.username == request.username))
        user = result.scalar_one_or_none()
        if not user or not verify_password(request.password, user.password_hash):
            await AuditLogger.log(
                db=db,
                action_type="LOGIN",
                resource_type="user",
                success=False,
                performed_by=request.username,
                action_description="Invalid credentials",
                error_message="Invalid username or password"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

    if not user.is_active:
        await AuditLogger.log(
            db=db,
            action_type="LOGIN",
            resource_type="user",
            user_id=user.id,
            success=False,
            resource_id=str(user.id),
            resource_name=user.username,
            action_description="Account is inactive",
            error_message="Account is inactive"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    access_payload = decode_token_unsafe(access_token)
    refresh_payload = decode_token_unsafe(refresh_token)
    
    access_session = Session(
        user_id=user.id,
        jti=access_payload["jti"],
        token_type="access",
        expires_at=datetime.fromtimestamp(access_payload["exp"], tz=timezone.utc),
        user_agent=http_request.headers.get("user-agent"),
        ip_address=http_request.client.host if http_request.client else None
    )
    
    refresh_session = Session(
        user_id=user.id,
        jti=refresh_payload["jti"],
        token_type="refresh",
        expires_at=datetime.fromtimestamp(refresh_payload["exp"], tz=timezone.utc),
        user_agent=http_request.headers.get("user-agent"),
        ip_address=http_request.client.host if http_request.client else None
    )
    
    db.add(access_session)
    db.add(refresh_session)
    await db.commit()
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
    }
    
    await AuditLogger.log(
        db=db,
        action_type="LOGIN",
        resource_type="user",
        user_id=user.id,
        success=True,
        resource_id=str(user.id),
        resource_name=user.username,
        action_description=f"User '{user.username}' logged in successfully"
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 3600,
        "user": user_dict
    }


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    http_request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Logout current user
    
    - Revokes current session
    - Invalidates JWT token
    """
    auth_header = http_request.headers.get("authorization") if http_request else None
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    jti = payload.get("jti")
    
    result = await db.execute(select(Session).where(Session.jti == jti))
    session = result.scalar_one_or_none()
    
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        await db.commit()
    
    await AuditLogger.log(
        db=db,
        action_type="LOGOUT",
        resource_type="user",
        user_id=current_user.id,
        success=True,
        resource_id=str(current_user.id),
        resource_name=current_user.username,
        action_description=f"User '{current_user.username}' logged out"
    )
    
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    - Validates refresh token
    - Issues new access token
    - Keeps same refresh token
    """
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    jti = payload.get("jti")
    
    result = await db.execute(
        select(Session).where(
            Session.jti == jti,
            Session.user_id == int(user_id),
            Session.token_type == "refresh"
        )
    )
    session = result.scalar_one_or_none()
    
    if not session or not session.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    access_payload = decode_token_unsafe(access_token)
    
    access_session = Session(
        user_id=user.id,
        jti=access_payload["jti"],
        token_type="access",
        expires_at=datetime.fromtimestamp(access_payload["exp"], tz=timezone.utc),
        user_agent=http_request.headers.get("user-agent"),
        ip_address=http_request.client.host if http_request.client else None
    )
    
    db.add(access_session)
    await db.commit()
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
    }
    
    return {
        "access_token": access_token,
        "refresh_token": request.refresh_token,  # Return same refresh token
        "token_type": "bearer",
        "expires_in": 3600,
        "user": user_dict
    }


@router.get("/me")
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user information including organizations.
    Optional header X-Org-Id sets the current org context.
    Hardcoded user Aathithyan sees all organizations and can switch into any.
    """
    if current_user.username == HARDCODED_USERNAME:
        result = await db.execute(select(Organization).order_by(Organization.id.asc()))
        all_orgs = result.scalars().all()
        organizations = [
            {"id": org.id, "name": org.name, "slug": org.slug, "description": org.description, "role": "owner"}
            for org in all_orgs
        ]
    else:
        result = await db.execute(
            select(UserOrganization, Organization)
            .join(Organization, UserOrganization.organization_id == Organization.id)
            .where(UserOrganization.user_id == current_user.id)
            .order_by(UserOrganization.joined_at.asc())
        )
        rows = result.all()
        organizations = [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "description": org.description,
                "role": uo.role.value,
            }
            for uo, org in rows
        ]
    current_org_id = request.headers.get("X-Org-Id")
    if current_org_id:
        try:
            oid = int(current_org_id)
            if not any(o["id"] == oid for o in organizations):
                current_org_id = None
        except ValueError:
            current_org_id = None
    if not current_org_id and organizations:
        current_org_id = str(organizations[0]["id"])
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "organizations": organizations,
        "current_org_id": int(current_org_id) if current_org_id else None,
    }


@router.get("/sessions")
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active sessions for current user
    """
    result = await db.execute(
        select(Session).where(
            Session.user_id == current_user.id,
            Session.revoked_at.is_(None)
        ).order_by(Session.created_at.desc())
    )
    sessions = result.scalars().all()
    
    return {
        "sessions": [
            {
                "id": s.id,
                "token_type": s.token_type,
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "created_at": s.created_at.isoformat(),
                "expires_at": s.expires_at.isoformat(),
                "is_expired": s.is_expired
            }
            for s in sessions
        ]
    }


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke a specific session
    """
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Session revoked successfully"}



class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    role: str = "user"  # user, viewer, admin (not super_admin)


@router.post("/admin/users", status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    request: AdminCreateUserRequest,
    http_request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user (Admin only)
    
    - Only admins and super admins can create users
    - Admins cannot create super_admin users
    - Super admins can create any role
    """
    is_valid, error_msg = validate_password(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )
    
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )
    
    raw_role = (request.role or "user").strip().lower() or "user"
    requested_role = raw_role
    
    role_map = {
        "user": UserRole.USER,
        "viewer": UserRole.VIEWER,
        "admin": UserRole.ADMIN,
        "super_admin": UserRole.SUPER_ADMIN if hasattr(UserRole, 'SUPER_ADMIN') else UserRole.ADMIN,
    }
    
    if requested_role not in role_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {list(role_map.keys())}"
        )
    
    if requested_role == "super_admin":
        if not hasattr(current_user.role, 'value') or current_user.role.value != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can create Super Admin users"
            )
    
    if requested_role == "admin":
        if not hasattr(current_user.role, 'value') or current_user.role.value not in ["super_admin", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins or Admins can create Admin users"
            )
    
    user_role = role_map[requested_role]
    
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=user_role,
        is_verified=True,
        is_active=True
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    org_id_header = http_request.headers.get("X-Org-Id") if http_request else None
    if org_id_header:
        try:
            org_id = int(org_id_header)
            membership_result = await db.execute(
                select(UserOrganization).where(
                    UserOrganization.user_id == current_user.id,
                    UserOrganization.organization_id == org_id,
                )
            )
            membership = membership_result.scalar_one_or_none()
            if membership and membership.role in (OrgRole.OWNER, OrgRole.ADMIN):
                db.add(UserOrganization(
                    user_id=user.id,
                    organization_id=org_id,
                    role=OrgRole.MEMBER,
                ))
                await db.commit()
        except ValueError:
            pass
    
    await AuditLogger.log(
        db=db,
        action_type="CREATE",
        resource_type="user",
        user_id=current_user.id,
        success=True,
        resource_id=str(user.id),
        resource_name=user.username,
        action_description=f"Admin created user '{user.username}'",
        ip_address=http_request.client.host if http_request and http_request.client else None,
        user_agent=http_request.headers.get("user-agent") if http_request else None,
    )
    
    return {
        "message": "User created successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }


@router.get("/users/search")
async def search_users(
    q: str = "",
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search users by username or email. Any authenticated user (e.g. connection owners
    when adding people to share with). Returns id, username, email.
    """
    if not q or len(q.strip()) < 2:
        return {"users": []}
    pattern = f"%{q.strip()}%"
    result = await db.execute(
        select(User)
        .where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))
        .where(User.is_active == True)
        .limit(limit)
    )
    users = result.scalars().all()
    return {
        "users": [{"id": u.id, "username": u.username, "email": u.email or ""} for u in users]
    }


@router.get("/admin/users")
async def admin_list_users(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users (Admin only)
    """
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None
            }
            for u in users
        ]
    }


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    http_request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user (Admin only)
    
    - Cannot delete yourself
    - Only super_admin can delete admin users
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role.value in ["super_admin", "admin"]:
        if current_user.role.value != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can delete Admin users"
            )
    
    deleted_username = user.username
    await db.delete(user)
    await db.commit()
    
    await AuditLogger.log(
        db=db,
        action_type="DELETE",
        resource_type="user",
        user_id=current_user.id,
        success=True,
        resource_id=str(user_id),
        resource_name=deleted_username,
        action_description=f"Admin deleted user '{deleted_username}'",
        ip_address=http_request.client.host if http_request and http_request.client else None,
        user_agent=http_request.headers.get("user-agent") if http_request else None,
    )
    
    return {"message": f"User {deleted_username} deleted successfully"}



class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile
    """
    if request.full_name is not None:
        current_user.full_name = request.full_name
    
    if request.email is not None and request.email != current_user.email:
        result = await db.execute(select(User).where(User.email == request.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use"
            )
        current_user.email = request.email
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role.value
        }
    }


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change current user's password
    """
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    is_valid, error_msg = validate_password(request.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    if verify_password(request.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    current_user.password_hash = hash_password(request.new_password)
    await db.commit()
    
    await AuditLogger.log(
        db=db,
        action_type="PASSWORD_CHANGE",
        resource_type="user",
        user_id=current_user.id,
        success=True,
        resource_id=str(current_user.id),
        resource_name=current_user.username,
        action_description=f"User '{current_user.username}' changed their password"
    )
    
    return {"message": "Password changed successfully"}


@router.get("/activity")
async def get_my_activity(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's recent activity from audit logs
    """
    from app.models.audit_log import AuditLog
    
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == str(current_user.id))
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    
    return {
        "activities": [
            {
                "id": log.id,
                "action_type": log.action_type,
                "resource_type": log.resource_type,
                "resource_name": log.resource_name,
                "action_description": log.action_description,
                "success": log.success,
                "ip_address": log.ip_address,
                "created_at": log.timestamp.isoformat() if log.timestamp else None
            }
            for log in logs
        ]
    }


@router.delete("/sessions/all")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    http_request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke all sessions except the current one
    """
    current_jti = None
    if http_request:
        auth_header = http_request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            current_jti = payload.get("jti")
    
    result = await db.execute(
        select(Session).where(
            Session.user_id == current_user.id,
            Session.revoked_at.is_(None)
        )
    )
    sessions = result.scalars().all()
    
    revoked_count = 0
    for session in sessions:
        if session.jti != current_jti:
            session.revoked_at = datetime.now(timezone.utc)
            revoked_count += 1
    
    await db.commit()
    
    return {"message": f"Revoked {revoked_count} sessions"}


@router.patch("/admin/users/{user_id}")
async def admin_update_user(
    user_id: int,
    http_request: Request,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user (Admin only)
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    changes = {}
    
    if role is not None:
        role = (role if isinstance(role, str) else str(role)).strip().lower() or None
    if role:
        if role == "super_admin" and current_user.role.value != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can assign Super Admin role"
            )
        
        role_map = {
            "user": UserRole.USER,
            "viewer": UserRole.VIEWER,
            "admin": UserRole.ADMIN,
            "super_admin": UserRole.SUPER_ADMIN if hasattr(UserRole, 'SUPER_ADMIN') else UserRole.ADMIN,
        }
        if role in role_map:
            old_role = user.role.value
            user.role = role_map[role]
            if old_role != role:
                changes["role"] = {"old": old_role, "new": role}
    
    if full_name is not None and full_name != user.full_name:
        changes["full_name"] = {"old": user.full_name, "new": full_name}
        user.full_name = full_name
    
    if is_active is not None:
        if user.role.value == "super_admin" and not is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot deactivate Super Admin"
            )
        if user.is_active != is_active:
            changes["is_active"] = {"old": user.is_active, "new": is_active}
        user.is_active = is_active
    
    await db.commit()
    await db.refresh(user)
    
    action_desc = f"Admin updated user '{user.username}'"
    if changes:
        action_desc += ": " + ", ".join(changes.keys())
    
    await AuditLogger.log(
        db=db,
        action_type="UPDATE",
        resource_type="user",
        user_id=current_user.id,
        success=True,
        resource_id=str(user.id),
        resource_name=user.username,
        action_description=action_desc,
        changes_made=changes if changes else None,
        ip_address=http_request.client.host if http_request and http_request.client else None,
        user_agent=http_request.headers.get("user-agent") if http_request else None,
    )
    
    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active
        }
    }