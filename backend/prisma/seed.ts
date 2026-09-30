import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'madtech' },
    update: {},
    create: {
      name: 'MadTech Solutions Ltd',
      subdomain: 'madtech',
    },
  });
  console.log(`Tenant created: ${tenant.name} (${tenant.id})`);

  // 2. Create User
  const passwordHash = bcrypt.hashSync('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@madtech.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@madtech.com',
      passwordHash,
      firstName: 'MadTech',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`Admin user created: ${adminUser.email}`);

  // 3. Create Companies
  const companiesData = [
    {
      legalName: 'SHAIK & REDDY ASSOCIATES',
      tradeName: 'shaikandreddyassociates.com',
      gstin: '36AAAFS1234A1Z1',
      pan: 'AAAFS1234A',
      addressLine1: 'Hno: 2-105/3, 2nd Floor',
      addressLine2: 'Above PNB Bank, Suraram Main Road',
      city: 'Hyderabad',
      state: 'TELANGANA',
      stateCode: '36',
      pinCode: '500055',
      email: 'shaikandreddy@gmail.com',
      phone: '+919063255721',
      bankName: 'HDFC Bank',
      bankAccountNo: '50200112005848',
      bankIfsc: 'HDFC0009860',
      bankBranch: 'BAHDURPALLY',
      invoicePrefix: 'INV/',
      invoiceStartingNo: 112,
      invoiceTemplateId: 'standard_gst',
    },
    {
      legalName: 'MadTech Solutions Private Limited',
      tradeName: 'MadTech Solutions',
      gstin: '27AAAAA1111A1Z1',
      pan: 'AAAAA1111A',
      addressLine1: '101, Tech Park, Bandra East',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pinCode: '400051',
      email: 'billing@madtech.com',
      phone: '+919876543210',
      bankName: 'HDFC Bank',
      bankAccountNo: '50100223344556',
      bankIfsc: 'HDFC0000123',
      bankBranch: 'Bandra East',
      invoicePrefix: 'MTS/26-27/',
      invoiceStartingNo: 101,
      invoiceTemplateId: 'standard_gst',
    },
    {
      legalName: 'Apex Accounting Consultants',
      tradeName: 'Apex Accounting',
      gstin: '27BBBBB2222B1Z2',
      pan: 'BBBBB2222B',
      addressLine1: '505, Finance Towers, MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pinCode: '411001',
      email: 'billing@apex.com',
      phone: '+919876543211',
      bankName: 'ICICI Bank',
      bankAccountNo: '000401556677',
      bankIfsc: 'ICIC0000004',
      bankBranch: 'MG Road',
      invoicePrefix: 'APX/26-27/',
      invoiceStartingNo: 1,
      invoiceTemplateId: 'service_invoice',
    }
  ];

  for (const c of companiesData) {
    const company = await prisma.company.create({
      data: {
        ...c,
        tenantId: tenant.id,
      },
    });
    console.log(`Company created: ${company.legalName}`);
  }

  // 4. Create Customers
  const customersData = [
    {
      legalName: 'Alpha Technologies Inc',
      customerCode: 'CUST-ALPHA',
      gstin: '27CCCCC3333C1Z3',
      pan: 'CCCCC3333C',
      addressLine1: 'Sector V, Salt Lake',
      city: 'Kolkata',
      state: 'West Bengal',
      stateCode: '19', // IGST since Company is in MH (27)
      pinCode: '700091',
      email: 'finance@alphatech.com',
      phone: '+919876543220',
      contactPerson: 'Sanjay Sen',
      defaultTaxType: 'GST',
    },
    {
      legalName: 'Beta Retail Solutions',
      customerCode: 'CUST-BETA',
      gstin: '27DDDDD4444D1Z4',
      pan: 'DDDDD4444D',
      addressLine1: 'Andheri Kurla Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27', // CGST + SGST since Company is in MH (27)
      pinCode: '400059',
      email: 'accounts@betaretail.com',
      phone: '+919876543221',
      contactPerson: 'Aditi Rao',
      defaultTaxType: 'GST',
    },
    {
      legalName: 'Gamma Logistics Ltd',
      customerCode: 'CUST-GAMMA',
      gstin: '29EEEEE5555E1Z5',
      pan: 'EEEEE5555E',
      addressLine1: 'Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29', // IGST
      pinCode: '560100',
      email: 'billing@gammalogistics.com',
      phone: '+919876543222',
      contactPerson: 'Kiran Kumar',
      defaultTaxType: 'GST',
    }
  ];

  for (const cust of customersData) {
    await prisma.customer.create({
      data: {
        ...cust,
        tenantId: tenant.id,
      },
    });
  }

  // 5. Create 100 Sample Retainer Clients and a Billing Group for 100-Invoice Bulk Testing
  console.log('Creating 100 sample retainer clients...');
  const group100 = await prisma.customerGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Shaik & Reddy 100 Monthly Retainers (₹5,000 / Client)',
      defaultAmount: 5000,
      defaultDescription: 'BOOK KEEPING AND MONTHLY GST FILING',
      hsnSac: '998311',
      gstRate: 18,
    },
  });

  const states = [
    { state: 'TELANGANA', code: '36', city: 'Hyderabad', pin: '500055' },
    { state: 'Maharashtra', code: '27', city: 'Mumbai', pin: '400059' },
    { state: 'Karnataka', code: '29', city: 'Bengaluru', pin: '560100' },
    { state: 'Tamil Nadu', code: '33', city: 'Chennai', pin: '600001' },
  ];

  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(3, '0');
    const st = states[i % states.length];
    
    const client = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        legalName: `Retainer Client ${pad} Pvt Ltd`,
        customerCode: `SR-CUST-${pad}`,
        gstin: `${st.code}AAAAA${pad}1Z${i % 9}`,
        pan: `AAAAA${pad}A`,
        addressLine1: `Plot #${i}, Industrial Tech Area`,
        city: st.city,
        state: st.state,
        stateCode: st.code,
        pinCode: st.pin,
        email: `client${pad}@shaikreddyclients.com`,
        phone: `+91900000${pad}`,
        contactPerson: `Manager Client ${pad}`,
      },
    });

    await prisma.customerGroupMember.create({
      data: {
        groupId: group100.id,
        customerId: client.id,
      },
    });
  }

  console.log('Seeding 100 clients & group completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
