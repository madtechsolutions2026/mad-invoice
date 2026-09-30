import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';

const router = Router();

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

export default router;
