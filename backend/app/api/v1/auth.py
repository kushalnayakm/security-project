import logging

from fastapi import APIRouter, Depends, Request, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import AdminLoginRequest, CustomerLoginRequest, EntityLoginRequest, EntityOtpRequest, EntityOtpVerifyRequest, EntityRegisterOtpRequest, EntityRegisterOtpVerifyRequest, ForgotAdminIdRequest
from app.services.auth_service import AuthService
from app.utils.responses import success_response


router = APIRouter(prefix="/auth")
auth_service = AuthService()
logger = logging.getLogger(__name__)


@router.post("/admin/login")
async def admin_login(payload: AdminLoginRequest, session: AsyncSession = Depends(get_db), request: Request = None) -> dict:
    ip_address = request.client.host if request and request.client else None
    result = await auth_service.login_admin(session, payload.admin_id, payload.password, ip_address)
    return success_response(jsonable_encoder(result))


@router.post("/admin/forgot-id")
async def admin_forgot_id(payload: ForgotAdminIdRequest, session: AsyncSession = Depends(get_db)) -> dict:
    result = await auth_service.forgot_admin_id(session, payload.phone)
    return success_response(jsonable_encoder(result))


@router.post("/entity/login/request-otp")
async def entity_request_otp(payload: EntityOtpRequest, session: AsyncSession = Depends(get_db)) -> dict:
    logger.info("Request OTP endpoint reached")
    result = await auth_service.request_entity_otp(session, payload.gst_no, payload.phone)
    return success_response(jsonable_encoder(result))


@router.post("/entity/login/verify-otp")
async def entity_verify_otp(payload: EntityOtpVerifyRequest, session: AsyncSession = Depends(get_db), request: Request = None) -> dict:
    ip_address = request.client.host if request and request.client else None
    result = await auth_service.verify_entity_otp(session, payload.gst_no, payload.phone, payload.otp, ip_address)
    return success_response(jsonable_encoder(result))


@router.post("/entity/register/request-otp")
async def entity_register_request_otp(payload: EntityRegisterOtpRequest, session: AsyncSession = Depends(get_db)) -> dict:
    result = await auth_service.request_registration_otp(session, payload.phone)
    return success_response(jsonable_encoder(result))


@router.post("/entity/register/verify-otp")
async def entity_register_verify_otp(payload: EntityRegisterOtpVerifyRequest, session: AsyncSession = Depends(get_db)) -> dict:
    result = await auth_service.verify_registration_otp(session, payload.phone, payload.otp)
    return success_response(jsonable_encoder(result))


@router.post("/entity/login")
async def entity_login(payload: EntityLoginRequest, session: AsyncSession = Depends(get_db)) -> dict:
    result = await auth_service.login_entity(session, payload.email, payload.password)
    return success_response(jsonable_encoder(result))


@router.post("/logout")
async def logout() -> dict:
    return success_response({"success": True})


@router.post("/customer/login")
async def customer_login(payload: CustomerLoginRequest, session: AsyncSession = Depends(get_db)) -> dict:
    result = await auth_service.login_customer(session, payload.unique_id)
    return success_response(jsonable_encoder(result))
