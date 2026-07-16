import json
import secrets
import string
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.dynamic_form import DynamicForm
from app.models.entity import Entity
from app.models.form_field import FormField
from app.models.form_submission import FormSubmission


class EntityService:
    async def list_entities(self, session: AsyncSession, status_filter: str | None = None, include_branches: bool = False) -> list[dict]:
        stmt = (
            select(
                Entity.entity_id,
                Entity.parent_entity_id,
                Entity.entity_type,
                Entity.name,
                Entity.status,
                Entity.gst_no,
                func.count(Customer.customer_id).label("customer_count"),
            )
            .outerjoin(Customer, Customer.entity_id == Entity.entity_id)
            .group_by(Entity.entity_id)
        )
        if status_filter:
            stmt = stmt.where(Entity.status == status_filter)
        if not include_branches:
            stmt = stmt.where(Entity.entity_type == "MAIN")
        rows = (await session.execute(stmt)).all()
        return [
            {
                "entity_id": row.entity_id,
                "parent_entity_id": str(row.parent_entity_id) if row.parent_entity_id else None,
                "entity_type": row.entity_type,
                "name": row.name,
                "gstNo": row.gst_no,
                "status": row.status,
                "customerCount": row.customer_count,
            }
            for row in rows
        ]

    async def create_entity(self, session: AsyncSession, payload: dict, created_by: str | None = None) -> Entity:
        from app.models.user import User
        from app.models.entity_user import EntityUser
        from app.core.security import get_password_hash
        import secrets

        # Determine entity type based on parent
        parent_entity_id = payload.get("parentEntityId") or payload.get("parent_entity_id")
        entity_type = "BRANCH" if parent_entity_id else "MAIN"

        phone_val = payload.get("phone")
        gst_val = payload.get("gstNo") or payload.get("gst_no")

        # If creating a branch, validate that the parent exists and is a MAIN entity
        if parent_entity_id:
            parent = await session.get(Entity, str(parent_entity_id))
            if parent is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent entity not found.")
            if parent.entity_type != "MAIN":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Branches can only be created under main entities.")
            
            # Inherit phone and GST from parent if not explicitly provided
            if not phone_val:
                phone_val = parent.phone
            if not gst_val:
                gst_val = parent.gst_no

        # 1. Create the Entity
        entity = Entity(
            name=payload["name"],
            branch_name=payload.get("branchName") or payload.get("branch_name"),
            parent_entity_id=str(parent_entity_id) if parent_entity_id else None,
            entity_type=entity_type,
            gst_no=gst_val,
            gst_doc_url=payload.get("gstDocUrl") or payload.get("gst_doc_url"),
            business_type=payload.get("businessType") or payload.get("business_type"),
            address=payload.get("address"),
            location=payload.get("location"),
            location_lat=payload.get("locationLat") or payload.get("location_lat"),
            location_lng=payload.get("locationLng") or payload.get("location_lng"),
            contact_person=payload.get("contactPerson") or payload.get("contact_person"),
            phone=phone_val,
            email=payload.get("email"),
            created_by=created_by,
            updated_by=created_by,
        )
        session.add(entity)
        await session.flush()

        # 2. Create corresponding User for the entity staff
        placeholder_password = secrets.token_hex(32)
        hashed_password = get_password_hash(placeholder_password)
        
        user = User(
            name=payload["name"],
            password_hash=hashed_password,
            phone=phone_val,
            role="ENTITY_STAFF",
            status="ACTIVE",
        )
        session.add(user)
        await session.flush()

        # 3. Create EntityUser link
        entity_user = EntityUser(entity_id=entity.entity_id, user_id=user.user_id, role="OWNER")
        session.add(entity_user)

        await session.commit()
        await session.refresh(entity)
        return entity

    async def update_entity(self, session: AsyncSession, entity_id: str, payload: dict, commit: bool = True) -> Entity:
        from uuid import UUID

        entity_key = UUID(entity_id) if isinstance(entity_id, str) else entity_id
        entity = await session.get(Entity, entity_key)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No entity found with this ID.")
        mapping = {
            "branchName": "branch_name",
            "gstNo": "gst_no",
            "gstDocUrl": "gst_doc_url",
            "businessType": "business_type",
            "locationLat": "location_lat",
            "locationLng": "location_lng",
            "contactPerson": "contact_person",
            "parentEntityId": "parent_entity_id",
        }
        for key, value in payload.items():
            attr = mapping.get(key, key)
            setattr(entity, attr, value)
        entity.updated_at = datetime.now()
        if commit:
            await session.commit()
        await session.flush()
        await session.refresh(entity)
        return entity

    async def delete_entity(self, session: AsyncSession, entity_id: str) -> None:
        entity = await session.get(Entity, entity_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No entity found with this ID.")
        await session.delete(entity)
        await session.commit()

    async def list_branches(self, session: AsyncSession, entity_id: str) -> list[dict]:
        """List all sub-branches of a given entity."""
        parent = await session.get(Entity, entity_id)
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No entity found with this ID.")
        stmt = (
            select(
                Entity.entity_id,
                Entity.parent_entity_id,
                Entity.entity_type,
                Entity.name,
                Entity.status,
                Entity.gst_no,
                Entity.address,
                Entity.phone,
                Entity.email,
                Entity.contact_person,
                Entity.created_at,
            )
            .where(Entity.parent_entity_id == entity_id)
            .order_by(Entity.created_at.desc())
        )
        rows = (await session.execute(stmt)).all()
        return [
            {
                "entity_id": row.entity_id,
                "parent_entity_id": str(row.parent_entity_id) if row.parent_entity_id else None,
                "entity_type": row.entity_type,
                "name": row.name,
                "gstNo": row.gst_no,
                "status": row.status,
                "address": row.address,
                "phone": row.phone,
                "email": row.email,
                "contactPerson": row.contact_person,
                "createdAt": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]

    async def create_form(self, session: AsyncSession, entity_id: str, payload: dict) -> DynamicForm:
        form = DynamicForm(entity_id=entity_id, title=payload["title"], description=payload.get("description"))
        session.add(form)
        await session.flush()
        for field in payload["fields"]:
            options = field.get("options")
            field_type = field["type"]
            if field_type in {"SELECT", "RADIO", "CHECKBOX"}:
                serialized_options = json.dumps(options or [])
            else:
                serialized_options = None
            session.add(
                FormField(
                    form_id=form.form_id,
                    label=field["label"],
                    type=field_type,
                    is_required=field.get("isRequired", False),
                    options=serialized_options,
                    field_order=field.get("order", 0),
                )
            )
        await session.commit()
        await session.refresh(form)
        return form

    async def submit_form(self, session: AsyncSession, form_id: str, entity_id: str, data: dict) -> dict:
        form = await session.get(DynamicForm, form_id)
        if form is None or str(form.entity_id) != entity_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")

        fields = (
            await session.execute(select(FormField).where(FormField.form_id == form.form_id).order_by(FormField.field_order))
        ).scalars().all()
        missing_fields = [str(field.field_id) for field in fields if field.is_required and str(field.field_id) not in data]
        if missing_fields:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required fields: {', '.join(missing_fields)}")

        # Resolve customer name and phone from dynamic form values by checking field labels
        name_val = data.get("name")
        phone_val = data.get("phone")
        
        for field in fields:
            label_lower = field.label.lower()
            field_id_str = str(field.field_id)
            if "name" in label_lower and not name_val:
                name_val = data.get(field_id_str)
            elif ("phone" in label_lower or "mobile" in label_lower) and not phone_val:
                phone_val = data.get(field_id_str)

        unique_id = self._generate_unique_id()
        customer = Customer(entity_id=entity_id, unique_id=unique_id, name=name_val, phone=phone_val)
        session.add(customer)
        await session.flush()
        submission = FormSubmission(form_id=form_id, customer_id=customer.customer_id, data=data)
        session.add(submission)
        await session.commit()
        await session.refresh(submission)
        return {"submission_id": submission.submission_id, "unique_id": unique_id}

    async def list_form_submissions(self, session: AsyncSession, form_id: str) -> list[FormSubmission]:
        return (
            await session.execute(select(FormSubmission).where(FormSubmission.form_id == form_id).order_by(FormSubmission.submitted_at.desc()))
        ).scalars().all()

    async def replace_form_fields(self, session: AsyncSession, form_id: str, fields: list[dict]) -> None:
        await session.execute(delete(FormField).where(FormField.form_id == form_id))
        for field in fields:
            session.add(
                FormField(
                    form_id=form_id,
                    label=field["label"],
                    type=field["type"],
                    is_required=field.get("isRequired", False),
                    options=json.dumps(field.get("options", [])) if field["type"] in {"SELECT", "RADIO", "CHECKBOX"} else None,
                    field_order=field.get("order", 0),
                )
            )

    @staticmethod
    def _generate_unique_id() -> str:
        alphabet = string.ascii_uppercase + string.digits
        return "CUST-" + "".join(secrets.choice(alphabet) for _ in range(6))
