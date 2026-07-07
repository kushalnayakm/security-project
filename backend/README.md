# Customer Registration & Certificate Management System Backend

This repository now includes a FastAPI backend scaffold generated from [backend/schema.sql](/C:/Users/KUSHAL%20NAYAK/Downloads/security-project/backend/schema.sql) and [backend/documentation.md](/C:/Users/KUSHAL%20NAYAK/Downloads/security-project/backend/documentation.md).

## What is included

- Async FastAPI app with versioned routers under `app/api/v1`
- SQLAlchemy 2.0 async setup under `app/db`
- Models mapped to the PostgreSQL schema
- Alembic initial migration reflecting `schema.sql`
- Shared response envelope and exception handlers
- Service layer stubs for auth, entity, admin, and customer flows
- Basic test skeleton and environment template

## Important schema mismatch

`documentation.md` requires admin and entity users to log in with `email + password`, but `schema.sql` does not define an `email` column on `users`. Because the SQL file was treated as the primary source of truth, the `POST /auth/admin/login`, `POST /auth/entity/login`, and `POST /entity/register` routes are currently left as `501 Not Implemented` with an explicit explanation.

To fully enable those flows, update the schema and migration to add `users.email` or provide an alternate login field in the API spec.

## Quick start

1. Create a virtual environment and install requirements:
   ```bash
   python -m venv .venv
   source .venv/bin/activate    # On Windows use: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Configure settings:
   ```bash
   cp .env.example .env  # On Windows use: copy .env.example .env
   # Update the DATABASE_URL in .env if needed
   ```

3. Set up the database, schema, default admin and Alembic migrations state:
   ```bash
   python setup_db.py
   ```

4. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

## Migrations (Alembic)

For incremental schema updates in the future:
```bash
alembic upgrade head
```

## Notes

- The current implementation focuses on a faithful scaffold and core data flow.
- QR generation, PDF generation, upload handling, and notification delivery are represented as stubs and need concrete integrations.
- Entity-scoped JWT claims also depend on clarifying how entity staff identity is stored and authenticated in the schema.
