import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Customer Billing Groups...');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('No tenant found. Seed the main database first.');
    return;
  }

  const customers = await prisma.customer.findMany({ where: { tenantId: tenant.id } });
  if (customers.length === 0) {
    console.error('No customers found. Seed the main database first.');
    return;
  }

  // Define Groups Data
  const groupsData = [
    {
      name: '₹500 Bookkeeping Group',
      defaultAmount: 500.0,
      defaultDescription: 'Monthly Accounts Bookkeeping & Ledger Maintenance Fees',
      hsnSac: '998311',
      gstRate: 18.0
    },
    {
      name: '₹1000 Compliance Group',
      defaultAmount: 1000.0,
      defaultDescription: 'Standard GST Return Filing & Compliance Advisory Fees',
      hsnSac: '998311',
      gstRate: 18.0
    },
    {
      name: '₹2000 Corporate Advisory Group',
      defaultAmount: 2000.0,
      defaultDescription: 'Premium Business Tax Consultation & Audit Support Fees',
      hsnSac: '998311',
      gstRate: 18.0
    }
  ];

  for (let idx = 0; idx < groupsData.length; idx++) {
    const data = groupsData[idx];
    
    // Create group
    const group = await prisma.customerGroup.upsert({
      where: { id: `seed-group-${idx}` },
      update: {},
      create: {
        id: `seed-group-${idx}`,
        tenantId: tenant.id,
        ...data
      }
    });

    console.log(`Created Group: ${group.name}`);

    // Link customer(s) to this group
    // Link customer index matching group index
    const targetCust = customers[idx % customers.length];
    
    await prisma.customerGroupMember.upsert({
      where: {
        groupId_customerId: {
          groupId: group.id,
          customerId: targetCust.id
        }
      },
      update: {},
      create: {
        groupId: group.id,
        customerId: targetCust.id
      }
    });
    console.log(`  Linked Client: ${targetCust.legalName}`);
  }

  console.log('Groups seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
