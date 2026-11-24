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
  Menu, 
  X,
  FileSpreadsheet,
  Layers
} from 'lucide-react';

// Existing Page Imports
import Dashboard from './pages/dashboard';
import Invoices from './pages/invoices';
import UploadWizard from './components/imports/UploadWizard';
import Companies from './pages/companies';
import Customers from './pages/customers';
import Reports from './pages/reports';
import Audit from './pages/audit';
import Batches from './pages/batches';
import CustomerGroups from './pages/groups';

// Auth Pages
import Register from './pages/register';
import Login from './pages/login';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Configure Axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          // If token expired or invalid
          handleLogout();
        });
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, loggedInUser: any) => {
    setToken(newToken);
    setUser(loggedInUser);
    setActiveView('dashboard');
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

  // If not logged in -> Show Register or Login
  if (!token) {
    if (authMode === 'register') {
      return (
        <Register 
          onSwitchToLogin={() => setAuthMode('login')} 
          onRegisterSuccess={() => setAuthMode('login')} 
        />
      );
    }
    return (
      <Login 
        onSwitchToRegister={() => setAuthMode('register')} 
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Render the existing dashboard pages
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

  // Render the original existing Dashboard layout
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-0'} transition-transform duration-200 md:relative md:translate-x-0`}>
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-lg text-white">{user?.companyName || 'MAD Invoice'}</span>
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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
              <p className="text-xs text-slate-500">Logged in as ({user.role})</p>
              <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/40 hover:text-red-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
