import { Decimal } from 'decimal.js';

export interface CalculatedItem {
  hsnSac: string;
  description: string;
  quantity: Decimal;
  unit: string;
  rate: Decimal;
  discount: Decimal;
  taxableValue: Decimal;
  gstRate: Decimal;
  cgstRate: Decimal;
  sgstRate: Decimal;
  igstRate: Decimal;
  cgstAmount: Decimal;
  sgstAmount: Decimal;
  igstAmount: Decimal;
  totalAmount: Decimal;
}

export interface CalculatedInvoiceTotals {
  taxableAmount: Decimal;
  cgstAmount: Decimal;
  sgstAmount: Decimal;
  igstAmount: Decimal;
  totalTax: Decimal;
  discountAmount: Decimal;
  roundOffAmount: Decimal;
  totalAmount: Decimal;
  items: CalculatedItem[];
}

export function computeInvoiceTotals(
  companyStateCode: string,
  customerStateCode: string,
  rawItems: Array<{
    hsnSac: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    discount?: number;
    gstRate: number;
  }>
): CalculatedInvoiceTotals {
  const isMH = companyStateCode.trim() === customerStateCode.trim();

  let totalTaxable = new Decimal(0);
  let totalCgst = new Decimal(0);
  let totalSgst = new Decimal(0);
  let totalIgst = new Decimal(0);
  let totalDiscount = new Decimal(0);

  const calculatedItems: CalculatedItem[] = rawItems.map((item) => {
    const qty = new Decimal(item.quantity || 0);
    const rate = new Decimal(item.rate || 0);
    const disc = new Decimal(item.discount || 0);
    const gstRate = new Decimal(item.gstRate || 0);

    // taxableValue = qty * rate - disc
    const taxableValue = qty.mul(rate).sub(disc);

    let cgstRate = new Decimal(0);
    let sgstRate = new Decimal(0);
    let igstRate = new Decimal(0);
    let cgstAmount = new Decimal(0);
    let sgstAmount = new Decimal(0);
    let igstAmount = new Decimal(0);

    if (isMH) {
      cgstRate = gstRate.div(2);
      sgstRate = gstRate.div(2);
      cgstAmount = taxableValue.mul(cgstRate).div(100);
      sgstAmount = taxableValue.mul(sgstRate).div(100);
    } else {
      igstRate = gstRate;
      igstAmount = taxableValue.mul(igstRate).div(100);
    }

    const itemTotal = taxableValue.add(cgstAmount).add(sgstAmount).add(igstAmount);

    totalTaxable = totalTaxable.add(taxableValue);
    totalCgst = totalCgst.add(cgstAmount);
    totalSgst = totalSgst.add(sgstAmount);
    totalIgst = totalIgst.add(igstAmount);
    totalDiscount = totalDiscount.add(disc);

    return {
      hsnSac: item.hsnSac,
      description: item.description,
      quantity: qty,
      unit: item.unit,
      rate,
      discount: disc,
      taxableValue,
      gstRate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: itemTotal,
    };
  });

  const totalTax = totalCgst.add(totalSgst).add(totalIgst);
  const grandTotalRaw = totalTaxable.add(totalTax);

  // Round off to nearest whole number (INR standard practice)
  const totalAmountRounded = grandTotalRaw.round();
  const roundOffAmount = totalAmountRounded.sub(grandTotalRaw);

  return {
    taxableAmount: totalTaxable,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    igstAmount: totalIgst,
    totalTax,
    discountAmount: totalDiscount,
    roundOffAmount,
    totalAmount: totalAmountRounded,
    items: calculatedItems,
  };
}

// Convert amount to Indian Rupees Words representation
export function convertAmountToWords(amount: number): string {
  const roundedAmount = Math.round(amount);
  if (roundedAmount === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const doubleDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensDigits = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const formatTens = (num: number) => {
    if (num < 10) return singleDigits[num];
    if (num < 20) return doubleDigits[num - 10];
    return tensDigits[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + singleDigits[num % 10] : '');
  };

  const formatBelowThousand = (num: number) => {
    let str = '';
    if (num >= 100) {
      str += singleDigits[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      str += formatTens(num);
    }
    return str.trim();
  };

  let remaining = roundedAmount;
  let words = '';

  // Crores (10,00,00,00)
  if (remaining >= 10000000) {
    words += formatBelowThousand(Math.floor(remaining / 10000000)) + ' Crore ';
    remaining %= 10000000;
  }
  // Lakhs (1,00,000)
  if (remaining >= 100000) {
    words += formatBelowThousand(Math.floor(remaining / 100000)) + ' Lakh ';
    remaining %= 100000;
  }
  // Thousands (1,000)
  if (remaining >= 1000) {
    words += formatBelowThousand(Math.floor(remaining / 1000)) + ' Thousand ';
    remaining %= 1000;
  }
  // Hundreds and units
  if (remaining > 0) {
    words += formatBelowThousand(remaining);
  }

  return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}
