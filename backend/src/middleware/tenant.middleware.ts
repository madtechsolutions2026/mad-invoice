import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  let tenantId = req.headers['x-tenant-id'] as string;

  // Extract from host subdomain if headers are missing
  if (!tenantId && req.headers.host) {
    const host = req.headers.host;
    const parts = host.split('.');
    if (parts.length > 2) {
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'app') {
        const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
        if (tenant) {
          tenantId = tenant.id;
        }
      }
    }
  }

  // Fallback to first available tenant to ease development & seeding testing
  if (!tenantId) {
    const defaultTenant = await prisma.tenant.findFirst();
    if (defaultTenant) {
      tenantId = defaultTenant.id;
    } else {
      return res.status(500).json({
        error: 'No tenant scope resolved. Please seed the database first.',
      });
    }
  }

  req.tenantId = tenantId;
  next();
}
