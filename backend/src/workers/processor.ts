import * as archiver from 'archiver';
import { Writable } from 'stream';
import prisma from '../config/db';
import { computeInvoiceTotals, convertAmountToWords } from '../utils/calculations';
import { generateInvoicePDF } from '../utils/pdf-generator';
import StorageProvider from '../utils/storage';
import { InvoiceStatus, BatchStatus } from '@prisma/client';
import { logAuditAction } from '../modules/audit/audit.service';

class BufferWritable extends Writable {
  private chunks: Buffer[] = [];
  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }
  getBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

export async function processInvoiceJob(jobData: any) {
  const {
    tenantId,
    batchId,
    companyId,
    customerId,
    invoiceNumber,
    invoiceDate,
    placeOfSupply,
    poNumber,
    poDate,
    dueDate,
    remarks,
    items,
  } = jobData;

  console.log(`[Processor] Rendering invoice ${invoiceNumber} for Batch: ${batchId}`);

  const company = await prisma.company.findFirst({ where: { id: companyId, tenantId } });
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });

  if (!company || !customer) {
    throw new Error(`Company or Customer metadata missing`);
  }

  const totals = computeInvoiceTotals(company.stateCode, customer.stateCode, items);
  const amountInWords = convertAmountToWords(totals.totalAmount.toNumber());

  let invoice: any;

  // 1. Transactionally write invoice and items
  invoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { tenantId, companyId, invoiceNumber },
    });

    if (existing) {
      if (existing.status === InvoiceStatus.GENERATED) {
        return existing;
      }
      return await tx.invoice.update({
        where: { id: existing.id },
        data: {
          status: InvoiceStatus.PROCESSING,
          invoiceDate: new Date(invoiceDate),
          placeOfSupply,
          taxableAmount: totals.taxableAmount,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          totalTax: totals.totalTax,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          roundOffAmount: totals.roundOffAmount,
          poNumber,
          poDate: poDate ? new Date(poDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          remarks,
        },
      });
    }

    return await tx.invoice.create({
      data: {
        tenantId,
        batchId,
        companyId,
        customerId,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        placeOfSupply,
        taxableAmount: totals.taxableAmount,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        totalTax: totals.totalTax,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        roundOffAmount: totals.roundOffAmount,
        poNumber,
        poDate: poDate ? new Date(poDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        remarks,
        status: InvoiceStatus.PROCESSING,
        items: {
          create: totals.items.map((it) => ({
            hsnSac: it.hsnSac,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            rate: it.rate,
            discount: it.discount,
            taxableValue: it.taxableValue,
            gstRate: it.gstRate,
            cgstRate: it.cgstRate,
            sgstRate: it.sgstRate,
            igstRate: it.igstRate,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          })),
        },
      },
    });
  });

  if (invoice.status === InvoiceStatus.GENERATED) {
    console.log(`[Processor] Invoice ${invoiceNumber} already complete. Skipping PDF render.`);
    await checkAndZipBatch(tenantId, batchId);
    return;
  }

  try {
    // 2. Render A4 PDF using PDFKit (no browser required)
    const pdfBuffer = await generateInvoicePDF({
      company,
      customer,
      invoice,
      items: totals.items,
      amountInWords,
    });

    // 3. Save PDF file
    const pdfKey = `invoices/${companyId}/${invoiceNumber}_v${invoice.version}.pdf`;
    await StorageProvider.saveFile(pdfKey, pdfBuffer);

    // 4. Update status in Database
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.GENERATED,
        pdfStorageKey: pdfKey,
      },
    });

    console.log(`[Processor] Completed invoice ${invoiceNumber} generation`);

    // 5. Check and run ZIP compiler if this completes the batch
    await checkAndZipBatch(tenantId, batchId);
  } catch (error: any) {
    console.error(`[Processor] Failed to generate PDF for ${invoiceNumber}:`, error);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.FAILED,
        errorMessage: error.message || 'PDF rendering failed',
      },
    });
    throw error;
  }
}

async function checkAndZipBatch(tenantId: string, batchId: string) {
  const batch = await prisma.invoiceBatch.findUnique({ where: { id: batchId } });
  if (!batch) return;

  const rowLogs = await prisma.importRowLog.findMany({
    where: { batchId },
    select: { data: true },
  });
  
  const invSet = new Set(rowLogs.map((r: any) => String(r.data.invoiceNumber || '').trim()));
  const totalUniqueInvoices = invSet.size;

  const processedInvoices = await prisma.invoice.count({
    where: {
      batchId,
      status: { in: [InvoiceStatus.GENERATED, InvoiceStatus.FAILED] },
    },
  });

  if (processedInvoices >= totalUniqueInvoices && totalUniqueInvoices > 0) {
    console.log(`[Processor] Batch ${batchId} done (${processedInvoices}/${totalUniqueInvoices}). Packaging ZIP...`);

    const invoices = await prisma.invoice.findMany({
      where: { batchId, status: InvoiceStatus.GENERATED },
    });

    if (invoices.length === 0) {
      await prisma.invoiceBatch.update({
        where: { id: batchId },
        data: { status: BatchStatus.FAILED },
      });
      return;
    }

    try {
      const zipWritable = new BufferWritable();
      const archiverFn = typeof archiver === 'function' ? archiver : (archiver as any).default;
      const archive = archiverFn('zip', { zlib: { level: 9 } });
      archive.pipe(zipWritable);

      for (const inv of invoices) {
        if (!inv.pdfStorageKey) continue;
        const pdfBuffer = await StorageProvider.getFile(inv.pdfStorageKey);
        archive.append(pdfBuffer, { name: `${inv.invoiceNumber}.pdf` });
      }

      await archive.finalize();

      const cleanFileName = batch.fileName.replace(/\.[^/.]+$/, "");
      const zipKey = `batches/${batchId}/${cleanFileName}_invoices.zip`;
      await StorageProvider.saveFile(zipKey, zipWritable.getBuffer());

      await prisma.invoiceBatch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.COMPLETED,
          zipStorageKey: zipKey,
        },
      });

      await logAuditAction({
        tenantId,
        action: 'BATCH_COMPLETED',
        entityName: 'InvoiceBatch',
        entityId: batchId,
      });

      console.log(`[Processor] ZIP created successfully at storage key: ${zipKey}`);
    } catch (zipError: any) {
      console.error(`[Processor] Failed to create ZIP archive:`, zipError);
      await prisma.invoiceBatch.update({
        where: { id: batchId },
        data: { status: BatchStatus.FAILED },
      });
    }
  }
}
