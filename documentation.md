# API Documentation
## Customer Registration & Certificate Management System

This document maps every screen/action in the four user flows (Admin, Entity/Organization, System, Customer) to a concrete REST API endpoint, so the frontend can wire up calls directly. All endpoints are prefixed with `/api/v1`. Authentication uses JWT bearer tokens for Admin/Entity users, and a lightweight "unique ID" session token for Customers.

---

## 1. Authentication Model

| Actor | Login Method | Token Type | Notes |
|---|---|---|---|
| Admin | email + password | JWT (role=ADMIN) | Full access to entities, customers, admins table |
| Entity Staff | email + password | JWT (role=ENTITY_STAFF) | Scoped to their own `entity_id` via `entity_users` |
| Customer | `unique_id` only | Short-lived session JWT | No password; issued once, re-enterable anytime |

All protected endpoints require `Authorization: Bearer <token>` header. Entity-scoped endpoints are further restricted server-side by checking `entity_users` for the calling user's `entity_id`.

---

## 2. Admin Flow APIs

Maps to: Login → View Entities → Manage Entity (Add/Remove/Update) → View Customers & Reports → Remove Customer → Logout

| Step | Method & Endpoint | Request Body | Response | Table(s) Touched |
|---|---|---|---|---|
| Login to Admin Account | `POST /auth/admin/login` | `{ email, password }` | `{ token, admin }` | users, admins |
| View Entities | `GET /admin/entities` | — (query: `?status=&page=`) | `[{ entity_id, name, gstNo, status, customerCount }]` | entities, customers (count) |
| View single entity detail | `GET /admin/entities/{entityId}` | — | entity details + submission stats | entities, dynamic_forms, form_submissions |
| Add Entity | `POST /admin/entities` | `{ name, gstNo, businessType, address, contactPerson, phone, email }` | `{ entity_id }` | entities |
| Update Entity | `PATCH /admin/entities/{entityId}` | any updatable fields | `{ entity_id, updated }` | entities |
| Remove Entity | `DELETE /admin/entities/{entityId}` | — | `{ success: true }` | entities (cascades to forms, customers) |
| View Customers under an entity | `GET /admin/entities/{entityId}/customers` | — (query: `?status=&page=`) | `[{ customer_id, unique_id, name, phone, status, submittedAt }]` | customers, form_submissions |
| View Reports | `GET /admin/reports?entityId=&from=&to=` | — | aggregated submission/certificate counts | form_submissions, certificates |
| Remove Customer | `DELETE /admin/customers/{customerId}` | — | `{ success: true }` | customers (cascades to submissions, certs) |
| Logout | `POST /auth/logout` | — | `{ success: true }` | — |

### Developer/Admin-only extras (from `admins` table)

| Action | Method & Endpoint | Notes |
|---|---|---|
| Modify any customer data directly | `PATCH /admin/customers/{customerId}` | Requires `admins.can_manage_customers = true` |
| Modify any entity directly | `PATCH /admin/entities/{entityId}` | Requires `admins.can_manage_entities = true` |
| View audit trail | `GET /admin/audit-logs?targetType=&targetId=` | Reads audit_logs |

---

## 3. Entity/Organization Flow APIs

Maps to: Register Organization → Login → Create Dynamic Form → Save & Publish → Generate QR → Share/Download QR → View Submissions → Review Submissions → Generate Certificate → Send Notification → Logout

| Step | Method & Endpoint | Request Body | Response | Table(s) Touched |
|---|---|---|---|---|
| Register Organization | `POST /entity/register` | `{ name, gstNo, businessType, address, contactPerson, email, phone, password }` | `{ entity_id, user_id }` | entities, users, entity_users |
| Login to Entity Account | `POST /auth/entity/login` | `{ email, password }` | `{ token, entity }` | users, entity_users |
| Get Form-Builder Elements | `GET /entity/forms` | — (query: `?formId=` optional, to prefill for edit) | `{ availableFieldTypes: [{ type, label, supportsOptions }], existingForms: [{ form_id, title, isActive, createdAt }] }` | dynamic_forms, form_fields (returns building-block metadata, not a single form) |
| Create Dynamic Form | `POST /entity/forms` | `{ title, description, fields: [{ label, type, isRequired, options, order }] }` | `{ form_id }` | dynamic_forms, form_fields |
| Update Form (drag & drop edit) | `PATCH /entity/forms/{formId}` | `{ title?, description?, fields? }` | `{ form_id, updated }` | dynamic_forms, form_fields |
| Save & Publish Form | `POST /entity/forms/{formId}/publish` | `{ isActive: true }` | `{ form_id, isActive }` | dynamic_forms |
| Generate QR Code | `POST /entity/forms/{formId}/qr-code` | — | `{ qr_id, qrCodeData, qrImageUrl }` | qr_codes |
| Share/Download QR | `GET /entity/forms/{formId}/qr-code` | — | QR image binary/URL | qr_codes |
| View Submitted Data | `GET /entity/forms/{formId}/submissions` | — (query: `?page=&from=&to=`) | `[{ submission_id, customer_id, data, submittedAt }]` | form_submissions |
| View single Customer detail | `GET /entity/customers/{customerId}` | — | customer + latest submission | customers, form_submissions |
| Review Submission | `GET /entity/submissions/{submissionId}` | — | full submission with field labels mapped | form_submissions, form_fields |
| Generate Certificate | `POST /entity/submissions/{submissionId}/certificate` | `{ pdfUrl }` or multipart PDF upload | `{ certificate_id, issueDate }` | certificates |
| Logout | `POST /auth/logout` | — | `{ success: true }` | — |

### Sample form-builder GET response

```json
// GET /entity/forms
{
  "availableFieldTypes": [
    { "type": "TEXT", "label": "Short Text", "supportsOptions": false },
    { "type": "NUMBER", "label": "Number", "supportsOptions": false },
    { "type": "DATE", "label": "Date", "supportsOptions": false },
    { "type": "EMAIL", "label": "Email", "supportsOptions": false },
    { "type": "PHONE", "label": "Phone", "supportsOptions": false },
    { "type": "SELECT", "label": "Dropdown", "supportsOptions": true },
    { "type": "RADIO", "label": "Radio Group", "supportsOptions": true },
    { "type": "CHECKBOX", "label": "Checkbox", "supportsOptions": true }
  ],
  "existingForms": [
    { "form_id": "f1a2b3c4-...", "title": "KYC Form", "isActive": true, "createdAt": "2026-06-01T10:00:00Z" }
  ]
}
```

---

## 4. System (Backend Internal) APIs

These are internal service calls triggered automatically by the above actions (System column in the flow diagram); the frontend does not call these directly, but they explain what happens behind each Entity/Admin action.

| Trigger | Internal Action | Table(s) Touched |
|---|---|---|
| Entity registers | Validate GST/email uniqueness, hash password, create entity + user rows | entities, users, entity_users |
| Form published | Persist form + fields, mark isActive | dynamic_forms, form_fields |
| QR generated | Encode form_id into QR payload, generate image, save URL | qr_codes |
| Customer submits form | Validate against form_fields, generate unique_id, store JSONB data | customers, form_submissions |
| Certificate generated | Render PDF, store URL, link to submission | certificates |

---

## 5. Customer Flow APIs

Maps to: Scan QR → View Form → Fill Details → Enter Unique ID (if required) → Submit → Receive Confirmation → Check Certificate → Download/View Certificate

| Step | Method & Endpoint | Request Body | Response | Table(s) Touched |
|---|---|---|---|---|
| Scan QR / View Form | `GET /public/forms/{formId}` | — | `{ form_id, title, fields: [...] }` | dynamic_forms, form_fields |
| Submit Form | `POST /public/forms/{formId}/submit` | `{ entityId, data: { field_id: value, ... } }` | `{ submission_id, unique_id }` | customers, form_submissions |
| Re-login with Unique ID | `POST /customer/login` | `{ unique_id }` | `{ token, customer }` | customers |
| View My Submission | `GET /customer/me/submission` | — (auth via unique_id session) | `{ submission, formFields }` | form_submissions, form_fields |
| Check Certificate Status | `GET /customer/me/certificate` | — | `{ available: bool, certificate? }` | certificates |
| Download Certificate | `GET /customer/me/certificate/download` | — | PDF binary/URL | certificates |

### Sample submit request/response

```json
// POST /public/forms/{formId}/submit
{
  "entityId": "e1a2b3c4-...",
  "data": {
    "field_1a2b": "John Doe",
    "field_3c4d": "9876543210",
    "field_5e6f": "john@example.com",
    "field_7g8h": "1995-04-12",
    "field_9i0j": "Salaried",
    "field_k1l2": "Male"
  }
}
```

```json
// Response
{
  "submission_id": "s9f8e7d6-...",
  "unique_id": "CUST-7X9K2M",
  "message": "Save this Unique ID to check your submission or certificate later."
}
```

---

## 6. Frontend-to-Backend Communication Flow

1. **Entity onboarding**: Frontend calls `/entity/register` → on success, redirect to entity login → `/auth/entity/login` stores JWT in memory/secure storage.
2. **Form builder**: Frontend drag-and-drop UI first calls `GET /entity/forms` to fetch available field types (and existing forms list) to populate the builder palette, then calls `POST /entity/forms` to create the form, then `/entity/forms/{formId}/publish`, then immediately `/entity/forms/{formId}/qr-code` to render the QR on screen.
3. **Customer journey**: QR encodes a public URL like `https://app.com/f/{formId}`; scanning opens `GET /public/forms/{formId}` (no auth), customer fills and calls `/public/forms/{formId}/submit`, frontend then displays the returned `unique_id` prominently with a "copy/save" prompt.
4. **Customer return visit**: Frontend shows a single input for `unique_id`, calls `/customer/login`, stores the short-lived session token, then calls `/customer/me/submission` and `/customer/me/certificate` to render the dashboard.
5. **Entity certificate workflow**: Frontend polls or lets staff manually trigger `/entity/submissions/{id}/certificate`, then `/entity/submissions/{id}/notify` to alert the customer; customer's next login/poll on `/customer/me/certificate` reflects `available: true`.
6. **Admin oversight**: Frontend admin dashboard calls `/admin/entities` (with `customerCount` aggregated server-side) and drills into `/admin/entities/{id}/customers`; delete actions call the respective `DELETE` endpoints, each of which is recorded via internal audit_logs write (not a separate frontend call).

---

## 7. Standard Response Envelope

All endpoints return a consistent shape for easier frontend handling:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": { "code": "ENTITY_NOT_FOUND", "message": "No entity found with this ID." }
}
```

---

## 8. HTTP Status Code Conventions

| Code | Meaning |
|---|---|
| 200 | Successful GET/PATCH |
| 201 | Successful POST (resource created) |
| 400 | Validation error (e.g., missing required field) |
| 401 | Missing/invalid token |
| 403 | Authenticated but not authorized (e.g., entity staff accessing another entity's data) |
| 404 | Resource not found (entity, customer, form, unique_id) |
| 409 | Conflict (duplicate GST no, duplicate unique_id) |
| 500 | Internal server error |