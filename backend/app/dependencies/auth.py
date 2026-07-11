from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.security import bearer_scheme, require_roles
from app.db.session import get_db
from app.models.customer import Customer


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> dict:
    return require_roles(["ADMIN"], credentials, settings)


def require_entity_staff(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> dict:
    return require_roles(["ENTITY_STAFF", "ADMIN"], credentials, settings)


def require_entity_owner(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> dict:
    payload = require_roles(["ENTITY_STAFF", "ADMIN"], credentials, settings)
    if payload.get("role") == "ADMIN":
        return payload
    if payload.get("entity_user_role") != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to entity owners only."
        )
    return payload


async def require_customer_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
    session: AsyncSession = Depends(get_db),
) -> Customer:
    payload = require_roles(["CUSTOMER"], credentials, settings)
    customer = await session.get(Customer, payload.get("customer_id"))
    if customer is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Customer session is invalid.")
    return customer
