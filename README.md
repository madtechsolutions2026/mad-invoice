# MadTech Solutions | Bulk Invoice Automation Platform

An enterprise-grade, multi-tenant bulk invoice generation and management platform designed for Chartered Accountants (CAs), accounting firms, and businesses. It features an Excel/CSV column mapper, real-time decimal-safe tax validation, and queue-based background PDF rendering.

---

## Technical Architecture Overview

The platform is designed around a monorepo setup:
* **Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide React, and Recharts.
* **Backend:** Express, TypeScript, Prisma ORM, and Zod.
* **Queue System:** BullMQ backed by Redis for asynchronous worker pipelines.
* **PDF Render Engine:** Puppeteer (Chromium headless browser) for pixel-perfect A4 printing.
* **Database:** PostgreSQL for strongly typed relational mappings.
* **Storage Provider:** R2/S3 compatible API with a local file storage fallback.

---

## Directory Structure

```text
bulk-invoice-platform/
├── frontend/             # Vite + React Client
│   ├── src/
│   │   ├── components/   # Steppers, Column Mappers, Dialogs
│   │   ├── pages/        # Dashboard, Invoices, Masters, Reports, Audit Logs
│   │   ├── main.tsx
│   │   └── App.tsx
├── backend/              # Express API Server & BullMQ Worker
│   ├── prisma/           # Prisma Schemas & Database Seeds
│   ├── src/
│   │   ├── config/       # Redis, BullMQ, and DB pools
│   │   ├── middleware/   # Tenant resolver, Auth / RBAC guards
│   │   ├── modules/      # Features: Auth, Companies, Customers, Imports, Batches, Invoices, Reports
│   │   ├── workers/      # BullMQ PDF Generation worker
│   │   └── utils/        # Decimal tax math, HTML templates, Storage Provider
├── package.json          # Monorepo configuration
```

---

## Local Quick Start

### 1. Prerequisites
Make sure you have the following installed on your machine:
* **Node.js** (v18.x or above)
* **PostgreSQL**
* **Redis** (used by BullMQ)

### 2. Configuration Setup
Create a `.env` file in the `backend/` folder (we have auto-copied `.env.example` to `.env` during setup):
```ini
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mad_invoice?schema=public"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
JWT_SECRET="madtech_secret_super_secure_key_12345"
STORAGE_DIR="./storage"
```

### 3. Install Dependencies
Run from the project root:
```bash
npm install
```

### 4. Run Migrations & Database Seed
Apply DB structures and seed the default billing companies, user credentials, and customers:
```bash
npm run db:migrate
npm run db:seed
```

### 5. Launch Services
Open separate terminals for running the background tasks:
* **API Server:**
  ```bash
  npm run start:backend
  ```
* **Queue Background Worker:**
  ```bash
  npm run start:worker
  ```
* **Frontend Vite Dev Client:**
  ```bash
  npm run start:frontend
  ```

Once all services are up:
* Open `http://localhost:3000` to access the platform.
* Sign in with:
  * **Email:** `admin@madtech.com`
  * **Password:** `Admin@123`

---

## Documentation Folders
Detailed architectural blueprints and operating guides are located in the `/docs` directory:
* **[Architecture.md](file:///c:/Users/madte/OneDrive/Desktop/mad%20invoice/docs/Architecture.md):** System flow diagrams and monorepo configurations.
* **[Database.md](file:///c:/Users/madte/OneDrive/Desktop/mad%20invoice/docs/Database.md):** ER layout mapping and indexing rules.
* **[API.md](file:///c:/Users/madte/OneDrive/Desktop/mad%20invoice/docs/API.md):** Endpoint signatures and payload examples.
* **[Security.md](file:///c:/Users/madte/OneDrive/Desktop/mad%20invoice/docs/Security.md):** RBAC matrices and tenant sandbox designs.
* **[GST-Considerations.md](file:///c:/Users/madte/OneDrive/Desktop/mad%20invoice/docs/GST-Considerations.md):** Indian billing requirements checklist.
