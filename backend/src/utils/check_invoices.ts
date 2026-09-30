import prisma from '../config/db';

async function check() {
  try {
    const batches = await prisma.invoiceBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('--- RECENT BATCHES ---');
    batches.forEach(b => {
      console.log(`Batch ${b.id.substring(0,8)}: ${b.fileName} | Status: ${b.status} | Rows: ${b.totalRows} (Err: ${b.errorRows}, Val: ${b.validRows})`);
    });

    const invoices = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    console.log('\n--- INVOICES BY STATUS ---');
    invoices.forEach(i => {
      console.log(`${i.status}: ${i._count.id}`);
    });

    const failures = await prisma.invoice.findMany({
      where: { status: 'FAILED' },
      select: { invoiceNumber: true, errorMessage: true },
      take: 5
    });

    if (failures.length > 0) {
      console.log('\n--- RECENT FAILURES ---');
      failures.forEach(f => {
        console.log(`Invoice ${f.invoiceNumber}: ${f.errorMessage}`);
      });
    }
  } catch (err) {
    console.error('Failed to query database state:', err);
  } finally {
    process.exit(0);
  }
}

check();
