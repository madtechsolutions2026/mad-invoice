# Database Schema Blueprint
## Bulk Invoice Automation Platform — MadTech Solutions

---

## 1. Entity Relationships

Our system database is structured around standard PostgreSQL relational tables, utilizing a composite isolation structure for SaaS capability.

```text
  +------------------+
  |     Tenants      |
  +------------------+
        |
        +---+---------------+---------------+
        |   |               |               |
        v   v               v               v
  +-----------+     +-----------+     +-----------+
  |   Users   |     | Companies |     | Customers |
  +-----------+     +-----------+     +-----------+
        |                 |                 |
        |                 |                 |
        v                 v                 v
  +-----------------------------------------------+
  |                 Invoices                      |
  +-----------------------------------------------+
                        |
                        v
  +-----------------------------------------------+
  |               Invoice Items                   |
  +-----------------------------------------------+
```

---

## 2. Table Optimizations & Indexing Strategy

To maintain queries at sub-200ms when tables scale to millions of historical records, we declare targeted indexes:

### Indexes
* `CREATE INDEX idx_invoices_tenant_company ON invoices(tenant_id, company_id);`
  * Speeds up dashboard card totals aggregation and list querying.
* `CREATE UNIQUE INDEX idx_unique_invoice_no ON invoices(tenant_id, company_id, invoice_number);`
  * Prevents double-billing races at the database layer.
* `CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);`
  * Eliminates N+1 queries when loading items for standard PDF generation.
* `CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);`
  * Accelerates listing logs.
