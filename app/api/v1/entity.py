from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import require_entity_staff
from app.models.dynamic_form import DynamicForm
from app.models.form_field import FormField
from app.models.form_submission import FormSubmission
from app.schemas.entity import EntityRegisterRequest
from app.schemas.forms import CertificateCreate, DynamicFormCreate, DynamicFormUpdate, PublishFormRequest
from app.services.entity_service import EntityService
from app.utils.responses import success_response


router = APIRouter(prefix="/entity")
entity_service = EntityService()


@router.post("/register", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def register_entity(_: EntityRegisterRequest) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Entity registration needs a user email field in schema.sql.")


@router.get("/forms", dependencies=[Depends(require_entity_staff)])
async def get_forms(session: AsyncSession = Depends(get_db)) -> dict:
    forms = (await session.execute(select(DynamicForm).order_by(DynamicForm.created_at.desc()))).scalars().all()
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
async def create_form(payload: DynamicFormCreate, session: AsyncSession = Depends(get_db), actor: dict = Depends(require_entity_staff)) -> dict:
    entity_id = actor.get("entity_id")
    if not entity_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Entity scope is missing from token.")
    form = await entity_service.create_form(session, entity_id, payload.model_dump())
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
async def generate_qr_code(form_id: str) -> dict:
    return success_response({"qr_id": None, "qrCodeData": form_id, "qrImageUrl": None})


@router.get("/forms/{form_id}/qr-code", dependencies=[Depends(require_entity_staff)])
async def get_qr_code(form_id: str) -> dict:
    return success_response({"form_id": form_id, "qrImageUrl": None})


@router.get("/forms/{form_id}/submissions", dependencies=[Depends(require_entity_staff)])
async def get_form_submissions(form_id: str, session: AsyncSession = Depends(get_db)) -> dict:
    submissions = await entity_service.list_form_submissions(session, form_id)
    return success_response(submissions)


@router.get("/submissions/{submission_id}", dependencies=[Depends(require_entity_staff)])
async def get_submission(submission_id: str, session: AsyncSession = Depends(get_db)) -> dict:
    submission = await session.get(FormSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    fields = (await session.execute(select(FormField).where(FormField.form_id == submission.form_id))).scalars().all()
    return success_response({"submission": submission, "fields": fields})


@router.post("/submissions/{submission_id}/certificate", dependencies=[Depends(require_entity_staff)], status_code=status.HTTP_201_CREATED)
async def generate_certificate(submission_id: str, payload: CertificateCreate) -> dict:
    return success_response({"submission_id": submission_id, "pdfUrl": payload.pdfUrl})


@router.post("/submissions/{submission_id}/notify", dependencies=[Depends(require_entity_staff)])
async def notify_submission_customer(submission_id: str) -> dict:
    return success_response({"submission_id": submission_id, "notified": True})
