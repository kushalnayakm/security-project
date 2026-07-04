from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FormField(Base):
    __tablename__ = "form_fields"
    __table_args__ = (
        CheckConstraint(
            "type IN ('TEXT','NUMBER','DATE','EMAIL','PHONE','SELECT','RADIO','CHECKBOX')",
            name="form_fields_type_check",
        ),
    )

    field_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    form_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("dynamic_forms.form_id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(150), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("FALSE"))
    options: Mapped[str | None] = mapped_column(Text)
    field_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
