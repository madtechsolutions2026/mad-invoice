import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  Receipt, 
  AlertTriangle, 
  Building2, 
  Users, 
  Clock, 
  Download,
  IndianRupee
} from 'lucide-react';

interface DashboardStats {
  summary: {
    totalInvoices: number;
    generatedInvoices: number;
    pendingInvoices: number;
    failedInvoices: number;
    taxableValue: number;
    taxAmount: number;
    invoiceValue: number;
    totalCompanies: number;
    totalCustomers: number;
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

interface Batch {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdAt: string;
  company?: { legalName: string };
}

function Dashboard({ onViewBatch }: { onViewBatch: (id: string) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/reports/dashboard'),
      axios.get('/api/batches'),
    ])
      .then(([statsRes, batchesRes]) => {
        setStats(statsRes.data);
        setBatches(batchesRes.data.slice(0, 5)); // show top 5 recent batches
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { summary } = stats;

  const cards = [
    {
      title: 'Total Revenue',
      value: `₹${summary.invoiceValue.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-emerald-500/10 text-emerald-600',
      subtitle: `Taxable: ₹${summary.taxableValue.toLocaleString('en-IN')}`,
    },
    {
      title: 'Total Tax Collected',
      value: `₹${summary.taxAmount.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'bg-blue-500/10 text-blue-600',
      subtitle: `CGST/SGST/IGST splits`,
    },
    {
      title: 'Invoices Count',
      value: summary.totalInvoices.toString(),
      icon: Receipt,
      color: 'bg-indigo-500/10 text-indigo-600',
      subtitle: `Generated: ${summary.generatedInvoices} | Failed: ${summary.failedInvoices}`,
    },
    {
      title: 'Corporate Masters',
      value: summary.totalCustomers.toString(),
      icon: Users,
      color: 'bg-amber-500/10 text-amber-600',
      subtitle: `${summary.totalCompanies} active company entities`,
    },
  ];

  // Pie chart variables
  const statusPieData = [
    { name: 'Generated', value: summary.generatedInvoices, color: '#10b981' },
    { name: 'Pending', value: summary.pendingInvoices, color: '#6366f1' },
    { name: 'Failed', value: summary.failedInvoices, color: '#ef4444' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8">
      
      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">{card.title}</span>
                <div className={`p-2.5 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Monthly revenue bar chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 lg:col-span-2 shadow-sm">
          <h3 className="text-base font-bold text-slate-950 mb-6">Monthly Financial Volume</h3>
          <div className="h-80 w-full">
            {stats.monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyStats}>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, '']} />
                  <Legend />
                  <Bar dataKey="taxable" fill="#0056b3" name="Taxable Value" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" fill="#10b981" name="Grand Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No monthly statistics data compiled yet.
              </div>
            )}
          </div>
        </div>

        {/* Invoice status distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-950 mb-4">Invoice Queue Breakdown</h3>
          <div className="h-60 w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">No active batch invoices.</div>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {statusPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-500 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} ({Math.round(item.value / stats.summary.totalInvoices * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Batches List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-950">Recent Upload Batches</h3>
        </div>
        <div className="overflow-x-auto">
          {batches.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <th className="px-6 py-3.5">Filename</th>
                  <th className="px-6 py-3.5">Company Target</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Invoices Rows</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{batch.fileName}</td>
                    <td className="px-6 py-4">{batch.company?.legalName || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                        batch.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                        batch.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700 animate-pulse' :
                        batch.status === 'VALIDATED' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold">{batch.totalRows}</span>
                      {batch.errorRows > 0 && (
                        <span className="text-xs text-red-500 ml-1.5">({batch.errorRows} errors)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(batch.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onViewBatch(batch.id)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              No spreadsheets uploaded yet. Head to the "Upload Invoice Data" menu to start.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
