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
    async def list_entities(self, session: AsyncSession, status_filter: str | None = None) -> list[dict]:
        stmt = (
            select(
                Entity.entity_id,
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
        rows = (await session.execute(stmt)).all()
        return [
            {
                "entity_id": row.entity_id,
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

        # 1. Create the Entity
        entity = Entity(
            name=payload["name"],
            gst_no=payload.get("gstNo"),
            business_type=payload.get("businessType"),
            address=payload.get("address"),
            contact_person=payload.get("contactPerson"),
            phone=payload.get("phone"),
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
            phone=payload.get("phone"),
            role="ENTITY_STAFF",
            status="ACTIVE",
        )
        session.add(user)
        await session.flush()

        # 3. Create EntityUser link
        entity_user = EntityUser(entity_id=entity.entity_id, user_id=user.user_id)
        session.add(entity_user)

        await session.commit()
        await session.refresh(entity)
        return entity

    async def update_entity(self, session: AsyncSession, entity_id: str, payload: dict) -> Entity:
        entity = await session.get(Entity, entity_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No entity found with this ID.")
        mapping = {
            "gstNo": "gst_no",
            "businessType": "business_type",
            "contactPerson": "contact_person",
        }
        for key, value in payload.items():
            attr = mapping.get(key, key)
            setattr(entity, attr, value)
        entity.updated_at = datetime.now()
        await session.commit()
        await session.refresh(entity)
        return entity

    async def delete_entity(self, session: AsyncSession, entity_id: str) -> None:
        entity = await session.get(Entity, entity_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No entity found with this ID.")
        await session.delete(entity)
        await session.commit()

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
