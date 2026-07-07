# Getting Started Guide

Follow this guide to get the full-stack system configured, built, and running in your local development environment.

---

## 1. Prerequisites

Make sure you have the following installed on your machine:

* **Python 3.10+** (with `pip` and `venv`)
* **Node.js 16+** (with `npm`)
* **PostgreSQL** running locally

---

## 2. Environment Configurations

### Backend Configuration

Create a `.env` file in the `backend/` directory.

Example `backend/.env`:

```env
DATABASE_URL="postgresql+asyncpg://postgres:charan@localhost:5432/customer_registration"
JWT_SECRET=hello
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60
CUSTOMER_JWT_EXPIRY_MINUTES=30
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
OTP_EXPIRY_SECONDS=300
```

### Frontend Configuration

If needed, create a `.env` file in the `frontend/` directory to override the API server address.

Example `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

---

## 3. Database Initialization (Quick Setup)

We have simplified the installation process with a single setup script. Run the following command from the project root:

```bash
python backend/setup_db.py
```

### What this script does:

1. **Auto-Venv Fallback**: Detects if your active shell is missing dependencies like `asyncpg` and automatically re-executes itself using the `.venv` interpreter.
2. **Database Recreation**: Connects to your PostgreSQL engine, terminates active connections to the target database (`customer_registration`), drops it, and recreates it.
3. **Schema Initialization**: Reads and runs all SQL structures from `backend/schema.sql`.
4. **Seed Default Admin**: Creates a default Admin user:
   * **Username**: `admin`
   * **Password**: `admin@123`
   * **Admin ID**: Displays a random UUID (used for API testing).
5. **Alembic Stamp**: Stamps the database with the current migration revision (`head`) so Alembic is fully synchronized.

---

## 4. Running the Servers

### Run Backend (FastAPI)

Run these commands in a terminal window:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

The API server will launch at `http://localhost:8000` with interactive docs available at `http://localhost:8000/docs`.

### Run Frontend (React + Vite)

Run these commands in a separate terminal window:

```bash
cd frontend
npm install
npm run dev
```

The React frontend will serve at `http://localhost:5173`.

---

## 5. Running Tests

### Backend Tests

Execute Python tests using `pytest`:

```bash
cd backend
source .venv/bin/activate
pytest
```

### Frontend Tests

Execute JavaScript tests using Vitest:

```bash
cd frontend
npm test
```
