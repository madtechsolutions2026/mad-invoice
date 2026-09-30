import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Edit, X, Save, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const fetchCustomers = () => {
    setLoading(true);
    axios.get(`/api/customers`, {
      params: { page, limit: 10, search }
    })
      .then(res => {
        setCustomers(res.data.customers);
        setTotalPages(res.data.pagination.totalPages);
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

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Master</h2>
          <p className="text-xs text-slate-500 font-medium">Record profiles of buyers, clients, and vendor relations</p>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-3">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-1.5">
              <Save className="h-4 w-4" />
              Save Details
            </button>
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
                    <tr key={cust.id} className="hover:bg-slate-50/50">
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
                        <button
                          onClick={() => handleEditClick(cust)}
                          className="px-3 py-1.5 border border-slate-100 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </button>
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

    </div>
  );
}

export default Customers;
