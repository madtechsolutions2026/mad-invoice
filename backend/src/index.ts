import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { tenantMiddleware } from './middleware/tenant.middleware';

import authRoutes from './modules/auth/auth.controller';
import companyRoutes from './modules/companies/companies.controller';
import customerRoutes from './modules/customers/customers.controller';
import importRoutes from './modules/imports/imports.controller';
import batchRoutes from './modules/batches/batches.controller';
import invoiceRoutes from './modules/invoices/invoices.controller';
import reportRoutes from './modules/reports/reports.controller';
import groupRoutes from './modules/groups/groups.controller';

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false, // Turn off for testing/development flexibility
}));
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Multi-tenant resolution middleware
app.use(tenantMiddleware);

// Route registering
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/customer-groups', groupRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Uncaught Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error occurred';
  
  return res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`Express API Server running on port ${PORT}`);
});
