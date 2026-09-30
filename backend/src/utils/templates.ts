interface TemplateData {
  company: any;
  customer: any;
  invoice: any;
  items: any[];
  amountInWords: string;
}

const CA_LOGO_BASE64 = 'data:image/png;base64,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';

export function renderInvoiceTemplate(data: TemplateData): string {
  const { company, customer, invoice, items, amountInWords } = data;

  // Formatted Dates
  const formattedInvoiceDate = new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  const formattedDueDate = invoice.dueDate 
    ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
    : formattedInvoiceDate;

  // Calculate total items and quantity
  const totalQty = items.reduce((acc, item) => acc + parseFloat(item.quantity?.toString() || '0'), 0);

  // Build items table rows matching Shaik & Reddy / Swipe format
  const itemRows = items
    .map((item, index) => {
      const rate = parseFloat(item.rate?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const qty = parseFloat(item.quantity?.toString() || '0');
      const unit = item.unit ? item.unit.toUpperCase() : 'NOS';
      const total = parseFloat(item.totalAmount?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `
      <tr>
        <td style="text-align: left; font-weight: 500; width: 4%;">${index + 1}</td>
        <td style="text-align: left; font-weight: 700; width: 56%; text-transform: uppercase;">
          ${item.description}
          ${item.hsnSac ? `<div style="font-weight: normal; font-size: 9.5px; color: #64748b; margin-top: 2px;">HSN/SAC: ${item.hsnSac}</div>` : ''}
        </td>
        <td style="text-align: right; font-weight: 600; width: 16%;">${rate}</td>
        <td style="text-align: center; font-weight: 500; width: 8%;">${qty} ${unit}</td>
        <td style="text-align: right; font-weight: 700; width: 16%;">${total}</td>
      </tr>
    `;
    })
    .join('');

  const grandTotalFormatted = parseFloat(invoice.totalAmount?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 12mm 12mm 12mm 12mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 10.5px;
          line-height: 1.35;
          color: #1e293b;
          margin: 0;
          padding: 10px 15px;
          background-color: #fff;
        }
        .invoice-box {
          max-width: 780px;
          margin: auto;
        }

        /* Top Header */
        .top-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .top-table td {
          vertical-align: top;
        }
        .title-invoice {
          font-size: 18px;
          font-weight: 800;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .original-tag {
          font-size: 9px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          text-align: right;
          letter-spacing: 0.4px;
        }
        .ca-logo-img {
          height: 70px;
          width: auto;
          margin-top: 4px;
        }

        /* Company Identity */
        .company-name {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-top: 2px;
          margin-bottom: 3px;
        }
        .company-address {
          font-size: 10px;
          color: #334155;
          line-height: 1.35;
        }

        /* Meta Row */
        .meta-container {
          margin-top: 14px;
          margin-bottom: 12px;
          padding: 4px 0;
          width: 100%;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
        }
        .meta-table td {
          font-size: 11px;
          color: #0f172a;
          padding-right: 15px;
        }

        /* Customer Box */
        .customer-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          margin-bottom: 12px;
        }
        .customer-table td {
          width: 50%;
          vertical-align: top;
          padding-right: 15px;
        }
        .section-label {
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 2px;
        }
        .client-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 11px;
        }

        /* Reference Line */
        .reference-box {
          font-size: 10.5px;
          color: #0f172a;
          margin-top: 6px;
          margin-bottom: 12px;
        }

        /* Items Table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          margin-bottom: 0px;
        }
        .items-table th {
          border-top: 2px solid #2563eb;
          border-bottom: 1px solid #cbd5e1;
          padding: 6px 4px;
          font-size: 10px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }
        .items-table td {
          padding: 8px 4px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        /* Summary Section */
        .summary-wrapper {
          border-top: 2px solid #2563eb;
          padding-top: 6px;
          margin-bottom: 20px;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
        }

        /* Payment & Signature Row */
        .payment-sig-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          margin-bottom: 15px;
        }
        .payment-sig-table td {
          vertical-align: top;
        }

        /* Notes Box */
        .notes-container {
          margin-top: 15px;
          font-size: 9.5px;
          color: #475569;
          line-height: 1.4;
        }

        /* Footer Bar */
        .footer-bar {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        
        <!-- Header -->
        <table class="top-table">
          <tr>
            <td>
              <div class="title-invoice">INVOICE</div>
              <div class="company-name">${company.legalName}</div>
              <div class="company-address">
                ${company.addressLine1}${company.addressLine2 ? ', ' + company.addressLine2 : ''}<br>
                ${company.city}, ${company.state}, ${company.pinCode}<br>
                Mobile <strong>${company.phone || '+91 9063255721'}</strong> &nbsp;&nbsp; Email <strong>${company.email || 'shaikandreddy@gmail.com'}</strong><br>
                ${company.tradeName ? `Website <strong>${company.tradeName.toLowerCase().replace(/\s+/g, '')}.com</strong>` : 'Website <strong>shaikandreddyassociates.com</strong>'}
              </div>
            </td>
            <td style="text-align: right;">
              <div class="original-tag">ORIGINAL FOR RECIPIENT</div>
              <img src="${CA_LOGO_BASE64}" class="ca-logo-img" alt="CA INDIA Logo" />
            </td>
          </tr>
        </table>

        <!-- Meta Row -->
        <div class="meta-container">
          <table class="meta-table">
            <tr>
              <td>Invoice #: <strong>${invoice.invoiceNumber}</strong></td>
              <td>Invoice Date: <strong>${formattedInvoiceDate}</strong></td>
              <td>Due Date: <strong>${formattedDueDate}</strong></td>
            </tr>
          </table>
        </div>

        <!-- Customer & Billing Details -->
        <table class="customer-table">
          <tr>
            <td>
              <div class="section-label">Customer Details:</div>
              <div class="client-name">${customer.legalName}</div>
              <div style="font-size: 10.5px; color: #334155; margin-top: 2px;">
                GSTIN: <strong>${customer.gstin || 'URD (Unregistered)'}</strong>
              </div>
            </td>
            <td>
              <div class="section-label">Billing Address:</div>
              <div style="font-size: 10.5px; color: #334155;">
                ${customer.addressLine1}${customer.addressLine2 ? ', ' + customer.addressLine2 : ''}<br>
                ${customer.city}, ${customer.state}, ${customer.pinCode}
              </div>
            </td>
          </tr>
        </table>

        <!-- Reference Line -->
        <div class="reference-box">
          Reference: <strong>Professional charges for the month of ${new Date(invoice.invoiceDate).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</strong>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align: left; width: 4%;">#</th>
              <th style="text-align: left; width: 56%;">Item</th>
              <th style="text-align: right; width: 16%;">Rate / Item</th>
              <th style="text-align: center; width: 8%;">Qty</th>
              <th style="text-align: right; width: 16%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Total Summary Bar -->
        <div class="summary-wrapper">
          <table class="summary-table">
            <tr>
              <td style="font-size: 10px; color: #475569; font-weight: 500;">
                Total Items / Qty : ${items.length} / ${totalQty}
              </td>
              <td style="text-align: right;">
                <span style="font-size: 14px; font-weight: 800; color: #0f172a;">Total &nbsp;&nbsp;&nbsp;&nbsp; ₹${grandTotalFormatted}</span>
              </td>
            </tr>
          </table>
          <div style="text-align: right; font-size: 10px; color: #475569; margin-top: 4px;">
            Total amount (in words): INR ${amountInWords}.
          </div>
          <div style="text-align: right; font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 3px;">
            Amount Payable: &nbsp;&nbsp;&nbsp;&nbsp; ₹${grandTotalFormatted}
          </div>
        </div>

        <!-- Payment & Signature Section -->
        <table class="payment-sig-table">
          <tr>
            <td style="width: 60%; font-size: 10px; color: #334155;">
              <strong>Pay using UPI:</strong><br>
              <div style="margin-top: 4px; margin-bottom: 8px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=upi://pay?pa=${company.bankAccountNo || '50200112005848'}@hdfcbank&pn=${encodeURIComponent(company.legalName)}&am=${invoice.totalAmount}" style="width: 85px; height: 85px; border: 1px solid #e2e8f0; border-radius: 4px;" alt="UPI QR" />
              </div>
              <strong>Bank Details:</strong><br>
              <table style="font-size: 10px; color: #334155; margin-top: 2px; border-collapse: collapse;">
                <tr><td style="padding-right: 12px; color: #64748b;">Bank:</td><td><strong>${company.bankName || 'HDFC Bank'}</strong></td></tr>
                <tr><td style="padding-right: 12px; color: #64748b;">Account #:</td><td><strong>${company.bankAccountNo || '50200112005848'}</strong></td></tr>
                <tr><td style="padding-right: 12px; color: #64748b;">IFSC Code:</td><td><strong>${company.bankIfsc || 'HDFC0009860'}</strong></td></tr>
                <tr><td style="padding-right: 12px; color: #64748b;">Branch:</td><td><strong>${company.bankBranch || 'BAHDURPALLY'}</strong></td></tr>
              </table>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top;">
              <div style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">
                For ${company.legalName}
              </div>
              <div style="height: 45px;"></div>
              <div style="font-size: 10px; font-weight: 700; color: #334155;">
                Authorized Signatory
              </div>
            </td>
          </tr>
        </table>

        <!-- Notes -->
        <div class="notes-container">
          <strong>Notes:</strong><br>
          We sincerely appreciate your business. Kindly ensure payment is made within 15 days. Should you have any inquiries regarding this invoice, please do not hesitate to contact us.
        </div>

        <!-- Footer -->
        <div class="footer-bar">
          <div>Page 1/1 • This is a digitally signed document.</div>
          <div style="font-weight: 700; color: #0f172a;">Powered By MadTech</div>
        </div>

      </div>
    </body>
    </html>
  `;
}
