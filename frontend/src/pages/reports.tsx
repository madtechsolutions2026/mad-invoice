import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Download, RefreshCw, Calendar, TrendingUp } from 'lucide-react';

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

function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = () => {
    setLoading(true);
    axios.get('/api/reports/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error('Fetch reports failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
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

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tax Reports & Sales Summary</h2>
          <p className="text-xs text-slate-500 font-medium">Download aggregated invoice summaries in GSTR-friendly layout structures</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Download className="h-4 w-4" />
          Export CSV Report
        </button>
      </div>

      {/* Grid summarizing monthly sales */}
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
                const cgstSgst = row.tax / 2; // general heuristic split representation
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

      {/* Customer contribution listing */}
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
