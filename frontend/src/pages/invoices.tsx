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
  AlertCircle,
  CreditCard,
  X
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
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentDate?: string;
  paymentAmount?: number;
  paymentNote?: string;
}

interface Company {
  id: string;
  legalName: string;
}

interface PaymentForm {
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentDate: string;
  paymentAmount: string;
  paymentNote: string;
}

function PaymentModal({ invoice, onClose, onSaved }: { invoice: Invoice; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PaymentForm>({
    paymentStatus: invoice.paymentStatus || 'UNPAID',
    paymentDate: invoice.paymentDate ? new Date(invoice.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    paymentAmount: invoice.paymentAmount?.toString() || parseFloat(invoice.totalAmount.toString()).toFixed(2),
    paymentNote: invoice.paymentNote || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.patch(`/api/invoices/${invoice.id}/payment`, {
        paymentStatus: form.paymentStatus,
        paymentDate: form.paymentDate || null,
        paymentAmount: form.paymentAmount ? parseFloat(form.paymentAmount) : null,
        paymentNote: form.paymentNote || null,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update payment status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mark Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Status</label>
            <select
              value={form.paymentStatus}
              onChange={e => setForm({ ...form, paymentStatus: e.target.value as PaymentForm['paymentStatus'] })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PAID">PAID</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="UNPAID">UNPAID</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Date</label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={e => setForm({ ...form, paymentDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Received (₹)</label>
            <input
              type="number"
              step="0.01"
              value={form.paymentAmount}
              onChange={e => setForm({ ...form, paymentAmount: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Note (optional)</label>
            <textarea
              value={form.paymentNote}
              onChange={e => setForm({ ...form, paymentNote: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. Paid via NEFT, reference #..."
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  if (status === 'PAID') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-emerald-50 text-emerald-700">
        🟢 PAID
      </span>
    );
  }
  if (status === 'PARTIAL') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-amber-50 text-amber-700">
        🟡 PARTIAL
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-red-50 text-red-700">
      🔴 UNPAID
    </span>
  );
}

const PAYMENT_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Unpaid', value: 'UNPAID' },
  { label: 'Partial', value: 'PARTIAL' },
];

function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Filtering & Pagination states
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Payment modal state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);

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
        paymentStatus,
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
  }, [page, search, status, companyId, paymentStatus]);

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
      
      {paymentModalInvoice && (
        <PaymentModal
          invoice={paymentModalInvoice}
          onClose={() => setPaymentModalInvoice(null)}
          onSaved={fetchInvoices}
        />
      )}

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

        {/* Payment status filter tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {PAYMENT_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setPaymentStatus(tab.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                paymentStatus === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
                  <th className="px-6 py-3.5">Payment</th>
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
                    <td className="px-6 py-4">
                      <PaymentBadge status={inv.paymentStatus || 'UNPAID'} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setPaymentModalInvoice(inv)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Mark Payment
                        </button>
                        {inv.pdfStorageKey ? (
                          <button
                            onClick={() => handleDownload(inv.pdfStorageKey!, inv.invoiceNumber)}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Processing...</span>
                        )}
                      </div>
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
