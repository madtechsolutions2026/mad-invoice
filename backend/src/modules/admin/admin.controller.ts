import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';

const router = Router();

// POST /api/admin/reset-database - Complete blank slate reset (preserves tenant & users)
router.post(
  '/reset-database',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  async (req: Request, res: Response) => {
    const { confirmation } = req.body;

    if (confirmation !== 'RESET_PRODUCTION_DATABASE') {
      return res.status(400).json({
        error: 'Invalid confirmation token. Send { confirmation: "RESET_PRODUCTION_DATABASE" } to proceed.',
      });
    }

    try {
      const tenantId = req.tenantId;

      await prisma.$transaction(async (tx) => {
        // 1. Delete invoice items
        await tx.invoiceItem.deleteMany({
          where: { invoice: { tenantId } },
        });

        // 2. Delete invoices
        await tx.invoice.deleteMany({
          where: { tenantId },
        });

        // 3. Delete import row logs
        await tx.importRowLog.deleteMany({
          where: { batch: { tenantId } },
        });

        // 4. Delete invoice batches
        await tx.invoiceBatch.deleteMany({
          where: { tenantId },
        });

        // 5. Delete customer group members
        await tx.customerGroupMember.deleteMany({
          where: { group: { tenantId } },
        });

        // 6. Delete customer groups
        await tx.customerGroup.deleteMany({
          where: { tenantId },
        });

        // 7. Delete customers
        await tx.customer.deleteMany({
          where: { tenantId },
        });

        // 8. Delete mapping templates
        await tx.mappingTemplate.deleteMany({
          where: { tenantId },
        });

        // 9. Delete companies
        await tx.company.deleteMany({
          where: { tenantId },
        });

        // 10. Clear past audit logs
        await tx.auditLog.deleteMany({
          where: { tenantId },
        });
      });

      // Log the fresh reset action
      await logAuditAction({
        tenantId: req.tenantId,
        userId: req.userId,
        action: 'DATABASE_RESET_BLANK_SLATE',
        entityName: 'Database',
        metadata: {
          resetBy: req.userId,
          timestamp: new Date().toISOString(),
          type: 'COMPLETE_BLANK_SLATE',
        },
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        message: 'Production database has been completely reset to a blank slate. Invoices, batches, customers, groups, and companies have been wiped. Your Admin account remains active.',
      });
    } catch (error: any) {
      console.error('Reset database error:', error);
      return res.status(500).json({ error: error.message || 'Failed to reset database' });
    }
  }
);

export default router;
