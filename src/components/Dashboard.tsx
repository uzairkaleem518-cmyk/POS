import { useState } from 'react';
import { useApp } from './AppContext';
import { 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  ArrowRight,
  Filter,
  User
} from 'lucide-react';
import { WelcomeBanner } from './WelcomeBanner';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { products, customers, sales, ledgerEntries, suppliers, shop, userName, userEmail } = useApp();
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);

  // Check if user is a power user (can see all data)
  const userRole = (shop?.role || '').toLowerCase().trim();
  const isPowerUser = ['admin', 'super_admin', 'manager'].includes(userRole);
  const currentUserName = (userName || '').trim();
  const currentUserEmail = (userEmail || '').trim();

  // Filter sales based on user role
  const userSales = sales.filter(sale => {
    if (isPowerUser) {
      return true; // Power users see all sales
    }
    const soldBy = ((sale as any).soldBy || '').trim();
    return soldBy === currentUserName || 
           soldBy === currentUserEmail || 
           soldBy.toLowerCase() === currentUserEmail.toLowerCase();
  });

  // 1. Get unique list of staff members from sales history for the filter (only for power users)
  const staffMembers = isPowerUser 
    ? Array.from(new Set(userSales.map(s => (s as any).soldBy || 'Admin')))
    : [currentUserName || currentUserEmail];

  // 2. Normalize "Today" to midnight for accurate comparison
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 3. Filter sales based on selected staff (only for power users)
  const filteredSales = userSales.filter(sale => {
    if (!isPowerUser) return true; 
    const matchesStaff = staffFilter === 'all' || ((sale as any).soldBy || 'Admin') === staffFilter;
    return matchesStaff;
  });

  // 4. Calculate stats based on filtered data
  const todaySales = filteredSales.filter(sale => {
    const saleDate = new Date(sale.date);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === todayStart.getTime();
  });

  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  
  // Calculate profit (only for power users)
  let todayProfit = 0;
  let totalProfit = 0;
  
  if (isPowerUser) {
    todaySales.forEach(sale => {
      let saleCost = 0;
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = (product as any)?.costPrice || 0;
        saleCost += costPrice * item.quantity;
      });
      todayProfit += sale.total - saleCost;
    });

    filteredSales.forEach(sale => {
      let saleCost = 0;
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = (product as any)?.costPrice || 0;
        saleCost += costPrice * item.quantity;
      });
      totalProfit += sale.total - saleCost;
    });
  }
  
  // These stats remain global (business-wide) - only visible to power users
  const totalReceivables = customers.reduce((sum, customer) => sum + customer.balance, 0);
  const totalPayables = suppliers.reduce((sum, supplier) => sum + (supplier.balance || 0), 0);

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  return (
    <div className="space-y-5">
      <WelcomeBanner />
      
      {/* Low Stock Alert - Only for power users */}
      {isPowerUser && lowStockProducts.length > 0 && showLowStockAlert && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-bold text-red-800">Low Stock Alert!</h3>
                <p className="text-xs text-red-700 mt-1">
                  {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's are' : ' is'} running low on stock:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {lowStockProducts.slice(0, 5).map(product => (
                    <span key={product.id} className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded text-xs font-medium text-red-700 border border-red-200">
                      <Package size={12} />
                      {product.name} ({product.stock} {product.unit} left)
                    </span>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <span className="text-xs text-red-600 font-medium">
                      +{lowStockProducts.length - 5} more
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="mt-3 text-xs font-bold text-red-700 hover:text-red-800 underline"
                >
                  View All Low Stock Items →
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowLowStockAlert(false)}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss alert"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Header & Staff Filter (only show for power users) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
          {isPowerUser ? 'Business Overview' : 'My Sales Dashboard'}
        </h2>
        
        {isPowerUser && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Filter by Staff:</span>
            <select 
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="text-xs font-semibold text-blue-600 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Team Members</option>
              {staffMembers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Interactive Stats Grid */}
      <div className={`grid grid-cols-2 ${isPowerUser ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-2'} gap-3`}>
        {/* Today's Sales */}
        <div 
          onClick={() => onNavigate('sales')}
          className="bg-white p-3 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Today</p>
              <p className="text-lg font-bold text-gray-800">RS.{todayRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-green-600 font-medium">{todaySales.length} Orders</p>
            </div>
            <div className="bg-green-50 p-1.5 rounded group-hover:bg-green-100 transition-colors">
              <DollarSign className="text-green-600" size={16} />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div 
          onClick={() => onNavigate('sales')}
          className="bg-white p-3 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                {isPowerUser ? 'Revenue' : 'My Revenue'}
              </p>
              <p className="text-lg font-bold text-gray-800">RS.{totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 font-medium">
                {isPowerUser 
                  ? (staffFilter === 'all' ? 'Total' : `By ${staffFilter}`)
                  : `${filteredSales.length} Sales`
                }
              </p>
            </div>
            <div className="bg-blue-50 p-1.5 rounded group-hover:bg-blue-100 transition-colors">
              <TrendingUp className="text-blue-600" size={16} />
            </div>
          </div>
        </div>

        {/* Today's Profit - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('reports')}
            className="bg-white p-3 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Today Profit</p>
                <p className={`text-lg font-bold ${todayProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  RS.{todayProfit.toLocaleString()}
                </p>
                <p className="text-[10px] text-purple-600 font-medium">Click for details</p>
              </div>
              <div className="bg-purple-50 p-1.5 rounded group-hover:bg-purple-100 transition-colors">
                <TrendingUp className="text-purple-600" size={16} />
              </div>
            </div>
          </div>
        )}

        {/* Total Profit - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('reports')}
            className="bg-white p-3 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Total Profit</p>
                <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  RS.{totalProfit.toLocaleString()}
                </p>
                <p className="text-[10px] text-green-600 font-medium">View reports</p>
              </div>
              <div className="bg-green-50 p-1.5 rounded group-hover:bg-green-100 transition-colors">
                <DollarSign className="text-green-600" size={16} />
              </div>
            </div>
          </div>
        )}

        {/* Receivables - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('customers')}
            className="bg-white p-3 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Receivable</p>
                <p className="text-lg font-bold text-orange-600">RS.{totalReceivables.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 p-1.5 rounded group-hover:bg-orange-100 transition-colors">
                <Users className="text-orange-600" size={16} />
              </div>
            </div>
          </div>
        )}

        {/* Payables - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('suppliers')}
            className="bg-white p-3 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Payable</p>
                <p className="text-lg font-bold text-red-600">RS.{totalPayables.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 p-1.5 rounded group-hover:bg-red-100 transition-colors">
                <Truck className="text-red-600" size={16} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sales and Financial Summary (unchanged) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Sales with Staff Filter */}
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {isPowerUser 
                ? (staffFilter === 'all' ? 'Recent Transactions' : `Sales by ${staffFilter}`)
                : 'My Recent Sales'
              }
            </h3>
            <button onClick={() => onNavigate('sales')} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              VIEW HISTORY <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredSales.length > 0 ? (
              filteredSales.slice(0, 6).map(sale => (
                <div key={sale.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{sale.customerName}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-2">
                      {new Date(sale.date).toLocaleDateString()}
                      {isPowerUser && (
                        <span className="flex items-center gap-1 text-blue-500 font-medium">
                          <User size={10} /> {(sale as any).soldBy || 'Admin'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">RS.{sale.total.toLocaleString()}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${sale.balance > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {sale.balance > 0 ? 'Credit' : 'Paid'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-xs text-gray-400">No sales found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Health Summary without Cash Balance */}
        {isPowerUser ? (
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Financial Health</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => onNavigate('customers')}
                  className="p-3 border border-gray-100 rounded cursor-pointer hover:bg-gray-50"
                >
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Total Receivables</p>
                  <p className="text-sm font-bold text-orange-600">RS.{totalReceivables.toLocaleString()}</p>
                </div>
                <div 
                  onClick={() => onNavigate('suppliers')}
                  className="p-3 border border-gray-100 rounded cursor-pointer hover:bg-gray-50"
                >
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Total Payables</p>
                  <p className="text-sm font-bold text-red-600">RS.{totalPayables.toLocaleString()}</p>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('ledger')} 
                className="w-full mt-2 py-2 border border-blue-600 text-blue-600 rounded text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-all uppercase tracking-wide shadow-sm"
              >
                Open Business Ledger
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            {/* Salesmen performance card remains unchanged */}
          </div>
        )}
      </div>
    </div>
  );
}
