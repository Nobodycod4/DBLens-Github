"""
Organization API: list, create, get, update, list members.
Scoped to current user's memberships.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.database import get_db
from app.models.user import User
from app.models.organization import Organization, UserOrganization, OrgRole
from app.middleware.auth_middleware import get_current_user

router = APIRouter()



class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)


def _slugify(name: str) -> str:
    s = name.lower().strip()
    s = "".join(c if c.isalnum() or c in " -" else "" for c in s)
    return "-".join(s.split()).replace("--", "-")[:100]


async def _get_membership(db: AsyncSession, user_id: int, org_id: int) -> Optional[UserOrganization]:
    result = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
        )
    )
    return result.scalar_one_or_none()


async def _require_org_member(db: AsyncSession, user: User, org_id: int) -> UserOrganization:
    m = await _get_membership(db, user.id, org_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return m


async def _require_org_admin(db: AsyncSession, user: User, org_id: int) -> UserOrganization:
    m = await _require_org_member(db, user, org_id)
    if m.role not in (OrgRole.OWNER, OrgRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or owner access required")
    return m



HARDCODED_USERNAME = "Aathithyan"


@router.get("/")
async def list_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List organizations the current user belongs to. Aathithyan sees all orgs."""
    if current_user.username == HARDCODED_USERNAME:
        result = await db.execute(select(Organization).order_by(Organization.id.asc()))
        orgs = result.scalars().all()
        return [
            {
                "id": o.id,
                "name": o.name,
                "slug": o.slug,
                "description": o.description,
                "role": "owner",
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orgs
        ]
    result = await db.execute(
        select(UserOrganization, Organization)
        .join(Organization, UserOrganization.organization_id == Organization.id)
        .where(UserOrganization.user_id == current_user.id)
    )
    rows = result.all()
    return [
        {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "role": uo.role.value,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        }
        for uo, org in rows
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization; current user becomes owner."""
    slug = (data.slug or _slugify(data.name)).strip() or _slugify(data.name)
    existing = await db.execute(select(Organization).where(Organization.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already taken")
    org = Organization(
        name=data.name,
        slug=slug,
        description=data.description,
        created_by_id=current_user.id,
    )
    db.add(org)
    await db.flush()
    db.add(UserOrganization(user_id=current_user.id, organization_id=org.id, role=OrgRole.OWNER))
    await db.commit()
    await db.refresh(org)
    return org.to_dict()


@router.get("/{org_id}")
async def get_organization(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get organization by id (must be a member)."""
    await _require_org_member(db, current_user, org_id)
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org.to_dict()


@router.put("/{org_id}")
async def update_organization(
    org_id: int,
    data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update organization (admin or owner only)."""
    await _require_org_admin(db, current_user, org_id)
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if data.name is not None:
        org.name = data.name
    if data.description is not None:
        org.description = data.description
    await db.commit()
    await db.refresh(org)
    return org.to_dict()


@router.get("/{org_id}/members")
async def list_members(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List members of the organization (must be a member)."""
    await _require_org_member(db, current_user, org_id)
    result = await db.execute(
        select(UserOrganization, User)
        .join(User, UserOrganization.user_id == User.id)
        .where(UserOrganization.organization_id == org_id)
    )
    rows = result.all()
    return [
        {
            "id": uo.id,
            "user_id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": uo.role.value,
            "joined_at": uo.joined_at.isoformat() if uo.joined_at else None,
        }
        for uo, u in rows
    ]
