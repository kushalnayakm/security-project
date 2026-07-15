# Frontend TODO List: Entity Self-Registration & Sub-Branch Creation

Implement the client-side screens and integration endpoints to support entity direct signup, GST document upload, and sub-branch management from inside the Entity Portal.

## 1. Direct Entity Sign Up (`/auth/entity/signup`)

- [x] Create signup routing and link it from the entity login page.
- [x] Build the registration form containing business and contact details.
- [x] Implement file upload field for the **GST Document**, **Company Logo**, and **Operator Photo**.
- [x] Handle validation rules (e.g. required fields, email format, password strength).

## 2. Branch Registration Dashboard (`/entity/branches`)

- [ ] Add "Branches" management tab/section inside the Entity Portal (Backend Integration Pending).
- [ ] Build sub-branch creation dialog/modal containing:
  - Branch Name
  - Business Type
  - Full Address
  - Contact Person Name
  - Optional: Branch-specific phone number (defaults to main organization phone if empty)
  - Optional: Branch-specific email address
- [ ] Integrate with `POST /api/v1/entity/branches` endpoint.
- [ ] Display a cards layout or a table listing all sub-branches under the organization.

## 3. Scoping & Verification View Updates

- [x] Update Entity Profile Screen to display the registered GST document download/view link and logo/photo.
- [ ] Update form builder, customer list, and QR code screens to allow the owner to select branch scope:
  - A dropdown filter showing `"All Branches"` or individual branch names.
  - Dynamically pass branch `entity_id` to query APIs.
