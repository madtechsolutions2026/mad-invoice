import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';
import multer from 'multer';
import * as xlsx from 'xlsx';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET /api/customers - List all customers with pagination, search, and status filter
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const search = req.query.search as string || '';
  const status = req.query.status as string || 'all';

  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {
      tenantId: req.tenantId,
      ...(status !== 'all' && { isActive: status === 'active' }),
      ...(search && {
        OR: [
          { legalName: { contains: search, mode: 'insensitive' } },
          { customerCode: { contains: search, mode: 'insensitive' } },
          { gstin: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { legalName: 'asc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    return res.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch customers error:', error);
    return res.status(500).json({ error: 'Failed to retrieve customers' });
  }
});

// POST /api/customers/bulk-import - Import customers from CSV/Excel
router.post(
  '/bulk-import',
  authMiddleware,
  requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet) as any[];

      if (rows.length === 0) {
        return res.status(400).json({ error: 'File is empty or has no data rows' });
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const legalName = (row['Customer Name'] || row['legalName'] || '').toString().trim();
        const addressLine1 = (row['Address Line 1'] || row['addressLine1'] || '').toString().trim();
        const city = (row['City'] || row['city'] || '').toString().trim();
        const state = (row['State'] || row['state'] || '').toString().trim();
        const stateCode = (row['State Code'] || row['stateCode'] || '').toString().trim();
        const pinCode = (row['PIN Code'] || row['pinCode'] || '').toString().trim();

        if (!legalName || !city || !state || !stateCode || !pinCode) {
          errors.push(`Row ${rowNum}: Missing required fields (Customer Name, City, State, State Code, PIN Code)`);
          skipped++;
          continue;
        }

        const customerCode = (row['Customer Code'] || row['customerCode'] || '').toString().trim() || null;

        try {
          // Upsert by customerCode if provided, else by legalName+tenantId
          if (customerCode) {
            const existing = await prisma.customer.findFirst({
              where: { tenantId: req.tenantId, customerCode },
            });

            if (existing) {
              await prisma.customer.update({
                where: { id: existing.id },
                data: {
                  legalName,
                  gstin: (row['GSTIN'] || row['gstin'] || null)?.toString().trim() || null,
                  pan: (row['PAN'] || row['pan'] || null)?.toString().trim() || null,
                  addressLine1,
                  addressLine2: (row['Address Line 2'] || row['addressLine2'] || null)?.toString().trim() || null,
                  city,
                  state,
                  stateCode,
                  pinCode,
                  email: (row['Email'] || row['email'] || null)?.toString().trim() || null,
                  phone: (row['Phone'] || row['phone'] || null)?.toString().trim() || null,
                  contactPerson: (row['Contact Person'] || row['contactPerson'] || null)?.toString().trim() || null,
                  defaultTaxType: (row['Tax Type'] || row['defaultTaxType'] || 'GST').toString().trim(),
                },
              });
              updated++;
            } else {
              await prisma.customer.create({
                data: {
                  tenantId: req.tenantId,
                  legalName,
                  customerCode,
                  gstin: (row['GSTIN'] || row['gstin'] || null)?.toString().trim() || null,
                  pan: (row['PAN'] || row['pan'] || null)?.toString().trim() || null,
                  addressLine1,
                  addressLine2: (row['Address Line 2'] || row['addressLine2'] || null)?.toString().trim() || null,
                  city,
                  state,
                  stateCode,
                  pinCode,
                  email: (row['Email'] || row['email'] || null)?.toString().trim() || null,
                  phone: (row['Phone'] || row['phone'] || null)?.toString().trim() || null,
                  contactPerson: (row['Contact Person'] || row['contactPerson'] || null)?.toString().trim() || null,
                  defaultTaxType: (row['Tax Type'] || row['defaultTaxType'] || 'GST').toString().trim(),
                  isActive: true,
                },
              });
              created++;
            }
          } else {
            await prisma.customer.create({
              data: {
                tenantId: req.tenantId,
                legalName,
                customerCode: null,
                gstin: (row['GSTIN'] || row['gstin'] || null)?.toString().trim() || null,
                pan: (row['PAN'] || row['pan'] || null)?.toString().trim() || null,
                addressLine1,
                addressLine2: (row['Address Line 2'] || row['addressLine2'] || null)?.toString().trim() || null,
                city,
                state,
                stateCode,
                pinCode,
                email: (row['Email'] || row['email'] || null)?.toString().trim() || null,
                phone: (row['Phone'] || row['phone'] || null)?.toString().trim() || null,
                contactPerson: (row['Contact Person'] || row['contactPerson'] || null)?.toString().trim() || null,
                defaultTaxType: (row['Tax Type'] || row['defaultTaxType'] || 'GST').toString().trim(),
                isActive: true,
              },
            });
            created++;
          }
        } catch (rowError: any) {
          errors.push(`Row ${rowNum}: ${rowError.message}`);
          skipped++;
        }
      }

      await logAuditAction({
        tenantId: req.tenantId,
        userId: req.userId,
        action: 'CUSTOMERS_BULK_IMPORTED',
        entityName: 'Customer',
        metadata: { created, updated, skipped, totalRows: rows.length },
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        summary: { totalRows: rows.length, created, updated, skipped },
        errors: errors.slice(0, 20), // return max 20 error messages
      });
    } catch (error: any) {
      console.error('Customer bulk import error:', error);
      return res.status(500).json({ error: 'Failed to process customer import file' });
    }
  }
);

// GET /api/customers/export - Export all customers as Excel file
router.get('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { legalName: 'asc' },
    });

    const exportData = customers.map((c) => ({
      'Customer Name': c.legalName,
      'Customer Code': c.customerCode || '',
      'GSTIN': c.gstin || '',
      'PAN': c.pan || '',
      'Address Line 1': c.addressLine1,
      'Address Line 2': c.addressLine2 || '',
      'City': c.city,
      'State': c.state,
      'State Code': c.stateCode,
      'PIN Code': c.pinCode,
      'Email': c.email || '',
      'Phone': c.phone || '',
      'Contact Person': c.contactPerson || '',
      'Tax Type': c.defaultTaxType,
      'Status': c.isActive ? 'Active' : 'Inactive',
      'Created At': c.createdAt.toLocaleDateString('en-IN'),
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(exportData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
      { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
      { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Customer Master');

    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Customer_Master_${today}.xlsx"`);
    return res.send(excelBuffer);
  } catch (error) {
    console.error('Customer export error:', error);
    return res.status(500).json({ error: 'Failed to export customer data' });
  }
});

// GET /api/customers/:id - Single customer details
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenantId,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve customer' });
  }
});

// POST /api/customers - Create customer
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const data = req.body;

  if (!data.legalName || !data.addressLine1 || !data.city || !data.state || !data.stateCode || !data.pinCode) {
    return res.status(400).json({
      error: 'Required fields missing: legalName, addressLine1, city, state, stateCode, pinCode',
    });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        tenantId: req.tenantId,
        legalName: data.legalName,
        customerCode: data.customerCode || null,
        gstin: data.gstin || null,
        pan: data.pan || null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state,
        stateCode: data.stateCode,
        pinCode: data.pinCode,
        email: data.email || null,
        phone: data.phone || null,
        contactPerson: data.contactPerson || null,
        defaultTaxType: data.defaultTaxType || 'GST',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CUSTOMER_CREATED',
      entityName: 'Customer',
      entityId: customer.id,
      ipAddress: req.ip,
    });

    return res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    return res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const data = req.body;

  try {
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        legalName: data.legalName,
        customerCode: data.customerCode,
        gstin: data.gstin,
        pan: data.pan,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        stateCode: data.stateCode,
        pinCode: data.pinCode,
        email: data.email,
        phone: data.phone,
        contactPerson: data.contactPerson,
        defaultTaxType: data.defaultTaxType,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CUSTOMER_UPDATED',
      entityName: 'Customer',
      entityId: customer.id,
      ipAddress: req.ip,
    });

    return res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id - Delete a customer
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenantId,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer has any associated invoices
    const invoiceCount = await prisma.invoice.count({
      where: {
        customerId: req.params.id,
        tenantId: req.tenantId,
      },
    });

    if (invoiceCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${customer.legalName}" because ${invoiceCount} invoice(s) are associated with them. Please mark them as inactive instead to preserve accounting history.`,
      });
    }

    // Remove from customer group members first if present
    await prisma.customerGroupMember.deleteMany({
      where: { customerId: req.params.id },
    });

    // Delete customer
    await prisma.customer.delete({
      where: { id: req.params.id },
    });

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CUSTOMER_DELETED',
      entityName: 'Customer',
      entityId: customer.id,
      metadata: { legalName: customer.legalName, customerCode: customer.customerCode },
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `Customer "${customer.legalName}" was deleted successfully.` });
  } catch (error: any) {
    console.error('Delete customer error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete customer' });
  }
});

// POST /api/customers/bulk-delete - Delete multiple customers
router.post('/bulk-delete', authMiddleware, async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No customer IDs provided for deletion' });
  }

  try {
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: ids },
        tenantId: req.tenantId,
      },
    });

    let deleted = 0;
    const skipped: string[] = [];

    for (const cust of customers) {
      const invoiceCount = await prisma.invoice.count({
        where: { customerId: cust.id, tenantId: req.tenantId },
      });

      if (invoiceCount > 0) {
        skipped.push(`${cust.legalName} (${invoiceCount} invoice(s) linked)`);
        continue;
      }

      await prisma.customerGroupMember.deleteMany({
        where: { customerId: cust.id },
      });

      await prisma.customer.delete({
        where: { id: cust.id },
      });

      deleted++;
    }

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CUSTOMERS_BULK_DELETED',
      entityName: 'Customer',
      metadata: { requestedCount: ids.length, deleted, skippedCount: skipped.length, skipped },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      deleted,
      skipped,
      message: `Successfully deleted ${deleted} customer(s).${skipped.length > 0 ? ` Skipped ${skipped.length} with existing invoices.` : ''}`,
    });
  } catch (error: any) {
    console.error('Bulk delete customer error:', error);
    return res.status(500).json({ error: error.message || 'Failed to bulk delete customers' });
  }
});

export default router;
