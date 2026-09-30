# Operations & Troubleshooting Manual
## Bulk Invoice Automation Platform — MadTech Solutions

---

## 1. Redis Connection Failures

If you see `Redis Connection Refused` or `ioredis connection error` logs:
* **Local environment:** Ensure the Redis daemon is running locally (`redis-server`).
* **Credentials mismatch:** Verify `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` in your backend `.env`.
* **BullMQ blockages:** BullMQ requires Redis connection options to have `maxRetriesPerRequest: null`. If you are sharing a Redis client or config, verify this parameter is set.

---

## 2. Puppeteer / Headless Chromium Crash

If PDF generation throws browser spawn or execution errors:
* **Missing dependencies (Linux/Docker):** Headless Chromium requires shared packages (like `libxss1`, `libatk1.0-0`, etc.). On Debian/Ubuntu servers, make sure to configure your Dockerfile or buildpacks to download these libraries.
* **Sandbox configurations:** On restricted cloud environments, launch Puppeteer with sandbox disabled:
  ```typescript
  puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  ```
  *(This is already enabled by default in our codebase).*

---

## 3. High Memory Consumption During ZIP Compression

For large batches (e.g. 5,000+ invoices), writing all PDF files into RAM before compressing will cause Out Of Memory (OOM) crashes:
* **Mitigation:** We utilize stream-based pipe architectures (`archiver` node library) to write chunks straight to the target storage stream (either local writeStream or S3 Upload Stream), keeping memory footprint flat under 100MB.
