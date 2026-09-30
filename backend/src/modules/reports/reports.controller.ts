import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// GET /api/reports/dashboard - Total aggregated summary metrics
router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;

    // 1. Core metric sums
    const aggregateTotals = await prisma.invoice.aggregate({
      where: { tenantId, status: 'GENERATED' },
      _sum: {
        taxableAmount: true,
        totalTax: true,
        totalAmount: true,
      },
    });

    const totalInvoices = await prisma.invoice.count({ where: { tenantId } });
    const generatedInvoices = await prisma.invoice.count({ where: { tenantId, status: 'GENERATED' } });
    const pendingInvoices = await prisma.invoice.count({ where: { tenantId, status: 'PENDING' } });
    const failedInvoices = await prisma.invoice.count({ where: { tenantId, status: 'FAILED' } });

    const totalCompanies = await prisma.company.count({ where: { tenantId } });
    const totalCustomers = await prisma.customer.count({ where: { tenantId } });

    // 2. Aggregate monthly statistics (MH/Indian standard fiscal breakdown)
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, status: 'GENERATED' },
      select: {
        invoiceDate: true,
        totalAmount: true,
        taxableAmount: true,
        totalTax: true,
      },
    });

    const monthlyMap: { [key: string]: { count: number; taxable: number; tax: number; total: number } } = {};

    invoices.forEach((inv) => {
      const date = new Date(inv.invoiceDate);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // e.g. "August 2026"
      
      if (!monthlyMap[monthYear]) {
        monthlyMap[monthYear] = { count: 0, taxable: 0, tax: 0, total: 0 };
      }
      
      monthlyMap[monthYear].count++;
      monthlyMap[monthYear].taxable += parseFloat(inv.taxableAmount.toString());
      monthlyMap[monthYear].tax += parseFloat(inv.totalTax.toString());
      monthlyMap[monthYear].total += parseFloat(inv.totalAmount.toString());
    });

    const monthlyStats = Object.keys(monthlyMap).map((key) => ({
      month: key,
      ...monthlyMap[key],
    }));

    // 3. Customer Billing Distributions
    const customerBillings = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: { tenantId, status: 'GENERATED' },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const customersInfo = await prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, legalName: true },
    });

    const customerStats = customerBillings.map((group) => {
      const cust = customersInfo.find((c) => c.id === group.customerId);
      return {
        customerId: group.customerId,
        customerName: cust ? cust.legalName : 'Unknown Customer',
        invoiceCount: group._count.id,
        totalValue: parseFloat(group._sum.totalAmount?.toString() || '0'),
      };
    });

    return res.json({
      summary: {
        totalInvoices,
        generatedInvoices,
        pendingInvoices,
        failedInvoices,
        taxableValue: parseFloat(aggregateTotals._sum.taxableAmount?.toString() || '0'),
        taxAmount: parseFloat(aggregateTotals._sum.totalTax?.toString() || '0'),
        invoiceValue: parseFloat(aggregateTotals._sum.totalAmount?.toString() || '0'),
        totalCompanies,
        totalCustomers,
      },
      monthlyStats,
      customerStats,
    });
  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    return res.status(500).json({ error: 'Failed to compile dashboard reports' });
  }
});

// GET /api/reports/audit-logs - Query audit history logs
router.get('/audit-logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch audit history' });
  }
});

export default router;
