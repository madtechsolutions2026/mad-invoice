import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Building2, 
  Users, 
  BarChart3, 
  History, 
  LogOut, 
  LogIn, 
  ShieldAlert, 
  Menu, 
  X,
  FileSpreadsheet,
  Layers
} from 'lucide-react';

// Page Imports
import Dashboard from './pages/dashboard';
import Invoices from './pages/invoices';
import UploadWizard from './components/imports/UploadWizard';
import Companies from './pages/companies';
import Customers from './pages/customers';
import Reports from './pages/reports';
import Audit from './pages/audit';
import Batches from './pages/batches';
import CustomerGroups from './pages/groups';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Configure Axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user profile
      axios.get('/api/auth/me')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          handleLogout();
        });
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setActiveView('dashboard');
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Login failed. Please check credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setActiveView('dashboard');
  };

  const navigateToBatchDetails = (batchId: string) => {
    setSelectedBatchId(batchId);
    setActiveView('batch-details');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl border border-slate-100">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-full bg-blue-100 text-blue-600 mb-4">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-950">MadTech Solutions</h2>
            <p className="mt-2 text-sm text-slate-500">Bulk Invoice Generation & Management</p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@madtech.com"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          </form>
          <div className="text-center text-xs text-slate-400 mt-4">
            Default credentials: admin@madtech.com / Admin@123
          </div>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onViewBatch={navigateToBatchDetails} />;
      case 'invoices':
        return <Invoices />;
      case 'upload':
        return <UploadWizard onBatchCreated={navigateToBatchDetails} />;
      case 'companies':
        return <Companies />;
      case 'customers':
        return <Customers />;
      case 'groups':
        return <CustomerGroups onViewBatch={navigateToBatchDetails} />;
      case 'batches':
        return <Batches onViewBatch={navigateToBatchDetails} activeBatchId={null} />;
      case 'batch-details':
        return <Batches onViewBatch={navigateToBatchDetails} activeBatchId={selectedBatchId} />;
      case 'reports':
        return <Reports />;
      case 'audit':
        return <Audit />;
      default:
        return <Dashboard onViewBatch={navigateToBatchDetails} />;
    }
  };

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', name: 'Upload Invoice Data', icon: Upload },
    { id: 'invoices', name: 'Invoices History', icon: FileText },
    { id: 'batches', name: 'Batches Progress', icon: FileSpreadsheet },
    { id: 'companies', name: 'Company Profiles', icon: Building2 },
    { id: 'customers', name: 'Customer Masters', icon: Users },
    { id: 'groups', name: 'Billing Groups', icon: Layers },
    { id: 'reports', name: 'Tax Reports', icon: BarChart3 },
    { id: 'audit', name: 'Audit Trail', icon: History, adminOnly: true },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      
      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-0'} transition-transform duration-200 md:relative md:translate-x-0`}>
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-lg text-white">MadTech Billing</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            if (item.adminOnly && user?.role !== 'ADMIN') return null;
            const Icon = item.icon;
            const isActive = activeView === item.id || (item.id === 'batches' && activeView === 'batch-details');
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id !== 'batches') setSelectedBatchId(null);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
          {user && (
            <div className="px-2 pb-2">
              <p className="text-xs text-slate-500">Logged in as</p>
              <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-850 hover:bg-red-900/40 hover:text-red-200 border border-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 gap-4 md:px-8">
          <button className="md:hidden text-slate-500 hover:text-slate-950" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900 capitalize">
              {activeView.replace('-', ' ')}
            </h1>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

    </div>
  );
}

export default App;
