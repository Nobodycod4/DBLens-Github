"""
Org-scoping: require X-Org-Id and restrict data to the current organization.
Prevents cross-org data leak (dashboard, connections, audit logs, backups, schedules).
"""
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.organization import UserOrganization, Organization
from app.models.database_connection import DatabaseConnection
from app.middleware.auth_middleware import get_current_user


HARDCODED_USERNAME = "Aathithyan"


async def get_current_org_id(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> int:
    """
    Return current org id from X-Org-Id header. Validates that the user is a member
    of that org (or is the hardcoded super user who can access any org).
    If header is missing, falls back to user's first org. Raises 403 if not a member.
    """
    org_id_header = request.headers.get("X-Org-Id")
    if org_id_header and org_id_header.strip():
        try:
            org_id = int(org_id_header.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="X-Org-Id must be a number",
            )
        if org_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid organization",
            )
    else:
        if current_user.username == HARDCODED_USERNAME:
            result = await db.execute(select(Organization.id).order_by(Organization.id.asc()).limit(1))
            row = result.first()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No organization context. Set X-Org-Id or create an organization.",
                )
            org_id = row[0]
        else:
            result = await db.execute(
                select(UserOrganization.organization_id)
                .where(UserOrganization.user_id == current_user.id)
                .order_by(UserOrganization.joined_at.asc())
                .limit(1)
            )
            row = result.first()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No organization context. Set X-Org-Id or join an organization.",
                )
            org_id = row[0]
    if current_user.username == HARDCODED_USERNAME:
        return org_id
    result = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == current_user.id,
            UserOrganization.organization_id == org_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )
    return org_id


async def get_user_ids_for_org(db: AsyncSession, org_id: int) -> set[int]:
    """Return set of user ids that are members of the given org."""
    result = await db.execute(
        select(UserOrganization.user_id).where(
            UserOrganization.organization_id == org_id
        )
    )
    return {row[0] for row in result.all()}


async def get_connection_ids_for_org(
    db: AsyncSession,
    org_id: int,
) -> set[int]:
    """
    Return set of database_connection ids that belong to the given org.
    A connection belongs to an org if its owner (user_id) is a member of that org.
    """
    user_ids = await get_user_ids_for_org(db, org_id)
    if not user_ids:
        return set()
    result = await db.execute(
        select(DatabaseConnection.id).where(
            DatabaseConnection.user_id.in_(user_ids)
        )
    )
    return {row[0] for row in result.all()}


async def require_connection_in_org(
    db: AsyncSession,
    connection_id: int,
    org_id: int,
) -> None:
    """Raise 404 if the connection does not belong to the given org."""
    conn_ids = await get_connection_ids_for_org(db, org_id)
    if connection_id not in conn_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found",
        )
