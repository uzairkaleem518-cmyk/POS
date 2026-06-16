import { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { POSInterface } from './components/POSInterface';
import { InventoryManagement } from './components/InventoryManagement';
import { LedgerManagement }  from './components/LedgerManagement';
import { SalesHistory } from './components/SalesHistory';
import { CustomerManagement } from './components/CustomerManagement';
import { AdminPanel } from './components/AdminPanel';
import { UserManagement } from './components/UserManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { PurchaseManagement } from './components/PurchaseManagement';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { AccountHistoryView } from './components/FinancialReport';
import { AppProvider, useApp } from './components/AppContext';
import { authApi, setAccessToken } from './utils/api';
import { getSupabaseClient } from './utils/supabase/client';
import BanksPage from './components/BanksPage';
import { 
  LogOut, 
  Shield, 
  Users, 
  Store, 
  Truck, 
  ShoppingBag, 
  ShoppingCart, 
  Package, 
  LayoutDashboard, 
  History, 
  BookOpen,
  FileText,
  Scale, 
  Landmark
} from 'lucide-react';

// Unified View type definition (Lower-case recommended for consistency)
type View = 
  | 'dashboard' 
  | 'pos' 
  | 'inventory' 
  | 'ledger' 
  | 'sales' 
  | 'customers' 
  | 'admin' 
  | 'users' 
  | 'suppliers' 
  | 'purchases' 
  | 'reports' 
  | 'trial-balance' 
  | 'banks';

interface MainAppProps {
  handleSignOut: () => void;
  userEmail: string;
  userName: string;
}

/**
 * Main Application Layout
 * Handles Navigation and Role-based View Rendering
 */
function MainApp({ handleSignOut, userEmail, userName }: MainAppProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { shop } = useApp();

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  const isSuperAdmin = shop?.role === 'super_admin';
  const isAdmin = shop?.role === 'admin';
  const isManager = shop?.role === 'manager';
  const isSalesman = shop?.role === 'salesman';

  // Navigation Menu Configuration
  const menuItems = isSuperAdmin ? [
    { id: 'admin', label: 'Platform', icon: <Shield size={16} />, show: true },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, show: true },
    { id: 'pos', label: 'Sales', icon: <ShoppingCart size={16} />, show: true },
    { id: 'purchases', label: 'Stock', icon: <ShoppingBag size={16} />, show: isAdmin || isManager },
    { id: 'inventory', label: 'Inventory', icon: <Package size={16} />, show: isAdmin || isManager },
    { id: 'suppliers', label: 'Suppliers', icon: <Truck size={16} />, show: isAdmin || isManager },
    { id: 'reports', label: 'Reports', icon: <FileText size={16} />, show: isAdmin || isManager },
    { id: 'ledger', label: 'Ledger', icon: <BookOpen size={16} />, show: isAdmin || isManager },
    { id: 'trial-balance', label: 'Accounts', icon: <Scale size={16} />, show: isAdmin || isManager },
    { id: 'banks', label: 'Banks', icon: <Landmark size={16} />, show: isAdmin }, // Fixed ID to 'banks'
    { id: 'sales', label: 'History', icon: <History size={16} />, show: true },
    { id: 'customers', label: 'Customers', icon: <Users size={16} />, show: true },
    { id: 'users', label: 'Team', icon: <Users size={16} />, show: isAdmin },
  ];

  useEffect(() => {
    if (isSuperAdmin && currentView !== 'admin') {
      setCurrentView('admin');
    }
  }, [isSuperAdmin, currentView]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2.5">
              <div className="bg-green-600 p-1.5 rounded shadow-sm">
                <Store className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800 leading-tight">
                  {isSuperAdmin ? 'Platform Control' : (userName || userEmail || 'User Account')}
                </h1>
                
                <div className="flex items-center gap-2">
                  {!isSuperAdmin && userName && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      {userEmail}
                    </span>
                  )}
                  
                  {!isSuperAdmin && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      {userName && '•'} {shop?.shopName}
                    </span>
                  )}
                  
                  <div className="text-[10px] font-bold tracking-wide">
                    {isSuperAdmin && <span className="text-purple-600 uppercase">Super Admin</span>}
                    {isAdmin && !isSuperAdmin && <span className="text-blue-600 uppercase">Shop Owner</span>}
                    {isManager && <span className="text-green-600 uppercase">Manager</span>}
                    {isSalesman && <span className="text-yellow-600 uppercase">Salesman</span>}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded text-sm font-medium transition-all"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex-grow w-full">
        
        {/* Compact Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-4 overflow-x-auto border border-gray-200 scrollbar-hide">
          <div className="flex gap-0.5 p-1 min-w-max">
            {menuItems.filter(item => item.show).map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                  currentView === item.id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Component Rendering Container */}
        <div className="bg-white rounded-lg shadow-sm p-5 min-h-[550px] border border-gray-200">
          {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentView === 'pos' && <POSInterface />}
          {currentView === 'purchases' && <PurchaseManagement />}
          {currentView === 'inventory' && <InventoryManagement />}
          {currentView === 'suppliers' && <SupplierManagement />}
          {currentView === 'reports' && <ReportsAnalytics />}
          {currentView === 'ledger' && <LedgerManagement />}
          {currentView === 'trial-balance' && <AccountHistoryView />}
          {currentView === 'sales' && <SalesHistory />}
          {currentView === 'customers' && <CustomerManagement />}
          {currentView === 'users' && <UserManagement />}
          {currentView === 'admin' && <AdminPanel />}
          {currentView === 'banks' && <BanksPage />}
        </div>
      </div>
    </div>
  );
}

/**
 * Entry Point Component
 */
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setSession(null);
      setIsAuthenticated(false);
      setAccessToken(null);
      setUserEmail('');
      setUserName('');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const checkSession = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession) {
        setAccessToken(supabaseSession.access_token);
        setUserEmail(supabaseSession.user.email || '');
        
        const result = await authApi.getSession();
        if (result.shop) {
          const name = result.shop.teamMemberName || result.shop.ownerName || '';
          setUserName(name);
          setSession(result);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
    
    const supabase = getSupabaseClient();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string, supabaseSession: any) => {
      if (event === 'SIGNED_IN' && supabaseSession) {
        setUserEmail(supabaseSession.user.email || '');
        const result = await authApi.getSession();
        if (result.shop) {
          const name = result.shop.teamMemberName || result.shop.ownerName || '';
          setUserName(name);
          setSession(result);
          setIsAuthenticated(true);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsAuthenticated(false);
        setAccessToken(null);
        setUserEmail('');
        setUserName('');
      } else if (event === 'TOKEN_REFRESHED' && supabaseSession) {
        setAccessToken(supabaseSession.access_token);
        setUserEmail(supabaseSession.user.email || '');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (sessionData: any) => {
    if (!sessionData.shop) {
      alert('Your account is pending admin approval.');
      return;
    }
    if (sessionData.accessToken) setAccessToken(sessionData.accessToken);
    if (sessionData.user?.email) setUserEmail(sessionData.user.email);
    
    const name = sessionData.shop.teamMemberName || sessionData.shop.ownerName || '';
    setUserName(name);
    setSession(sessionData);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm font-medium">Synchronizing session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <AppProvider 
      initialShop={session.shop} 
      userName={userName}
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <MainApp handleSignOut={handleSignOut} userEmail={userEmail} userName={userName} />
    </AppProvider>
  );
}