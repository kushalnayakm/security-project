# Customer Registration & Certificate Management System

Welcome to the documentation for the Customer Registration & Certificate Management System. This project provides a full-stack, enterprise-grade portal allowing organizations (Entities) to build custom registration forms, generate scannable QR codes for them, and onboarding customers securely. Customers can log in using their unique ID to check certificate status, while admins govern entities, forms, and logs.

---

## Documentation Index

Please refer to the detailed sections below to understand, configure, and develop on the system:

1. 🚀 **[Getting Started Guide](file:///Users/saicharanbk/Documents/Github%20Projects/security-project/docs/GETTING_STARTED.md)**
   * Prerequisites and dependency installations.
   * Single-command database setup (`setup_db.py`).
   * Quick-start instructions for running backend and frontend local servers.
   * Test suite commands (pytest / npm test).

2. 🏗️ **[Architecture Overview](file:///Users/saicharanbk/Documents/Github%20Projects/security-project/docs/ARCHITECTURE_OVERVIEW.md)**
   * Codebase directory layout (Backend & Frontend).
   * Layered architecture (FastAPI routers, schemas, services, and models).
   * React frontend layout, state contexts, and session handling.
   * Database schema and key tables.

3. ✨ **[Features Guide](file:///Users/saicharanbk/Documents/Github%20Projects/security-project/docs/FEATURES_GUIDE.md)**
   * **Dynamic Form Builder**: Drag-and-drop interactive form designer (HTML5 native, 8 supported field types).
   * **Scannable QR Registration**: Real QR code generation (`qrcode[pil]`), URL encoding, and downloads.
   * **Customer Portal**: Passwordless login via Unique ID, view submission data, and certificate retrieval.
   * **Entity Live Submissions Feed**: Real-time polling feed showing new registrations on the dashboard.
   * **Admin Management Workspace**: Role checks, entity onboarding, and form editing.

---

## Technical Stack

| Area | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Core** | FastAPI | High-performance, asynchronous REST API framework. |
| **ORM** | SQLAlchemy (Async) | Object-Relational Mapping for database queries. |
| **Migrations** | Alembic | Version-controlled database schemas. |
| **Frontend Core** | React 18 + Vite | SPA framework and build tooling. |
| **Styling** | Tailwind CSS | Utility-first CSS theme engine. |
| **HTTP Client** | Axios | Frontend API requests with token interceptors. |
| **Libraries** | qrcode[pil] | QR code generation utility. |
