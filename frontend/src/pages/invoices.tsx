import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  company: { legalName: string };
  customer: { legalName: string };
  taxableAmount: number;
  totalTax: number;
  totalAmount: number;
  status: string;
  pdfStorageKey?: string;
}

interface Company {
  id: string;
  legalName: string;
}

function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Filtering & Pagination states
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Load company profiles for dropdown
    axios.get('/api/companies').then(res => setCompanies(res.data));
  }, []);

  const fetchInvoices = () => {
    setLoading(true);
    axios.get('/api/invoices', {
      params: {
        page,
        limit: 10,
        search,
        status,
        companyId,
      }
    })
      .then(res => {
        setInvoices(res.data.invoices);
        setTotalPages(res.data.pagination.totalPages);
      })
      .catch(err => console.error('Fetch invoices failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, search, status, companyId]);

  const handleDownload = async (pdfStorageKey: string, invoiceNumber: string) => {
    try {
      const res = await axios.get('/api/invoices/download-file', {
        params: { key: pdfStorageKey },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Invoices Directory</h2>
          <p className="text-xs text-slate-500 font-medium font-sans">Inspect generated tax records and download archives</p>
        </div>
      </div>

      {/* Filter and search parameters bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Company profile selector */}
        <div className="w-full md:w-56">
          <select
            value={companyId}
            onChange={e => { setCompanyId(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
          >
            <option value="">All Companies...</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.legalName}</option>
            ))}
          </select>
        </div>

        {/* Status selection */}
        <div className="w-full md:w-44">
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="GENERATED">Generated</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

      </div>

      {/* Invoices table data container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invoices.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <th className="px-6 py-3.5">Invoice No</th>
                  <th className="px-6 py-3.5">Invoice Date</th>
                  <th className="px-6 py-3.5">Issuer Profile</th>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Taxable Val</th>
                  <th className="px-6 py-3.5">Grand Total</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span>{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-xs font-medium">{inv.company.legalName}</td>
                    <td className="px-6 py-4">{inv.customer.legalName}</td>
                    <td className="px-6 py-4 font-mono">₹{parseFloat(inv.taxableAmount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 font-semibold font-mono">₹{parseFloat(inv.totalAmount.toString()).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                        inv.status === 'GENERATED' ? 'bg-emerald-50 text-emerald-700' :
                        inv.status === 'PENDING' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.pdfStorageKey ? (
                        <button
                          onClick={() => handleDownload(inv.pdfStorageKey!, inv.invoiceNumber)}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              No matching invoices found in history database.
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Invoices;
