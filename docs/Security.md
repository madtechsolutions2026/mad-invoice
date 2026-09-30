# Security & RBAC Specifications
## Bulk Invoice Automation Platform — MadTech Solutions

---

## 1. Multi-Tenant Isolation Safeguards

We implement logical multi-tenant separation using a shared database with tenant constraints:
1. **Tenant Middleware Scoping:** The `tenantMiddleware` resolves `req.tenantId` on every request. Any Prisma DB query uses `where: { tenantId: req.tenantId }`. This makes it impossible to view or modify records belonging to another tenant firm.
2. **File Download Guards:** The file server endpoint `/api/invoices/download-file` verifies if the target storage key belongs to the authenticated tenant before transmitting the file buffer. This prevents directory traversal or unauthorized link sharing.

---

## 2. Role-Based Access Control (RBAC) Matrix

We enforce three tiers of roles:

| Module Feature | Admin | Accountant | Viewer |
| :--- | :--- | :--- | :--- |
| **Manage Tenant Settings** | Yes | No | No |
| **CRUD Company Profiles** | Yes | No | No |
| **CRUD Customer Master** | Yes | Yes | No |
| **Upload Excel & Validate** | Yes | Yes | No |
| **Generate Bulk PDF Batches** | Yes | Yes | No |
| **Download PDF/ZIP** | Yes | Yes | Yes |
| **View Audit Trail Logs** | Yes | No | No |
| **Read Dashboard Reports** | Yes | Yes | Yes |
