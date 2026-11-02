import * as path from 'path';
import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware } from '../../middleware/auth.middleware';
import StorageProvider from '../../utils/storage';
import { logAuditAction } from '../audit/audit.service';
import { processInvoiceJob } from '../../workers/processor';

const router = Router();

// GET /api/invoices - Query invoices with filters, search, and pagination
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const search = req.query.search as string || '';
  const status = req.query.status as string || 'all';
  const companyId = req.query.companyId as string || '';
  const batchId = req.query.batchId as string || '';
  const paymentStatus = req.query.paymentStatus as string || '';

  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {
      tenantId: req.tenantId,
      ...(status !== 'all' && { status }),
      ...(companyId && { companyId }),
      ...(batchId && { batchId }),
      ...(paymentStatus && paymentStatus !== 'all' && { paymentStatus }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { legalName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where: whereClause,
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
        include: {
          company: { select: { legalName: true } },
          customer: { select: { legalName: true } },
        },
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    return res.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});

// GET /api/invoices/download-file - Secure local storage downloader with tenant check
router.get('/download-file', authMiddleware, async (req: Request, res: Response) => {
  const key = req.query.key as string;

  if (!key) {
    return res.status(400).json({ error: 'Storage key is required' });
  }

  try {
    // SECURITY GUARD: Ensure the file metadata belongs to the authenticated tenant
    let accessGranted = false;

    if (key.startsWith('invoices/')) {
      const invoice = await prisma.invoice.findFirst({
        where: { pdfStorageKey: key, tenantId: req.tenantId },
      });
      if (invoice) accessGranted = true;
    } else if (key.startsWith('batches/')) {
      const batch = await prisma.invoiceBatch.findFirst({
        where: { zipStorageKey: key, tenantId: req.tenantId },
      });
      if (batch) accessGranted = true;
    }

    if (!accessGranted) {
      return res.status(403).json({ error: 'Unauthorized: File does not belong to this tenant scope' });
    }

    // Retrieve file buffer
    const fileBuffer = await StorageProvider.getFile(key);
    
    // Determine content type
    let contentType = 'application/octet-stream';
    if (key.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (key.endsWith('.zip')) {
      contentType = 'application/zip';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
    return res.send(fileBuffer);
  } catch (error: any) {
    console.error('Download error:', error);
    return res.status(404).json({ error: 'Requested file not found or expired' });
  }
});

// GET /api/invoices/:id - Details of an invoice with line items
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        company: true,
        customer: true,
        items: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const downloadUrl = invoice.pdfStorageKey 
      ? await StorageProvider.getSignedUrl(invoice.pdfStorageKey)
      : null;

    return res.json({
      invoice,
      downloadUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve invoice details' });
  }
});

// POST /api/invoices/manual - Create and immediately render a single manual invoice
router.post('/manual', authMiddleware, async (req: Request, res: Response) => {
  const {
    companyId,
    customerId,
    invoiceNumber,
    invoiceDate,
    dueDate,
    placeOfSupply,
    poNumber,
    poDate,
    remarks,
    items,
  } = req.body;

  if (!companyId || !customerId) {
    return res.status(400).json({ error: 'companyId and customerId are required' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one invoice line item is required' });
  }

  try {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: req.tenantId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Resolve invoice number
    let finalInvoiceNumber = (invoiceNumber || '').trim();
    if (!finalInvoiceNumber) {
      const { nextNo, prefix } = await prisma.$transaction(async (tx) => {
        const company = await tx.company.findFirst({
          where: { id: companyId, tenantId: req.tenantId },
        });

        if (!company) {
          throw new Error('Company not found');
        }

        const currentNo = company.invoiceStartingNo;
        await tx.company.update({
          where: { id: companyId },
          data: { invoiceStartingNo: currentNo + 1 },
        });

        return { nextNo: currentNo, prefix: company.invoicePrefix || 'INV/' };
      });

      finalInvoiceNumber = `${prefix}${String(nextNo).padStart(5, '0')}`;
    }

    // Check for existing invoice with this number
    const existing = await prisma.invoice.findFirst({
      where: {
        tenantId: req.tenantId,
        companyId,
        invoiceNumber: finalInvoiceNumber,
      },
    });

    if (existing) {
      return res.status(400).json({
        error: `Invoice number "${finalInvoiceNumber}" already exists for this billing company.`,
      });
    }

    const resolvedPlaceOfSupply = placeOfSupply || customer.state;

    const formattedItems = items.map((it: any) => ({
      hsnSac: (it.hsnSac || '9983').toString().trim(),
      description: (it.description || '').toString().trim(),
      quantity: parseFloat(it.quantity) || 1,
      unit: (it.unit || 'NOS').toString().trim(),
      rate: parseFloat(it.rate) || 0,
      discount: parseFloat(it.discount) || 0,
      gstRate: parseFloat(it.gstRate) || 0,
    }));

    // Process & generate PDF immediately
    await processInvoiceJob({
      tenantId: req.tenantId,
      batchId: null,
      companyId,
      customerId,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      placeOfSupply: resolvedPlaceOfSupply,
      poNumber: poNumber || null,
      poDate: poDate || null,
      dueDate: dueDate || null,
      remarks: remarks || null,
      items: formattedItems,
    });

    const created = await prisma.invoice.findFirst({
      where: {
        tenantId: req.tenantId,
        companyId,
        invoiceNumber: finalInvoiceNumber,
      },
      include: {
        company: true,
        customer: true,
        items: true,
      },
    });

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'INVOICE_MANUALLY_CREATED',
      entityName: 'Invoice',
      entityId: created?.id,
      metadata: { invoiceNumber: finalInvoiceNumber, totalAmount: created?.totalAmount },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      invoice: created,
      message: `Invoice ${finalInvoiceNumber} generated successfully`,
    });
  } catch (error: any) {
    console.error('Manual invoice creation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create manual invoice' });
  }
});

// PATCH /api/invoices/:id/payment - Update payment status
router.patch('/:id/payment', authMiddleware, async (req: Request, res: Response) => {
  const { paymentStatus, paymentDate, paymentAmount, paymentNote } = req.body;

  if (!paymentStatus || !['PAID', 'UNPAID', 'PARTIAL'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'Invalid paymentStatus. Must be PAID, UNPAID, or PARTIAL' });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        paymentStatus,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
        paymentNote: paymentNote || null,
      },
    });

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'INVOICE_PAYMENT_UPDATED',
      entityName: 'Invoice',
      entityId: invoice.id,
      ipAddress: req.ip,
      metadata: { paymentStatus, paymentAmount },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Payment update error:', error);
    return res.status(500).json({ error: 'Failed to update payment status' });
  }
});

export default router;
