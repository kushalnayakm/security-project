from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (
        CheckConstraint("status IN ('ISSUED','REVOKED')", name="certificates_status_check"),
    )

    certificate_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    submission_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("form_submissions.submission_id", ondelete="CASCADE"), nullable=False, unique=True)
    issue_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    pdf_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'ISSUED'"))
