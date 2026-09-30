# Indian GST & e-Invoicing Domain Manual
## Bulk Invoice Automation Platform — MadTech Solutions

---

## 1. Place of Supply (POS) Logic

To ensure compliant tax calculations in India, the application determines taxes based on State Codes:
* **Intra-State Supply:**
  * Condition: Supplier State Code (Company) **equals** Recipient State Code (Customer).
  * Taxes Applied: **CGST** (Central GST) and **SGST** (State GST).
  * Rate Split: Split equally (e.g., an 18% GST item applies 9% CGST and 9% SGST).
* **Inter-State Supply:**
  * Condition: Supplier State Code (Company) **does not equal** Recipient State Code (Customer).
  * Taxes Applied: **IGST** (Integrated GST) at full rate (e.g., 18% IGST).

---

## 2. Rounded Off Rules (Financial Math)

* **Line-item level calculations:** Tax amounts are kept in decimals up to 4 places inside the database during intermediary operations to prevent aggregate truncation errors.
* **Invoice-level Grand Total rounding:** In accordance with standard Indian retail and B2B billing practices, the final invoice grand total is rounded off to the nearest whole rupee:
  * Example: A total of `₹1,250.45` rounds to `₹1,250.00` (Round-off: `-₹0.45`).
  * Example: A total of `₹1,250.55` rounds to `₹1,251.00` (Round-off: `+₹0.45`).

---

## 3. Phase 2 e-Invoicing API Integration Roadmap

When the client expands volumes to meet mandatory e-invoicing thresholds:
1. **Payload Generation:** Convert the generated `Invoice` and `InvoiceItem` records into the JSON schema mandated by the government portal (NIC/GSP sandbox).
2. **API Handshake:** Post payload to GSP (e.g. ClearTax/NIC APIs) to get back:
   * **IRN:** Invoice Reference Number (64-character hash).
   * **Ack No & Date:** Acknowledgement details.
   * **Signed QR Code String:** Cryptographic string representing invoice summaries.
3. **PDF Injector:** Render QR Code visual components using the returned signed string onto the PDF invoice template.
