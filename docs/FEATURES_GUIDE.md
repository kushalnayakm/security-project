# Features Guide

This document describes the core feature workflows of the application, detailing their operational flows and user experience.

---

## 1. Dynamic Form Builder

The system provides a visual drag-and-drop form builder for both the **Entity** and **Admin** portals.

* **Interactive Drag & Drop**: Built using HTML5 native drag-and-drop APIs. Users can click and hold the `Bars3Icon` handle next to any field and drag it to rearrange. The workspace provides visual feedback by dimming the active card, scaling it down, and showing a dashed orange border to guide the drop.
* **Supported Field Types**: Includes 8 inputs:
  1. *Short Text*
  2. *Number*
  3. *Date*
  4. *Email*
  5. *Phone*
  6. *Dropdown (Select)* - accepts comma-separated options.
  7. *Radio Group* - accepts comma-separated options.
  8. *Checkbox* - accepts comma-separated options.
* **Live Preview**: The right panel dynamically renders the form layout as fields are added, edited, or reordered.
* **Editing Existing Forms**: Clicking the "Edit" button next to any existing form loads its configuration, fields, and descriptions back into the workspace. Users can then update existing fields, insert new ones, reorder, or cancel the active editing mode.
* **Admin Override**: Admin users can access this builder on behalf of any entity via query parameter `entity_id` and save or update the configuration directly.

---

## 2. Scannable QR Registration

Once a form is published, organizations can generate a QR code to distribute to customers:

* **Real QR Generation**: Generated on-demand using the backend's `qrcode[pil]` utility. It encodes a URL pointing to the customer-facing form: `{frontend_url}/form/{form_id}`.
* **Storage**: The QR image is converted into a base64-encoded PNG data URI and saved in the `qr_codes` database table.
* **Actions**: Entity staff can:
  * Preview the generated QR code directly in the browser.
  * Download the QR code as a PNG file.
  * Copy the registration form URL to share via email or messages.

---

## 3. Public Form Filling & Customer Creation

Customers scan the QR code to navigate to the public registration screen:

* **Incognito-Friendly**: The form page `/form/:formId` is public and requires no user authentication.
* **Submission Schema**: Answers are validated against the form field schema (e.g. required validations).
* **Automatic Customer Registration**: When submitted, the backend automatically generates a Customer profile linked to the Entity. It generates a unique string identifier prefix `CUST-` followed by 6 alphanumeric characters (e.g., `CUST-VJE8VH`).
* **Unique ID Success Screen**: Upon submission, a success screen highlights the customer's Unique ID with a one-click copy button, instructing them to save it to track their status.

---

## 4. Customer Portal (Passwordless Login)

The customer portal is designed to provide simple status checks without requiring complex registrations:

* **Login Page** (`/customer/login`): Customers enter their `CUST-XXXXXX` Unique ID. The backend verifies the ID and returns a `CUSTOMER` role JWT.
* **Dashboard** (`/customer/dashboard`):
  * **Submission Details Card**: Shows a read-only list of the fields and answers submitted by the customer. It parses stringified JSON structures robustly. If form fields were deleted and recreated in the database during form editing (which orphans the historical submission's field UUID keys), it falls back to matching labels by order index, ensuring submitted answers are always visible.
  * **Conditional Certificate Status Card**: The certificate status card is conditionally rendered. If the certificate is not issued yet, the card remains completely hidden, keeping the layout clean and showing only the submission details. Once issued, the card appears with the issue date and download triggers.
  * **Programmatic PDF Downloading**: Uses a modular browser download utility (`downloadBase64File`) to convert base64 Data URIs into binary Blobs programmatically. This bypasses browser-level security policies that block raw base64 data link navigations.

---

## 5. Entity Dashboard Live Submissions Feed

The Entity Dashboard displays a live feed of all completed customer registrations:

* **Live Feed**: Lists the recent submissions, including the customer's Unique ID, form title, customer name, and submission time.
* **30-Second Polling**: The page automatically polls the backend every 30 seconds to fetch and render new submissions dynamically.
* **Manual Refresh**: Includes a manual refresh button to fetch new submissions instantly.

---

## 6. Registered Customers Management

The Entity Portal features a dedicated Customer Management area (`/entity/customers`):

* **Customer Metrics**: Displays the total count of unique customers registered with the organization.
* **Fuzzy Text Search**: Users can search and filter the customer database in real-time by customer name, Unique ID, or phone number.
* **Details List**: Lists each customer's details including:
  * Unique ID (prominent badge, e.g. `CUST-A3KF7X`)
  * Full Name
  * Registered Phone number
  * Registration Date
  * Verification status (e.g. `ACTIVE`)

---

## 7. Certificate Issuance Portal

The Entity Portal features an interactive Certificate Issuance workspace (`/entity/certificates`):

* **Fuzzy Customer Lookup**: Staff can search through customer card decks by name or Unique ID. Selecting a card reveals the active customer's metadata (Unique ID, name, form name).
* **Document Uploader**: A visual drag-and-drop or click selector zone. It accepts PDF files, reads them client-side, and converts them to base64 Data URIs (`FileReader.readAsDataURL`).
* **Instant Submission**: Clicking **Send Certificate** uploads the encoded PDF string directly to the customer database record.
* **Customer Verification**: The customer can immediately log in to the Customer Portal using their Unique ID, review the details, and download the issued PDF certificate.

---

## 8. Authentication and Validation Updates

* **Admin Forgot Code Lookup**: In the Admin Login Page, requesting a forgotten code query handles validations inline. If the admin phone number is invalid (returns a `404`), it highlights the error message directly under the phone input field using form-level state validation and suppresses the generic global error toast popups.
* **Custom Auth Prioritization**: The Axios API client ignores global auth token overrides if an `Authorization` header has already been manually specified. This allows separate Customer dashboard sessions to make requests without collision with active Admin/Entity sessions.

---

## 9. Admin QR Management Workspace

The Admin Portal features a full-access QR Management workspace (`/admin/qr`):

* **Organization Selector**: Admins can browse and select any onboarded entity from the list.
* **Form & QR Inspection**: Dynamically fetches the forms designed by that organization.
* **Full Access Operations**: Admins can preview scannable QR images, copy registration URLs, generate/regenerate links, and download PNG assets on behalf of the selected organization.

---

## 10. Form Deletion & Status Validations

* **Unpublished Form Restrictions**: When an Admin or Entity user unpublishes a form (setting its `is_active` status to `false` in the database), the backend public endpoints (`GET /public/forms/{form_id}` and `POST /public/forms/{form_id}/submit`) are blocked, returning `403 Forbidden` errors. The public registration page renders a warning notification dynamically to the customer.
* **Cascade Deletion**: Both the **Admin Forms Management** (`/admin/forms`) and **Entity Forms Builder** (`/entity/forms`) pages feature a **Delete** button next to each existing form. 
* **Warning Dialog**: Triggering deletion displays a warning prompt warning the user that the action is permanent. Deleting a form calls the backend delete API, which leverages PostgreSQL foreign key cascading (`ON DELETE CASCADE`) to permanently drop all related fields, QR codes, submissions, and certificates from the database.
