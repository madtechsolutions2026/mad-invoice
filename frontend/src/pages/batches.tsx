import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  History,
  Clock
} from 'lucide-react';

interface Batch {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  zipStorageKey?: string;
  createdAt: string;
  company?: { legalName: string };
}

interface BatchProgress {
  status: string;
  totalInvoices: number;
  generated: number;
  failed: number;
  zipStorageKey: string | null;
  progressPercentage: number;
}

interface BatchInvoice {
  id: string;
  invoiceNumber: string;
  pdfStorageKey: string | null;
  status: string;
  totalAmount: number;
  customer?: { legalName: string };
}

interface BatchesProps {
  onViewBatch: (id: string) => void;
  activeBatchId: string | null;
}

function Batches({ onViewBatch, activeBatchId }: BatchesProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchInvoices, setBatchInvoices] = useState<BatchInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll intervals for generation progress
  useEffect(() => {
    let pollInterval: any;

    if (activeBatchId) {
      setLoading(true);
      // Fetch details of active batch
      axios.get(`/api/batches/${activeBatchId}`)
        .then(res => {
          setSelectedBatch(res.data.batch);
          
          // Start polling progress
          const fetchProgress = () => {
            axios.get(`/api/batches/${activeBatchId}/progress`)
              .then(progRes => {
                setProgress(progRes.data);
                if (progRes.data.status === 'COMPLETED' || progRes.data.status === 'FAILED') {
                  clearInterval(pollInterval);
                  // Load individual invoices for per-client download buttons
                  axios.get('/api/invoices', { params: { batchId: activeBatchId, limit: 100 } })
                    .then(invRes => setBatchInvoices(invRes.data.invoices || []))
                    .catch(err => console.error('Failed to load batch invoices:', err));
                }
              });
          };

          fetchProgress();
          pollInterval = setInterval(fetchProgress, 2000);
        })
        .catch(err => console.error('Fetch batch details failed:', err))
        .finally(() => setLoading(false));
    } else {
      // Fetch all batches listing
      axios.get('/api/batches')
        .then(res => setBatches(res.data))
        .catch(err => console.error('Fetch batches listing failed:', err))
        .finally(() => setLoading(false));
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeBatchId]);

  const handleDownloadZip = async (storageKey: string, label: string) => {
    try {
      const res = await axios.get('/api/invoices/download-file', {
        params: { key: storageKey },
        responseType: 'blob',
      });
      const isPdf = storageKey.endsWith('.pdf');
      const mimeType = isPdf ? 'application/pdf' : 'application/zip';
      const ext = isPdf ? 'pdf' : 'zip';
      const safeName = label.replace(/[\/\\:*?"<>|]/g, '-');
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  if (loading && !selectedBatch) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Active Batch Progress Screen
  if (activeBatchId && selectedBatch && progress) {
    const isCompleted = progress.status === 'COMPLETED';
    const isProcessing = progress.status === 'PROCESSING';

    return (
      <div className="space-y-6 max-w-2xl mx-auto bg-white p-8 border border-slate-200 rounded-xl shadow-sm">
        
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <button 
            onClick={() => onViewBatch('')} 
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h3 className="font-bold text-slate-950">Active Batch Progress</h3>
            <p className="text-xs text-slate-500">{selectedBatch.fileName}</p>
          </div>
        </div>

        <div className="space-y-6 pt-4">
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">Batch ID:</span>
            <span className="font-mono text-xs font-bold text-slate-700">{selectedBatch.id}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">Generation Status:</span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase inline-flex items-center gap-1 ${
              isCompleted ? 'bg-emerald-50 text-emerald-700' :
              isProcessing ? 'bg-blue-50 text-blue-700 animate-pulse' :
              'bg-red-50 text-red-700'
            }`}>
              {isProcessing && <RefreshCw className="h-3 w-3 animate-spin" />}
              {progress.status}
            </span>
          </div>

          {/* Progress bar container */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">Render Progress</span>
              <span className="text-blue-600">{progress.progressPercentage}% ({progress.generated + progress.failed} / {progress.totalInvoices})</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300 ease-out" 
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Statistics summary */}
          <div className="grid grid-cols-3 gap-4 border border-slate-100 p-4 rounded-xl bg-slate-50/50 text-center">
            <div>
              <span className="text-xs text-slate-400 font-semibold block uppercase">Total Invoices</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">{progress.totalInvoices}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-600 font-semibold block uppercase">Generated</span>
              <span className="text-lg font-bold text-emerald-700 mt-1 block">{progress.generated}</span>
            </div>
            <div>
              <span className="text-xs text-red-600 font-semibold block uppercase">Failed</span>
              <span className="text-lg font-bold text-red-700 mt-1 block">{progress.failed}</span>
            </div>
          </div>

          {/* Per-Client PDF Downloads */}
          {isCompleted && (
            <div className="bg-emerald-50/30 border border-emerald-100 p-5 rounded-xl space-y-4">
              <div className="flex gap-2.5 items-center pb-3 border-b border-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Batch Complete!</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Click any client below to download their invoice PDF.</p>
                </div>
              </div>

              <div className="space-y-2">
                {batchInvoices.filter(inv => inv.status === 'GENERATED').map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        {inv.customer?.legalName || 'Unknown Client'}
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Invoice #{inv.invoiceNumber} · ₹{inv.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {inv.pdfStorageKey && (
                      <button
                        onClick={() => handleDownloadZip(inv.pdfStorageKey!, inv.invoiceNumber)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // Batches listing
  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-xl font-bold text-slate-900">Upload Batches Log</h2>
        <p className="text-xs text-slate-500 font-medium">History of imported files, row logs, and compilation ZIP packages</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {batches.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <th className="px-6 py-3.5">Filename</th>
                  <th className="px-6 py-3.5">Target Issuer</th>
                  <th className="px-6 py-3.5">Valid / Fail Rows</th>
                  <th className="px-6 py-3.5">Generation Status</th>
                  <th className="px-6 py-3.5">Uploaded Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {batches.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                      <span>{batch.fileName}</span>
                    </td>
                    <td className="px-6 py-4">{batch.company?.legalName || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs font-medium">
                      <span className="text-emerald-600 font-semibold">{batch.validRows}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-red-500 font-semibold">{batch.errorRows}</span>
                      <span className="text-slate-400 ml-1.5">(Total: {batch.totalRows})</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                        batch.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                        batch.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700 animate-pulse' :
                        batch.status === 'VALIDATED' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {batch.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
                        {batch.status === 'PROCESSING' && <RefreshCw className="h-3 w-3 animate-spin" />}
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(batch.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => onViewBatch(batch.id)}
                        className="px-3.5 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
                      >
                        Inspect Progress
                      </button>
                      {batch.zipStorageKey && (
                        <button
                          onClick={() => handleDownloadZip(batch.zipStorageKey!, batch.fileName)}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          ZIP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              No batches logged in history.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default Batches;
