import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Users, 
  Wallet, 
  IndianRupee, 
  Clock, 
  BarChart3, 
  FileText, 
  Download, 
  Settings, 
  LogOut,
  Menu,
  X,
  History
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState({ username: 'Admin' });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('rajindera_admin_user');
    if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('rajindera_admin_token');
      localStorage.removeItem('rajindera_admin_user');
      navigate('/login', { replace: true });
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'All Orders', path: '/admin/orders', icon: ClipboardList },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Accounts Summary', path: '/admin/accounts', icon: Wallet },
    { label: 'Payments History', path: '/admin/payments', icon: IndianRupee },
    { label: 'Pending Payments', path: '/admin/pending-payments', icon: Clock },
    { label: 'Business Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Audit Logs', path: '/admin/audit-log', icon: History },
    { label: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  // Helper to determine active link
  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const activeHeaderLabel = navItems.find(item => isActive(item.path))?.label || 'Admin Panel';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 shrink-0">
        {/* Logo Area */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-bold text-white shadow-soft">
            R
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight">Rajindera Water</p>
            <p className="text-xs text-slate-500 font-medium">Admin Accounting</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                  active 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Area with user pill and logout */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-2xl">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
              {adminUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-800 leading-tight capitalize">{adminUser.username}</p>
              <p className="text-xs text-slate-400">Authorized Admin</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar Drawer - Mobile Layout */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-sm">
          <div className="w-72 bg-white flex flex-col relative animate-slide-in">
            {/* Close button */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full border border-slate-200 bg-white text-slate-600"
            >
              <X size={18} />
            </button>

            {/* Logo Area */}
            <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-bold text-white">
                R
              </div>
              <div>
                <p className="font-semibold text-slate-900 leading-tight">Rajindera Water</p>
                <p className="text-xs text-slate-500 font-medium">Admin Accounting</p>
              </div>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                      active 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-2xl">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {adminUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight capitalize">{adminUser.username}</p>
                  <p className="text-xs text-slate-400">Authorized Admin</p>
                </div>
              </div>
              
              <button
                onClick={() => { setSidebarOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-900">
              {activeHeaderLabel}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 border border-slate-200 rounded-full bg-slate-50">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-600">Database Connection Online</span>
            </div>
            
            <a 
              href="/" 
              className="px-4 py-2 border border-slate-200 hover:border-blue-200 rounded-full text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
            >
              Public Site
            </a>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
