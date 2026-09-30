import { Decimal } from 'decimal.js';
import prisma from '../../config/db';

export interface RawRowData {
  invoiceNumber: string;
  invoiceDate: string;
  customerCode?: string;
  customerName: string;
  customerGstin?: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerStateCode: string;
  customerPinCode: string;
  hsnSac: string;
  description: string;
  quantity: string | number;
  unit: string;
  rate: string | number;
  discount?: string | number;
  gstRate: string | number;
  poNumber?: string;
  poDate?: string;
  dueDate?: string;
  remarks?: string;
}

export interface RowValidationIssue {
  type: 'ERROR' | 'WARNING';
  field: string;
  message: string;
}

export interface RowValidationResult {
  rowNumber: number;
  invoiceNumber: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  issues: RowValidationIssue[];
  data: RawRowData;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export class ValidationService {
  static async validateBatchRows(
    tenantId: string,
    companyId: string,
    rows: Array<{ rowNumber: number; data: RawRowData }>
  ): Promise<RowValidationResult[]> {
    const results: RowValidationResult[] = [];

    // Fetch company info for GST calculations
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });

    if (!company) {
      throw new Error('Target company not found');
    }

    const companyStateCode = company.stateCode;

    // Group rows by invoice number to validate aggregate math and consistency
    const invoiceGroups: { [key: string]: typeof rows } = {};
    for (const r of rows) {
      const invNo = String(r.data.invoiceNumber || '').trim();
      if (!invNo) continue;
      if (!invoiceGroups[invNo]) {
        invoiceGroups[invNo] = [];
      }
      invoiceGroups[invNo].push(r);
    }

    // Set of invoice numbers currently in this batch (for sheet-level duplicate checks)
    const batchInvoiceNumbers = new Set(Object.keys(invoiceGroups));

    // DB duplicate check (existing generated invoices in database)
    const existingInvoicesInDb = await prisma.invoice.findMany({
      where: {
        tenantId,
        companyId,
        invoiceNumber: { in: Array.from(batchInvoiceNumbers) },
        status: { not: 'CANCELLED' },
      },
      select: { invoiceNumber: true },
    });
    const dbInvoiceSet = new Set(existingInvoicesInDb.map((i) => i.invoiceNumber));

    // Validate each row
    for (const item of rows) {
      const { rowNumber, data } = item;
      const issues: RowValidationIssue[] = [];
      const invNo = String(data.invoiceNumber || '').trim();

      // 1. Mandatory fields
      if (!invNo) {
        issues.push({ type: 'ERROR', field: 'invoiceNumber', message: 'Invoice number is required' });
      }
      if (!data.invoiceDate) {
        issues.push({ type: 'ERROR', field: 'invoiceDate', message: 'Invoice date is required' });
      }
      if (!data.customerName) {
        issues.push({ type: 'ERROR', field: 'customerName', message: 'Customer name is required' });
      }
      if (!data.customerStateCode) {
        issues.push({ type: 'ERROR', field: 'customerStateCode', message: 'Customer state code is required' });
      }

      // 2. Format validations
      if (data.customerGstin) {
        const cleanGstin = String(data.customerGstin).trim().toUpperCase();
        if (!GSTIN_REGEX.test(cleanGstin)) {
          issues.push({ type: 'WARNING', field: 'customerGstin', message: `GSTIN format '${cleanGstin}' seems invalid` });
        } else {
          // Verify state code prefix matches customerStateCode
          const gstinPrefix = cleanGstin.substring(0, 2);
          if (gstinPrefix !== data.customerStateCode) {
            issues.push({
              type: 'WARNING',
              field: 'customerGstin',
              message: `GSTIN prefix '${gstinPrefix}' does not match state code '${data.customerStateCode}'`,
            });
          }
        }
      }

      // 3. Numeric range validations
      const qtyStr = String(data.quantity || '0');
      const rateStr = String(data.rate || '0');
      const discStr = String(data.discount || '0');
      const gstStr = String(data.gstRate || '0');

      let qty = new Decimal(0);
      let rate = new Decimal(0);
      let disc = new Decimal(0);
      let gstRate = new Decimal(0);

      try {
        qty = new Decimal(qtyStr);
        if (qty.isNegative() || qty.isZero()) {
          issues.push({ type: 'ERROR', field: 'quantity', message: 'Quantity must be greater than zero' });
        }
      } catch {
        issues.push({ type: 'ERROR', field: 'quantity', message: 'Quantity must be numeric' });
      }

      try {
        rate = new Decimal(rateStr);
        if (rate.isNegative()) {
          issues.push({ type: 'ERROR', field: 'rate', message: 'Rate cannot be negative' });
        }
      } catch {
        issues.push({ type: 'ERROR', field: 'rate', message: 'Rate must be numeric' });
      }

      try {
        disc = new Decimal(discStr);
        if (disc.isNegative()) {
          issues.push({ type: 'ERROR', field: 'discount', message: 'Discount cannot be negative' });
        }
      } catch {
        issues.push({ type: 'ERROR', field: 'discount', message: 'Discount must be numeric' });
      }

      try {
        gstRate = new Decimal(gstStr);
        if (gstRate.isNegative() || gstRate.gt(100)) {
          issues.push({ type: 'ERROR', field: 'gstRate', message: 'GST rate must be between 0 and 100' });
        }
      } catch {
        issues.push({ type: 'ERROR', field: 'gstRate', message: 'GST rate must be numeric' });
      }

      // 4. Duplicate checks
      if (invNo) {
        if (dbInvoiceSet.has(invNo)) {
          issues.push({
            type: 'ERROR',
            field: 'invoiceNumber',
            message: `Invoice number '${invNo}' already exists in database for this company`,
          });
        }

        // Group level checks (e.g. different customers in different rows for the same invoice number)
        const group = invoiceGroups[invNo];
        if (group && group.length > 1) {
          const firstItem = group[0].data;
          if (firstItem.customerName !== data.customerName) {
            issues.push({
              type: 'ERROR',
              field: 'customerName',
              message: `Customer name mismatch within the same invoice (${invNo})`,
            });
          }
          if (firstItem.invoiceDate !== data.invoiceDate) {
            issues.push({
              type: 'ERROR',
              field: 'invoiceDate',
              message: `Invoice date mismatch within the same invoice (${invNo})`,
            });
          }
        }
      }

      // Calculate taxes and totals to make warnings on math differences
      // HSN line calculation check
      const taxableVal = qty.mul(rate).sub(disc);
      const isMH = data.customerStateCode === companyStateCode;
      
      let calculatedTax = new Decimal(0);
      if (gstRate.gt(0)) {
        calculatedTax = taxableVal.mul(gstRate.div(100));
      }

      // Final status selection
      let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
      if (issues.some((i) => i.type === 'ERROR')) {
        status = 'ERROR';
      } else if (issues.some((i) => i.type === 'WARNING')) {
        status = 'WARNING';
      }

      results.push({
        rowNumber,
        invoiceNumber: invNo,
        status,
        issues,
        data,
      });
    }

    return results;
  }
}
