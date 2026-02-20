"""Ensure every user has at least one organization (default workspace)."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.organization import Organization, UserOrganization, OrgRole


def _slugify(name: str) -> str:
    """Simple slug: lowercase, replace spaces with dashes, alphanumeric + dashes only."""
    s = name.lower().strip()
    s = "".join(c if c.isalnum() or c in " -" else "" for c in s)
    return "-".join(s.split()).replace("--", "-")[:100]


async def ensure_default_organizations(session: AsyncSession) -> int:
    """
    For every user that has no organization membership, create a default org
    and add them as owner. Returns number of default orgs created.
    """
    result = await session.execute(select(User))
    users = result.scalars().all()
    created = 0
    existing_slugs = set()

    for user in users:
        membership_result = await session.execute(
            select(UserOrganization).where(UserOrganization.user_id == user.id)
        )
        if membership_result.scalars().first() is not None:
            continue

        base_name = f"{user.username}'s Workspace"
        slug = _slugify(base_name)
        while slug in existing_slugs:
            slug = slug + "-1" if not slug[-1].isdigit() else slug[:-1] + str(int(slug[-1]) + 1)
        existing_slugs.add(slug)

        org = Organization(
            name=base_name,
            slug=slug,
            description="Default workspace",
            created_by_id=user.id,
        )
        session.add(org)
        await session.flush()

        session.add(UserOrganization(
            user_id=user.id,
            organization_id=org.id,
            role=OrgRole.OWNER,
        ))
        created += 1

    if created:
        await session.commit()
    return created
