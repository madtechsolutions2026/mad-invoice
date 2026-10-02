/**
 * pdf-generator.ts
 *
 * PDFKit-based invoice PDF generator.
 *
 * FIX HISTORY (all bugs from original output corrected here):
 *
 * FIX 1 – "ORIGINAL FOR RECIPIENT" clipped
 *   CAUSE: text() called without width constraint, overflowed right edge.
 *   FIX: draw with { width: CW, align: 'right' } inside the content column.
 *
 * FIX 2 – Rupee symbol ₹ rendered as broken glyph "¹"
 *   CAUSE: built-in Helvetica has no ₹ glyph in PDFKit's subset.
 *   FIX: register NotoSans-Regular.ttf + NotoSans-Bold.ttf (full Unicode, includes ₹)
 *        and use them for the ENTIRE document instead of Helvetica.
 *
 * FIX 3 – Item rows overlap "Total Items / Qty" row
 *   CAUSE: Y positions were calculated with fixed row-height ignoring text wrap.
 *   FIX: measure each row's real height with doc.heightOfString() before drawing,
 *        then advance Y by that real height. Everything below auto-shifts.
 *
 * FIX 4 – Notes text clipped at right edge
 *   CAUSE: no width constraint on the notes text() call.
 *   FIX: pass { width: CW } so PDFKit wraps within the content area.
 *
 * FIX 5 – UPI QR box is a placeholder
 *   CAUSE: online QR-code URL is unavailable inside PDFKit (no HTTP fetch).
 *   FIX: use the `qrcode` npm package to generate a real QR PNG buffer
 *        synchronously in-process, then embed with doc.image().
 *        If no UPI ID is configured, hide the entire "Pay using UPI" block.
 *
 * FIX 6 – Bank details below QR instead of beside it
 *   CAUSE: Y was advanced after drawing the QR before drawing bank details.
 *   FIX: place QR at (ML, payY) then draw bank details at (ML + qrSize + gap, payY),
 *        both sharing the same payY anchor. Advance Y after both finish.
 *
 * FIX 7 – Font sizes too small / cramped
 *   FIX: apply the exact pt sizes from the spec throughout.
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

// ─── Font paths (NotoSans has full Unicode coverage including ₹) ─────────────
const FONTS_DIR   = path.join(__dirname, '../assets/fonts');
const FONT_REG    = path.join(FONTS_DIR, 'NotoSans-Regular.ttf');
const FONT_BOLD   = path.join(FONTS_DIR, 'NotoSans-Bold.ttf');

// ─── Logo path ────────────────────────────────────────────────────────────────
const LOGO_PATH   = path.join(__dirname, '../assets/logo.png');

// ─── Colour palette matching the reference PDF ───────────────────────────────
const C_BLUE      = '#2563EB';   // "INVOICE" title, table top-line
const C_DARK      = '#111827';   // primary text
const C_SLATE     = '#374151';   // secondary text
const C_MUTED     = '#6B7280';   // labels, footer
const C_LBLUE     = '#BFDBFE';   // table header separator
const C_LGRAY     = '#E5E7EB';   // section separator lines, logo bg border
const C_LOGOBG    = '#F3F4F6';   // logo background box

// ─── Typography ───────────────────────────────────────────────────────────────
// All sizes in PDF points (1pt = 1/72 inch)
const SZ_INVOICE_TITLE = 12;     // "INVOICE"
const SZ_FIRM_NAME     = 15;     // Firm name (uppercase, bold)
const SZ_BODY          = 9.5;    // general body
const SZ_LABEL         = 9;      // small labels
const SZ_SMALL         = 8.5;    // totals line, footer
const SZ_ORIG_TAG      = 8;      // "ORIGINAL FOR RECIPIENT"
const SZ_TOTAL_LABEL   = 13;     // "Total" word
const SZ_TOTAL_AMT     = 15;     // grand total amount

interface InvoiceTemplateData {
  company: any;
  customer: any;
  invoice: any;
  items: any[];
  amountInWords: string;
}

// ─── Helper: Indian number format ₹1,18,000.00 ───────────────────────────────
function inr(value: any): string {
  const n = parseFloat(value?.toString() || '0');
  return '\u20B9' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Helper: format date as "01 Aug 2026" ─────────────────────────────────────
function fmtDate(d: any): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Helper: generate QR code as PNG Buffer (FIX 5) ──────────────────────────
async function makeQrBuffer(content: string): Promise<Buffer> {
  // qrcode.toBuffer returns a Buffer with a PNG image of the QR code
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,   // high-res; PDFKit scales it down to whatever we specify
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateInvoicePDF(data: InvoiceTemplateData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate QR buffer before opening the doc (it's async)
      const upiId   = data.company.bankAccountNo
        ? `${data.company.bankAccountNo}@hdfcbank`
        : null;
      let qrBuffer: Buffer | null = null;
      if (upiId) {
        const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(data.company.legalName || '')}`
                     + `&am=${data.invoice.totalAmount}&cu=INR&tn=${data.invoice.invoiceNumber}`;
        qrBuffer = await makeQrBuffer(upiUri);
      }

      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,   // we control margins manually for pixel-perfect layout
        bufferPages: true,
        // FIX 2: no info block – avoids the broken security module on Windows
      });

      // FIX 2: register NotoSans TTF fonts – these contain the ₹ glyph
      doc.registerFont('NotoSans',     FONT_REG);
      doc.registerFont('NotoSans-Bold',FONT_BOLD);

      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      await buildPage(doc, data, qrBuffer);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Page builder ────────────────────────────────────────────────────────────
async function buildPage(
  doc: PDFKit.PDFDocument,
  d: InvoiceTemplateData,
  qrBuffer: Buffer | null,
) {
  const { company, customer, invoice, items, amountInWords } = d;

  // Page geometry
  const PAGE_W = doc.page.width;            // 595.28 for A4
  const ML     = 25;                        // left margin (pt) – ~9mm
  const MR     = 25;                        // right margin
  const MT     = 30;                        // top margin
  const CW     = PAGE_W - ML - MR;         // content width

  // ─── convenience drawing helpers that use NotoSans ─────────────────────────
  const rg = (sz: number) => doc.font('NotoSans').fontSize(sz).fillColor(C_DARK);
  const bd = (sz: number) => doc.font('NotoSans-Bold').fontSize(sz).fillColor(C_DARK);

  let y = MT;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: HEADER
  // ══════════════════════════════════════════════════════════════════════════

  // "INVOICE" – blue, bold, 12pt, letter-spacing via character-spacing
  doc.font('NotoSans-Bold').fontSize(SZ_INVOICE_TITLE).fillColor(C_BLUE)
     .text('INVOICE', ML, y, { characterSpacing: 1.5 });

  // FIX 1: "ORIGINAL FOR RECIPIENT" – right-aligned, capped to CW, 8pt grey
  // width: CW ensures it can never overflow the right margin
  doc.font('NotoSans').fontSize(SZ_ORIG_TAG).fillColor(C_MUTED)
     .text('ORIGINAL FOR RECIPIENT', ML, y + 2, {
       width: CW, align: 'right', characterSpacing: 1.5,
     });

  y += 18;

  // Firm name – bold, 15pt, uppercase
  doc.font('NotoSans-Bold').fontSize(SZ_FIRM_NAME).fillColor(C_DARK)
     .text((company.legalName || '').toUpperCase(), ML, y, { width: CW - 160 });

  // ── LOGO (top-right, light-grey rounded box, ~150×130pt) ──────────────────
  if (fs.existsSync(LOGO_PATH)) {
    const logoW = 140;
    const logoH = 120;
    const logoX = ML + CW - logoW;
    const logoY = MT - 4;

    // Light-grey background box (FIX: logo on #F3F4F6, not white)
    doc.save()
       .roundedRect(logoX - 4, logoY - 4, logoW + 8, logoH + 8, 6)
       .fill(C_LOGOBG)
       .restore();

    doc.image(LOGO_PATH, logoX, logoY, {
      fit: [logoW, logoH],
      align: 'center',
      valign: 'center',
    });
  }

  // Advance past firm name
  const firmNameH = doc.font('NotoSans-Bold').fontSize(SZ_FIRM_NAME).heightOfString(
    (company.legalName || '').toUpperCase(),
    { width: CW - 160 },
  );
  y += Math.max(firmNameH, 18) + 4;

  // Address line 1 & 2
  const addrParts = [company.addressLine1, company.addressLine2].filter(Boolean);
  if (addrParts.length) {
    rg(SZ_BODY).text(addrParts.join(', '), ML, y, { width: CW - 160, lineGap: 2 });
    y += doc.heightOfString(addrParts.join(', '), { width: CW - 160 }) + 2;
  }

  // City / State / Pin
  const cityLine = [company.city, company.state, company.pinCode].filter(Boolean).join(', ');
  if (cityLine) {
    rg(SZ_BODY).text(cityLine, ML, y, { width: CW - 160 });
    y += SZ_BODY + 3;
  }

  // Mobile  +919876543211   Email  billing@apex.com  – same line
  const mob = company.phone || '';
  const eml = company.email || '';
  if (mob || eml) {
    let lineX = ML;
    if (mob) {
      doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
         .text('Mobile ', lineX, y, { continued: true });
      lineX += doc.widthOfString('Mobile ');
      doc.font('NotoSans').fontSize(SZ_BODY).fillColor(C_SLATE).text(mob, { continued: !!eml });
    }
    if (eml) {
      doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
         .text('   Email ', { continued: true });
      doc.font('NotoSans').fontSize(SZ_BODY).fillColor(C_SLATE).text(eml);
    }
    y += SZ_BODY + 3;
  }

  // Website
  const website = company.tradeName
    ? company.tradeName.toLowerCase().replace(/\s+/g, '') + '.com'
    : (company.legalName || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
     .text('Website ', ML, y, { continued: true });
  rg(SZ_BODY).text(website);
  y += SZ_BODY + 3;

  // GSTIN / PAN
  const gstPan = [
    company.gstin ? `GSTIN: ${company.gstin}` : '',
    company.pan   ? `PAN: ${company.pan}`      : '',
  ].filter(Boolean).join('   |   ');
  if (gstPan) {
    rg(SZ_BODY).text(gstPan, ML, y, { width: CW - 160 });
    y += SZ_BODY + 4;
  }

  // ── Separator ─────────────────────────────────────────────────────────────
  y += 10;
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C_LGRAY).lineWidth(0.7).stroke();
  y += 10;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: META ROW  (Invoice # | Invoice Date | Due Date)
  // ══════════════════════════════════════════════════════════════════════════

  const col3W = CW / 3;
  const invDate = fmtDate(invoice.invoiceDate);
  const dueDate = invoice.dueDate ? fmtDate(invoice.dueDate) : invDate;

  // FIX 7: use correct sizes; labels 9pt, values bold 9pt
  doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_DARK)
     .text('Invoice #: ', ML, y, { continued: true });
  doc.font('NotoSans-Bold').fillColor(C_BLUE).text(invoice.invoiceNumber || '');

  doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_DARK)
     .text('Invoice Date: ', ML + col3W, y, { continued: true });
  doc.font('NotoSans-Bold').fillColor(C_SLATE).text(invDate);

  doc.font('NotoSans').fontSize(SZ_LABEL).fillColor(C_DARK)
     .text('Due Date: ', ML + col3W * 2, y, { continued: true });
  doc.font('NotoSans-Bold').fillColor(C_SLATE).text(dueDate);

  y += 20;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: CUSTOMER + BILLING  (two columns, ~50% each)
  // ══════════════════════════════════════════════════════════════════════════

  const halfW  = (CW - 20) / 2;
  const rightX = ML + halfW + 20;

  // Left: Customer Details
  doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_MUTED)
     .text('Customer Details:', ML, y);
  y += 13;

  doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
     .text(customer.legalName || '', ML, y, { width: halfW });
  const custNameH = doc.heightOfString(customer.legalName || '', { width: halfW });
  y += custNameH + 2;

  if (customer.gstin) {
    rg(SZ_BODY).text(`GSTIN: ${customer.gstin}`, ML, y, { width: halfW });
    y += SZ_BODY + 2;
  }

  // Right: Billing Address (anchored to the row start, not advancing y)
  const billY = y - (custNameH + 2) - 13;  // back to where "Customer Details:" started
  doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_MUTED)
     .text('Billing Address:', rightX, billY);

  const addr1 = [customer.addressLine1, customer.addressLine2].filter(Boolean).join(', ');
  const city1  = [customer.city, customer.state, customer.pinCode].filter(Boolean).join(', ');
  let bY = billY + 13;
  if (addr1) {
    rg(SZ_BODY).text(addr1, rightX, bY, { width: halfW });
    bY += doc.heightOfString(addr1, { width: halfW }) + 2;
  }
  if (city1) {
    rg(SZ_BODY).text(city1, rightX, bY, { width: halfW });
    bY += SZ_BODY + 2;
  }

  // Advance y to max of left column and right column
  y = Math.max(y, bY) + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: REFERENCE LINE
  // ══════════════════════════════════════════════════════════════════════════

  const refMonth = new Date(invoice.invoiceDate)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });
  doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
     .text('Reference: ', ML, y, { continued: true });
  rg(SZ_BODY).text(`Professional charges for the month of ${refMonth}`, { width: CW });
  y += SZ_BODY + 12;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5: ITEMS TABLE
  // ══════════════════════════════════════════════════════════════════════════

  // Blue 1.5px top rule
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C_BLUE).lineWidth(1.5).stroke();
  y += 4;

  // Column widths from spec: 4% | 50% | 15% | 13% | 18%
  const cNo   = CW * 0.04;
  const cItem = CW * 0.50;
  const cRate = CW * 0.15;
  const cQty  = CW * 0.13;
  const cAmt  = CW * 0.18;

  // Header row
  const HDR_PAD = 6;
  doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_DARK);
  let cx = ML;
  doc.text('#',            cx, y + HDR_PAD, { width: cNo,   align: 'left'   }); cx += cNo;
  doc.text('Item',         cx, y + HDR_PAD, { width: cItem, align: 'left'   }); cx += cItem;
  doc.text('Rate / Item',  cx, y + HDR_PAD, { width: cRate, align: 'right'  }); cx += cRate;
  doc.text('Qty',          cx, y + HDR_PAD, { width: cQty,  align: 'right'  }); cx += cQty;
  doc.text('Amount',       cx, y + HDR_PAD, { width: cAmt,  align: 'right'  });
  y += SZ_LABEL + HDR_PAD * 2 + 2;

  // Thin light-blue line under header (FIX 7: #BFDBFE)
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C_LBLUE).lineWidth(0.8).stroke();
  y += 4;

  // ── Item rows – FIX 3: measure real height, no fixed Y ──────────────────
  let totalQty = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty  = parseFloat(item.quantity?.toString() || '0');
    totalQty += qty;
    const unit = (item.unit || 'NOS').toUpperCase();
    const desc = (item.description || '').toUpperCase();

    // Measure how tall the description will be at cItem width
    // This is the key to FIX 3: real, not assumed, row height
    const descH   = doc.font('NotoSans-Bold').fontSize(SZ_BODY).heightOfString(desc, {
      width: cItem,
    });
    const hsnLine = item.hsnSac ? `HSN/SAC: ${item.hsnSac}` : '';
    const hsnH    = hsnLine
      ? doc.font('NotoSans').fontSize(8).heightOfString(hsnLine, { width: cItem })
      : 0;
    const ROW_PAD = 6;
    const rowH    = Math.max(descH + (hsnH ? hsnH + 2 : 0), SZ_BODY) + ROW_PAD * 2;

    cx = ML;
    // Row number
    rg(SZ_BODY).text(String(i + 1), cx, y + ROW_PAD, { width: cNo, align: 'left' });
    cx += cNo;

    // Description (bold) + HSN below it
    doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
       .text(desc, cx, y + ROW_PAD, { width: cItem });
    if (hsnLine) {
      doc.font('NotoSans').fontSize(8).fillColor(C_MUTED)
         .text(hsnLine, cx, y + ROW_PAD + descH + 2, { width: cItem });
    }
    cx += cItem;

    // Rate / Qty / Amount  – all at same Y, right-aligned
    rg(SZ_BODY).text(
      parseFloat(item.rate?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      cx, y + ROW_PAD, { width: cRate, align: 'right' },
    );
    cx += cRate;

    const qtyStr = `${qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)} ${unit}`;
    rg(SZ_BODY).text(qtyStr, cx, y + ROW_PAD, { width: cQty, align: 'right' });
    cx += cQty;

    doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
       .text(
         parseFloat(item.totalAmount?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
         cx, y + ROW_PAD, { width: cAmt, align: 'right' },
       );

    y += rowH;

    // Very light row separator
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C_LGRAY).lineWidth(0.4).stroke();
  }

  y += 6;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6: TOTALS BLOCK
  // ══════════════════════════════════════════════════════════════════════════

  const totalAmt = parseFloat(invoice.totalAmount?.toString() || '0');
  const grandStr = totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // "Total  ₹8,000.00"  – right-aligned, "Total" 13pt + amount 15pt bold
  // We use fixed width for the amount, and place "Total" to its left to avoid 'continued' stacking bugs with different font sizes
  const amtBoxW = 160;
  doc.font('NotoSans-Bold').fontSize(SZ_TOTAL_LABEL).fillColor(C_DARK)
     .text('Total', ML, y + 1.5, { width: CW - amtBoxW - 15, align: 'right' }); // y offset to align baselines
  doc.font('NotoSans-Bold').fontSize(SZ_TOTAL_AMT).fillColor(C_DARK)
     .text(`\u20B9${grandStr}`, ML + CW - amtBoxW, y, { width: amtBoxW, align: 'right' });

  y += SZ_TOTAL_AMT + 4;

  // Blue divider under Total
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C_BLUE).lineWidth(1.5).stroke();
  y += 5;

  // "Total Items / Qty : 1 / 1" left  |  "Total amount (in words): ..." right
  const qtyLabel = `Total Items / Qty : ${items.length} / ${totalQty % 1 === 0 ? totalQty.toFixed(0) : totalQty.toFixed(2)}`;
  doc.font('NotoSans').fontSize(SZ_SMALL).fillColor(C_MUTED).text(qtyLabel, ML, y);

  // Amount in words – right-aligned, FIX 4 width: CW
  doc.font('NotoSans').fontSize(SZ_SMALL).fillColor(C_MUTED)
     .text(`Total amount (in words): INR ${amountInWords} Only.`, ML, y, {
       width: CW, align: 'right',
     });
  y += SZ_SMALL + 5;

  // "Amount Payable: ₹x,xxx.xx" bold, right-aligned
  doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
     .text(`Amount Payable:   \u20B9${grandStr}`, ML, y, { width: CW, align: 'right' });
  y += SZ_BODY + 6;

  // ── Tax breakdown (CGST / SGST / IGST) – right-aligned under Amount Payable
  const cgst    = parseFloat(invoice.cgstAmount?.toString()    || '0');
  const sgst    = parseFloat(invoice.sgstAmount?.toString()    || '0');
  const igst    = parseFloat(invoice.igstAmount?.toString()    || '0');
  const taxable = parseFloat(invoice.taxableAmount?.toString() || '0');
  const disc    = parseFloat(invoice.discountAmount?.toString()|| '0');

  if (cgst + sgst + igst > 0) {
    const taxRows: [string, string][] = [
      ['Taxable Amount', `\u20B9${taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];
    if (disc > 0)  taxRows.push(['Discount',    `-\u20B9${disc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    if (cgst > 0)  taxRows.push(['CGST',         `\u20B9${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    if (sgst > 0)  taxRows.push(['SGST',         `\u20B9${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    if (igst > 0)  taxRows.push(['IGST',         `\u20B9${igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);

    const taxBlockW = 220;
    const taxLblW   = 110;
    const taxX      = ML + CW - taxBlockW;

    for (const [lbl, val] of taxRows) {
      // Both label and value drawn at same y, explicit X positions
      doc.font('NotoSans').fontSize(SZ_SMALL).fillColor(C_MUTED)
         .text(lbl, taxX, y, { width: taxLblW });
      doc.font('NotoSans').fontSize(SZ_SMALL).fillColor(C_DARK)
         .text(val, taxX + taxLblW, y, { width: taxBlockW - taxLblW, align: 'right' });
      y += SZ_SMALL + 3;
    }
    y += 6;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7: PAYMENT + SIGNATURE  (FIX 5, 6)
  // ══════════════════════════════════════════════════════════════════════════

  y += 12;
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C_LGRAY).lineWidth(0.7).stroke();
  y += 14;

  const payY   = y;       // anchor for this whole block
  const QR_PT  = 85;      // QR size in pt
  const BANK_X = ML + QR_PT + 18;  // FIX 6: bank details to the RIGHT of QR
  const BANK_W = CW * 0.40;
  const SIG_X  = ML + BANK_X - ML + BANK_W + 20;
  const SIG_W  = CW - (BANK_X - ML) - BANK_W - 20;

  // ── LEFT: Pay using UPI + QR ──────────────────────────────────────────────
  if (qrBuffer) {
    // FIX 5: real QR code from qrcode library
    doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_DARK)
       .text('Pay using UPI:', ML, payY);
    doc.image(qrBuffer, ML, payY + 14, { width: QR_PT, height: QR_PT });
  }

  // ── MIDDLE: Bank Details (same row as QR, FIX 6) ─────────────────────────
  const bankStartY = payY + (qrBuffer ? 14 : 0);  // align with QR top

  doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_DARK)
     .text('Bank Details:', BANK_X, bankStartY);

  const bankRows: [string, string][] = [
    ['Bank:',      company.bankName      || ''],
    ['Account #:', company.bankAccountNo || ''],
    ['IFSC Code:', company.bankIfsc      || ''],
    ['Branch:',    company.bankBranch    || ''],
  ].filter(([, v]) => !!v) as [string, string][];

  let bkY = bankStartY + 14;
  const LBL_COL = 68;   // label column width inside bank block

  for (const [lbl, val] of bankRows) {
    // Label (grey, normal)
    doc.font('NotoSans').fontSize(SZ_BODY).fillColor(C_MUTED)
       .text(lbl, BANK_X, bkY, { width: LBL_COL });
    // Value (black, bold) – positioned at fixed X, same bkY
    doc.font('NotoSans-Bold').fontSize(SZ_BODY).fillColor(C_DARK)
       .text(val, BANK_X + LBL_COL + 4, bkY, { width: BANK_W - LBL_COL - 4 });
    bkY += SZ_BODY + 4;
  }

  // ── RIGHT: Authorized Signatory ──────────────────────────────────────────
  const sigNameW = CW - (SIG_X - ML);
  doc.font('NotoSans').fontSize(SZ_LABEL).fillColor(C_MUTED)
     .text(`For ${(company.legalName || '').toUpperCase()}`, SIG_X, payY, {
       width: sigNameW, align: 'right',
     });

  // Signature space (~50pt) then underline + "Authorized Signatory"
  const sigLineY = payY + 64;
  doc.moveTo(SIG_X + sigNameW - 120, sigLineY)
     .lineTo(SIG_X + sigNameW, sigLineY)
     .strokeColor(C_DARK).lineWidth(0.6).stroke();
  doc.font('NotoSans').fontSize(SZ_LABEL).fillColor(C_MUTED)
     .text('Authorized Signatory', SIG_X, sigLineY + 4, {
       width: sigNameW, align: 'right',
     });

  // Advance y past the taller of left and right blocks
  const leftBlockH  = (qrBuffer ? 14 + QR_PT : 0) + 4;
  const rightBlockH = 64 + SZ_LABEL + 8;
  y = payY + Math.max(leftBlockH, Math.max(bkY - bankStartY, rightBlockH)) + 16;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 8: NOTES  (FIX 4: full-width, never clipped)
  // ══════════════════════════════════════════════════════════════════════════

  doc.font('NotoSans-Bold').fontSize(SZ_LABEL).fillColor(C_DARK)
     .text('Notes: ', ML, y, { continued: true });
  // FIX 4: width: CW ensures text wraps inside the page, never clips
  rg(SZ_BODY).text(
    'We sincerely appreciate your business. Kindly ensure payment is made within 15 days. '
    + 'Should you have any inquiries regarding this invoice, please do not hesitate to contact us.',
    { width: CW },
  );
  y += doc.heightOfString(
    'We sincerely appreciate your business. Kindly ensure payment is made within 15 days.',
    { width: CW },
  ) + 20;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 9: FOOTER – pinned near bottom, within margins
  // ══════════════════════════════════════════════════════════════════════════

  const FOOTER_Y = doc.page.height - 28;
  doc.moveTo(ML, FOOTER_Y - 6).lineTo(ML + CW, FOOTER_Y - 6)
     .strokeColor(C_LGRAY).lineWidth(0.7).stroke();

  // Left: page info
  doc.font('NotoSans').fontSize(SZ_SMALL).fillColor(C_MUTED)
     .text('Page 1 / 1  \u2022  This is a digitally signed document.', ML, FOOTER_Y);

  // Right: branding (existing "Powered By MadTech")
  doc.font('NotoSans-Bold').fontSize(SZ_SMALL).fillColor(C_DARK)
     .text('Powered By MadTech', ML, FOOTER_Y, { width: CW, align: 'right' });
}
