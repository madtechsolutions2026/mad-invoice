import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Plus, Users, X, Save, Edit, CheckSquare, Square } from 'lucide-react';

interface Customer {
  id: string;
  legalName: string;
  customerCode?: string;
  stateCode: string;
}

interface Group {
  id: string;
  name: string;
  defaultAmount: number;
  defaultDescription: string;
  hsnSac: string;
  gstRate: number;
  memberCount: number;
  members: Array<{ id: string; legalName: string }>;
}

interface Company {
  id: string;
  legalName: string;
}

interface CustomerGroupsProps {
  onViewBatch: (batchId: string) => void;
}

function CustomerGroups({ onViewBatch }: CustomerGroupsProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  
  // Membership sync state
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Group>>({
    name: '',
    defaultAmount: 0,
    defaultDescription: '',
    hsnSac: '9983',
    gstRate: 18.0,
  });

  // Group bulk generation state
  const [groupToGenerate, setGroupToGenerate] = useState<Group | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/customer-groups'),
      axios.get('/api/customers?limit=100'),
      axios.get('/api/companies')
    ])
      .then(([groupsRes, custRes, compRes]) => {
        setGroups(groupsRes.data);
        setCustomers(custRes.data.customers);
        setCompanies(compRes.data);
        if (compRes.data.length > 0) {
          setSelectedCompanyId(compRes.data[0].id);
        }
      })
      .catch(err => console.error('Fetch groups data failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNewClick = () => {
    setFormData({
      name: '',
      defaultAmount: 0,
      defaultDescription: '',
      hsnSac: '9983',
      gstRate: 18.0,
    });
    setIsEditing(true);
  };

  const handleEditClick = (group: Group) => {
    setFormData(group);
    setIsEditing(true);
  };

  const handleManageMembersClick = (group: Group) => {
    setActiveGroup(group);
    setSelectedCustomerIds(group.members.map(m => m.id));
    setIsManagingMembers(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await axios.post(`/api/customer-groups`, formData); // In our controller post acts as create
      } else {
        await axios.post('/api/customer-groups', formData);
      }
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save billing group');
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSaveMembers = async () => {
    if (!activeGroup) return;
    try {
      await axios.post(`/api/customer-groups/${activeGroup.id}/members`, {
        customerIds: selectedCustomerIds
      });
      setIsManagingMembers(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to sync group memberships');
    }
  };

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Billing Tiers & Groups</h2>
          <p className="text-xs text-slate-500 font-medium">Manage recurring customer billing groups (e.g. ₹500, ₹1000 groups)</p>
        </div>
        {!isEditing && !isManagingMembers && (
          <button
            onClick={handleNewClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Billing Group
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleFormSubmit} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6 max-w-2xl">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-950 flex items-center gap-1.5">
              <Layers className="h-5 w-5 text-blue-600" />
              {formData.id ? 'Edit Billing Group' : 'Create Billing Group'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Group / Tier Name *</label>
              <input type="text" required name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. ₹500 Accounting Group" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Default Amount (INR) *</label>
              <input type="number" required name="defaultAmount" value={formData.defaultAmount} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">GST Rate (%) *</label>
              <input type="number" required name="gstRate" value={formData.gstRate} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">HSN / SAC Code</label>
              <input type="text" name="hsnSac" value={formData.hsnSac} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Default Invoice Description *</label>
              <input type="text" required name="defaultDescription" value={formData.defaultDescription} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Professional accounting consulting charges" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-1.5">
              <Save className="h-4 w-4" />
              Save Group
            </button>
          </div>
        </form>
      )}

      {isManagingMembers && activeGroup && (
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6 max-w-2xl">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-950">Manage Group Members</h3>
              <p className="text-xs text-slate-500">Add or remove customers from the group: <strong>{activeGroup.name}</strong></p>
            </div>
            <button type="button" onClick={() => setIsManagingMembers(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Members Checkbox list */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {customers.map(cust => {
              const isChecked = selectedCustomerIds.includes(cust.id);
              return (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => toggleCustomerSelection(cust.id)}
                  className={`w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors ${
                    isChecked ? 'border-blue-200 bg-blue-50/20' : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isChecked ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-300" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{cust.legalName}</span>
                      {cust.customerCode && <span className="text-xs text-slate-400 ml-1.5">({cust.customerCode})</span>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">State Code: {cust.stateCode}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsManagingMembers(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={handleSaveMembers}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              Save Members ({selectedCustomerIds.length})
            </button>
          </div>
        </div>
      )}

      {!isEditing && !isManagingMembers && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{group.name}</h3>
                      <span className="text-xs text-slate-400 block mt-0.5">Recurring Amount: <strong>₹{group.defaultAmount.toLocaleString()}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditClick(group)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-100 hover:bg-slate-50 rounded"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-slate-400 font-medium block">GST Rate / HSN</span>
                    <span className="text-slate-800 font-semibold">{group.gstRate}% / {group.hsnSac}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Total Members</span>
                    <span className="text-slate-800 font-semibold">{group.memberCount} clients linked</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-medium block">Description</span>
                    <span className="text-slate-700 italic">{group.defaultDescription}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => handleManageMembersClick(group)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Link Clients
                </button>
                <button
                  onClick={() => {
                    setGroupToGenerate(group);
                    setCustomDescription(group.defaultDescription);
                  }}
                  disabled={group.memberCount === 0}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <CheckSquare className="h-4 w-4" />
                  Generate Invoices
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Group Generation Modal Dialog */}
      {groupToGenerate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-xl w-full max-w-md space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-950">Bulk Generate Invoices</h3>
                <span className="text-xs text-slate-400 block mt-0.5">Group: <strong>{groupToGenerate.name}</strong> ({groupToGenerate.memberCount} clients)</span>
              </div>
              <button type="button" onClick={() => setGroupToGenerate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Billing Company *</label>
                <select
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">Select target profile...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.legalName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Custom Description Override</label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  placeholder="Leave empty to use group default description"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-[11px] text-blue-800 font-medium">
                You are about to submit {groupToGenerate.memberCount} invoices of ₹{groupToGenerate.defaultAmount.toLocaleString()} each. The worker will automatically compute CGST/SGST or IGST based on place of supply.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setGroupToGenerate(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedCompanyId) {
                    alert('Please select a target company');
                    return;
                  }
                  setGenerateLoading(true);
                  try {
                    const res = await axios.post(`/api/customer-groups/${groupToGenerate.id}/generate`, {
                      companyId: selectedCompanyId,
                      invoiceDate,
                      dueDate: dueDate || undefined,
                      customDescription: customDescription || undefined
                    });
                    setGroupToGenerate(null);
                    onViewBatch(res.data.batchId);
                  } catch (err: any) {
                    alert(err.response?.data?.error || 'Failed to trigger group invoicing');
                  } finally {
                    setGenerateLoading(false);
                  }
                }}
                disabled={generateLoading || !selectedCompanyId}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm flex items-center gap-1.5 shadow-sm disabled:opacity-40"
              >
                {generateLoading ? 'Generating...' : 'Confirm & Launch'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CustomerGroups;
