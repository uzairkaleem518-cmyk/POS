import { useState } from 'react';
import { useApp } from './AppContext';
import { Calendar, TrendingUp, DollarSign, Package, Users, FileText, Download } from 'lucide-react';

export function ReportsAnalytics() {
  const { sales, products, shop, userName, userEmail } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  // Check if user is a power user
  const userRole = (shop?.role || '').toLowerCase().trim();
  const isPowerUser = ['admin', 'super_admin', 'manager'].includes(userRole);
  const currentUserName = (userName || '').trim();
  const currentUserEmail = (userEmail || '').trim();

  // Filter sales by user role
  const userSales = sales.filter(sale => {
    if (isPowerUser) return true;
    const soldBy = ((sale as any).soldBy || '').trim();
    return soldBy === currentUserName || soldBy === currentUserEmail;
  });

  // Get date range based on report type
  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (reportType === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (reportType === 'week') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (reportType === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (reportType === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const { start: dateStart, end: dateEnd } = getDateRange();

  // Filter sales by date range
  const filteredSales = userSales.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate >= dateStart && saleDate <= dateEnd;
  });

  // Calculate profit for each sale
  const salesWithProfit = filteredSales.map(sale => {
    let totalCost = 0;
    let totalRevenue = sale.total;

    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const costPrice = (product as any)?.costPrice || 0;
      totalCost += costPrice * item.quantity;
    });

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      ...sale,
      cost: totalCost,
      profit,
      profitMargin
    };
  });

  // Calculate totals
  const totalRevenue = salesWithProfit.reduce((sum, s) => sum + s.total, 0);
  const totalCost = salesWithProfit.reduce((sum, s) => sum + s.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Product profit breakdown
  const productProfits = products.map(product => {
    let totalQtySold = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.productId === product.id) {
          totalQtySold += item.quantity;
          totalRevenue += item.total;
          const costPrice = (product as any)?.costPrice || 0;
          totalCost += costPrice * item.quantity;
        }
      });
    });

    return {
      name: product.name,
      qtySold: totalQtySold,
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
    };
  }).filter(p => p.qtySold > 0).sort((a, b) => b.profit - a.profit);

  // Salesperson profit (only for power users)
  const salespersonProfits = isPowerUser ? (() => {
    const salespeople = Array.from(new Set(filteredSales.map(s => (s as any).soldBy || 'Admin')));
    return salespeople.map(person => {
      const personSales = salesWithProfit.filter(s => ((s as any).soldBy || 'Admin') === person);
      const revenue = personSales.reduce((sum, s) => sum + s.total, 0);
      const cost = personSales.reduce((sum, s) => sum + s.cost, 0);
      const profit = revenue - cost;

      return {
        name: person,
        salesCount: personSales.length,
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0
      };
    }).sort((a, b) => b.profit - a.profit);
  })() : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} className="text-green-600" />
            Profit Reports & Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isPowerUser ? 'Business-wide profit analysis' : 'Your performance & earnings'}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold"
        >
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          {(['today', 'week', 'month', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                reportType === type
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'today' ? 'Today' : type === 'week' ? 'Last 7 Days' : type === 'month' ? 'This Month' : 'Custom Range'}
            </button>
          ))}
        </div>

        {reportType === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Revenue</p>
              <p className="text-xl font-bold text-gray-800">RS.{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Package className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Cost</p>
              <p className="text-xl font-bold text-gray-800">RS.{totalCost.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Profit</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                RS.{totalProfit.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Profit Margin</p>
              <p className={`text-xl font-bold ${overallMargin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {overallMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales with Profit Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Sales Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                {isPowerUser && <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sold By</th>}
                <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-orange-600 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {salesWithProfit.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(sale.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{sale.customerName}</td>
                  {isPowerUser && <td className="px-4 py-3 text-xs text-gray-600">{(sale as any).soldBy || 'Admin'}</td>}
                  <td className="px-4 py-3 text-xs font-bold text-blue-600 text-right">RS.{sale.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-bold text-orange-600 text-right">RS.{sale.cost.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    RS.{sale.profit.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${sale.profitMargin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    {sale.profitMargin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {salesWithProfit.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No sales found for selected date range</p>
          </div>
        )}
      </div>

      {/* Product Profit Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Profit by Product</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-orange-600 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productProfits.map(product => (
                <tr key={product.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{product.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-right">{product.qtySold}</td>
                  <td className="px-4 py-3 text-xs font-bold text-blue-600 text-right">RS.{product.revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-orange-600 text-right">RS.{product.cost.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    RS.{product.profit.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${product.margin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    {product.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salesperson Profit (Admin only) */}
      {isPowerUser && salespersonProfits.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Profit by Salesperson</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Salesperson</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Sales Count</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-orange-600 uppercase">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {salespersonProfits.map(person => (
                  <tr key={person.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{person.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-right">{person.salesCount}</td>
                    <td className="px-4 py-3 text-xs font-bold text-blue-600 text-right">RS.{person.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-orange-600 text-right">RS.{person.cost.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-xs font-bold text-right ${person.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      RS.{person.profit.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-xs font-bold text-right ${person.margin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {person.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}