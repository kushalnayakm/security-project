from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.entity import Entity
from app.models.entity_user import EntityUser
from app.core.security import get_password_hash
import secrets


class StaffService:
    async def add_staff(self, session: AsyncSession, payload: dict, actor: dict) -> dict:
        actor_user_id = actor.get("user_id")
        actor_entity_id = actor.get("entity_id")
        actor_role = actor.get("entity_user_role")

        # 1. Enforce authorization: only OWNER can add staff
        if actor_role != "OWNER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the entity owner can add staff."
            )

        target_entity_id = payload["entityId"]
        
        # 2. Verify target entity exists
        target_entity = await session.get(Entity, target_entity_id)
        if not target_entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target entity/branch not found."
            )

        # 3. Verify actor owns target entity (either same entity or parent of the branch)
        if str(actor_entity_id) != str(target_entity_id):
            if target_entity.parent_entity_id is None or str(target_entity.parent_entity_id) != str(actor_entity_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have authorization to add staff to this branch."
                )

        # 4. Check if phone is already in use by an active staff member in this entity
        phone = payload["phone"]
        existing_user_stmt = (
            select(User)
            .join(EntityUser, EntityUser.user_id == User.user_id)
            .where(
                and_(
                    User.phone == phone,
                    User.status == "ACTIVE",
                    EntityUser.entity_id == target_entity_id
                )
            )
        )
        existing_user = await session.scalar(existing_user_stmt)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A staff member with this phone number is already registered under this entity."
            )

        # 5. Create user
        placeholder_password = secrets.token_hex(32)
        hashed_password = get_password_hash(placeholder_password)
        
        new_user = User(
            name=payload["name"],
            password_hash=hashed_password,
            phone=phone,
            role="ENTITY_STAFF",
            status="ACTIVE",
            photo_url=payload.get("photoUrl")
        )
        session.add(new_user)
        await session.flush()

        # 6. Create entity_user link
        role = payload.get("role", "STAFF")
        if role not in ("MANAGER", "STAFF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role assignment. Can only assign MANAGER or STAFF."
            )

        entity_user = EntityUser(
            entity_id=target_entity_id,
            user_id=new_user.user_id,
            role=role,
            added_by=UUID(actor_user_id) if isinstance(actor_user_id, str) else actor_user_id
        )
        session.add(entity_user)
        await session.commit()
        await session.refresh(new_user)

        return {
            "user_id": str(new_user.user_id),
            "name": new_user.name,
            "phone": new_user.phone,
            "role": role,
            "status": new_user.status
        }

    async def list_staff(self, session: AsyncSession, entity_id: str, actor: dict) -> list[dict]:
        actor_entity_id = actor.get("entity_id")

        # 1. Enforce scoping: can only view own organization's staff
        # If actor is OWNER of head branch, they can view main branch + sub branches staff
        actor_entity = await session.get(Entity, actor_entity_id)
        if not actor_entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Actor entity not found."
            )

        # Build list of allowed entity IDs
        allowed_entity_ids = [UUID(actor_entity_id) if isinstance(actor_entity_id, str) else actor_entity_id]
        if actor_entity.entity_type == "MAIN":
            # Fetch child branch IDs
            branches_stmt = select(Entity.entity_id).where(Entity.parent_entity_id == actor_entity.entity_id)
            branch_ids = (await session.execute(branches_stmt)).scalars().all()
            allowed_entity_ids.extend(branch_ids)

        target_uuid = UUID(entity_id) if isinstance(entity_id, str) else entity_id
        if target_uuid not in allowed_entity_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to view staff for this entity/branch."
            )

        # 2. Query staff members
        stmt = (
            select(
                User.user_id,
                User.name,
                User.phone,
                User.photo_url,
                User.status,
                User.created_at,
                EntityUser.role,
                EntityUser.entity_id,
                Entity.name.label("entity_name")
            )
            .join(EntityUser, EntityUser.user_id == User.user_id)
            .join(Entity, Entity.entity_id == EntityUser.entity_id)
            .where(EntityUser.entity_id == target_uuid)
            .order_by(User.created_at.desc())
        )
        rows = (await session.execute(stmt)).all()
        return [
            {
                "user_id": str(row.user_id),
                "name": row.name,
                "phone": row.phone,
                "photo_url": row.photo_url,
                "status": row.status,
                "role": row.role,
                "entity_id": str(row.entity_id),
                "entity_name": row.entity_name,
                "created_at": row.created_at.isoformat() if row.created_at else None
            }
            for row in rows
        ]

    async def update_staff(self, session: AsyncSession, user_id: str, payload: dict, actor: dict) -> dict:
        actor_user_id = actor.get("user_id")
        actor_entity_id = actor.get("entity_id")
        actor_role = actor.get("entity_user_role")

        target_user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        # 1. Fetch user and link
        user = await session.get(User, target_user_uuid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found."
            )
        
        entity_user = await session.scalar(
            select(EntityUser).where(EntityUser.user_id == target_user_uuid)
        )
        if not entity_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff entity link not found."
            )

        # Verify relationship tree (same entity or child branch)
        target_entity = await session.get(Entity, entity_user.entity_id)
        if not target_entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entity not found."
            )

        is_same_entity = str(actor_entity_id) == str(entity_user.entity_id)
        is_child_branch = target_entity.parent_entity_id is not None and str(target_entity.parent_entity_id) == str(actor_entity_id)

        if not (is_same_entity or is_child_branch):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to update this staff member."
            )

        # Enforce role hierarchy:
        # OWNER can update anyone (except changing their own role/status)
        # MANAGER can only update STAFF role in their same branch
        if actor_role == "OWNER":
            if str(actor_user_id) == str(user_id):
                # Owner updating themselves: can change name, phone, photo, but NOT role or status
                if "role" in payload or "status" in payload:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="As owner, you cannot modify your own role or status."
                    )
        elif actor_role == "MANAGER":
            if not is_same_entity:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only update staff within their own branch."
                )
            if entity_user.role in ("OWNER", "MANAGER") and str(actor_user_id) != str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only update STAFF role members."
                )
            if "role" in payload or "status" in payload:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers cannot modify staff roles or status."
                )
        else:
            # STAFF cannot update anyone except themselves (name/phone/photo only)
            if str(actor_user_id) != str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Staff can only update their own profile."
                )
            if any(k in payload for k in ("role", "status")):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Staff cannot modify their own role or status."
                )

        # 2. Perform updates
        if "name" in payload:
            user.name = payload["name"]
        if "phone" in payload:
            # check uniqueness in entity if phone is changing
            if payload["phone"] != user.phone:
                dup = await session.scalar(
                    select(User)
                    .join(EntityUser, EntityUser.user_id == User.user_id)
                    .where(
                        and_(
                            User.phone == payload["phone"],
                            User.status == "ACTIVE",
                            EntityUser.entity_id == entity_user.entity_id
                        )
                    )
                )
                if dup:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This phone number is already registered under this entity."
                    )
            user.phone = payload["phone"]
        if "photoUrl" in payload:
            user.photo_url = payload["photoUrl"]
        if "role" in payload and actor_role == "OWNER":
            if payload["role"] not in ("MANAGER", "STAFF"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Can only change roles to MANAGER or STAFF."
                )
            entity_user.role = payload["role"]
        if "status" in payload and actor_role == "OWNER":
            if payload["status"] not in ("ACTIVE", "INACTIVE", "SUSPENDED"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid status value."
                )
            user.status = payload["status"]

        await session.commit()
        await session.refresh(user)

        return {
            "user_id": str(user.user_id),
            "name": user.name,
            "phone": user.phone,
            "role": entity_user.role,
            "status": user.status,
            "photo_url": user.photo_url
        }

    async def remove_staff(self, session: AsyncSession, user_id: str, actor: dict) -> None:
        actor_user_id = actor.get("user_id")
        actor_entity_id = actor.get("entity_id")
        actor_role = actor.get("entity_user_role")

        target_user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        # 1. Enforce authorization: only OWNER can remove staff
        if actor_role != "OWNER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the entity owner can remove staff."
            )

        if str(actor_user_id) == str(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot remove yourself as owner."
            )

        # 2. Fetch target and verify scoping
        user = await session.get(User, target_user_uuid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found."
            )
        
        entity_user = await session.scalar(
            select(EntityUser).where(EntityUser.user_id == target_user_uuid)
        )
        if not entity_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff entity link not found."
            )

        target_entity = await session.get(Entity, entity_user.entity_id)
        is_same_entity = str(actor_entity_id) == str(entity_user.entity_id)
        is_child_branch = target_entity.parent_entity_id is not None and str(target_entity.parent_entity_id) == str(actor_entity_id)

        if not (is_same_entity or is_child_branch):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to remove this staff member."
            )

        if entity_user.role == "OWNER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove owner of an organization."
            )

        # 3. Soft delete (set status INACTIVE)
        user.status = "INACTIVE"
        await session.commit()
