import * as fs from 'fs';
import * as path from 'path';

/** Presentation rules shared by the PDF and HTML invoice outputs. */
export function getPreviousBillingMonth(invoiceDate: string | number | Date): string {
  const date = new Date(invoiceDate);
  if (Number.isNaN(date.getTime())) throw new Error('A valid invoice date is required');
  // Build the first of the previous month, rather than subtracting from a
  // month-end date (31 March would otherwise overflow back into March).
  const previousMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return previousMonth.toLocaleString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function getCompanyStampLines(company: { legalName?: string; city?: string }): string[] {
  return [company.legalName || 'Company', company.city || ''].filter(Boolean).map(line => line.toUpperCase());
}

export function escapeInvoiceHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

export function renderCompanyNameStamp(company: { legalName?: string; city?: string }): string {
  const [name, city] = getCompanyStampLines(company).map(escapeInvoiceHtml);
  // A company-name mark, never a simulated handwritten signature or a claim
  // that the invoice has a cryptographic digital signature.
  return `<div aria-label="Company name stamp" style="display: inline-block; max-width: 155px; padding: 9px 10px; border: 3px double #24549b; border-radius: 4px; color: #24549b; text-align: center; line-height: 1.35; font-family: Arial, sans-serif;"><strong style="font-size: 10px; letter-spacing: 0.3px;">${name}</strong>${city ? `<div style="font-size: 8px; margin-top: 4px;">${city}</div>` : ''}</div>`;
}


/** Uploaded branding wins; the supplied Shaik & Reddy seal is firm-specific. */
export function resolveCompanyStampPath(company: { legalName?: string; stampStorageKey?: string }): string | null {
  if (company.stampStorageKey) {
    const uploadedPath = path.join(process.cwd(), 'storage', company.stampStorageKey);
    if (fs.existsSync(uploadedPath)) return uploadedPath;
  }
  const name = (company.legalName || '').toLowerCase().replace(/&/g, ' and ').replace(/\band\b/g, ' ').replace(/[^a-z0-9]/g, '');
  if (name === 'shaikreddyassociates') {
    const suppliedPath = path.join(process.cwd(), 'src/assets/company-stamps/shaik-and-reddy.png');
    if (fs.existsSync(suppliedPath)) return suppliedPath;
  }
  return null;
}
