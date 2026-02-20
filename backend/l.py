import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.utils.security import hash_password

async def create_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.username == "admin")
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print("⚠️  Admin already exists, updating password...")
            existing.password_hash = hash_password("Admin123!")
            existing.is_active = True
            await db.commit()
            print("✅ Admin password updated to: Admin123!")
        else:
            print("Creating new admin user...")
            admin = User(
                username="admin",
                email="admin@dblens.local",
                password_hash=hash_password("Admin123!"),
                full_name="Administrator",
                role="admin",
                is_active=True,
                is_verified=True
            )
            db.add(admin)
            await db.commit()
            print("✅ Admin user created!")
            print("   Username: admin")
            print("   Password: Admin123!")

if __name__ == "__main__":
    asyncio.run(create_admin())