from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QrCode(Base):
    __tablename__ = "qr_codes"

    qr_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    form_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("dynamic_forms.form_id", ondelete="CASCADE"), nullable=False, unique=True)
    qr_code_data: Mapped[str] = mapped_column(Text, nullable=False)
    qr_image_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
