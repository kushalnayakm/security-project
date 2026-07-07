import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import require_entity_staff
from app.models.dynamic_form import DynamicForm
from app.models.form_field import FormField
from app.models.form_submission import FormSubmission
from app.models.qr_code import QrCode
from app.schemas.entity import EntityRegisterRequest
from app.schemas.forms import CertificateCreate, DynamicFormCreate, DynamicFormUpdate, PublishFormRequest
from app.services.auth_service import AuthService
from app.services.entity_service import EntityService
from app.utils.qr_generator import generate_qr_image
from app.utils.responses import success_response


router = APIRouter(prefix="/entity")
entity_service = EntityService()
auth_service = AuthService()
logger = logging.getLogger(__name__)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_entity(payload: EntityRegisterRequest, session: AsyncSession = Depends(get_db)) -> dict:
    logger.info("Request received for entity registration")
    logger.info("Entity registration request model: %s", payload)
    logger.info("Validation successful for entity registration")
    logger.info("Entity registration password type: %s", type(payload.password).__name__)
    logger.info("Entity registration password length: %s", len(payload.password))
    result = await auth_service.register_entity(session, payload)
    return success_response(result)


@router.get("/forms", dependencies=[Depends(require_entity_staff)])
async def get_forms(entity_id: str | None = None, session: AsyncSession = Depends(get_db), actor: dict = Depends(require_entity_staff)) -> dict:
    target_entity_id = entity_id if actor.get("role") == "ADMIN" else actor.get("entity_id")
    
    stmt = select(DynamicForm).order_by(DynamicForm.created_at.desc())
    if target_entity_id:
        stmt = stmt.where(DynamicForm.entity_id == target_entity_id)
        
    forms = (await session.execute(stmt)).scalars().all()
    available_field_types = [
        {"type": "TEXT", "label": "Short Text", "supportsOptions": False},
        {"type": "NUMBER", "label": "Number", "supportsOptions": False},
        {"type": "DATE", "label": "Date", "supportsOptions": False},
        {"type": "EMAIL", "label": "Email", "supportsOptions": False},
        {"type": "PHONE", "label": "Phone", "supportsOptions": False},
        {"type": "SELECT", "label": "Dropdown", "supportsOptions": True},
        {"type": "RADIO", "label": "Radio Group", "supportsOptions": True},
        {"type": "CHECKBOX", "label": "Checkbox", "supportsOptions": True},
    ]
    existing = [{"form_id": form.form_id, "title": form.title, "isActive": form.is_active, "createdAt": form.created_at} for form in forms]
    return success_response({"availableFieldTypes": available_field_types, "existingForms": existing})


@router.post("/forms", dependencies=[Depends(require_entity_staff)], status_code=status.HTTP_201_CREATED)
async def create_form(payload: DynamicFormCreate, entity_id: str | None = None, session: AsyncSession = Depends(get_db), actor: dict = Depends(require_entity_staff)) -> dict:
    target_entity_id = entity_id if actor.get("role") == "ADMIN" else actor.get("entity_id")
    if not target_entity_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Entity scope is missing.")
    form = await entity_service.create_form(session, target_entity_id, payload.model_dump())
    return success_response({"form_id": form.form_id})


@router.patch("/forms/{form_id}", dependencies=[Depends(require_entity_staff)])
async def update_form(form_id: str, payload: DynamicFormUpdate, session: AsyncSession = Depends(get_db)) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    data = payload.model_dump(exclude_none=True)
    if "title" in data:
        form.title = data["title"]
    if "description" in data:
        form.description = data["description"]
    if "fields" in data:
        await entity_service.replace_form_fields(session, form_id, data["fields"])
    await session.commit()
    return success_response({"form_id": form.form_id, "updated": True})


@router.post("/forms/{form_id}/publish", dependencies=[Depends(require_entity_staff)])
async def publish_form(form_id: str, payload: PublishFormRequest, session: AsyncSession = Depends(get_db)) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    form.is_active = payload.isActive
    await session.commit()
    return success_response({"form_id": form.form_id, "isActive": form.is_active})


@router.post("/forms/{form_id}/qr-code", dependencies=[Depends(require_entity_staff)], status_code=status.HTTP_201_CREATED)
async def generate_qr_code(form_id: str, base_url: str = "http://localhost:5173", session: AsyncSession = Depends(get_db)) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")

    target_url = f"{base_url.rstrip('/')}/form/{form_id}"
    qr_image_data_uri = generate_qr_image(target_url)

    # Upsert — qr_codes.form_id has a UNIQUE constraint
    existing = await session.scalar(select(QrCode).where(QrCode.form_id == form_id))
    if existing:
        existing.qr_code_data = target_url
        existing.qr_image_url = qr_image_data_uri
        await session.commit()
        await session.refresh(existing)
        return success_response({"qr_id": str(existing.qr_id), "qrCodeData": target_url, "qrImageUrl": qr_image_data_uri})

    qr = QrCode(form_id=form_id, qr_code_data=target_url, qr_image_url=qr_image_data_uri)
    session.add(qr)
    await session.commit()
    await session.refresh(qr)
    return success_response({"qr_id": str(qr.qr_id), "qrCodeData": target_url, "qrImageUrl": qr_image_data_uri})


@router.get("/forms/{form_id}/qr-code", dependencies=[Depends(require_entity_staff)])
async def get_qr_code(form_id: str, session: AsyncSession = Depends(get_db)) -> dict:
    qr = await session.scalar(select(QrCode).where(QrCode.form_id == form_id))
    if qr is None:
        return success_response({"form_id": form_id, "qrImageUrl": None, "qrCodeData": None})
    return success_response({"form_id": form_id, "qr_id": str(qr.qr_id), "qrCodeData": qr.qr_code_data, "qrImageUrl": qr.qr_image_url})


@router.get("/forms/{form_id}/submissions", dependencies=[Depends(require_entity_staff)])
async def get_form_submissions(form_id: str, session: AsyncSession = Depends(get_db)) -> dict:
    from app.models.customer import Customer
    from app.models.certificate import Certificate
    from app.models.form_field import FormField
    
    fields = (
        await session.execute(select(FormField).where(FormField.form_id == UUID(form_id)))
    ).scalars().all()
    
    submissions = await entity_service.list_form_submissions(session, form_id)
    result = []
    for s in submissions:
        customer = await session.get(Customer, s.customer_id)
        
        customer_name = customer.name if customer and customer.name else None
        if not customer_name and s.data:
            for field in fields:
                if "name" in field.label.lower():
                    customer_name = s.data.get(str(field.field_id))
                    if customer_name:
                        break
            if not customer_name:
                customer_name = "Unnamed Customer"

        cert = await session.scalar(select(Certificate).where(Certificate.submission_id == s.submission_id))
        result.append({
            "submission_id": str(s.submission_id),
            "form_id": str(s.form_id),
            "customer_id": str(s.customer_id),
            "unique_id": customer.unique_id if customer else None,
            "customer_name": customer_name,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "data": s.data,
            "certificate": {
                "certificate_id": str(cert.certificate_id),
                "pdf_url": cert.pdf_url,
                "issue_date": cert.issue_date.isoformat() if cert.issue_date else None,
                "status": cert.status
            } if cert else None
        })
    return success_response(result)


@router.get("/submissions/{submission_id}", dependencies=[Depends(require_entity_staff)])
async def get_submission(submission_id: str, session: AsyncSession = Depends(get_db)) -> dict:
    submission = await session.get(FormSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    fields = (await session.execute(select(FormField).where(FormField.form_id == submission.form_id))).scalars().all()
    return success_response({"submission": submission, "fields": fields})


@router.post("/submissions/{submission_id}/certificate", dependencies=[Depends(require_entity_staff)], status_code=status.HTTP_201_CREATED)
async def generate_certificate(submission_id: str, payload: CertificateCreate, session: AsyncSession = Depends(get_db)) -> dict:
    from app.models.certificate import Certificate
    existing = await session.scalar(select(Certificate).where(Certificate.submission_id == submission_id))
    if existing:
        existing.pdf_url = payload.pdfUrl
        await session.commit()
        return success_response({"submission_id": submission_id, "pdfUrl": payload.pdfUrl, "updated": True})

    certificate = Certificate(submission_id=submission_id, pdf_url=payload.pdfUrl, status="ISSUED")
    session.add(certificate)
    await session.commit()
    return success_response({"submission_id": submission_id, "pdfUrl": payload.pdfUrl, "created": True})


@router.post("/submissions/{submission_id}/notify", dependencies=[Depends(require_entity_staff)])
async def notify_submission_customer(submission_id: str) -> dict:
    return success_response({"submission_id": submission_id, "notified": True})


@router.get("/customers", dependencies=[Depends(require_entity_staff)])
async def get_entity_customers(
    entity_id: str | None = None,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff)
) -> dict:
    target_entity_id = entity_id if actor.get("role") == "ADMIN" else actor.get("entity_id")
    if not target_entity_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entity ID is required.")

    from app.models.customer import Customer
    stmt = select(Customer).where(Customer.entity_id == target_entity_id, Customer.status == "ACTIVE").order_by(Customer.created_at.desc())
    customers = (await session.execute(stmt)).scalars().all()
    
    result = [
        {
            "customer_id": str(c.customer_id),
            "entity_id": str(c.entity_id),
            "unique_id": c.unique_id,
            "name": c.name or "Unnamed Customer",
            "phone": c.phone,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in customers
    ]
    return success_response(result)


@router.delete("/forms/{form_id}", dependencies=[Depends(require_entity_staff)])
async def delete_form(form_id: UUID, session: AsyncSession = Depends(get_db), actor: dict = Depends(require_entity_staff)) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")

    if actor.get("role") != "ADMIN" and str(form.entity_id) != actor.get("entity_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this form.")

    await session.delete(form)
    await session.commit()
    return success_response({"message": "Form and all associated QR codes, submissions, and certificates have been permanently deleted."})
