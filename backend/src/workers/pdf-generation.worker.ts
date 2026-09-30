import { Worker, Job } from 'bullmq';
import redisConfig from '../config/redis';
import { processInvoiceJob } from './processor';

const worker = new Worker(
  'invoice-generation',
  async (job: Job) => {
    await processInvoiceJob(job.data);
  },
  {
    connection: redisConfig,
    concurrency: 4, // Process 4 jobs concurrently using shared persistent Chromium instance
  }
);

console.log('BullMQ Invoice Generation Worker running...');
