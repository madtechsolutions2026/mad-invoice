import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import prisma from '../../config/db';
import { authMiddleware } from '../../middleware/auth.middleware';
import { ValidationService, RawRowData } from './validation.service';
import { BatchStatus, RowValidationStatus } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB file cap
});

// Heuristic Mapper for automatically parsing headers
const COMMON_HEADER_MAPS: { [key: string]: string } = {
  'invoice no': 'invoiceNumber',
  'invoice number': 'invoiceNumber',
  'inv number': 'invoiceNumber',
  'inv no': 'invoiceNumber',
  'invoice date': 'invoiceDate',
  'inv date': 'invoiceDate',
  'date': 'invoiceDate',
  'customer name': 'customerName',
  'customer': 'customerName',
  'client': 'customerName',
  'gstin': 'customerGstin',
  'customer gstin': 'customerGstin',
  'client gstin': 'customerGstin',
  'address': 'customerAddress',
  'customer address': 'customerAddress',
  'city': 'customerCity',
  'state': 'customerState',
  'state code': 'customerStateCode',
  'pin': 'customerPinCode',
  'pincode': 'customerPinCode',
  'pin code': 'customerPinCode',
  'hsn': 'hsnSac',
  'sac': 'hsnSac',
  'hsn/sac': 'hsnSac',
  'description': 'description',
  'item description': 'description',
  'qty': 'quantity',
  'quantity': 'quantity',
  'unit': 'unit',
  'rate': 'rate',
  'price': 'rate',
  'discount': 'discount',
  'gst rate': 'gstRate',
  'gst %': 'gstRate',
  'gst percent': 'gstRate',
  'po number': 'poNumber',
  'po date': 'poDate',
  'due date': 'dueDate',
  'remarks': 'remarks',
};

// POST /api/imports/upload - Parse headers and return preview
router.post('/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read raw rows
    const rawJson = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (rawJson.length === 0) {
      return res.status(400).json({ error: 'Uploaded sheet is empty' });
    }

    const headers = rawJson[0].map((h) => String(h || '').trim());
    const previewRows = rawJson.slice(1, 6).map((row) => {
      const rowObj: { [key: string]: any } = {};
      headers.forEach((h, idx) => {
        rowObj[h] = row[idx] !== undefined ? row[idx] : '';
      });
      return rowObj;
    });

    // Generate heuristics auto-mapping
    const autoMapping: { [key: string]: string } = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9/ ]/g, '');
      if (COMMON_HEADER_MAPS[lower]) {
        autoMapping[COMMON_HEADER_MAPS[lower]] = h;
      }
    });

    // Temporarily cache buffer in database or return back to UI.
    // For production-readiness, we return headers, data preview, and the file base64 so they can post it back in the next step.
    const fileBase64 = req.file.buffer.toString('base64');

    return res.json({
      fileName: req.file.originalname,
      headers,
      autoMapping,
      previewRows,
      fileBase64,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: 'Failed to process spreadsheet file' });
  }
});

// POST /api/imports/validate - Run validation mapping and insert rows into ImportRowLog
router.post('/validate', authMiddleware, async (req: Request, res: Response) => {
  const { fileBase64, fileName, companyId, mapping, saveTemplateName } = req.body;

  if (!fileBase64 || !companyId || !mapping) {
    return res.status(400).json({ error: 'Missing parameters: fileBase64, companyId, mapping are required' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawJson = xlsx.utils.sheet_to_json(worksheet) as any[];

    // Map rows using mapping object: systemField -> excelColumn
    const mappedRows = rawJson.map((row, idx) => {
      const mappedRow: any = {};
      Object.keys(mapping).forEach((systemField) => {
        const excelColumn = mapping[systemField];
        mappedRow[systemField] = row[excelColumn] !== undefined ? row[excelColumn] : '';
      });
      return {
        rowNumber: idx + 2, // 1-based, plus skip header row
        data: mappedRow as RawRowData,
      };
    });

    // Run Validation
    const validationResults = await ValidationService.validateBatchRows(
      req.tenantId,
      companyId,
      mappedRows
    );

    // Save mapping template if user selected
    if (saveTemplateName) {
      await prisma.mappingTemplate.create({
        data: {
          tenantId: req.tenantId,
          name: saveTemplateName,
          mapping: mapping,
        },
      });
    }

    // Determine counts
    let validRows = 0;
    let warningRows = 0;
    let errorRows = 0;

    validationResults.forEach((res) => {
      if (res.status === 'ERROR') errorRows++;
      else if (res.status === 'WARNING') warningRows++;
      else validRows++;
    });

    // Create Batch
    const batch = await prisma.invoiceBatch.create({
      data: {
        tenantId: req.tenantId,
        companyId,
        uploadedBy: req.userId,
        fileName,
        status: errorRows > 0 ? BatchStatus.FAILED : BatchStatus.VALIDATED,
        totalRows: validationResults.length,
        validRows,
        warningRows,
        errorRows,
        duplicateRows: 0,
      },
    });

    // Create Row Logs
    const rowLogs = validationResults.map((r) => ({
      batchId: batch.id,
      rowNumber: r.rowNumber,
      data: r.data as any,
      status: r.status as RowValidationStatus,
      issues: r.issues as any,
    }));

    await prisma.importRowLog.createMany({
      data: rowLogs,
    });

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'BATCH_VALIDATED',
      entityName: 'InvoiceBatch',
      entityId: batch.id,
      metadata: { totalRows: batch.totalRows, errors: errorRows },
    });

    return res.json({
      batchId: batch.id,
      summary: {
        totalRows: batch.totalRows,
        validRows,
        warningRows,
        errorRows,
      },
      results: validationResults.slice(0, 100), // Return first 100 for screen preview
    });
  } catch (error: any) {
    console.error('Validation route error:', error);
    return res.status(500).json({ error: error.message || 'Failed to execute data validation' });
  }
});

// GET /api/imports/templates - Get saved templates
router.get('/templates', authMiddleware, async (req: Request, res: Response) => {
  try {
    const templates = await prisma.mappingTemplate.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

export default router;
