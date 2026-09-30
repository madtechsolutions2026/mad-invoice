import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware } from '../../middleware/auth.middleware';
import { invoiceQueue } from '../../config/queue';
import { BatchStatus, RowValidationStatus } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';

const router = Router();

// GET /api/customer-groups - List all billing groups with members count
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const groups = await prisma.customerGroup.findMany({
      where: { tenantId: req.tenantId },
      include: {
        members: {
          include: {
            customer: {
              select: { id: true, legalName: true, customerCode: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    // Format list
    const formatted = groups.map(g => ({
      id: g.id,
      name: g.name,
      defaultAmount: parseFloat(g.defaultAmount.toString()),
      defaultDescription: g.defaultDescription,
      hsnSac: g.hsnSac,
      gstRate: parseFloat(g.gstRate.toString()),
      createdAt: g.createdAt,
      memberCount: g.members.length,
      members: g.members.map(m => ({
        id: m.customer.id,
        legalName: m.customer.legalName,
        customerCode: m.customer.customerCode,
      }))
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch groups error:', error);
    return res.status(500).json({ error: 'Failed to retrieve billing groups' });
  }
});

// POST /api/customer-groups - Create a new billing group
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { name, defaultAmount, defaultDescription, hsnSac, gstRate } = req.body;

  if (!name || defaultAmount === undefined || !defaultDescription) {
    return res.status(400).json({ error: 'Missing fields: name, defaultAmount, and defaultDescription are required' });
  }

  try {
    const group = await prisma.customerGroup.create({
      data: {
        tenantId: req.tenantId,
        name,
        defaultAmount: parseFloat(defaultAmount),
        defaultDescription,
        hsnSac: hsnSac || '9983',
        gstRate: gstRate !== undefined ? parseFloat(gstRate) : 18.0,
      }
    });

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CUSTOMER_GROUP_CREATED',
      entityName: 'CustomerGroup',
      entityId: group.id,
      metadata: { name: group.name },
    });

    return res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ error: 'Failed to create billing group' });
  }
});

// POST /api/customer-groups/:id/members - Sync group memberships (takes an array of customerIds)
router.post('/:id/members', authMiddleware, async (req: Request, res: Response) => {
  const { customerIds } = req.body; // array of customer IDs

  if (!Array.isArray(customerIds)) {
    return res.status(400).json({ error: 'customerIds must be an array' });
  }

  try {
    const group = await prisma.customerGroup.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Billing group not found' });
    }

    // Run in a transaction to replace old members
    await prisma.$transaction([
      prisma.customerGroupMember.deleteMany({
        where: { groupId: group.id }
      }),
      prisma.customerGroupMember.createMany({
        data: customerIds.map(cid => ({
          groupId: group.id,
          customerId: cid
        }))
      })
    ]);

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CUSTOMER_GROUP_MEMBERS_SYNCED',
      entityName: 'CustomerGroup',
      entityId: group.id,
      metadata: { memberCount: customerIds.length },
    });

    return res.json({ message: 'Members synced successfully', count: customerIds.length });
  } catch (error) {
    console.error('Sync group members error:', error);
    return res.status(500).json({ error: 'Failed to sync group memberships' });
  }
});

// POST /api/customer-groups/:id/generate - Trigger bulk invoice generation for the group
router.post('/:id/generate', authMiddleware, async (req: Request, res: Response) => {
  const { companyId, invoiceDate, dueDate, customDescription, remarks } = req.body;

  if (!companyId || !invoiceDate) {
    return res.status(400).json({ error: 'Required fields: companyId and invoiceDate are required' });
  }

  try {
    // 1. Get Group and Members
    const group = await prisma.customerGroup.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        members: {
          include: { customer: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Billing group not found' });
    }

    if (group.members.length === 0) {
      return res.status(400).json({ error: 'Cannot generate invoices for an empty group. Assign customers first.' });
    }

    // 2. Lock & Increment Company Invoices Sequence
    const { startNo, prefix } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: { id: companyId, tenantId: req.tenantId },
      });

      if (!company) {
        throw new Error('Billing company not found');
      }

      const currentStart = company.invoiceStartingNo;
      const nextStart = currentStart + group.members.length;

      // Update sequence in DB to reserve this block
      await tx.company.update({
        where: { id: companyId },
        data: { invoiceStartingNo: nextStart }
      });

      return {
        startNo: currentStart,
        prefix: company.invoicePrefix || 'INV/'
      };
    });

    // 3. Create Invoices Batch
    const dateObj = new Date(invoiceDate);
    const dateFormatted = dateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const fileName = `${group.name} Recurring Invoices - ${dateFormatted}`;

    const batch = await prisma.invoiceBatch.create({
      data: {
        tenantId: req.tenantId,
        companyId,
        uploadedBy: req.userId,
        fileName,
        status: BatchStatus.PROCESSING,
        totalRows: group.members.length,
        validRows: group.members.length,
        warningRows: 0,
        errorRows: 0,
        duplicateRows: 0
      }
    });

    // 4. Create row logs for historical reference on the validation screen
    const rowLogs = group.members.map((member, idx) => {
      const invoiceNumber = `${prefix}${String(startNo + idx).padStart(5, '0')}`;
      const desc = customDescription || group.defaultDescription;
      
      const itemData = {
        invoiceNumber,
        invoiceDate,
        customerCode: member.customer.customerCode || undefined,
        customerName: member.customer.legalName,
        customerGstin: member.customer.gstin || undefined,
        customerAddress: member.customer.addressLine1,
        customerCity: member.customer.city,
        customerState: member.customer.state,
        customerStateCode: member.customer.stateCode,
        customerPinCode: member.customer.pinCode,
        hsnSac: group.hsnSac,
        description: desc,
        quantity: 1,
        unit: 'NOS',
        rate: parseFloat(group.defaultAmount.toString()),
        gstRate: parseFloat(group.gstRate.toString()),
        poNumber: undefined,
      };

      return {
        batchId: batch.id,
        rowNumber: idx + 1,
        data: itemData as any,
        status: RowValidationStatus.VALID,
        issues: []
      };
    });

    await prisma.importRowLog.createMany({
      data: rowLogs
    });

    // 5. Submit individual jobs to BullMQ
    for (let idx = 0; idx < group.members.length; idx++) {
      const member = group.members[idx];
      const invoiceNumber = `${prefix}${String(startNo + idx).padStart(5, '0')}`;
      const desc = customDescription || group.defaultDescription;

      const jobData = {
        tenantId: req.tenantId,
        batchId: batch.id,
        companyId,
        customerId: member.customer.id,
        invoiceNumber,
        invoiceDate,
        placeOfSupply: member.customer.state,
        poNumber: null,
        poDate: null,
        dueDate: dueDate || null,
        remarks: remarks || null,
        items: [
          {
            hsnSac: group.hsnSac,
            description: desc,
            quantity: 1,
            unit: 'NOS',
            rate: parseFloat(group.defaultAmount.toString()),
            discount: 0,
            gstRate: parseFloat(group.gstRate.toString())
          }
        ]
      };

      await invoiceQueue.add(`group-invoice-${batch.id}-${invoiceNumber}`, jobData, {
        jobId: `${batch.id}-${invoiceNumber}` // Idempotent key
      });
    }

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'GROUP_GENERATION_STARTED',
      entityName: 'CustomerGroup',
      entityId: group.id,
      metadata: { batchId: batch.id, count: group.members.length }
    });

    return res.json({
      message: 'Group billing invoices submitted successfully',
      batchId: batch.id,
      totalInvoices: group.members.length
    });
  } catch (error: any) {
    console.error('Trigger group generation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit group billing' });
  }
});

export default router;
