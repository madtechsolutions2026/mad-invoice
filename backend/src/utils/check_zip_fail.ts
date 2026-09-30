import prisma from '../config/db';
import * as archiver from 'archiver';
import { Writable } from 'stream';
import StorageProvider from '../utils/storage';

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

async function testZip() {
  const batchId = 'd235818b-9767-4363-a81e-5e71b5635d01';
  console.log(`Running ZIP test for batch ${batchId}...`);

  try {
    const batch = await prisma.invoiceBatch.findUnique({
      where: { id: batchId }
    });

    if (!batch) {
      console.error('Batch not found in database.');
      return;
    }

    const invoices = await prisma.invoice.findMany({
      where: { batchId, status: 'GENERATED' }
    });

    console.log(`Found ${invoices.length} generated invoices in DB.`);
    invoices.forEach(inv => {
      console.log(`Invoice ${inv.invoiceNumber} | Key: ${inv.pdfStorageKey}`);
    });

    const zipWritable = new BufferWritable();
    const archiverFn = typeof archiver === 'function' ? archiver : (archiver as any).default;
    const archive = archiverFn('zip', { zlib: { level: 9 } });
    archive.pipe(zipWritable);

    for (const inv of invoices) {
      if (!inv.pdfStorageKey) {
        console.warn(`Invoice ${inv.invoiceNumber} has no pdfStorageKey.`);
        continue;
      }
      console.log(`Reading file for key: ${inv.pdfStorageKey}...`);
      const pdfBuffer = await StorageProvider.getFile(inv.pdfStorageKey);
      console.log(`Successfully read file (${pdfBuffer.length} bytes). Appending to archive...`);
      archive.append(pdfBuffer, { name: `${inv.invoiceNumber}.pdf` });
    }

    console.log('Finalizing archive...');
    await archive.finalize();
    console.log('Archive finalized successfully!');

    const zipBuffer = zipWritable.getBuffer();
    console.log(`Generated ZIP buffer size: ${zipBuffer.length} bytes`);

    const cleanFileName = batch.fileName.replace(/\.[^/.]+$/, "");
    const zipKey = `batches/${batchId}/${cleanFileName}_invoices.zip`;
    console.log(`Saving ZIP file to storage key: ${zipKey}...`);
    await StorageProvider.saveFile(zipKey, zipBuffer);
    console.log('ZIP file saved successfully to storage!');

    await prisma.invoiceBatch.update({
      where: { id: batchId },
      data: { status: 'COMPLETED', zipStorageKey: zipKey }
    });
    console.log('Batch status updated to COMPLETED in database!');

  } catch (err: any) {
    console.error('ERROR ENCOUNTERED DURING ZIPPING:');
    console.error(err.stack || err);
  } finally {
    process.exit(0);
  }
}

testZip();
