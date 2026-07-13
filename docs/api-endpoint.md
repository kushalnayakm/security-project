# API Endpoint Reference and Usage Guide

This document describes all version 1 API endpoints, authentication requirements, query specifications, and payload envelopes of the Customer Registration & Certificate Management System.

---

## 1. Request/Response Envelopes

The backend API enforces a standard response envelope for all calls:

### Success Envelope
```json
{
  "status": "SUCCESS",
  "data": { ... },
  "error": null
}
```

### Error Envelope
```json
{
  "status": "ERROR",
  "data": null,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable error explanation."
  }
}
```

---

## 2. Authentication & Authorization

Protected endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Roles Structure
- **`ADMIN`**: Enforced via `require_admin` dependency.
- **`ENTITY_STAFF`**: Enforced via `require_entity_staff` dependency. Contains permission hierarchy tags:
  - `OWNER`: Full branch creation and staff write privileges.
  - `MANAGER`: Management operations within assigned branch scope.
  - `STAFF`: Read-only queries scoped to branch.
- **`CUSTOMER`**: Passwordless login via unique customer ID badges.

---

## 3. Endpoints Directory

### Authentication Router (`/api/v1/auth`)

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/auth/admin/login` | `POST` | Public | Authenticates admin using username/password. |
| `/auth/admin/forgot-id` | `POST` | Public | Requests admin unique lookup code via SMS. |
| `/auth/entity/login/request-otp` | `POST` | Public | Triggers OTP validation message to user phone. |
| `/auth/entity/login/verify-otp` | `POST` | Public | Checks OTP and issues jwt with permission scopes. |
| `/auth/entity/login` | `POST` | Public | Direct email/password login path for entity owners. |
| `/auth/customer/login` | `POST` | Public | Checks customer `unique_id` badge and logs in. |
| `/auth/logout` | `POST` | Public | Session termination indicator. |

#### Request / Response Payloads
#### `POST /auth/entity/login`
- **Request Body**:
  ```json
  {
    "email": "owner@company.com",
    "password": "strong_password"
  }
  ```
- **Response Data**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "entity": {
      "entity_id": "893cfa3f...",
      "name": "Main Office",
      "gst_no": "29ABCDE1234F1Z5",
      "entity_type": "MAIN"
    },
    "role": "ENTITY_STAFF"
  }
  ```

---

### Admin Router (`/api/v1/admin`)

Requires `ADMIN` authorization header.

| Endpoint | Method | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/admin/entities` | `GET` | `status` (optional) | Lists all registered main organizations. |
| `/admin/entities` | `POST` | None | Onboards a new entity and registers OWNER staff account. |
| `/admin/entities/{entity_id}` | `PATCH` | None | Updates details of a registered entity. |
| `/admin/entities/{entity_id}` | `DELETE` | None | Permanently drops an entity, cascading all data. |
| `/admin/entities/{entity_id}/branches` | `GET` | None | Lists all sub-branches under the specified entity. |
| `/admin/customers/{customer_id}` | `PATCH` | None | Updates a customer card's details. |
| `/admin/customers/{customer_id}` | `DELETE` | None | Removes a customer profile. |
| `/admin/audit-logs` | `GET` | `targetType`, `targetId` | Queries administrative tracking events list. |

---

### Entity Router (`/api/v1/entity`)

Requires `ENTITY_STAFF` or `ADMIN` authorization header.

| Endpoint | Method | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/entity/register` | `POST` | None | Direct entity self-registration path (requires GST upload). |
| `/entity/branches` | `POST` | None | Registers a sub-branch under the owner's organization. |
| `/entity/forms` | `GET` | `entity_id` (optional) | Lists all dynamic forms configured by this entity. |
| `/entity/forms` | `POST` | `entity_id` (optional) | Creates a new dynamic form configuration. |
| `/entity/forms/{form_id}` | `PATCH` | None | Reorders inputs, updates titles or descriptions. |
| `/entity/forms/{form_id}` | `DELETE` | None | Removes form and cascading submissions/QR codes. |
| `/entity/forms/{form_id}/publish`| `POST` | None | Publishes (`isActive: true`) or unpublishes form. |
| `/entity/forms/{form_id}/qr-code`| `POST` | `base_url` (optional) | Instantiates/regenerates form scannable QR. |
| `/entity/forms/{form_id}/qr-code`| `GET` | None | Retrieves active QR image Data URI. |
| `/entity/forms/{form_id}/welcome`| `POST` | None | Sets greeting toggles, texts, and welcome branding logo. |
| `/entity/forms/{form_id}/submissions`| `GET` | None | Lists form submissions and active certificates. |
| `/entity/submissions/{submission_id}`| `GET` | None | Gets detailed form answers keyed by field UUIDs. |
| `/entity/submissions/{submission_id}/certificate`| `POST` | None | Issues a PDF certificate (updates if existing). |
| `/entity/submissions/{submission_id}/notify`| `POST` | None | Triggers alert notifications to customers. |
| `/entity/customers` | `GET` | `entity_id` (optional) | Lists all active customers of the organization. |

#### Request / Response Payloads
#### `POST /entity/branches` (Owner Only)
- **Request Body**:
  ```json
  {
    "name": "East Regional Branch",
    "businessType": "Retail",
    "address": "456 East Road, city",
    "contactPerson": "Jane Doe",
    "phone": "9876543211", // Inherits parent phone if null
    "email": "east@company.com"
  }
  ```

---

### Staff Router (`/api/v1/entity`)

Requires `ENTITY_STAFF` or `ADMIN` authorization header.

| Endpoint | Method | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/entity/staff` | `POST` | None | Registers an employee (OWNER only). |
| `/entity/staff` | `GET` | `entity_id` | Lists branch/company staff (OWNER/MANAGER only). |
| `/entity/staff/{user_id}` | `PATCH` | None | Updates details, roles, or suspension status. |
| `/entity/staff/{user_id}` | `DELETE` | None | Deactivates staff user (soft delete). |

---

### Customer Router (`/api/v1/customer`)

Requires `CUSTOMER` authorization header.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/customer/me/submission` | `GET` | Retrieves the answers submitted by the customer. |
| `/customer/me/certificate` | `GET` | Gets the metadata and download details of the PDF certificate. |
| `/customer/me/certificate/download`| `GET` | Returns binary/base64 encoded certificate payload. |

---

### Public Router (`/api/v1/public`)

No authorization required (Public endpoints).

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/public/forms/{form_id}` | `GET` | Fetches dynamic inputs fields schema for customer filling. |
| `/public/forms/{form_id}/submit`| `POST` | Processes form registration answers and returns customer ID badge. |

#### Response Payloads
#### `GET /public/forms/{form_id}`
- **Response Data**:
  ```json
  {
    "form_id": "4a71fa9d...",
    "entity_id": "893cfa3f...",
    "title": "Visitor Registration",
    "description": "Please complete details.",
    "fields": [
      {
        "field_id": "3bb210f0...",
        "label": "Full Name",
        "type": "TEXT",
        "is_required": true,
        "options": null,
        "field_order": 0
      }
    ],
    "welcome": {
      "showWelcome": true,
      "welcomeTitle": "Welcome to Headquarters",
      "welcomeMessage": "Please check in.",
      "welcomeLogo": "data:image/png;base64,..."
    }
  }
  ```
