import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'madtech_secret_super_secure_key_12345';

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  let tenantId = req.headers['x-tenant-id'] as string;

  // 1. If an Authorization Bearer token is provided, extract tenantId from it!
  const authHeader = req.headers.authorization;
  if (!tenantId && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.tenantId) {
        tenantId = decoded.tenantId;
      }
    } catch {
      // If token is invalid/expired, authMiddleware downstream will handle rejection
    }
  }

  // 2. Extract from host subdomain if headers are missing
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

  // 3. Fallback to first available tenant to ease development & seeding testing
  if (!tenantId) {
    const defaultTenant = await prisma.tenant.findFirst();
    if (defaultTenant) {
      tenantId = defaultTenant.id;
    }
  }

  req.tenantId = tenantId;
  next();
}
