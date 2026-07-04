from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.customer import Customer


class AuthService:
    """Authentication helpers.

    Note: `schema.sql` does not store user email addresses, so admin/entity email+password
    login from `documentation.md` cannot be implemented faithfully without a schema change.
    """

    async def login_customer(self, session: AsyncSession, unique_id: str) -> dict:
        customer = await session.scalar(select(Customer).where(Customer.unique_id == unique_id))
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer unique ID not found.")

        settings = get_settings()
        token = create_access_token(
            subject=str(customer.customer_id),
            role="CUSTOMER",
            expires_delta=timedelta(minutes=settings.customer_jwt_expiry_minutes),
            extra_claims={"customer_id": str(customer.customer_id)},
        )
        return {"token": token, "customer": customer}
