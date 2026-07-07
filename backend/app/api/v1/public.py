from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.dynamic_form import DynamicForm
from app.models.form_field import FormField
from app.schemas.forms import SubmissionCreate
from app.services.entity_service import EntityService
from app.utils.responses import success_response


router = APIRouter(prefix="/public")
entity_service = EntityService()


@router.get("/forms/{form_id}")
async def get_form(form_id: UUID, session: AsyncSession = Depends(get_db)) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not form.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This registration form is currently unpublished and cannot be accessed."
        )
    fields_raw = (await session.execute(select(FormField).where(FormField.form_id == form_id).order_by(FormField.field_order))).scalars().all()
    fields = [
        {
            "field_id": str(f.field_id),
            "label": f.label,
            "type": f.type,
            "is_required": f.is_required,
            "options": f.options,
            "field_order": f.field_order,
        }
        for f in fields_raw
    ]
    return success_response({"form_id": str(form.form_id), "entity_id": str(form.entity_id), "title": form.title, "description": form.description, "fields": fields})


@router.post("/forms/{form_id}/submit", status_code=status.HTTP_201_CREATED)
async def submit_form(form_id: UUID, payload: SubmissionCreate, session: AsyncSession = Depends(get_db)) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not form.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This registration form is currently unpublished and cannot accept submissions."
        )
    result = await entity_service.submit_form(session, str(form_id), str(payload.entityId), payload.data)
    result["message"] = "Save this Unique ID to check your submission or certificate later."
    return success_response(result)
