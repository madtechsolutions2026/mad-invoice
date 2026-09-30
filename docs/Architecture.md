# Architecture Design Document
## Bulk Invoice Automation Platform — MadTech Solutions

---

## 1. Monorepo Layout & Workspace Setup

We utilize npm workspaces to link folders inside the root project directory:
* **Root Scope:** Orchestrates overall builds, cross-workspace runs, and standard linting.
* **Workspace `backend`:** Exposes RESTful APIs on Express and runs a detached event worker on `pdf-generation.worker.ts`.
* **Workspace `frontend`:** Configures hot-reloads using Vite, React, and Tailwind CSS.

---

## 2. Asynchronous Queue Processing Architecture

To safely support batches of 1,000+ invoices without overloading memory or timing out HTTP connections:
1. **Validation Phase:** The accountant uploads a file. The validation engine performs validation checks. The file is temporarily cached and saved to a database table `ImportRowLog`.
2. **Job Queueing:** When the generation request is triggered, the API groups the validation logs by invoice number. For each invoice, it submits a BullMQ job payload containing the metadata.
3. **Event Broker (Redis):** Redis queues the jobs. If multiple workers are spawned, they consume from the Redis queue concurrently.
4. **Recycling Puppeteer browser:** Chromium tabs are opened and closed per PDF generation. Every 100 invoice generations, the worker shuts down the browser instance and launches a fresh one to prevent memory leaks.
5. **Batch Zipping:** When the worker detects that the completed count matching this batch matches the total batch count, it streams a ZIP file using `archiver` straight to the storage bucket.

```text
+--------------+        1. Upload & Validate        +----------------------+
|  React Client| =================================> | Express API Endpoint |
+--------------+                                    +----------------------+
       ^                                                       ||
       || 4. Polling                                           || 2. Submits Jobs
       ||    Progress                                          \/
+--------------+                                    +----------------------+
|  Database/R2 | <================================= |    BullMQ Queue      |
+--------------+         3. Save PDF & ZIP          +----------------------+
                                                               ||
                                                               \/
                                                    +----------------------+
                                                    |  Puppeteer Workers   |
                                                    +----------------------+
```
