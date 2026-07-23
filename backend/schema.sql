
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','ENTITY_STAFF')),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    photo_url       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    last_login      TIMESTAMP
);

CREATE TABLE admins (
    admin_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    can_manage_entities BOOLEAN NOT NULL DEFAULT TRUE,   -- create/update/remove entities
    can_manage_customers BOOLEAN NOT NULL DEFAULT TRUE,  -- remove/edit customers or their data
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE entities (
    entity_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_entity_id UUID REFERENCES entities(entity_id) ON DELETE CASCADE,
    entity_type     VARCHAR(20) NOT NULL DEFAULT 'MAIN' CHECK (entity_type IN ('MAIN','BRANCH')),
    name            VARCHAR(100) NOT NULL,
    branch_name     VARCHAR(100),
    gst_no          VARCHAR(50) UNIQUE,
    gst_doc_url     TEXT,
    entity_licence_url TEXT,
    business_type   VARCHAR(100),
    address         TEXT,
    location        TEXT,
    location_lat    VARCHAR(50),
    location_lng    VARCHAR(50),
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','REMOVED')),
    created_by      UUID REFERENCES users(user_id),
    updated_by      UUID REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE entity_users (
    entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role            VARCHAR(30) NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER','MANAGER','STAFF')),
    added_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (entity_id, user_id)
);

CREATE TABLE documents (
    document_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id         UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    document_type     VARCHAR(50) NOT NULL,
    file_path         TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size         INT,
    mime_type         VARCHAR(100),
    uploaded_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE dynamic_forms (
    form_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE form_fields (
    field_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES dynamic_forms(form_id) ON DELETE CASCADE,
    label           VARCHAR(150) NOT NULL,
    type            VARCHAR(50) NOT NULL CHECK (type IN ('TEXT','NUMBER','DATE','EMAIL','PHONE','SELECT','RADIO','CHECKBOX')),
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    options         TEXT,
    field_order     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE qr_codes (
    qr_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL UNIQUE REFERENCES dynamic_forms(form_id) ON DELETE CASCADE,
    qr_code_data    TEXT NOT NULL,
    qr_image_url    TEXT,
    show_welcome    BOOLEAN NOT NULL DEFAULT TRUE,
    welcome_title   VARCHAR(150) DEFAULT 'Welcome',
    welcome_message TEXT,
    welcome_logo    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    expires_at      TIMESTAMP
);

CREATE TABLE customers (
    customer_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    unique_id       VARCHAR(100) NOT NULL UNIQUE,   -- the ONLY credential customer needs to re-login
    name            VARCHAR(150),
    phone           VARCHAR(20),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REMOVED')),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE form_submissions (
    submission_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES dynamic_forms(form_id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    submitted_at    TIMESTAMP NOT NULL DEFAULT now(),
    data            JSONB NOT NULL     -- key/value answers keyed by field_id
);

CREATE TABLE certificates (
    certificate_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID NOT NULL UNIQUE REFERENCES form_submissions(submission_id) ON DELETE CASCADE,
    issue_date      TIMESTAMP NOT NULL DEFAULT now(),
    pdf_url         TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','REVOKED'))
);

CREATE TABLE audit_logs (
    log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(50)  NOT NULL,
    target_id       UUID,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);


CREATE UNIQUE INDEX idx_entities_phone_unique ON entities(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_entity_id       ON customers(entity_id);
CREATE INDEX idx_customers_unique_id       ON customers(unique_id);
CREATE INDEX idx_form_submissions_form_id  ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_customer ON form_submissions(customer_id);
CREATE INDEX idx_dynamic_forms_entity_id   ON dynamic_forms(entity_id);
CREATE INDEX idx_form_fields_form_id       ON form_fields(form_id);
CREATE INDEX idx_certificates_submission   ON certificates(submission_id);
CREATE INDEX idx_audit_logs_target         ON audit_logs(target_type, target_id);
CREATE INDEX idx_admins_user_id            ON admins(user_id);
CREATE INDEX idx_entities_parent            ON entities(parent_entity_id) WHERE parent_entity_id IS NOT NULL;
