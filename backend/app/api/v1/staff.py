from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import require_entity_staff, require_entity_owner
from app.schemas.staff import StaffCreate, StaffUpdate
from app.services.staff_service import StaffService
from app.utils.responses import success_response

router = APIRouter(prefix="/entity", dependencies=[Depends(require_entity_staff)])
staff_service = StaffService()


@router.post("/staff", status_code=status.HTTP_201_CREATED)
async def add_staff(
    payload: StaffCreate,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_owner)
) -> dict:
    result = await staff_service.add_staff(session, payload.model_dump(), actor)
    return success_response(result)


@router.get("/staff")
async def list_staff(
    entity_id: str,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff)
) -> dict:
    result = await staff_service.list_staff(session, entity_id, actor)
    return success_response(result)


@router.patch("/staff/{user_id}")
async def update_staff(
    user_id: str,
    payload: StaffUpdate,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff)
) -> dict:
    result = await staff_service.update_staff(session, user_id, payload.model_dump(exclude_none=True), actor)
    return success_response(result)


@router.delete("/staff/{user_id}")
async def remove_staff(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_owner)
) -> dict:
    await staff_service.remove_staff(session, user_id, actor)
    return success_response({"success": True})
