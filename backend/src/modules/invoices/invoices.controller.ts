import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware } from '../../middleware/auth.middleware';
import StorageProvider from '../../utils/storage';
import { logAuditAction } from '../audit/audit.service';

const router = Router();

// GET /api/invoices - Query invoices with filters, search, and pagination
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const search = req.query.search as string || '';
  const status = req.query.status as string || 'all';
  const companyId = req.query.companyId as string || '';
  const batchId = req.query.batchId as string || '';

  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {
      tenantId: req.tenantId,
      ...(status !== 'all' && { status }),
      ...(companyId && { companyId }),
      ...(batchId && { batchId }),
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

export default router;
import * as path from 'path';
