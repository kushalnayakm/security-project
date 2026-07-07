from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import Certificate
from app.models.customer import Customer
from app.models.form_submission import FormSubmission


class CustomerService:
    async def get_customer_submission(self, session: AsyncSession, customer_id: str) -> dict:
        submission = await session.scalar(
            select(FormSubmission).where(FormSubmission.customer_id == customer_id).order_by(FormSubmission.submitted_at.desc())
        )
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No submission found for this customer.")
        return {
            "submission_id": str(submission.submission_id),
            "form_id": str(submission.form_id),
            "customer_id": str(submission.customer_id),
            "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
            "data": submission.data,
        }

    async def get_customer_certificate(self, session: AsyncSession, customer_id: str) -> dict:
        customer = await session.get(Customer, customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
        
        submission = await session.scalar(
            select(FormSubmission).where(FormSubmission.customer_id == customer_id).order_by(FormSubmission.submitted_at.desc())
        )
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No submission found for this customer.")

        certificate = await session.scalar(select(Certificate).where(Certificate.submission_id == submission.submission_id))
        cert_data = None
        if certificate is not None:
            cert_data = {
                "certificate_id": str(certificate.certificate_id),
                "submission_id": str(certificate.submission_id),
                "issue_date": certificate.issue_date.isoformat() if certificate.issue_date else None,
                "pdf_url": certificate.pdf_url,
                "status": certificate.status,
            }
        return {"available": certificate is not None, "certificate": cert_data}
