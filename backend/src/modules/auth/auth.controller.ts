import { Router, Request, Response } from "express";
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from "../../config/db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'madtech_secret_super_secure_key_12345';

export async function registerUser(req: Request, res: Response) {
  const { companyName, email, firstName, lastName, password } = req.body;

  if (!companyName || !email || !password) {
    return res.status(400).json({
      error: 'Company name, email, and password are required',
    });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'A user with this email already exists',
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // Create Tenant (Company space) and User together in a Transaction
    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: companyName,
        },
      });

      const newUser = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          firstName: firstName?.trim() || null,
          lastName: lastName?.trim() || null,
          tenantId: newTenant.id,
          role: 'ADMIN', // Account owner is ADMIN
        },
      });

      // Automatically initialize primary company profile for this new client
      await tx.company.create({
        data: {
          tenantId: newTenant.id,
          legalName: companyName.trim(),
          tradeName: companyName.trim(),
          gstin: 'URD',
          pan: 'NA',
          addressLine1: 'Update your address in Company Profiles',
          city: 'Hyderabad',
          state: 'TELANGANA',
          stateCode: '36',
          pinCode: '500001',
          email: email.trim().toLowerCase(),
          phone: '',
          invoicePrefix: 'INV-',
          invoiceStartingNo: 1,
          invoiceTemplateId: 'standard_gst',
        },
      });

      return { tenant: newTenant, user: newUser };
    });

    return res.status(201).json({
      message: 'Company and user registered successfully',
      company: {
        id: result.tenant.id,
        name: result.tenant.name,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

export async function userLogin(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        tenantId: user.tenantId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login success',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyName: user.tenant?.name || 'MAD Invoice',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyName: user.tenant?.name || 'MAD Invoice',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default router;
