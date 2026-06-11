# Biometric Identity Verification Platform

## Workflow Contract

The implementation keeps the finalized workflow unchanged:

- Mobile registration:
  `Shop QR -> Face Capture -> Face Photo Upload -> Device Biometric Check -> Name -> Phone -> OTP -> Verify OTP -> Create Account -> Dashboard`
- Returning mobile login:
  `Shop QR -> Camera Opens -> Face Recognition -> Match Found -> Dashboard`
- Mobile fallback:
  `Shop QR -> Face Recognition Failed -> Phone OTP Verification -> Dashboard`
- Desktop login:
  `Desktop Website -> QR Display -> Mobile Scan -> Mobile Authentication -> Approve Login -> Desktop Dashboard`

## Backend Architecture

- `FastAPI` exposes session-driven auth routes in `backend/app/api/auth.py`.
- `SQLAlchemy` models in `backend/app/models/user.py` store users, QR auth sessions, and OTP challenges.
- `JWT` access tokens are issued after face match, OTP fallback, or first-time registration completion.
- `Alembic` migration `backend/alembic/versions/0001_initial.py` reflects the current schema.
- `Face recognition` is architected behind service boundaries now and can be replaced later with `InsightFace`.
- `Uploads` remain local for now through `backend/app/services/upload_service.py`, ready for future `AWS S3`.

## Database Design

### `users`

- `id`
- `name`
- `country_code`
- `phone_number`
- `face_photo_url`
- `face_embedding`
- `face_profile_key`
- `biometric_supported`
- `biometric_registered`
- `phone_verified`
- `account_active`
- `created_at`
- `updated_at`

### `auth_sessions`

- `id`
- `session_token`
- `session_type`
- `status`
- `location_code`
- `location_name`
- `device_label`
- `fallback_reason`
- `desktop_approved`
- `registration_payload`
- `access_token`
- `user_id`
- `face_attempts`
- `created_at`
- `updated_at`
- `expires_at`

### `otp_challenges`

- `id`
- `purpose`
- `country_code`
- `phone_number`
- `otp_code`
- `attempts`
- `max_attempts`
- `verified_at`
- `created_at`
- `expires_at`
- `session_id`
- `user_id`

## Frontend Architecture

- `frontend/src/pages/Home/Home.tsx`
  Provides the product entry point, sample shop QR destinations, and desktop QR launch.
- `frontend/src/pages/DesktopLogin/DesktopLogin.tsx`
  Creates and polls the WhatsApp-style desktop login session.
- `frontend/src/pages/MobileSession/MobileSession.tsx`
  Runs mobile face capture, registration, OTP fallback, and desktop approval from the same session engine.
- `frontend/src/pages/Dashboard/Dashboard.tsx`
  Displays profile photo, user name, verification state, face registered, phone verified, biometric registered, and account active.
- `frontend/src/lib/api.ts`
  Centralizes frontend-to-backend contracts.
- `frontend/src/lib/storage.ts`
  Stores remembered identity data for returning mobile sessions in the current demo implementation.

## Future Integration Points

- Replace demo face matching with `InsightFace`.
- Replace local upload storage with `AWS S3`.
- Replace OTP display with real SMS delivery and rate limiting.
- Add `pgvector` for scalable embedding search.
- Add `Redis` for distributed OTP/session caching if traffic grows.
