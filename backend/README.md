# BiometricPlatform — Backend v1

FastAPI · PostgreSQL · SQLAlchemy · Alembic · JWT · Uvicorn

---

## Folder Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── users.py          # POST /register, GET /profile/:id
│   │   ├── otp.py            # POST /send, POST /verify
│   │   └── uploads.py        # POST /photo
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py           # SQLAlchemy User model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user_schema.py    # Pydantic request / response
│   │   ├── otp_schema.py
│   │   └── upload_schema.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── otp_service.py    # In-memory OTP store + generation
│   │   ├── upload_service.py # File validation & disk write
│   │   └── user_service.py   # DB CRUD helpers
│   └── core/
│       ├── __init__.py
│       ├── config.py         # Pydantic-settings (reads .env)
│       ├── database.py       # SQLAlchemy engine + session
│       └── security.py       # JWT helpers
├── alembic/
│   ├── versions/
│   │   └── 0001_initial.py  # Create users table
│   ├── env.py
│   └── script.py.mako
├── uploads/
│   └── selfies/             # Uploaded selfie images (gitignored)
├── alembic.ini
├── main.py                   # FastAPI app + lifespan
├── requirements.txt
├── .env                      # Environment variables (DO NOT COMMIT)
└── BiometricPlatform.postman_collection.json
```

---

## 1 — Prerequisites

- Python 3.11+
- PostgreSQL 14+ running locally (or via Docker)

---

## 2 — PostgreSQL Setup

```sql
-- Connect as superuser
psql -U postgres

-- Create the database
CREATE DATABASE biometric_db;

-- (Optional) Create a dedicated app user
CREATE USER biometric_user WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE biometric_db TO biometric_user;
\q
```

Update `DATABASE_URL` in `.env` if you used a dedicated user:
```
DATABASE_URL=postgresql://biometric_user:strongpassword@localhost:5432/biometric_db
```

---

## 3 — Installation

```bash
# Clone / enter the backend directory
cd backend

# Create and activate a virtual environment
python3.11 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## 4 — Environment Variables

Copy and edit `.env` (already created; review before running):

```bash
# The most important values to change:
SECRET_KEY=your-super-secret-jwt-key-change-in-production-min-32-chars
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/biometric_db
```

---

## 5 — Database Migrations

### Option A — Alembic (recommended for production)

```bash
# Apply all migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

### Option B — Auto-create (dev only)

The app calls `create_tables()` on startup which runs
`Base.metadata.create_all()`. Tables are created automatically the first
time you start the server if they don't already exist.

---

## 6 — Run the Server

```bash
# Development (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Interactive docs: http://localhost:8000/docs  
ReDoc:           http://localhost:8000/redoc  
Health check:    http://localhost:8000/health

---

## 7 — API Reference & curl Examples

### Health check
```bash
curl http://localhost:8000/health
```

### Step 1 — Upload selfie
```bash
curl -X POST http://localhost:8000/api/upload/photo \
  -F "file=@/path/to/selfie.jpg"
# Response: { "photo_url": "uploads/selfies/<uuid>.jpg", ... }
```

### Step 2 — Register user
```bash
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Arjun Sharma",
    "country_code": "+91",
    "phone": "9876543210",
    "photo_url": "uploads/selfies/<uuid-from-step-1>.jpg"
  }'
# Response: { "message": "User created successfully", "user_id": 1, ... }
```

### Step 3 — Send OTP
```bash
curl -X POST http://localhost:8000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"country_code": "+91", "phone": "9876543210"}'
# Response: { "otp": "482910", "expires_in_seconds": 600, ... }
# Copy the otp value for the next step.
```

### Step 4 — Verify OTP
```bash
curl -X POST http://localhost:8000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "+91",
    "phone": "9876543210",
    "otp": "482910"
  }'
# Response: { "is_phone_verified": true, "access_token": "<jwt>", ... }
```

### Step 5 — Fetch profile
```bash
curl http://localhost:8000/api/users/profile/1
```

---

## 8 — Postman

Import `BiometricPlatform.postman_collection.json` into Postman.

The collection includes:
- Auto-capture of `otp_code` from the send-OTP response
- Auto-capture of `access_token` from the verify-OTP response
- Collection variables: `base_url`, `user_id`, `otp_code`, `token`

---

## 9 — v2 TODO Placeholders

| Feature | File | Marker |
|---|---|---|
| Real SMS gateway (Twilio/SNS) | `services/otp_service.py` | `_send_sms_placeholder` |
| Redis OTP store | `services/otp_service.py` | `OTPStore` class |
| Face detection pre-check | `services/upload_service.py` | TODO comment |
| Face embedding (FaceNet/DeepFace) | `models/user.py` | `face_embedding_vector` |
| Fingerprint template (ISO 19794-2) | `models/user.py` | `fingerprint_template` |
| S3 / GCS storage | `services/upload_service.py` | TODO comment |
| Face-recognition login endpoint | `app/api/` | New router to create |
| Fingerprint SDK integration | `app/api/` | New router to create |

---

## 10 — Running Tests (stub)

```bash
pip install pytest httpx
pytest tests/ -v
```

*(Test files are not included in v1 but the structure is ready to add.)*
