import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (PNG, JPG, GIF, WEBP)'));
    }
  },
});

// GET /api/companies - List all companies
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { legalName: 'asc' },
    });
    return res.json(companies);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve companies' });
  }
});

// GET /api/companies/:id - Single company details
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenantId,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    return res.json(company);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve company' });
  }
});

// POST /api/companies - Create company
router.post(
  '/',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  async (req: Request, res: Response) => {
    const data = req.body;

    if (!data.legalName || !data.gstin || !data.pan || !data.state || !data.stateCode) {
      return res.status(400).json({ error: 'Required fields missing: legalName, gstin, pan, state, stateCode' });
    }

    try {
      const company = await prisma.company.create({
        data: {
          tenantId: req.tenantId,
          legalName: data.legalName,
          tradeName: data.tradeName || null,
          gstin: data.gstin,
          pan: data.pan,
          addressLine1: data.addressLine1 || '',
          addressLine2: data.addressLine2 || null,
          city: data.city || '',
          state: data.state,
          stateCode: data.stateCode,
          pinCode: data.pinCode || '',
          email: data.email || '',
          phone: data.phone || '',
          bankName: data.bankName || null,
          bankAccountNo: data.bankAccountNo || null,
          bankIfsc: data.bankIfsc || null,
          bankBranch: data.bankBranch || null,
          invoicePrefix: data.invoicePrefix || 'INV/',
          invoiceStartingNo: parseInt(data.invoiceStartingNo || '1', 10),
          invoiceTemplateId: data.invoiceTemplateId || 'standard_gst',
        },
      });

      await logAuditAction({
        tenantId: req.tenantId,
        userId: req.userId,
        action: 'COMPANY_CREATED',
        entityName: 'Company',
        entityId: company.id,
        ipAddress: req.ip,
      });

      return res.status(201).json(company);
    } catch (error) {
      console.error('Create company error:', error);
      return res.status(500).json({ error: 'Failed to create company' });
    }
  }
);

// PUT /api/companies/:id - Update company
router.put(
  '/:id',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  async (req: Request, res: Response) => {
    const data = req.body;

    try {
      const existing = await prisma.company.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await prisma.company.update({
        where: { id: req.params.id },
        data: {
          legalName: data.legalName,
          tradeName: data.tradeName,
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
          bankName: data.bankName,
          bankAccountNo: data.bankAccountNo,
          bankIfsc: data.bankIfsc,
          bankBranch: data.bankBranch,
          invoicePrefix: data.invoicePrefix,
          invoiceStartingNo: data.invoiceStartingNo !== undefined ? parseInt(data.invoiceStartingNo, 10) : undefined,
          invoiceTemplateId: data.invoiceTemplateId,
        },
      });

      await logAuditAction({
        tenantId: req.tenantId,
        userId: req.userId,
        action: 'COMPANY_UPDATED',
        entityName: 'Company',
        entityId: company.id,
        ipAddress: req.ip,
      });

      return res.json(company);
    } catch (error) {
      console.error('Update company error:', error);
      return res.status(500).json({ error: 'Failed to update company' });
    }
  }
);

// POST /api/companies/:id/logo - Upload company logo
router.post(
  '/:id/logo',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  upload.single('logo'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }

    try {
      const company = await prisma.company.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Store logo in storage/company-assets folder
      const storageDir = path.join(process.cwd(), 'storage', 'company-assets');
      if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

      const ext = path.extname(req.file.originalname);
      const logoKey = `company-assets/${req.params.id}_logo${ext}`;
      const logoPath = path.join(process.cwd(), 'storage', logoKey);
      fs.writeFileSync(logoPath, req.file.buffer);

      const updated = await prisma.company.update({
        where: { id: req.params.id },
        data: { logoStorageKey: logoKey },
      });

      return res.json({ success: true, logoStorageKey: logoKey, company: updated });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      return res.status(500).json({ error: 'Failed to upload logo' });
    }
  }
);

// POST /api/companies/:id/stamp - Upload company stamp
router.post(
  '/:id/stamp',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  upload.single('stamp'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No stamp file uploaded' });
    }

    try {
      const company = await prisma.company.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const storageDir = path.join(process.cwd(), 'storage', 'company-assets');
      if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

      const ext = path.extname(req.file.originalname);
      const stampKey = `company-assets/${req.params.id}_stamp${ext}`;
      const stampPath = path.join(process.cwd(), 'storage', stampKey);
      fs.writeFileSync(stampPath, req.file.buffer);

      const updated = await prisma.company.update({
        where: { id: req.params.id },
        data: { stampStorageKey: stampKey },
      });

      return res.json({ success: true, stampStorageKey: stampKey, company: updated });
    } catch (error: any) {
      console.error('Stamp upload error:', error);
      return res.status(500).json({ error: 'Failed to upload stamp' });
    }
  }
);

// PUT /api/companies/:id/signatory - Update authorized signatory details
router.put(
  '/:id/signatory',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  async (req: Request, res: Response) => {
    const { authorizedSignatoryName, authorizedSignatoryDesignation } = req.body;

    try {
      const company = await prisma.company.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const updated = await prisma.company.update({
        where: { id: req.params.id },
        data: {
          authorizedSignatoryName: authorizedSignatoryName || null,
          authorizedSignatoryDesignation: authorizedSignatoryDesignation || 'Authorized Signatory',
        },
      });

      return res.json(updated);
    } catch (error) {
      console.error('Signatory update error:', error);
      return res.status(500).json({ error: 'Failed to update signatory details' });
    }
  }
);

export default router;
