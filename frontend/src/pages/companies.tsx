import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Building2, 
  Plus, 
  Edit, 
  X, 
  Save, 
  Search, 
  Filter, 
  LayoutList, 
  LayoutGrid, 
  MapPin, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Company {
  id: string;
  legalName: string;
  tradeName?: string;
  gstin: string;
  pan: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  email: string;
  phone: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  invoicePrefix?: string;
  invoiceStartingNo: number;
  invoiceTemplateId: string;
}

function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Search, Filter & View Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState<Partial<Company>>({
    legalName: '',
    tradeName: '',
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
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankBranch: '',
    invoicePrefix: 'INV/',
    invoiceStartingNo: 1,
    invoiceTemplateId: 'standard_gst',
  });

  const fetchCompanies = () => {
    setLoading(true);
    axios.get('/api/companies')
      .then(res => setCompanies(res.data))
      .catch(err => console.error('Fetch companies failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Extract unique states for state filter dropdown
  const statesList = useMemo(() => {
    const states = Array.from(new Set(companies.map(c => c.state).filter(Boolean)));
    return states.sort();
  }, [companies]);

  // Filtered companies based on search and state
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        !query ||
        c.legalName.toLowerCase().includes(query) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(query)) ||
        c.gstin.toLowerCase().includes(query) ||
        c.pan.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query) ||
        c.state.toLowerCase().includes(query) ||
        (c.invoicePrefix && c.invoicePrefix.toLowerCase().includes(query));

      const matchesState = selectedState === 'all' || c.state.toLowerCase() === selectedState.toLowerCase();

      return matchesSearch && matchesState;
    });
  }, [companies, searchTerm, selectedState]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedState]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  const handleEditClick = (company: Company) => {
    setFormData(company);
    setIsEditing(true);
  };

  const handleNewClick = () => {
    setFormData({
      legalName: '',
      tradeName: '',
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
      bankName: '',
      bankAccountNo: '',
      bankIfsc: '',
      bankBranch: '',
      invoicePrefix: 'INV/',
      invoiceStartingNo: 1,
      invoiceTemplateId: 'standard_gst',
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
        await axios.put(`/api/companies/${formData.id}`, formData);
      } else {
        await axios.post('/api/companies', formData);
      }
      setIsEditing(false);
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save company profile');
    }
  };

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Billing Profiles</h2>
          <p className="text-xs text-slate-500 font-medium">Manage companies and issuer entities ({companies.length} Total Registered)</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNewClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Profile
          </button>
        )}
      </div>

      {isEditing ? (
        /* Edit / Create Form */
        <form onSubmit={handleFormSubmit} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-950 flex items-center gap-1.5">
              <Building2 className="h-5 w-5 text-blue-600" />
              {formData.id ? 'Edit Company Profile' : 'Add New Billing Entity'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Company Legal Name *</label>
              <input type="text" required name="legalName" value={formData.legalName} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Company Trade Name</label>
              <input type="text" name="tradeName" value={formData.tradeName} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">GSTIN *</label>
              <input type="text" required name="gstin" value={formData.gstin} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none" placeholder="27AAAAA1111A1Z1" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">PAN *</label>
              <input type="text" required name="pan" value={formData.pan} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none" placeholder="AAAAA1111A" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Address Line 1 *</label>
              <input type="text" required name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Address Line 2</label>
              <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">City *</label>
              <input type="text" required name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">State *</label>
              <input type="text" required name="state" value={formData.state} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" placeholder="Maharashtra" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">State Code (2 digits) *</label>
              <input type="text" required name="stateCode" value={formData.stateCode} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none" placeholder="27" maxLength={2} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">PIN Code *</label>
              <input type="text" required name="pinCode" value={formData.pinCode} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" maxLength={6} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email *</label>
              <input type="email" required name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone *</label>
              <input type="text" required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            
            <div className="md:col-span-2 pb-1 pt-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Bank Details</h4>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Bank Name</label>
              <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Account No</label>
              <input type="text" name="bankAccountNo" value={formData.bankAccountNo} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">IFSC Code</label>
              <input type="text" name="bankIfsc" value={formData.bankIfsc} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none" placeholder="HDFC0000123" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Branch</label>
              <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none" />
            </div>

            <div className="md:col-span-2 pb-1 pt-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Invoice Numbering & Template Settings</h4>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Prefix</label>
              <input type="text" name="invoicePrefix" value={formData.invoicePrefix} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none" placeholder="INV/2026/" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Starting Number</label>
              <input type="number" name="invoiceStartingNo" value={formData.invoiceStartingNo} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Layout Template</label>
              <select name="invoiceTemplateId" value={formData.invoiceTemplateId} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none">
                <option value="standard_gst">Standard GST Layout</option>
                <option value="service_invoice">Service Invoicing Layout</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-1.5 shadow-sm">
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Search, Filter & Controls Toolbar */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full md:w-auto">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Company, Trade Name, GSTIN, PAN, City..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* State Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
                <select
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none"
                >
                  <option value="all">All States ({statesList.length})</option>
                  {statesList.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* View Toggle & Records count */}
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              <span className="text-xs font-medium text-slate-500">
                Showing <strong className="text-slate-800">{filteredCompanies.length}</strong> of {companies.length}
              </span>

              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List Table View"
                >
                  <LayoutList className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table View (Default High Density View for 100+ Companies) */}
          {viewMode === 'table' ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Company Entity</th>
                      <th className="py-3 px-4">GSTIN / PAN</th>
                      <th className="py-3 px-4">State & Location</th>
                      <th className="py-3 px-4">Prefix / Starting No</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm font-medium">No company profiles match your search filters.</p>
                          <button
                            onClick={() => { setSearchTerm(''); setSelectedState('all'); }}
                            className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                          >
                            Reset filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      paginatedCompanies.map(company => (
                        <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{company.legalName}</h4>
                                <p className="text-xs text-slate-400 font-normal">{company.tradeName || 'No Trade Name'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="font-mono text-xs font-semibold text-slate-800">
                                <span className="text-slate-400 font-normal">GST:</span> {company.gstin}
                              </div>
                              <div className="font-mono text-xs text-slate-500">
                                <span className="text-slate-400 font-normal">PAN:</span> {company.pan}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 text-slate-800 font-medium">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <span>{company.state}</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono rounded text-[10px]">Code {company.stateCode}</span>
                            </div>
                            <div className="text-slate-400 text-[11px] truncate max-w-[200px] mt-0.5" title={`${company.addressLine1}, ${company.city} - ${company.pinCode}`}>
                              {company.city} - {company.pinCode}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md font-mono text-xs text-slate-800 font-semibold border border-slate-200/60">
                              <FileText className="h-3.5 w-3.5 text-blue-600" />
                              {company.invoicePrefix}{String(company.invoiceStartingNo).padStart(4, '0')}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 truncate max-w-[180px]" title={company.email}>{company.email}</div>
                            <div className="text-slate-400 text-[11px]">{company.phone}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleEditClick(company)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-all flex items-center gap-1 ml-auto"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 border border-slate-200 bg-white rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 border border-slate-200 bg-white rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedCompanies.map(company => (
                <div key={company.id} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 leading-tight">{company.legalName}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{company.tradeName || 'No Trade Name'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditClick(company)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-100 hover:bg-slate-50 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 border-t border-slate-100 pt-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block">GSTIN / PAN</span>
                        <span className="text-slate-800 font-semibold">{company.gstin} / {company.pan}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Prefix Format</span>
                        <span className="text-slate-800 font-semibold">{company.invoicePrefix}{String(company.invoiceStartingNo).padStart(4, '0')}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">State Details</span>
                        <span className="text-slate-800 font-semibold">{company.state} (Code: {company.stateCode})</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Address</span>
                        <span className="text-slate-850">{company.addressLine1}, {company.city} - {company.pinCode}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default Companies;
