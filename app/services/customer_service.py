from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import Certificate
from app.models.customer import Customer
from app.models.form_submission import FormSubmission


class CustomerService:
    async def get_customer_submission(self, session: AsyncSession, customer_id: str) -> FormSubmission:
        submission = await session.scalar(
            select(FormSubmission).where(FormSubmission.customer_id == customer_id).order_by(FormSubmission.submitted_at.desc())
        )
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No submission found for this customer.")
        return submission

    async def get_customer_certificate(self, session: AsyncSession, customer_id: str) -> dict:
        customer = await session.get(Customer, customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
        submission = await self.get_customer_submission(session, customer_id)
        certificate = await session.scalar(select(Certificate).where(Certificate.submission_id == submission.submission_id))
        return {"available": certificate is not None, "certificate": certificate}
