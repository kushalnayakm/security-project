import logging
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import String, cast, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.entity import Entity
from app.models.entity_user import EntityUser
from app.models.user import User
from app.schemas.entity import EntityRegisterRequest
from app.services.admin_service import AdminService
from app.utils.otp_service import otp_service


logger = logging.getLogger(__name__)


class AuthService:
    """Authentication helpers."""

    async def login_admin(self, session: AsyncSession, admin_id: str, password: str, ip_address: str | None = None) -> dict:
        import uuid
        is_uuid = False
        try:
            uuid.UUID(admin_id)
            is_uuid = True
        except ValueError:
            pass

        admin = None
        user = None

        if is_uuid:
            admin = await session.scalar(select(Admin).where(cast(Admin.admin_id, String) == admin_id))
            if admin is not None:
                user = await session.get(User, admin.user_id)
        else:
            # Fall back to checking username (User.name)
            user = await session.scalar(select(User).where(User.name == admin_id, User.role == "ADMIN"))
            if user is not None:
                admin = await session.scalar(select(Admin).where(Admin.user_id == user.user_id))

        if admin is None or user is None or user.role != "ADMIN" or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials.")

        user.last_login = datetime.utcnow()
        await session.commit()

        # Log audit event for successful admin login
        admin_service = AdminService()
        try:
            await admin_service.write_audit_log(
                session=session,
                user_id=str(user.user_id),
                action="LOGIN",
                target_type="ADMIN",
                target_id=str(admin.admin_id),
                ip_address=ip_address,
            )
        except Exception as e:
            logger.error(f"Failed to write audit log for admin login: {e}")

        settings = get_settings()
        token = create_access_token(
            subject=str(user.user_id),
            role=user.role,
            expires_delta=timedelta(minutes=settings.jwt_expiry_minutes),
            extra_claims={"user_id": str(user.user_id), "admin_id": str(admin.admin_id)},
        )
        return {"token": token, "admin": admin, "role": user.role}

    async def forgot_admin_id(self, session: AsyncSession, phone: str) -> dict:
        """Find admin by phone number and return admin name."""
        from fastapi import HTTPException, status
        
        user = await session.scalar(
            select(User).where(User.phone == phone, User.role == "ADMIN")
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin account not found with this phone number."
            )

        admin = await session.scalar(select(Admin).where(Admin.user_id == user.user_id))
        if admin is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin account not found with this phone number."
            )

        return {"admin_name": user.name}
        
    async def request_entity_otp(self, session: AsyncSession, gst_no: str, phone: str) -> dict:
        """Generate and store OTP for entity login."""
        # Verify that GST Number and Phone Number belong to the same entity
        entity = await session.scalar(
            select(Entity).where(Entity.gst_no == gst_no, Entity.phone == phone)
        )
        if entity is None:
            # Generic NOT_FOUND response - don't reveal which field failed
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid GST number or phone number."
            )

        # Generate OTP
        otp = await otp_service.generate_otp()

        # Store OTP in Redis
        success = await otp_service.store_otp(gst_no, phone, otp)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate OTP. Please try again."
            )

        masked_phone = otp_service.mask_phone(phone)
        return {"otp_sent": True, "masked_phone": masked_phone}

    async def verify_entity_otp(self, session: AsyncSession, gst_no: str, phone: str, otp: str, ip_address: str | None = None) -> dict:
        """Verify OTP and generate JWT for entity login."""
        # Verify that GST Number and Phone Number belong to the same entity
        entity = await session.scalar(
            select(Entity).where(Entity.gst_no == gst_no, Entity.phone == phone)
        )
        if entity is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GST number or phone number."
            )

        # Get entity_user to find the associated user
        entity_user = await session.scalar(
            select(EntityUser).where(EntityUser.entity_id == entity.entity_id)
        )
        if entity_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Entity user not found."
            )

        # Get user and verify role
        user = await session.get(User, entity_user.user_id)
        if user is None or user.role != "ENTITY_STAFF":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user credentials."
            )

        # Verify OTP using Redis
        otp_valid = await otp_service.verify_otp(gst_no, phone, otp)
        if not otp_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP."
            )

        # Update last_login
        user.last_login = datetime.utcnow()
        await session.commit()

        # Log audit event for successful entity OTP login
        admin_service = AdminService()
        try:
            await admin_service.write_audit_log(
                session=session,
                user_id=str(user.user_id),
                action="LOGIN",
                target_type="ENTITY",
                target_id=str(entity.entity_id),
                ip_address=ip_address,
            )
        except Exception as e:
            logger.error(f"Failed to write audit log for entity OTP login: {e}")

        # Generate JWT token (reuse existing JWT generation logic)
        settings = get_settings()
        token = create_access_token(
            subject=str(user.user_id),
            role=user.role,
            expires_delta=timedelta(minutes=settings.jwt_expiry_minutes),
            extra_claims={"user_id": str(user.user_id), "entity_id": str(entity.entity_id)},
        )

        # Return same response structure as login_entity
        return {"token": token, "entity": entity, "role": user.role}

    async def login_entity(self, session: AsyncSession, email: str, password: str) -> dict:
        entity = await session.scalar(select(Entity).where(Entity.email == email))
        if entity is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid entity credentials.")

        entity_user = await session.scalar(select(EntityUser).where(EntityUser.entity_id == entity.entity_id))
        if entity_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid entity credentials.")

        user = await session.get(User, entity_user.user_id)
        if user is None or user.role != "ENTITY_STAFF" or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid entity credentials.")

        settings = get_settings()
        token = create_access_token(
            subject=str(user.user_id),
            role=user.role,
            expires_delta=timedelta(minutes=settings.jwt_expiry_minutes),
            extra_claims={"user_id": str(user.user_id), "entity_id": str(entity.entity_id)},
        )
        return {"token": token, "entity": entity, "role": user.role}

    async def register_entity(self, session: AsyncSession, payload: EntityRegisterRequest) -> dict:
        logger.info("Request received in AuthService.register_entity")
        logger.info("Validated entity registration model: %s", payload)

        existing_entity = await session.scalar(select(Entity).where(Entity.email == payload.email))
        if existing_entity is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entity email already exists.")
        if payload.gstNo:
            existing_gst = await session.scalar(select(Entity).where(Entity.gst_no == payload.gstNo))
            if existing_gst is not None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entity GST already exists.")

        try:
            # Generate random placeholder password internally
            placeholder_password = secrets.token_hex(32)
            hashed_password = get_password_hash(placeholder_password)
            
            user = User(
                name=payload.name,
                password_hash=hashed_password,
                phone=payload.phone,
                role="ENTITY_STAFF",
            )
            session.add(user)
            await session.flush()
            logger.info("User created")

            entity = Entity(
                name=payload.name,
                gst_no=payload.gstNo,
                business_type=payload.businessType,
                address=payload.address,
                contact_person=payload.contactPerson,
                phone=payload.phone,
                email=str(payload.email) if payload.email is not None else None,
                created_by=user.user_id,
                updated_by=user.user_id,
            )
            session.add(entity)
            await session.flush()
            logger.info("Entity created")

            session.add(EntityUser(entity_id=entity.entity_id, user_id=user.user_id))
            logger.info("Entity_User created")
            await session.commit()
            logger.info("Commit successful")
            await session.refresh(entity)
            return {"entity_id": entity.entity_id, "user_id": user.user_id}
        except Exception as exc:
            await session.rollback()
            logger.exception("Entity registration failed: %s", exc)
            raise

    async def login_customer(self, session: AsyncSession, unique_id: str) -> dict:
        customer = await session.scalar(select(Customer).where(Customer.unique_id == unique_id))
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer unique ID not found.")

        settings = get_settings()
        token = create_access_token(
            subject=str(customer.customer_id),
            role="CUSTOMER",
            expires_delta=timedelta(minutes=settings.customer_jwt_expiry_minutes),
            extra_claims={"customer_id": str(customer.customer_id)},
        )
        return {"token": token, "customer": customer}
