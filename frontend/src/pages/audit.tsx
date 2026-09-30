import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, ShieldAlert, User, Terminal } from 'lucide-react';

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

  useEffect(() => {
    axios.get('/api/reports/audit-logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error('Fetch audit logs failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-xl font-bold text-slate-900">Security Audit Trail</h2>
        <p className="text-xs text-slate-500 font-medium">Log of platform alterations, logins, and billing executions</p>
      </div>

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

    </div>
  );
}

export default Audit;
