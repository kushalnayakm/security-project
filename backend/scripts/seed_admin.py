import asyncio
import logging
import sys
from pathlib import Path

from sqlalchemy import select


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.admin import Admin
from app.models.user import User


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_admin() -> None:
    async with AsyncSessionLocal() as session:
        try:
            # 1. Find or Create the User
            existing_user = await session.scalar(select(User).where(User.role == "ADMIN"))
            if existing_user is not None:
                print("Admin already exists. Updating admin user.")
                logger.info("Admin seed updating existing admin user.")
                user = existing_user
            else:
                user = User(
                    name="admin",
                    password_hash="admin@123",
                    phone="9876543210",
                    role="ADMIN",
                    status="ACTIVE",
                )
                session.add(user)
                await session.flush()

            # 2. Create or Update the Admin profile
            existing_admin = await session.scalar(select(Admin).where(Admin.user_id == user.user_id))
            if existing_admin is not None:
                print("Admin profile already exists. Updating permissions.")
                logger.info("Admin profile updating permissions.")
                existing_admin.can_manage_entities = True
                existing_admin.can_manage_customers = True
                admin = existing_admin
            else:
                admin = Admin(
                    user_id=user.user_id,
                    can_manage_entities=True,
                    can_manage_customers=True,
                )
                session.add(admin)

            await session.commit()
            await session.refresh(user)
            await session.refresh(admin)

            logger.info("Admin seed completed successfully.")
            print("Admin seeded successfully.")
            print(f"Admin ID: {admin.admin_id}")
            print(f"User ID: {user.user_id}")
        except Exception:
            await session.rollback()
            logger.exception("Admin seed failed.")
            print("Admin seed failed. Transaction rolled back.")
            raise


if __name__ == "__main__":
    asyncio.run(seed_admin())
