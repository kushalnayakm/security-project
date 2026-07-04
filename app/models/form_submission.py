from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    submission_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    form_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("dynamic_forms.form_id", ondelete="CASCADE"), nullable=False)
    customer_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("customers.customer_id", ondelete="CASCADE"), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
