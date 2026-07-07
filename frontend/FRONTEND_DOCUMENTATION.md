# Frontend Documentation

This file explains how the frontend is structured, how authentication works, what each main page does, and how the frontend connects to the backend.

## Tech Stack

- React 18
- Vite
- React Router
- Axios
- Tailwind CSS
- Framer Motion
- React Hook Form
- Zod

## Folder Structure

Main frontend code is inside [src](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src).

Important folders:

- `src/pages`
  - All screen-level pages
- `src/services`
  - API calls to backend
- `src/context`
  - Auth state and toast state
- `src/routes`
  - Route protection and route mapping
- `src/layouts`
  - Shared page shells and auth layouts
- `src/components`
  - Reusable UI components
- `src/styles`
  - Global styling

## Entry Flow

Frontend starts from:

- [src/main.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/main.jsx)
- [src/App.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/App.jsx)

Flow:

1. React app mounts
2. `BrowserRouter` is enabled
3. `ToastProvider` is loaded
4. `AuthProvider` is loaded
5. `AppRoutes` renders the correct portal routes

## Route System

Defined in [src/routes/AppRoutes.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/routes/AppRoutes.jsx).

### Public routes

- `/auth/admin/login`
- `/auth/entity/login`
- `/customer`

### Admin protected routes

- `/admin/dashboard`
- `/admin/register-entity`
- `/admin/entities`
- `/admin/forms`
- `/admin/qr`
- `/admin/audit-logs`
- `/admin/reports`
- `/admin/settings`

### Entity protected routes

- `/entity/dashboard`
- `/entity/forms`
- `/entity/qr`
- `/entity/customers`
- `/entity/certificates`
- `/entity/profile`

### Route protection

Handled in [src/routes/ProtectedRoute.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/routes/ProtectedRoute.jsx).

How it works:

- If there is no session token, user is redirected to admin login
- If a user opens the wrong portal route, they are redirected to the correct dashboard for their stored portal

## Authentication System

Handled by:

- [src/context/AuthContext.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/context/AuthContext.jsx)
- [src/services/authService.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/authService.js)
- [src/services/api/client.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/api/client.js)
- [src/utils/storage.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/utils/storage.js)

### Session flow

1. User logs in
2. Token and portal info are stored in local storage
3. Axios attaches `Authorization: Bearer <token>` to requests
4. If backend returns `401`, session is cleared and user is redirected to `/auth/admin/login`

### Admin login

Page:

- [src/pages/auth/AdminLoginPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/auth/AdminLoginPage.jsx)

Uses:

- `POST /auth/admin/login`
- `POST /auth/admin/forgot-id`

Behavior:

- Admin enters `admin_code` and `password`
- On success, frontend stores session as `portal: "admin"`
- Forgot ID flow accepts phone number and shows returned admin code

### Entity OTP login

Page:

- [src/pages/auth/EntityLoginPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/auth/EntityLoginPage.jsx)

Uses:

- `POST /auth/entity/login/request-otp`
- `POST /auth/entity/login/verify-otp`

Behavior:

1. Entity enters `gst_no` and `phone`
2. Frontend requests OTP
3. User enters OTP
4. On success, frontend stores session as `portal: "entity"`

## API Client

Configured in [src/services/api/client.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/api/client.js).

Default backend base URL:

`http://127.0.0.1:8000/api/v1`

Can be overridden with:

`VITE_API_BASE_URL`

### Service files

- [src/services/authService.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/authService.js)
- [src/services/adminService.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/adminService.js)
- [src/services/entityService.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/entityService.js)
- [src/services/publicService.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/publicService.js)
- [src/services/customerService.js](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/services/customerService.js)

## Layouts

### Auth layout

File:

- [src/layouts/AuthLayout.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/layouts/AuthLayout.jsx)

Used for:

- Admin login
- Entity login

Purpose:

- Shared branded login shell
- Portal switcher at top

### App shell

File:

- [src/layouts/AppShell.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/layouts/AppShell.jsx)

Purpose:

- Sidebar navigation
- Portal-aware layout
- Logout action
- Common wrapper for all protected pages

## Admin Portal Functionality

### 1. Admin Dashboard

File:

- [src/pages/admin/AdminDashboardPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/AdminDashboardPage.jsx)

What it does:

- Shows main admin actions
- Shows recent entities
- Shows recent audit logs
- Acts as the business workflow landing page

Backend usage:

- `GET /admin/entities`
- `GET /admin/audit-logs`

### 2. Register Entity

File:

- [src/pages/admin/RegisterEntityPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/RegisterEntityPage.jsx)

What it does:

- Collects entity registration details
- Sends registration payload to backend
- Shows created reference ID after success

Backend usage:

- `POST /admin/entities`

Fields used:

- `name`
- `gstNo`
- `businessType`
- `address`
- `contactPerson`
- `phone`
- `email`

### 3. Entity Management

File:

- [src/pages/admin/EntityManagementPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/EntityManagementPage.jsx)

What it does:

- Lists entities
- Allows search by text
- Allows delete action

Backend usage:

- `GET /admin/entities`
- `DELETE /admin/entities/{entity_id}`

### 4. Dynamic Forms

File:

- [src/pages/admin/AdminFormsPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/AdminFormsPage.jsx)

What it does:

- Presents form-related business stage in admin workflow
- Shows entities relevant to form preparation

Backend usage currently visible in page data:

- `GET /admin/entities`

Note:

- The admin UI presents forms as an admin workflow stage.
- Internal backend integration may be expanded later without changing this admin-facing flow.

### 5. QR Management

File:

- [src/pages/admin/AdminQrManagementPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/AdminQrManagementPage.jsx)

What it does:

- Presents QR generation workflow as an admin-owned feature
- Shows action cards for:
  - Generate QR
  - Preview QR
  - Download QR
  - Assign QR
  - QR Status
- Shows entity cards with QR-related status blocks

Current backend state:

- UI shows `Backend Integration Pending` where the business action exists in UI but full direct admin-side integration is not yet completed

### 6. Audit Logs

File:

- [src/pages/admin/AuditLogsPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/AuditLogsPage.jsx)

What it does:

- Displays audit activity records

Backend usage:

- `GET /admin/audit-logs`

### 7. Reports

File:

- [src/pages/admin/AdminReportsPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/AdminReportsPage.jsx)

What it does:

- Combines existing entity and audit data into a simple operational report view

Backend usage:

- `GET /admin/entities`
- `GET /admin/audit-logs`

### 8. Settings

File:

- [src/pages/admin/AdminSettingsPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/admin/AdminSettingsPage.jsx)

What it does:

- Shows admin session-related profile details returned during login

## Entity Portal Functionality

### 1. Entity Dashboard

File:

- [src/pages/entity/EntityDashboardPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/entity/EntityDashboardPage.jsx)

What it does:

- Welcomes logged-in entity
- Shows high-level cards:
  - Assigned QR
  - Registered Customers
  - Certificates Issued
  - Profile Completion

Data source:

- Primarily derived from the stored authenticated session

### 2. Entity Forms

File:

- [src/pages/entity/EntityFormsPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/entity/EntityFormsPage.jsx)

What it does:

- Loads available field types
- Loads existing forms
- Supports creating a form draft
- Supports adding/removing fields
- Supports preview
- Supports publish/unpublish actions

Backend usage:

- `GET /entity/forms`
- `POST /entity/forms`
- `POST /entity/forms/{form_id}/publish`

Main local state:

- `formsData`
- `draft`
- `selectedFormId`

### 3. My QR Code

File:

- [src/pages/entity/EntityQrPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/entity/EntityQrPage.jsx)

What it does:

- Loads existing forms
- Lets user choose a form
- Fetches QR preview data for selected form

Backend usage:

- `GET /entity/forms`
- `GET /entity/forms/{form_id}/qr-code`

### 4. Profile

File:

- [src/pages/entity/EntityProfilePage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/entity/EntityProfilePage.jsx)

What it does:

- Displays entity information stored in authenticated session
- Calculates simple profile completion percentage

### 5. Certificates

File:

- [src/pages/entity/EntityCertificatesPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/entity/EntityCertificatesPage.jsx)

What it does:

- Placeholder page for certificate-related work

### 6. Customers

Route currently uses:

- [src/pages/common/PlaceholderPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/common/PlaceholderPage.jsx)

What it does:

- Shows coming-soon style placeholder for customer management section

## Customer Portal

File:

- [src/pages/customer/CustomerComingSoonPage.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/pages/customer/CustomerComingSoonPage.jsx)

What it does:

- Shows `Coming Soon`
- No customer backend flow is active here yet

## Reusable Components

Important reusable UI components:

- [src/components/ui/Button.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/ui/Button.jsx)
- [src/components/ui/Card.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/ui/Card.jsx)
- [src/components/ui/Input.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/ui/Input.jsx)
- [src/components/ui/SectionHeading.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/ui/SectionHeading.jsx)
- [src/components/ui/EmptyState.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/ui/EmptyState.jsx)
- [src/components/ui/Skeleton.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/ui/Skeleton.jsx)
- [src/components/ui/Badge.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/ui/Badge.jsx)

Navigation component:

- [src/components/navigation/PortalSwitcher.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/components/navigation/PortalSwitcher.jsx)

## Toast System

Handled in [src/context/ToastContext.jsx](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/context/ToastContext.jsx).

What it does:

- Shows temporary notification messages
- Used for success and error feedback after API calls

## Global Styling

Main global stylesheet:

- [src/styles/index.css](C:/Users/KUSHAL%20NAYAK/Downloads/security-project/frontend/src/styles/index.css)

What it controls:

- Light enterprise visual theme
- Base typography
- Background styling
- Shared shell styling

## How To Run Frontend

From project root:

```powershell
cd frontend
npm install
npm run dev
```

Typical local URL:

`http://localhost:5173`

## Backend Requirement

The frontend expects backend API access.

Default API base URL:

`http://127.0.0.1:8000/api/v1`

If needed, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Quick Functional Summary

### Admin side

- Login
- Forgot admin code
- Dashboard
- Register entity
- Manage entities
- View dynamic-form workflow stage
- View QR management stage
- View audit logs
- View reports
- View settings

### Entity side

- OTP login
- Dashboard
- Forms workspace
- View QR
- Profile
- Certificates placeholder
- Customers placeholder

### Customer side

- Coming soon page

