import prisma from '../config/db';

async function check() {
  const batchId = '0986c26c-65b9-4010-9364-2dc8cdbe2fe7';
  const invoices = await prisma.invoice.findMany({
    where: { batchId },
    select: {
      invoiceNumber: true,
      status: true,
      pdfStorageKey: true,
      customer: { select: { legalName: true } }
    }
  });
  console.log(JSON.stringify(invoices, null, 2));
  await prisma.$disconnect();
  process.exit(0);
}
check();
