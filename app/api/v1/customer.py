from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import require_customer_session
from app.models.customer import Customer
from app.services.customer_service import CustomerService
from app.utils.responses import success_response


router = APIRouter(prefix="/customer")
customer_service = CustomerService()


@router.get("/me/submission")
async def get_my_submission(customer: Customer = Depends(require_customer_session), session: AsyncSession = Depends(get_db)) -> dict:
    submission = await customer_service.get_customer_submission(session, str(customer.customer_id))
    return success_response({"submission": submission})


@router.get("/me/certificate")
async def get_my_certificate(customer: Customer = Depends(require_customer_session), session: AsyncSession = Depends(get_db)) -> dict:
    return success_response(await customer_service.get_customer_certificate(session, str(customer.customer_id)))


@router.get("/me/certificate/download")
async def download_my_certificate(customer: Customer = Depends(require_customer_session), session: AsyncSession = Depends(get_db)) -> dict:
    return success_response(await customer_service.get_customer_certificate(session, str(customer.customer_id)))
