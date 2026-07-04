from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import AdminLoginRequest, CustomerLoginRequest, EntityLoginRequest
from app.services.auth_service import AuthService
from app.utils.responses import success_response


router = APIRouter(prefix="/auth")
auth_service = AuthService()


@router.post("/admin/login", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def admin_login(_: AdminLoginRequest) -> dict:
    """Implements documentation.md section 2 admin login.

    Blocked by schema mismatch: users table has no email column.
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Admin email login is not possible with the current schema.")


@router.post("/entity/login", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def entity_login(_: EntityLoginRequest) -> dict:
    """Implements documentation.md section 3 entity login.

    Blocked by schema mismatch: users table has no email column.
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Entity email login is not possible with the current schema.")


@router.post("/logout")
async def logout() -> dict:
    return success_response({"success": True})


@router.post("/customer/login")
async def customer_login(payload: CustomerLoginRequest, session: AsyncSession = Depends(get_db)) -> dict:
    result = await auth_service.login_customer(session, payload.unique_id)
    return success_response(result)
