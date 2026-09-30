import { invoiceQueue } from '../config/queue';

async function check() {
  try {
    const counts = await invoiceQueue.getJobCounts();
    console.log('--- QUEUE STATUS ---');
    console.log('Waiting jobs (queued):', counts.waiting);
    console.log('Active jobs (processing):', counts.active);
    console.log('Completed jobs:', counts.completed);
    console.log('Failed jobs:', counts.failed);
    console.log('Delayed jobs:', counts.delayed);
  } catch (err) {
    console.error('Failed to read queue counts:', err);
  } finally {
    process.exit(0);
  }
}

check();
