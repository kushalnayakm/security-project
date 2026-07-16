from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Entity(Base):
    __tablename__ = "entities"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE','INACTIVE','REMOVED')", name="entities_status_check"),
        CheckConstraint("entity_type IN ('MAIN','BRANCH')", name="entities_entity_type_check"),
    )

    entity_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    parent_entity_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("entities.entity_id", ondelete="CASCADE"))
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'MAIN'"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    branch_name: Mapped[str | None] = mapped_column(String(100))
    gst_no: Mapped[str | None] = mapped_column(String(50), unique=True)
    gst_doc_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    location_lat: Mapped[str | None] = mapped_column(String(50))
    location_lng: Mapped[str | None] = mapped_column(String(50))
    contact_person: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'ACTIVE'"))
    created_by: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.user_id"))
    updated_by: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
