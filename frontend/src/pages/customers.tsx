import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Edit, X, Save, Search, ChevronLeft, ChevronRight, Upload, Download, FileSpreadsheet, Trash2, AlertTriangle } from 'lucide-react';

interface Customer {
  id: string;
  legalName: string;
  customerCode?: string;
  gstin?: string;
  pan?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  defaultTaxType: string;
  isActive: boolean;
}

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    legalName: '',
    customerCode: '',
    gstin: '',
    pan: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    stateCode: '',
    pinCode: '',
    email: '',
    phone: '',
    contactPerson: '',
    defaultTaxType: 'GST',
    isActive: true,
  });

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{summary: any, errors: string[]} | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Deletion and bulk selection states
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isBulkDeleteModal, setIsBulkDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCustomers = () => {
    setLoading(true);
    axios.get(`/api/customers`, {
      params: { page, limit: 10, search }
    })
      .then(res => {
        setCustomers(res.data.customers);
        setTotalPages(res.data.pagination.totalPages);
        setSelectedCustomerIds([]);
      })
      .catch(err => console.error('Fetch customers failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const handleEditClick = (cust: Customer) => {
    setFormData(cust);
    setIsEditing(true);
  };

  const handleNewClick = () => {
    setFormData({
      legalName: '',
      customerCode: '',
      gstin: '',
      pan: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      stateCode: '',
      pinCode: '',
      email: '',
      phone: '',
      contactPerson: '',
      defaultTaxType: 'GST',
      isActive: true,
    });
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await axios.put(`/api/customers/${formData.id}`, formData);
      } else {
        await axios.post('/api/customers', formData);
      }
      setIsEditing(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save customer details');
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'Customer Name,Customer Code,GSTIN,PAN,Address Line 1,Address Line 2,City,State,State Code,PIN Code,Email,Phone,Contact Person,Tax Type\nAlpha Technologies Inc,ALPHA-001,27CCCCC3333C1Z3,CCCCC3333C,Sector V Salt Lake,,Kolkata,West Bengal,19,700091,alpha@example.com,9000000001,Rajesh Kumar,GST';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Customer_Import_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/customers/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      fetchCustomers();
    } catch (err: any) {
      setImportResult({ summary: null, errors: [err.response?.data?.error || 'Import failed'] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await axios.get('/api/customers/export', {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Customer_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export customer failed:', err);
      alert(err.response?.data?.error || 'Failed to export customer data');
    } finally {
      setExporting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCustomerIds.length === customers.length && customers.length > 0) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customers.map(c => c.id));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteClick = (cust: Customer) => {
    setCustomerToDelete(cust);
    setIsBulkDeleteModal(false);
    setDeleteError(null);
  };

  const handleBulkDeleteClick = () => {
    if (selectedCustomerIds.length === 0) return;
    setIsBulkDeleteModal(true);
    setCustomerToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await axios.delete(`/api/customers/${customerToDelete.id}`);
      if (isEditing && formData.id === customerToDelete.id) {
        setIsEditing(false);
      }
      setSelectedCustomerIds(prev => prev.filter(id => id !== customerToDelete.id));
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedCustomerIds.length === 0) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await axios.post('/api/customers/bulk-delete', { ids: selectedCustomerIds });
      if (res.data.skipped && res.data.skipped.length > 0) {
        alert(`Deleted ${res.data.deleted} customer(s).\n\nSkipped ${res.data.skipped.length} with existing invoices:\n- ${res.data.skipped.join('\n- ')}`);
      }
      setSelectedCustomerIds([]);
      setIsBulkDeleteModal(false);
      fetchCustomers();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Failed to bulk delete customers');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Master</h2>
          <p className="text-xs text-slate-500 font-medium">Record profiles of buyers, clients, and vendor relations</p>
        </div>
        {!isEditing && (
          <div className="flex flex-wrap items-center gap-3">
            {selectedCustomerIds.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-semibold text-red-700 text-xs">{selectedCustomerIds.length} selected</span>
                <button
                  type="button"
                  onClick={handleBulkDeleteClick}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md text-xs flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerIds([])}
                  className="text-xs text-slate-500 hover:text-slate-800 underline ml-1"
                >
                  Clear
                </button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 md:w-64 shadow-sm"
              />
            </div>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <button
              onClick={handleNewClick}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              New Customer
            </button>
          </div>
        )}
      </div>

      {importResult && (
        <div className={`p-4 rounded-xl border text-sm ${
          importResult.errors.length > 0 && !importResult.summary
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {importResult.summary && (
            <p className="font-semibold">
              Import complete: {importResult.summary.created} created, {importResult.summary.updated} updated, {importResult.summary.skipped} skipped (of {importResult.summary.totalRows} rows)
            </p>
          )}
          {importResult.errors.length > 0 && (
            <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
              {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
          <button onClick={() => setImportResult(null)} className="mt-2 text-xs underline opacity-70">Dismiss</button>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleFormSubmit} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6 max-w-3xl">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-950 flex items-center gap-1.5">
              <Users className="h-5 w-5 text-blue-600" />
              {formData.id ? 'Edit Customer Info' : 'New Customer Register'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Customer Legal Name *</label>
              <input type="text" required name="legalName" value={formData.legalName} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Customer Code / ID</label>
              <input type="text" name="customerCode" value={formData.customerCode} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. ALPHA-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Customer GSTIN</label>
              <input type="text" name="gstin" value={formData.gstin} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="27BBBBB2222B1Z2" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">PAN</label>
              <input type="text" name="pan" value={formData.pan} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="BBBBB2222B" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Address Line 1 *</label>
              <input type="text" required name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Address Line 2</label>
              <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">City *</label>
              <input type="text" required name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">State *</label>
              <input type="text" required name="state" value={formData.state} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Karnataka" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">State Code (2 digits) *</label>
              <input type="text" required name="stateCode" value={formData.stateCode} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="29" maxLength={2} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">PIN Code *</label>
              <input type="text" required name="pinCode" value={formData.pinCode} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" maxLength={6} />
            </div>
            
            <div className="md:col-span-2 pb-2 pt-4 border-b border-slate-100">
              <h4 className="text-xs font-bold text-blue-600 uppercase">Contact Information</h4>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contact Person</label>
              <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Default Tax Treatment</label>
              <select name="defaultTaxType" value={formData.defaultTaxType} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <option value="GST">GST Registered</option>
                <option value="IGST">Out of State / IGST</option>
                <option value="EXEMPT">Exempt / Zero Rated</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            {formData.id ? (
              <button
                type="button"
                onClick={() => handleDeleteClick(formData as Customer)}
                className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
                Delete Customer
              </button>
            ) : <div />}
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                Save Details
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : customers.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                    <th className="w-10 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={customers.length > 0 && selectedCustomerIds.length === customers.length}
                        onChange={toggleSelectAll}
                        title="Select all"
                      />
                    </th>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-6 py-3.5">GSTIN</th>
                    <th className="px-6 py-3.5">State</th>
                    <th className="px-6 py-3.5">Contact Person</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {customers.map(cust => (
                    <tr key={cust.id} className={`hover:bg-slate-50/50 transition-colors ${selectedCustomerIds.includes(cust.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="w-10 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedCustomerIds.includes(cust.id)}
                          onChange={() => toggleSelectCustomer(cust.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{cust.legalName}</td>
                      <td className="px-6 py-4">{cust.customerCode || '-'}</td>
                      <td className="px-6 py-4 text-xs font-mono">{cust.gstin || 'URD'}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-semibold">{cust.state}</span>
                        <span className="text-slate-400 ml-1">({cust.stateCode})</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-800">{cust.contactPerson || '-'}</div>
                        <div className="text-xs text-slate-400">{cust.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(cust)}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5 text-slate-400" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(cust)}
                            className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            title="Delete customer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                No customer records logged.
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
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
      )}

      {/* Delete Confirmation Modal */}
      {(customerToDelete || isBulkDeleteModal) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isBulkDeleteModal ? `Delete ${selectedCustomerIds.length} Customers` : 'Delete Customer'}
                </h3>
                <p className="text-xs text-slate-500">Confirm permanent deletion</p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 leading-relaxed">
                {deleteError}
              </div>
            )}

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {isBulkDeleteModal ? (
                <>
                  Are you sure you want to permanently delete the <span className="font-semibold text-slate-900">{selectedCustomerIds.length} selected customers</span>? Customers with existing invoices will be automatically protected and skipped.
                </>
              ) : (
                <>
                  Are you sure you want to delete <span className="font-semibold text-slate-900">{customerToDelete?.legalName}</span>
                  {customerToDelete?.customerCode ? ` (${customerToDelete.customerCode})` : ''}? This action cannot be undone.
                </>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setCustomerToDelete(null); setIsBulkDeleteModal(false); setDeleteError(null); }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={isBulkDeleteModal ? handleConfirmBulkDelete : handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-red-200"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Customers;
