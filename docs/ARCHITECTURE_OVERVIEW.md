
# Architecture Overview

This document describes the design patterns, layer divisions, file layout, and data models of the Customer Registration & Certificate Management System.

---

## 1. Backend Architecture (FastAPI)

The backend follows a clean, layered architecture separating request management, schema validation, business logic, and database schemas.

### Media & Static File Delivery
- Mounted the `uploads/` directory on FastAPI to serve images and documents at `/uploads`.
- Saves uploaded files with UUID prefixes to avoid name collision.

### Database Additions
- **`documents`**: Stores file metadata, type (logo, photo, certificate), and local server path linked to entities and users.

```
backend/
├── app/
│   ├── api/             # API Routers & Presentation Layer
│   │   └── v1/          # Endpoint definitions by role
│   ├── core/            # Security utilities (JWT, bcrypt) & config
│   ├── db/              # Session factory & base schema
│   ├── models/          # SQLAlchemy Database entities
│   ├── schemas/         # Pydantic request/response validation schemas
│   ├── services/        # Business logic services & DB queries
│   └── utils/           # Utilities (QR generators, responses)
├── alembic/             # Version control database migrations
├── requirements.txt     # Dependency list
└── schema.sql           # Target schema SQL dump
```

### Presentation Layer (`api/v1/`)

Processes incoming HTTP requests, maps requests to Pydantic schemas, delegates business operations to services, and packages responses:

* [auth.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/api/v1/auth.py>): Endpoint routes for logging in admins, requesting entity OTPs, and logging in customers.
* [entity.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/api/v1/entity.py>): Form creation, update, publication, deletion, QR code actions, and registered customer lists.
* [public.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/api/v1/public.py>): Public form configuration retrieval and submission processing (with active/published validations).
* [customer.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/api/v1/customer.py>): Logged-in customer submission and certificate lookups.
* [admin.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/api/v1/admin.py>): Administrative functions for entities, branch management/lookups, and logs.

### Business Service Layer (`services/`)

Orchestrates application logic. Operates directly on database models:

* [auth_service.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/services/auth_service.py>): Resolves admin codes/usernames, tracks OTP verifications, and creates role-specific JWT tokens.
* [entity_service.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/services/entity_service.py>): Saves dynamic form fields, maps form submissions, and associates `User` and `EntityUser` records.
* [customer_service.py](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/backend/app/services/customer_service.py>): Gathers customer form answers and maps certificate availability.

---

## 2. Frontend Architecture (React)

The frontend is structured as a component-driven Single Page Application (SPA).

```
frontend/
├── src/
│   ├── components/      # UI primitives (Button, Input, Card) & PortalSwitcher
│   ├── context/         # AuthContext (sessions) & ToastContext (toasts)
│   ├── layouts/         # Shared screen layouts (AppShell sidebar, AuthLayout)
│   ├── pages/           # Portals (admin, entity, customer, public)
│   ├── routes/          # Protected route filters & app router mapping
│   ├── services/        # Axios API client & endpoints
│   ├── utils/           # Helper scripts (storage.js, download.js)
│   └── styles/          # Styling files (index.css)
```

### Session Authorization & Request Interceptor

* **Admin / Entity**: Sessions are managed globally through `AuthContext`. Tokens are persisted in `localStorage`.
* **Entity OTP Login State Fix**: The frontend auth flow now unwraps `response.data.data` from Axios before storing `token`, `entity`, and `role`, preventing false unauthenticated states after successful OTP verification.
* **Customer**: Sessions are managed locally via `sessionStorage` (with key `customer_session`). Because customer JWTs are short-lived and represent passwordless lookups, isolating them prevents cross-contamination of credentials.
* **Axios Request Interceptor**: The global interceptor in [client.js](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/frontend/src/services/api/client.js>) automatically injects the active Admin/Entity token. To prevent overwriting manually supplied headers (like the customer dashboard requests), the interceptor first checks if an `Authorization` header is already defined on the config before applying defaults.
* **Protected Entity Dashboard Route**: The entity dashboard is protected at `/entity/dashboard` and relies on the hydrated AuthContext state instead of a page refresh to unlock navigation.
* **Programmatic Downloads**: PDF file downloading uses the custom [download.js](<file:///Users/saicharanbk/Documents/Github%20Projects/security-project/frontend/src/utils/download.js>) utility. This converts base64 Data URIs into binary Blobs and triggers downloads programmatically, resolving browser-level data frame security blockages.

---

## 3. Database Schema

The system uses a PostgreSQL database. Below are the key entities and relationships defined in `schema.sql`:

* **`users`**: Root user credential table. Roles are `ADMIN` or `ENTITY_STAFF`.
* **`admins`**: Extra administrative metadata fields linked to `users`.
* **`entities`**: Onboarded organizations containing phone, email, and GST details. Supports hierarchical sub-branching through `parent_entity_id` (self-referencing FK) and `entity_type` (`MAIN`/`BRANCH`).
* **`entity_users`**: Mapping table linking `entities` to their registered `users` (staff).
* **`dynamic_forms`**: Forms configured by entities.
* **`form_fields`**: Columns or inputs designed for forms (e.g. text fields, select lists).
* **`qr_codes`**: Generated references storing image URLs and encoded form links.
* **`customers`**: Registered customers linked to an entity. Store their `unique_id` (e.g. `CUST-XXXXXX`).
* **`form_submissions`**: Completed submissions containing customer answers stored in JSONB format.
* **`certificates`**: Issued credentials linked to individual submissions.
* **`audit_logs`**: Tracking table auditing operations like `LOGIN` or `REGISTER`.
