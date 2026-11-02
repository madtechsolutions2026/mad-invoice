import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, ShieldAlert, User, Terminal, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entityName?: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Database Reset Modal states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    axios.get('/api/reports/audit-logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error('Fetch audit logs failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleResetDatabase = async () => {
    if (resetConfirmInput !== 'RESET') return;
    setIsResetting(true);
    setResetError(null);
    try {
      const res = await axios.post('/api/admin/reset-database', {
        confirmation: 'RESET_PRODUCTION_DATABASE',
      });
      setResetSuccess(res.data.message || 'Database reset successfully!');
      setIsResetModalOpen(false);
      setResetConfirmInput('');
      fetchLogs();
      alert('Production database has been successfully reset to a blank slate! All test invoices, batches, customers, and companies were wiped.');
      window.location.reload();
    } catch (err: any) {
      setResetError(err.response?.data?.error || 'Failed to reset database');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Security Audit Trail</h2>
          <p className="text-xs text-slate-500 font-medium">Log of platform alterations, logins, and billing executions</p>
        </div>
        <button
          onClick={() => {
            setIsResetModalOpen(true);
            setResetConfirmInput('');
            setResetError(null);
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm shadow-red-200 self-start sm:self-auto"
        >
          <Trash2 className="h-4 w-4" />
          Reset Database
        </button>
      </div>

      {resetSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <span>{resetSuccess}</span>
          <button onClick={() => setResetSuccess(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {logs.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">Trigger User</th>
                  <th className="px-6 py-3.5">Entity / ID</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5">Time Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <div className="font-semibold text-slate-800">{log.user.firstName} {log.user.lastName}</div>
                          <div className="text-xs text-slate-400">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">System Process</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.entityName ? (
                        <div>
                          <span className="font-medium text-slate-800">{log.entityName}</span>
                          {log.entityId && <span className="text-xs text-slate-400 ml-1.5">({log.entityId.substring(0, 8)}...)</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{log.ipAddress || '-'}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              No audit logs captured.
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-red-50/60 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-red-950">Danger Zone: Complete Blank Slate Database Reset</h3>
            <p className="text-xs text-red-800 mt-1 leading-relaxed">
              This operation will permanently purge all invoices, batches, customer records, billing groups, and company entities from the production database.
              Your Administrator credentials will remain completely active so you can immediately begin afresh.
            </p>
            <div className="mt-4">
              <button
                onClick={() => {
                  setIsResetModalOpen(true);
                  setResetConfirmInput('');
                  setResetError(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                Reset Production Database to Blank Slate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Production Database</h3>
                <p className="text-xs text-red-600 font-semibold">Irreversible Complete Blank Slate Action</p>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 leading-relaxed">
                {resetError}
              </div>
            )}

            <div className="space-y-3 text-sm text-slate-600 mb-6">
              <p className="leading-relaxed">
                Are you sure you want to reset the production database? This will permanently delete:
              </p>
              <ul className="text-xs list-disc list-inside space-y-1 text-slate-700 font-medium pl-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <li>All Invoices & Line Items</li>
                <li>All Uploaded Batches & Import History</li>
                <li>All Customer Master Records</li>
                <li>All Billing Groups & Members</li>
                <li>All Billing Entity / Company Profiles</li>
                <li>Historical Audit Trail Logs</li>
              </ul>
              <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                ✓ Your Admin account (login & password) will remain 100% active.
              </p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type <span className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="RESET"
                  value={resetConfirmInput}
                  onChange={e => setResetConfirmInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-red-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => { setIsResetModalOpen(false); setResetConfirmInput(''); setResetError(null); }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetConfirmInput !== 'RESET' || isResetting}
                onClick={handleResetDatabase}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                {isResetting ? 'Resetting Database...' : 'Confirm Blank Slate Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Audit;
