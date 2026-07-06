"""Initial schema matching backend/schema.sql."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'ACTIVE'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_login", sa.DateTime(), nullable=True),
        sa.CheckConstraint("role IN ('ADMIN','ENTITY_STAFF')", name="users_role_check"),
        sa.CheckConstraint("status IN ('ACTIVE','INACTIVE','SUSPENDED')", name="users_status_check"),
    )

    op.create_table(
        "admins",
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("can_manage_entities", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("can_manage_customers", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "entities",
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("gst_no", sa.String(length=50), nullable=True, unique=True),
        sa.Column("business_type", sa.String(length=100), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("contact_person", sa.String(length=100), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'ACTIVE'")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('ACTIVE','INACTIVE','REMOVED')", name="entities_status_check"),
    )

    op.create_table(
        "entity_users",
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("entity_id", "user_id", name="entity_users_pkey"),
    )

    op.create_table(
        "dynamic_forms",
        sa.Column("form_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "form_fields",
        sa.Column("field_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dynamic_forms.form_id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=150), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("options", sa.Text(), nullable=True),
        sa.Column("field_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("type IN ('TEXT','NUMBER','DATE','EMAIL','PHONE','SELECT','RADIO','CHECKBOX')", name="form_fields_type_check"),
    )

    op.create_table(
        "qr_codes",
        sa.Column("qr_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dynamic_forms.form_id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("qr_code_data", sa.Text(), nullable=False),
        sa.Column("qr_image_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "customers",
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False),
        sa.Column("unique_id", sa.String(length=100), nullable=False, unique=True),
        sa.Column("name", sa.String(length=150), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'ACTIVE'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('ACTIVE','REMOVED')", name="customers_status_check"),
    )

    op.create_table(
        "form_submissions",
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dynamic_forms.form_id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.customer_id", ondelete="CASCADE"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )

    op.create_table(
        "certificates",
        sa.Column("certificate_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("form_submissions.submission_id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("issue_date", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("pdf_url", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'ISSUED'")),
        sa.CheckConstraint("status IN ('ISSUED','REVOKED')", name="certificates_status_check"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("idx_customers_entity_id", "customers", ["entity_id"])
    op.create_index("idx_customers_unique_id", "customers", ["unique_id"])
    op.create_index("idx_form_submissions_form_id", "form_submissions", ["form_id"])
    op.create_index("idx_form_submissions_customer", "form_submissions", ["customer_id"])
    op.create_index("idx_dynamic_forms_entity_id", "dynamic_forms", ["entity_id"])
    op.create_index("idx_form_fields_form_id", "form_fields", ["form_id"])
    op.create_index("idx_certificates_submission", "certificates", ["submission_id"])
    op.create_index("idx_audit_logs_target", "audit_logs", ["target_type", "target_id"])
    op.create_index("idx_admins_user_id", "admins", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_admins_user_id", table_name="admins")
    op.drop_index("idx_audit_logs_target", table_name="audit_logs")
    op.drop_index("idx_certificates_submission", table_name="certificates")
    op.drop_index("idx_form_fields_form_id", table_name="form_fields")
    op.drop_index("idx_dynamic_forms_entity_id", table_name="dynamic_forms")
    op.drop_index("idx_form_submissions_customer", table_name="form_submissions")
    op.drop_index("idx_form_submissions_form_id", table_name="form_submissions")
    op.drop_index("idx_customers_unique_id", table_name="customers")
    op.drop_index("idx_customers_entity_id", table_name="customers")
    op.drop_table("audit_logs")
    op.drop_table("certificates")
    op.drop_table("form_submissions")
    op.drop_table("customers")
    op.drop_table("qr_codes")
    op.drop_table("form_fields")
    op.drop_table("dynamic_forms")
    op.drop_table("entity_users")
    op.drop_table("entities")
    op.drop_table("admins")
    op.drop_table("users")
