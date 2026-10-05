import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Download, RefreshCw, Calendar, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ReportData {
  summary: {
    totalInvoices: number;
    taxableValue: number;
    taxAmount: number;
    invoiceValue: number;
  };
  monthlyStats: Array<{
    month: string;
    count: number;
    taxable: number;
    tax: number;
    total: number;
  }>;
  customerStats: Array<{
    customerId: string;
    customerName: string;
    invoiceCount: number;
    totalValue: number;
  }>;
}

interface PaymentSummaryData {
  monthlyStats: Array<{
    month: string;
    totalInvoiced: number;
    totalReceived: number;
    totalPending: number;
    paidCount: number;
    unpaidCount: number;
    partialCount: number;
    invoiceCount: number;
  }>;
  summary: {
    grandTotalInvoiced: number;
    grandTotalReceived: number;
    grandTotalPending: number;
    collectionRate: number;
  };
}

function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/reports/dashboard'),
      axios.get('/api/reports/payment-summary'),
    ])
      .then(([dashRes, payRes]) => {
        setData(dashRes.data);
        setPaymentData(payRes.data);
      })
      .catch(err => console.error('Fetch reports failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Month/Period,Invoice Count,Taxable Value (INR),Tax Amount (INR),Grand Total (INR)\n';

    data.monthlyStats.forEach(row => {
      csvContent += `"${row.month}",${row.count},${row.taxable},${row.tax},${row.total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'GSTR_Sales_Summary_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPaymentCSV = () => {
    if (!paymentData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Month,Total Invoiced (INR),Amount Received (INR),Amount Pending (INR),Paid Invoices,Unpaid Invoices,Partial Invoices,Collection Rate (%)\n';

    paymentData.monthlyStats.forEach(row => {
      const rate = row.totalInvoiced > 0 ? Math.round((row.totalReceived / row.totalInvoiced) * 100) : 0;
      csvContent += `"${row.month}",${row.totalInvoiced},${row.totalReceived},${row.totalPending},${row.paidCount},${row.unpaidCount},${row.partialCount},${rate}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Payment_Collection_Monthly_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 font-medium">Track fee collections, payment statuses, and monthly GSTR summaries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPaymentCSV}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Payments Report
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export GSTR Sales
          </button>
        </div>
      </div>

      {/* ── SECTION 1: PAYMENT COLLECTION SUMMARY (REQ-3) ── */}
      {paymentData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Fee Collection Summary (Month-Wise)
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-full text-slate-600">
              Overall Recovery Rate: {paymentData.summary.collectionRate}%
            </span>
          </div>

          {/* 3 Key Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Total Invoiced</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{paymentData.summary.grandTotalInvoiced.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All generated invoices</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-600">Payment Received</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{paymentData.summary.grandTotalReceived.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{paymentData.summary.collectionRate}% collected</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-rose-600">Amount Pending</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">₹{paymentData.summary.grandTotalPending.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Outstanding balance</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Month-Wise Payment Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Month-by-Month Fee Collections</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                    <th className="px-6 py-3.5">Month / Period</th>
                    <th className="px-6 py-3.5">Total Invoiced</th>
                    <th className="px-6 py-3.5">Received (Paid)</th>
                    <th className="px-6 py-3.5">Pending (Outstanding)</th>
                    <th className="px-6 py-3.5 text-center">Invoices Status</th>
                    <th className="px-6 py-3.5 text-right">% Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {paymentData.monthlyStats.length > 0 ? (
                    paymentData.monthlyStats.map((row, idx) => {
                      const rate = row.totalInvoiced > 0 ? Math.round((row.totalReceived / row.totalInvoiced) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-semibold text-slate-900">{row.month}</td>
                          <td className="px-6 py-4 font-mono font-semibold">₹{row.totalInvoiced.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 font-mono font-semibold text-emerald-600">₹{row.totalReceived.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 font-mono font-semibold text-rose-600">
                            ₹{row.totalPending.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium mr-1.5">{row.paidCount} Paid</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">{row.unpaidCount} Pending</span>
                            {row.partialCount > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium ml-1.5">{row.partialCount} Partial</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                              rate >= 90 ? 'bg-emerald-50 text-emerald-700' :
                              rate >= 50 ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                        No invoices logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: GSTR SALES SUMMARY ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-950">GSTR Sales Summary by Month</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                <th className="px-6 py-3.5">Month / Period</th>
                <th className="px-6 py-3.5">Invoice Count</th>
                <th className="px-6 py-3.5">Taxable Value</th>
                <th className="px-6 py-3.5">CGST / SGST (Est 9% each)</th>
                <th className="px-6 py-3.5">IGST (Est 18%)</th>
                <th className="px-6 py-3.5">Total Taxes</th>
                <th className="px-6 py-3.5">Grand Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {data.monthlyStats.map((row, idx) => {
                const cgstSgst = row.tax / 2;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.month}</td>
                    <td className="px-6 py-4 font-medium">{row.count}</td>
                    <td className="px-6 py-4 font-mono font-semibold">₹{row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">₹{cgstSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">₹{cgstSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-blue-700">₹{row.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-950">₹{row.total.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 3: TOP CUSTOMER CONTRIBUTIONS ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-950">Top Customer Contributions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Billing Volume (Count)</th>
                <th className="px-6 py-3.5">Total Billing Value (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {data.customerStats.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{row.customerName}</td>
                  <td className="px-6 py-4 font-medium">{row.invoiceCount} invoices</td>
                  <td className="px-6 py-4 font-bold font-mono text-emerald-700">₹{row.totalValue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default Reports;
