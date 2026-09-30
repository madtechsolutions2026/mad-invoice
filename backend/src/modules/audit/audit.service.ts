import prisma from '../../config/db';

export async function logAuditAction({
  tenantId,
  userId,
  action,
  entityName,
  entityId,
  ipAddress,
  metadata,
}: {
  tenantId: string;
  userId?: string;
  action: string;
  entityName?: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action,
        entityName: entityName || null,
        entityId: entityId || null,
        ipAddress: ipAddress || null,
        metadata: metadata || {},
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
