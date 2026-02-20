"""
Wipe all users EXCEPT:
  - User with username "Aathithyan"
  - All users who are members of any organization whose name contains "chennai" (case-insensitive)

Chennai org(s) and their members are left intact. All other users (and their memberships in
non-Chennai orgs) are removed. Run from backend: python wipe_users_keep_aathithyan_and_chennai.py
"""
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.organization import Organization, UserOrganization

HARDCODED_USERNAME = "Aathithyan"
CHENNAI_ORG_NAME_SUBSTRING = "chennai"


async def main():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.username == HARDCODED_USERNAME))
        aathithyan = r.scalar_one_or_none()
        keep_user_ids = set()
        if aathithyan:
            keep_user_ids.add(aathithyan.id)
            print(f"Keeping user: {HARDCODED_USERNAME} (id={aathithyan.id})")
        else:
            print(f"Note: No user '{HARDCODED_USERNAME}' found; only Chennai org members will be kept.")

        r = await db.execute(
            select(Organization).where(
                Organization.name.ilike(f"%{CHENNAI_ORG_NAME_SUBSTRING}%")
            )
        )
        chennai_orgs = r.scalars().all()
        chennai_org_ids = {o.id for o in chennai_orgs}
        print(f"Chennai org(s): {[o.name for o in chennai_orgs]} (ids={chennai_org_ids})")

        if chennai_org_ids:
            r = await db.execute(
                select(UserOrganization.user_id).where(
                    UserOrganization.organization_id.in_(chennai_org_ids)
                ).distinct()
            )
            chennai_member_ids = {row[0] for row in r.all()}
            keep_user_ids |= chennai_member_ids
            print(f"Keeping Chennai org member user ids: {chennai_member_ids}")

        r = await db.execute(select(User))
        all_users = r.scalars().all()
        to_delete = [u for u in all_users if u.id not in keep_user_ids]
        if not to_delete:
            print("No users to delete.")
            return
        print(f"Deleting {len(to_delete)} user(s): {[u.username for u in to_delete]}")

        for u in to_delete:
            await db.delete(u)
        await db.commit()
        print("Done. Remaining users: Aathithyan (if existed) + all Chennai org members.")


if __name__ == "__main__":
    asyncio.run(main())
