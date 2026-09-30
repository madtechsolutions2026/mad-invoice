import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  Map, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  Download
} from 'lucide-react';

interface Company {
  id: string;
  legalName: string;
}

interface Template {
  id: string;
  name: string;
  mapping: any;
}

interface UploadWizardProps {
  onBatchCreated: (batchId: string) => void;
}

function UploadWizard({ onBatchCreated }: UploadWizardProps) {
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  
  // File Upload states
  const [file, setFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Parser output states
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');

  // Column Mapping states
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [saveTemplateName, setSaveTemplateName] = useState('');

  // Validation output states
  const [valSummary, setValSummary] = useState<{
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
  } | null>(null);
  const [valResults, setValResults] = useState<any[]>([]);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [batchId, setBatchId] = useState<string | null>(null);

  // System target fields to map
  const targetFields = [
    { key: 'invoiceNumber', label: 'Invoice Number', required: true },
    { key: 'invoiceDate', label: 'Invoice Date', required: true },
    { key: 'customerName', label: 'Customer Name', required: true },
    { key: 'customerGstin', label: 'Customer GSTIN', required: false },
    { key: 'customerAddress', label: 'Customer Address', required: true },
    { key: 'customerCity', label: 'Customer City', required: true },
    { key: 'customerState', label: 'Customer State', required: true },
    { key: 'customerStateCode', label: 'Customer State Code', required: true },
    { key: 'customerPinCode', label: 'Customer PIN Code', required: true },
    { key: 'hsnSac', label: 'HSN / SAC Code', required: true },
    { key: 'description', label: 'Item Description', required: true },
    { key: 'quantity', label: 'Quantity', required: true },
    { key: 'unit', label: 'Unit (e.g. PCS, KGS)', required: true },
    { key: 'rate', label: 'Rate / Unit', required: true },
    { key: 'discount', label: 'Discount Amount', required: false },
    { key: 'gstRate', label: 'GST Percentage (%)', required: true },
    { key: 'poNumber', label: 'PO Reference No', required: false },
  ];

  // Billing Group Invoicing states
  const [activeUploadMode, setActiveUploadMode] = useState<'excel' | 'group'>('excel');
  const [customerGroups, setCustomerGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupInvoiceDate, setGroupInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupDueDate, setGroupDueDate] = useState('');
  const [groupCustomDescription, setGroupCustomDescription] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState('');

  useEffect(() => {
    // Load companies, templates, and customer billing groups
    axios.get('/api/companies').then(res => {
      setCompanies(res.data);
      if (res.data.length > 0) setSelectedCompanyId(res.data[0].id);
    });

    axios.get('/api/imports/templates').then(res => {
      setTemplates(res.data);
    });

    axios.get('/api/customer-groups').then(res => {
      setCustomerGroups(res.data);
      if (res.data.length > 0) {
        setSelectedGroupId(res.data[0].id);
        setGroupCustomDescription(res.data[0].defaultDescription);
      }
    });
  }, []);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const g = customerGroups.find(x => x.id === groupId);
    if (g) {
      setGroupCustomDescription(g.defaultDescription);
    }
  };

  const handleGroupGenerate = async () => {
    if (!selectedGroupId) {
      setGroupError('Please select a customer group');
      return;
    }
    if (!selectedCompanyId) {
      setGroupError('Please select a target company');
      return;
    }
    if (!groupInvoiceDate) {
      setGroupError('Please specify an invoice date');
      return;
    }

    setGroupError('');
    setGroupLoading(true);

    try {
      const res = await axios.post(`/api/customer-groups/${selectedGroupId}/generate`, {
        companyId: selectedCompanyId,
        invoiceDate: groupInvoiceDate,
        dueDate: groupDueDate || undefined,
        customDescription: groupCustomDescription || undefined,
      });

      onBatchCreated(res.data.batchId);
    } catch (err: any) {
      setGroupError(err.response?.data?.error || 'Failed to trigger group generation');
    } finally {
      setGroupLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }
    if (!selectedCompanyId) {
      setUploadError('Please select a target company');
      return;
    }

    setUploadError('');
    setUploadLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setHeaders(res.data.headers);
      setPreviewRows(res.data.previewRows);
      setFileBase64(res.data.fileBase64);
      setFileName(res.data.fileName);

      // Pre-fill mapping values based on heuristics
      const initialMap: { [key: string]: string } = {};
      targetFields.forEach(f => {
        initialMap[f.key] = res.data.autoMapping[f.key] || '';
      });
      setMapping(initialMap);

      setStep(2);
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Failed to parse file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const t = templates.find(item => item.id === templateId);
    if (t) {
      const updatedMap = { ...mapping };
      Object.keys(t.mapping).forEach(k => {
        if (headers.includes(t.mapping[k])) {
          updatedMap[k] = t.mapping[k];
        }
      });
      setMapping(updatedMap);
    }
  };

  const handleMapChange = (fieldKey: string, excelHeader: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: excelHeader
    }));
  };

  const handleRunValidation = async () => {
    // Check required mappings
    const missing = targetFields.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      alert(`Please map all required fields: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    setValidationLoading(true);
    setValidationError('');

    try {
      const res = await axios.post('/api/imports/validate', {
        fileBase64,
        fileName,
        companyId: selectedCompanyId,
        mapping,
        saveTemplateName: saveTemplateName || undefined,
      });

      setValSummary(res.data.summary);
      setValResults(res.data.results);
      setBatchId(res.data.batchId);
      
      // Default to error tab if errors are present, else all
      if (res.data.summary.errorRows > 0) setActiveTab('error');
      else setActiveTab('all');

      setStep(3);
    } catch (err: any) {
      setValidationError(err.response?.data?.error || 'Validation execution failed');
    } finally {
      setValidationLoading(false);
    }
  };

  const handleTriggerInvoiceGeneration = async () => {
    if (!batchId) return;

    try {
      await axios.post(`/api/batches/${batchId}/generate`);
    } catch (err: any) {
      console.log('Batch trigger notification:', err.response?.data?.error || err.message);
    } finally {
      // Automatically redirect straight to Active Batch Progress screen
      onBatchCreated(batchId);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
      
      {/* Wizard Header Progress stepper */}
      <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</span>
            <span className={`text-sm font-semibold ${step === 1 ? 'text-slate-900' : 'text-slate-400'}`}>Upload Sheet</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
            <span className={`text-sm font-semibold ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>Map Columns</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
            <span className={`text-sm font-semibold ${step === 3 ? 'text-slate-900' : 'text-slate-400'}`}>Validate & Launch</span>
          </div>
        </div>
      </div>

      <div className="p-8">
        
        {/* STEP 1: Upload sheet and select billing entity */}
        {step === 1 && (
          <div className="space-y-6">
            
            {/* Mode Selector Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit mb-4">
              <button
                type="button"
                onClick={() => setActiveUploadMode('excel')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeUploadMode === 'excel' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Excel / CSV Import
              </button>
              <button
                type="button"
                onClick={() => setActiveUploadMode('group')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeUploadMode === 'group' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Recurring Billing Group
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-950 mb-1">
                {activeUploadMode === 'excel' ? 'Upload Invoice Sheet' : 'Run Recurring Billing Group'}
              </h3>
              <p className="text-xs text-slate-500">
                {activeUploadMode === 'excel' 
                  ? 'Provide invoice logs along with the target billing profile' 
                  : 'Instantly generate fixed-rate invoices for all clients in a billing group'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Billing Company *</label>
                <select
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select target profile...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.legalName}</option>
                  ))}
                </select>
              </div>

              {activeUploadMode === 'excel' ? (
                /* EXCEL UPLOAD INTERFACE */
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold uppercase text-slate-500">Select Excel / CSV spreadsheet *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const csvContent = 
`Invoice No,Invoice Date,Customer Code,Customer Name,Customer GSTIN,Customer Address,Customer City,Customer State,Customer State Code,Customer PIN Code,HSN/SAC,Item Description,Qty,Unit,Rate,Discount,GST %,PO Number
INV-2026-001,2026-09-30,CUST-001,Beta Retail Solutions,27DDDDD4444D1Z4,Andheri Kurla Road,Mumbai,Maharashtra,27,400059,998311,Monthly Accounting Retainer,1,Month,15000,0,18,PO-99228
INV-2026-002,2026-09-30,CUST-002,Alpha Technologies Inc,19CCCCC3333C1Z3,Salt Lake Sector V,Kolkata,West Bengal,19,700091,998313,GST Audit & Tax Advisory,1,Month,25000,0,18,PO-99229
INV-2026-003,2026-09-30,CUST-003,Gamma Logistics Ltd,29EEEEE5555E1Z5,Electronic City,Bengaluru,Karnataka,29,560100,998311,Corporate Filing Services,1,Month,10000,0,18,PO-99230`;

                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.setAttribute('href', url);
                        link.setAttribute('download', 'sample_invoice_import_template.csv');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Sample Template (.CSV)
                    </button>
                  </div>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1.5 text-center">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-700 focus-within:outline-none">
                          <span>Upload a file</span>
                          <input type="file" className="sr-only" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                        </label>
                      </div>
                      <p className="text-xs text-slate-400">Excel / CSV up to 15MB</p>
                      {file && (
                        <p className="text-xs font-bold text-slate-800 mt-2 bg-blue-50 py-1 px-3.5 rounded-full inline-flex items-center gap-1.5 border border-blue-100">
                          {file.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* BILLING GROUP INTERFACE */
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Select Billing Group *</label>
                      <select
                        value={selectedGroupId}
                        onChange={e => handleGroupChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                      >
                        <option value="">Select group...</option>
                        {customerGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.memberCount} clients)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Date *</label>
                      <input
                        type="date"
                        value={groupInvoiceDate}
                        onChange={e => setGroupInvoiceDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={groupDueDate}
                        onChange={e => setGroupDueDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Custom Description Override</label>
                      <input
                        type="text"
                        value={groupCustomDescription}
                        onChange={e => setGroupCustomDescription(e.target.value)}
                        placeholder="Default group description will be used if empty"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {selectedGroupId && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800">
                      {(() => {
                        const g = customerGroups.find(x => x.id === selectedGroupId);
                        if (!g) return null;
                        return (
                          <div>
                            <span className="font-bold">Group Details:</span>
                            <ul className="mt-1 space-y-0.5 list-disc pl-4 font-medium">
                              <li>Linked Clients: <strong>{g.memberCount} customers</strong></li>
                              <li>Taxable Rate per Client: <strong>₹{g.defaultAmount.toLocaleString()}</strong></li>
                              <li>Taxes: <strong>{g.gstRate}% (Dynamic CGST/SGST or IGST depending on Place of Supply)</strong></li>
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeUploadMode === 'excel' ? (
              <>
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleUploadSubmit}
                    disabled={uploadLoading || !file || !selectedCompanyId}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-40"
                  >
                    {uploadLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {groupError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{groupError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleGroupGenerate}
                    disabled={groupLoading || !selectedGroupId || !selectedCompanyId}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-40"
                  >
                    {groupLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating Batch...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Generate Group Invoices
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        )}

        {/* STEP 2: Header mapping inputs */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-950 mb-1">Map Column Headers</h3>
                <p className="text-xs text-slate-500">Link source columns in your spreadsheet to target system invoice fields</p>
              </div>

              {templates.length > 0 && (
                <div className="w-56">
                  <select
                    value={selectedTemplateId}
                    onChange={handleTemplateChange}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                  >
                    <option value="">Load saved mapping...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-[360px] overflow-y-auto pr-2 border-y border-slate-100 py-4">
              {targetFields.map(f => (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    {f.label}
                    {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={e => handleMapChange(f.key, e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm focus:outline-none ${
                      mapping[f.key] ? 'border-slate-200' : f.required ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Choose Column...</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Save mapping as template (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MTS Monthly Format"
                  value={saveTemplateName}
                  onChange={e => setSaveTemplateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>
            </div>

            {validationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              
              <button
                onClick={handleRunValidation}
                disabled={validationLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-2"
              >
                {validationLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Run Verification
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Verification stats review screen */}
        {step === 3 && valSummary && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-950 mb-1">Validation Summary Results</h3>
              <p className="text-xs text-slate-500">Correct errors before proceeding with generation.</p>
            </div>

            {/* Validation Counts Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                <span className="text-xs font-semibold text-slate-500 block uppercase">Total Rows</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{valSummary.totalRows}</span>
              </div>
              <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-xl text-center">
                <span className="text-xs font-semibold text-emerald-600 block uppercase">Fully Valid</span>
                <span className="text-xl font-bold text-emerald-700 mt-1 block">{valSummary.validRows}</span>
              </div>
              <div className="bg-amber-50/50 p-4 border border-amber-100 rounded-xl text-center">
                <span className="text-xs font-semibold text-amber-600 block uppercase">Warnings</span>
                <span className="text-xl font-bold text-amber-700 mt-1 block">{valSummary.warningRows}</span>
              </div>
              <div className="bg-red-50/50 p-4 border border-red-100 rounded-xl text-center">
                <span className="text-xs font-semibold text-red-600 block uppercase">Critical Errors</span>
                <span className="text-xl font-bold text-red-700 mt-1 block">{valSummary.errorRows}</span>
              </div>
            </div>

            {/* Tabs selection */}
            <div className="border-b border-slate-200 flex gap-4">
              {['all', 'valid', 'warning', 'error'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-2.5 text-xs font-bold uppercase transition-colors border-b-2 px-1 ${
                    activeTab === tab 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab} ({
                    tab === 'all' ? valSummary.totalRows :
                    tab === 'valid' ? valSummary.validRows :
                    tab === 'warning' ? valSummary.warningRows :
                    valSummary.errorRows
                  })
                </button>
              ))}
            </div>

            {/* Validation logs list */}
            <div className="max-h-[280px] overflow-y-auto space-y-3">
              {valResults
                .filter(item => {
                  if (activeTab === 'all') return true;
                  if (activeTab === 'valid') return item.status === 'VALID';
                  if (activeTab === 'warning') return item.status === 'WARNING';
                  return item.status === 'ERROR';
                })
                .map((item, idx) => (
                  <div key={idx} className={`p-4 border rounded-xl flex flex-col gap-1.5 ${
                    item.status === 'ERROR' ? 'border-red-200 bg-red-50/10' :
                    item.status === 'WARNING' ? 'border-amber-200 bg-amber-50/10' :
                    'border-slate-100 bg-slate-50/30'
                  }`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">Row {item.rowNumber} | Invoice No: {item.invoiceNumber || 'N/A'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'ERROR' ? 'bg-red-100 text-red-700' :
                        item.status === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>{item.status}</span>
                    </div>
                    {item.issues && item.issues.length > 0 ? (
                      <div className="space-y-1 mt-1 text-xs">
                        {item.issues.map((iss: any, i: number) => (
                          <div key={i} className="flex gap-1.5 items-start text-slate-600">
                            <span className="font-bold text-slate-700">[{iss.field}]:</span>
                            <span>{iss.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Row matches calculation structures.</span>
                    )}
                  </div>
                ))}
            </div>

            {valSummary.errorRows > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <span className="font-bold">Errors Block Generation:</span>
                  <p className="mt-1 text-xs text-red-700">Spreadsheet contains rows with invalid parameters. Correct values, download templates and upload files again.</p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                disabled={valSummary.errorRows > 0}
                onClick={handleTriggerInvoiceGeneration}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-emerald-600"
              >
                <CheckCircle2 className="h-4 w-4" />
                Generate Invoices
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default UploadWizard;
