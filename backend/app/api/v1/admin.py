from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import require_admin
from app.schemas.customer import CustomerUpdate
from app.schemas.entity import EntityCreate, EntityUpdate
from app.services.admin_service import AdminService
from app.services.entity_service import EntityService
from app.utils.responses import success_response


router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])
entity_service = EntityService()
admin_service = AdminService()


@router.get("/entities")
async def list_entities(status: str | None = None, session: AsyncSession = Depends(get_db)) -> dict:
    return success_response(await entity_service.list_entities(session, status))


@router.post("/entities", status_code=status.HTTP_201_CREATED)
async def create_entity(payload: EntityCreate, session: AsyncSession = Depends(get_db)) -> dict:
    entity = await entity_service.create_entity(session, payload.model_dump())
    return success_response({"entity_id": entity.entity_id})


@router.patch("/entities/{entity_id}")
async def update_entity(entity_id: str, payload: EntityUpdate, session: AsyncSession = Depends(get_db)) -> dict:
    entity = await entity_service.update_entity(session, entity_id, payload.model_dump(exclude_none=True))
    return success_response({"entity_id": entity.entity_id, "updated": True})


@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: str, request: Request, session: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)) -> dict:
    await entity_service.delete_entity(session, entity_id)
    await admin_service.write_audit_log(session, admin.get("sub"), "DELETE_ENTITY", "entity", entity_id, request.client.host if request.client else None)
    return success_response({"success": True})


@router.patch("/customers/{customer_id}")
async def update_customer(customer_id: str, payload: CustomerUpdate) -> dict:
    return success_response({"customer_id": customer_id, "updated": True, "payload": payload.model_dump(exclude_none=True)})


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, request: Request, session: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)) -> dict:
    await admin_service.write_audit_log(session, admin.get("sub"), "DELETE_CUSTOMER", "customer", customer_id, request.client.host if request.client else None)
    return success_response({"success": True})


@router.get("/audit-logs")
async def audit_logs(targetType: str | None = None, targetId: str | None = None, session: AsyncSession = Depends(get_db)) -> dict:
    return success_response(await admin_service.list_audit_logs(session, targetType, targetId))
