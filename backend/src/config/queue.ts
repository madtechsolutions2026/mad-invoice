import { Queue } from 'bullmq';
import Redis from 'ioredis';
import redisConfig from './redis';
import { processInvoiceJob } from '../workers/processor';

export const INVOICE_QUEUE_NAME = 'invoice-generation';

// Concurrency-controlled In-Memory Queue for local execution without Redis
class InMemoryConcurrencyPool {
  private queue: any[] = [];
  private activeCount = 0;
  private maxConcurrency = 20; // PDFKit is pure Node.js — no browser, safe to run 20 parallel renders

  push(data: any) {
    this.queue.push(data);
    this.next();
  }

  private next() {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const data = this.queue.shift();
      this.activeCount++;

      (async () => {
        try {
          await prismaUpdateToPending(data.tenantId, data.batchId, data.companyId, data.customerId, data.invoiceNumber);
          await processInvoiceJob(data);
        } catch (err) {
          console.error(`[Queue] Inline invoice render failed for ${data.invoiceNumber}:`, err);
        } finally {
          this.activeCount--;
          this.next();
        }
      })();
    }
  }
}

const localPool = new InMemoryConcurrencyPool();

class InvoiceQueueWrapper {
  private queue: Queue | null = null;
  private useRedis = false;
  private checkPromise: Promise<boolean>;

  constructor() {
    console.log('[Queue] Initializing queue system...');
    
    // Check if we can reach Redis on port 6379
    const testRedis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 2000,
      maxRetriesPerRequest: 0,
    });

    this.checkPromise = new Promise((resolve) => {
      testRedis.on('connect', () => {
        console.log('[Queue] Redis connection established. Using BullMQ queue.');
        this.useRedis = true;
        this.queue = new Queue(INVOICE_QUEUE_NAME, {
          connection: redisConfig,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        });
        testRedis.disconnect();
        resolve(true);
      });

      testRedis.on('error', (err) => {
        console.warn('[Queue] Redis is unreachable. Using Managed In-Memory Concurrency Pool.');
        this.useRedis = false;
        testRedis.disconnect();
        resolve(false);
      });
    });
  }

  async add(name: string, data: any, options?: any) {
    const hasRedis = await this.checkPromise;

    if (hasRedis && this.queue) {
      try {
        console.log(`[Queue] Queueing invoice ${data.invoiceNumber} in BullMQ`);
        return await this.queue.add(name, data, options);
      } catch (err) {
        console.warn('[Queue] Failed to queue via BullMQ. Falling back to in-memory pool.', err);
        localPool.push(data);
      }
    } else {
      localPool.push(data);
    }
  }
}

async function prismaUpdateToPending(tenantId: string, batchId: string, companyId: string, customerId: string, invoiceNumber: string) {
  try {
    const prisma = require('./db').default;
    const existing = await prisma.invoice.findFirst({
      where: { tenantId, companyId, invoiceNumber },
    });
    if (!existing) {
      await prisma.invoice.create({
        data: {
          tenantId,
          batchId,
          companyId,
          customerId,
          invoiceNumber,
          invoiceDate: new Date(),
          placeOfSupply: 'N/A',
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTax: 0,
          totalAmount: 0,
          status: 'PENDING',
        }
      });
    }
  } catch (err) {
    console.error('[Queue] Failed to pre-seed pending invoice:', err);
  }
}

export const invoiceQueue = new InvoiceQueueWrapper() as any;
