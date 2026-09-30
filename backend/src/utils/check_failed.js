const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const failedInvoices = await prisma.invoice.findMany({
    where: { status: 'FAILED' },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: { id: true, invoiceNumber: true, errorMessage: true }
  });
  console.log('Failed Invoices:', JSON.stringify(failedInvoices, null, 2));
}

run().finally(() => prisma.$disconnect());
