# Garage Pilot

Garage Pilot is a multi-tenant garage and service center management platform built with React, Express, and MySQL.

It is designed around 2 core user roles:
- `Owner`: business insights, company settings, receptionist management
- `Receptionist`: customers, vehicles, appointments, orders, inventory, payments

Each company runs in its own workspace and its own tenant database.

## What It Does

- Owner signup creates a new service center workspace
- Each company gets a unique company code
- Owners can create receptionist accounts
- Receptionists log in with company code + username + password
- Business data stays isolated per company
- Owners get dashboard insights for revenue, customers, collections, and stock risk
- Receptionists get fast front-desk workflows for daily operations

## Current Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL with control-plane + tenant databases
- Charts: Recharts
- Auth: JWT + bcrypt

## Architecture

Garage Pilot now uses a multi-tenant design:

- Control database:
  - stores companies
  - stores tenant routing data
  - stores owner identity and authentication metadata
- Tenant database per company:
  - customers
  - vehicles
  - appointments
  - service orders
  - inventory
  - payments
  - feedback
  - audit log

This means one garage cannot access another garage’s operational data.

## Main Product Flow

1. Owner signs up and creates a service center
2. System generates a company code and provisions a tenant database
3. Owner logs in and manages the company
4. Owner creates receptionist accounts
5. Receptionist logs in using company code
6. Receptionist handles bookings, orders, customers, and payments
7. Owner monitors business performance from the dashboard

## Project Structure

```text
backend/
  config/
  middleware/
  routes/
  services/
  utils/

frontend/
  src/
    components/
    pages/
    services/
    utils/

database/
  01_schema.sql
  03_views.sql
  04_triggers.sql
  05_stored_procedures.sql
```

## Local Setup

### 1. Start MySQL

Make sure MySQL is running locally before starting the backend.

If you use Homebrew on macOS:

```bash
brew services start mysql
```

### 2. Backend Environment

Create `backend/.env` using `backend/.env.example` as reference.

Example:

```env
PORT=5005
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=autoservice_pro
CONTROL_DB_NAME=autoservice_control
JWT_SECRET=change-me-in-local-dev
```

### 3. Frontend Environment

Create `frontend/.env` using `frontend/.env.example`.

Example:

```env
VITE_API_BASE_URL=http://localhost:5005/api
```

### 4. Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

Backend runs at:

```text
http://localhost:5005
```

Health check:

```text
http://localhost:5005/api/health
```

### 6. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Demo Credentials

### Owner

- Username: `codex_owner_test`
- Password: `StrongPass123`

### Receptionist

- Company code: `GAR-EZG3IT`
- Username: `frontdesk_test`
- Password: `DeskPass123`

## Important Notes

- MySQL must be running before the backend starts
- The backend uses the control database first, then resolves the tenant database from the logged-in company
- Business routes are protected and require a valid JWT
- Owner and receptionist experiences are different by design

## Main Features Added In This Version

- Multi-tenant company architecture
- Owner signup with tenant provisioning
- Separate owner and receptionist login flows
- Company-code based receptionist access
- Role-aware navigation and dashboards
- Owner business summary metrics
- Standardized API responses and backend error handling
- Request validation for major flows
- Better form UX, toast handling, and session expiry handling
- Pagination and filters on major list pages

## Useful Commands

Start backend:

```bash
cd backend && npm run dev
```

Start frontend:

```bash
cd frontend && npm run dev
```

Build frontend:

```bash
cd frontend && npm run build
```

## Who This Project Is For

Garage Pilot is best suited for:

- garage owners who want business visibility
- reception/front-desk staff who need fast operational tools
- academic or portfolio use cases showing DBMS + full-stack architecture

## Status

This project has moved beyond the original single-tenant workshop demo and now reflects a more product-style multi-tenant garage platform with role-based workflows.
