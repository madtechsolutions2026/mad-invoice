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

// GET /api/reports/payment-summary - Month-wise payment received vs pending
router.get('/payment-summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, status: 'GENERATED' },
      select: {
        invoiceDate: true,
        totalAmount: true,
        paymentStatus: true,
        paymentAmount: true,
      },
    });

    const monthlyMap: { 
      [key: string]: { 
        month: string; 
        totalInvoiced: number; 
        totalReceived: number; 
        totalPending: number;
        paidCount: number;
        unpaidCount: number;
        partialCount: number;
        invoiceCount: number;
      } 
    } = {};

    invoices.forEach((inv) => {
      const date = new Date(inv.invoiceDate);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyMap[monthYear]) {
        monthlyMap[monthYear] = {
          month: monthYear,
          totalInvoiced: 0,
          totalReceived: 0,
          totalPending: 0,
          paidCount: 0,
          unpaidCount: 0,
          partialCount: 0,
          invoiceCount: 0,
        };
      }

      const total = parseFloat(inv.totalAmount.toString());
      const received = parseFloat(inv.paymentAmount?.toString() || '0');

      monthlyMap[monthYear].invoiceCount++;
      monthlyMap[monthYear].totalInvoiced += total;

      if (inv.paymentStatus === 'PAID') {
        monthlyMap[monthYear].totalReceived += total;
        monthlyMap[monthYear].paidCount++;
      } else if (inv.paymentStatus === 'PARTIAL') {
        monthlyMap[monthYear].totalReceived += received;
        monthlyMap[monthYear].totalPending += (total - received);
        monthlyMap[monthYear].partialCount++;
      } else {
        monthlyMap[monthYear].totalPending += total;
        monthlyMap[monthYear].unpaidCount++;
      }
    });

    // Totals
    let grandTotalInvoiced = 0;
    let grandTotalReceived = 0;
    let grandTotalPending = 0;

    const monthlyStats = Object.values(monthlyMap);
    monthlyStats.forEach(m => {
      grandTotalInvoiced += m.totalInvoiced;
      grandTotalReceived += m.totalReceived;
      grandTotalPending += m.totalPending;
    });

    return res.json({
      monthlyStats,
      summary: {
        grandTotalInvoiced,
        grandTotalReceived,
        grandTotalPending,
        collectionRate: grandTotalInvoiced > 0 
          ? Math.round((grandTotalReceived / grandTotalInvoiced) * 100) 
          : 0,
      },
    });
  } catch (error) {
    console.error('Payment summary error:', error);
    return res.status(500).json({ error: 'Failed to compile payment summary' });
  }
});

export default router;

