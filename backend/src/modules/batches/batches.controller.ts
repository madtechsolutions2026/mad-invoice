import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware } from '../../middleware/auth.middleware';
import { invoiceQueue } from '../../config/queue';
import { BatchStatus, InvoiceStatus } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';

const router = Router();

// GET /api/batches - List all batches
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const batches = await prisma.invoiceBatch.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: { legalName: true },
        },
      },
    });
    return res.json(batches);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve batches' });
  }
});

// GET /api/batches/:id - Batch statistics, details, and validation logs
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const batch = await prisma.invoiceBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        company: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const rowLogs = await prisma.importRowLog.findMany({
      where: { batchId: batch.id },
      orderBy: { rowNumber: 'asc' },
    });

    return res.json({
      batch,
      rowLogs,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve batch details' });
  }
});

// POST /api/batches/:id/generate - Trigger bulk invoice generation jobs
router.post('/:id/generate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const batch = await prisma.invoiceBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (batch.status === BatchStatus.PROCESSING || batch.status === BatchStatus.COMPLETED) {
      return res.status(400).json({ error: 'Batch is already processing or completed' });
    }

    // Read all import row logs
    const rowLogs = await prisma.importRowLog.findMany({
      where: { batchId: batch.id },
    });

    const errorRows = rowLogs.filter((r) => r.status === 'ERROR');
    if (errorRows.length > 0) {
      return res.status(400).json({
        error: 'Cannot generate invoices for a batch containing critical validation errors. Please correct and re-upload.',
      });
    }

    // Update batch state
    await prisma.invoiceBatch.update({
      where: { id: batch.id },
      data: { status: BatchStatus.PROCESSING },
    });

    // Group rows by Invoice Number
    const invoiceGroups: { [key: string]: typeof rowLogs } = {};
    rowLogs.forEach((row) => {
      const data = row.data as any;
      const invNo = String(data.invoiceNumber || '').trim();
      if (!invoiceGroups[invNo]) {
        invoiceGroups[invNo] = [];
      }
      invoiceGroups[invNo].push(row);
    });

    const uniqueInvoiceNumbers = Object.keys(invoiceGroups);

    // Queue each invoice group as a separate background job
    for (const invNo of uniqueInvoiceNumbers) {
      const items = invoiceGroups[invNo];
      const primaryData = items[0].data as any;

      // Extract customer details to look up or provision
      let customer = await prisma.customer.findFirst({
        where: {
          tenantId: req.tenantId,
          OR: [
            primaryData.customerCode ? { customerCode: primaryData.customerCode } : {},
            primaryData.customerGstin ? { gstin: primaryData.customerGstin } : {},
            { legalName: primaryData.customerName },
          ].filter(o => Object.keys(o).length > 0),
        },
      });

      // Auto-provision customer if not found
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            tenantId: req.tenantId,
            legalName: primaryData.customerName,
            customerCode: primaryData.customerCode || null,
            gstin: primaryData.customerGstin || null,
            pan: primaryData.customerPan || null,
            addressLine1: primaryData.customerAddress || 'N/A',
            city: primaryData.customerCity || 'N/A',
            state: primaryData.customerState || 'N/A',
            stateCode: primaryData.customerStateCode || 'N/A',
            pinCode: primaryData.customerPinCode || '000000',
            isActive: true,
          },
        });
      }

      // Format payload for BullMQ
      const jobData = {
        tenantId: req.tenantId,
        batchId: batch.id,
        companyId: batch.companyId,
        customerId: customer.id,
        invoiceNumber: invNo,
        invoiceDate: primaryData.invoiceDate,
        placeOfSupply: primaryData.customerState,
        poNumber: primaryData.poNumber || null,
        poDate: primaryData.poDate || null,
        dueDate: primaryData.dueDate || null,
        remarks: primaryData.remarks || null,
        items: items.map((it) => {
          const d = it.data as any;
          return {
            hsnSac: d.hsnSac,
            description: d.description,
            quantity: parseFloat(d.quantity || '0'),
            unit: d.unit || 'PCS',
            rate: parseFloat(d.rate || '0'),
            discount: parseFloat(d.discount || '0'),
            gstRate: parseFloat(d.gstRate || '0'),
          };
        }),
      };

      // Add to BullMQ
      await invoiceQueue.add(`invoice-${batch.id}-${invNo}`, jobData, {
        jobId: `${batch.id}-${invNo}`, // Set idempotent ID
      });
    }

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'BATCH_GENERATION_STARTED',
      entityName: 'InvoiceBatch',
      entityId: batch.id,
      metadata: { invoiceCount: uniqueInvoiceNumbers.length },
    });

    return res.json({
      message: 'Batch generation started in background',
      batchId: batch.id,
      totalInvoices: uniqueInvoiceNumbers.length,
    });
  } catch (error: any) {
    console.error('Trigger batch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to start batch generation' });
  }
});

// GET /api/batches/:id/progress - Get active queue progress of this batch
router.get('/:id/progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const batch = await prisma.invoiceBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Read generated status counts in DB
    const totalInvoicesCount = await prisma.invoice.count({
      where: { batchId: batch.id },
    });

    const generatedCount = await prisma.invoice.count({
      where: { batchId: batch.id, status: InvoiceStatus.GENERATED },
    });

    const failedCount = await prisma.invoice.count({
      where: { batchId: batch.id, status: InvoiceStatus.FAILED },
    });

    const totalExpected = totalInvoicesCount > 0 ? totalInvoicesCount : batch.totalRows;

    return res.json({
      status: batch.status,
      totalInvoices: totalExpected,
      generated: generatedCount,
      failed: failedCount,
      zipStorageKey: batch.zipStorageKey,
      progressPercentage: totalExpected > 0 
        ? Math.round(((generatedCount + failedCount) / totalExpected) * 100) 
        : 0,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve progress' });
  }
});

export default router;
