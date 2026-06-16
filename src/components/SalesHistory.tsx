import { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { 
  Search, 
  FileText, 
  Printer, 
  Calendar, 
  ShieldCheck, 
  RefreshCw,
  CheckCircle2 
} from 'lucide-react';

export function SalesHistory() {
  const { sales, shop, userName, userEmail, refreshData } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredSales = (sales as any[]).filter(sale => {
    const userRole = (shop?.role || '').toLowerCase().trim();
    const currentUserName = (userName || '').trim();
    const currentUserEmail = (userEmail || '').trim();
    const soldBy = (sale.soldBy || '').trim();

    // DEBUG: Log the comparison values (remove this after debugging)
    console.log('🔍 Filtering sale:', {
      saleId: sale.id.slice(-6),
      soldBy,
      currentUserName,
      currentUserEmail,
      userRole,
    });

    // Power users (admin, manager, super_admin) can see all transactions
    const isPowerUser = ['admin', 'super_admin', 'manager'].includes(userRole);
    
    if (isPowerUser) {
      console.log('✅ Power user - showing all sales');
      // Apply search filter for power users
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm ||
        (sale.customerName?.toLowerCase() || '').includes(search) ||
        (sale.soldBy?.toLowerCase() || '').includes(search) ||
        (sale.id || '').includes(searchTerm);
      
      return matchesSearch;
    }
    
    // For salesmen: only show transactions sold by them
    // Match by name OR email
    const isSoldByCurrentUser = 
      soldBy === currentUserName || 
      soldBy === currentUserEmail || 
      soldBy.toLowerCase() === currentUserEmail.toLowerCase();
    
    console.log('👤 Salesman check:', { isSoldByCurrentUser, soldBy, currentUserName, currentUserEmail });
    
    if (!isSoldByCurrentUser && soldBy) {
      console.log('❌ Not sold by current user - hiding');
      return false;
    }
    
    if (!soldBy) {
      console.log('⚠️ Legacy sale (no soldBy) - hiding for salesman');
      return false; // Hide legacy sales from salesmen
    }

    // Apply search filter for salesmen
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      (sale.customerName?.toLowerCase() || '').includes(search) ||
      (sale.soldBy?.toLowerCase() || '').includes(search) ||
      (sale.id || '').includes(searchTerm);
    
    return matchesSearch;
  });

  const printReceipt = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsHtml = sale.items.map((item: any) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">RS. ${item.price.toLocaleString()}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">RS. ${item.total.toLocaleString()}</td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice #${sale.id.slice(-6)}</title>
          <style>
            @media print {
              @page { margin: 0.5cm; }
              body { margin: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .shop-name {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
            }
            .shop-details {
              font-size: 12px;
              color: #666;
              margin: 5px 0;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              font-size: 13px;
            }
            .invoice-info div {
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background: #f5f5f5;
              padding: 10px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              border-bottom: 2px solid #000;
            }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) {
              text-align: right;
            }
            td {
              font-size: 13px;
            }
            .totals {
              margin-top: 20px;
              text-align: right;
            }
            .totals-row {
              display: flex;
              justify-content: flex-end;
              padding: 5px 0;
              font-size: 14px;
            }
            .totals-row.grand-total {
              border-top: 2px solid #000;
              margin-top: 10px;
              padding-top: 10px;
              font-size: 18px;
              font-weight: bold;
            }
            .totals-label {
              min-width: 150px;
              text-align: right;
              padding-right: 20px;
            }
            .totals-value {
              min-width: 120px;
              text-align: right;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #000;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .payment-info {
              background: #f9f9f9;
              padding: 10px;
              margin: 15px 0;
              border-left: 3px solid #4CAF50;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="shop-name">${shop?.shopName || 'Shop Name'}</h1>
            <div class="shop-details">${shop?.address || ''}</div>
            <div class="shop-details">Phone: ${shop?.phone || 'N/A'} | Email: ${shop?.email || ''}</div>
          </div>

          <div class="invoice-info">
            <div>
              <strong>INVOICE #${sale.id.slice(-6)}</strong><br>
              Date: ${new Date(sale.date).toLocaleDateString()}<br>
              Time: ${new Date(sale.date).toLocaleTimeString()}
            </div>
            <div>
              <strong>Customer:</strong><br>
              ${sale.customerName}<br>
              ${sale.soldBy ? `Sold By: ${sale.soldBy}` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <div class="totals-label">Subtotal:</div>
              <div class="totals-value">RS. ${sale.subtotal.toLocaleString()}</div>
            </div>
            ${sale.discount > 0 ? `
            <div class="totals-row">
              <div class="totals-label">Discount:</div>
              <div class="totals-value">- RS. ${sale.discount.toLocaleString()}</div>
            </div>
            ` : ''}
            <div class="totals-row grand-total">
              <div class="totals-label">TOTAL:</div>
              <div class="totals-value">RS. ${sale.total.toLocaleString()}</div>
            </div>
          </div>

          <div class="payment-info">
            <strong>Payment Method:</strong> ${sale.paymentMethod.toUpperCase()}<br>
            <strong>Amount Paid:</strong> RS. ${sale.amountPaid.toLocaleString()}<br>
            ${sale.balance > 0 ? `<strong>Balance Due:</strong> <span style="color: #f44336;">RS. ${sale.balance.toLocaleString()}</span>` : '<strong>Status:</strong> <span style="color: #4CAF50;">PAID IN FULL</span>'}
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p style="font-size: 10px; margin-top: 10px;">This is a computer-generated invoice.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              // Auto-close after printing (optional)
              // setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <ShieldCheck className="text-green-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 leading-none">Sales Records</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">
              Logged as: <span className="text-blue-600">{userName || userEmail}</span> ({shop?.role})
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all border ${
              isRefreshing 
                ? 'bg-gray-100 text-gray-400 border-gray-200' 
                : 'bg-white text-green-700 border-green-200 hover:bg-green-50 active:scale-95'
            }`}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Syncing...' : 'Refresh Data'}
          </button>

          <div className="h-6 w-[1px] bg-gray-200 hidden sm:block mx-1"></div>

          <input 
            type="text" 
            placeholder="Search invoice, customer, or seller..." 
            value={searchTerm}
            className="border border-gray-200 p-2 text-xs rounded-md w-full sm:w-64 focus:ring-2 focus:ring-green-500 outline-none" 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table Area */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-3 font-bold uppercase tracking-wider">Invoice</th>
                <th className="p-3 font-bold uppercase tracking-wider">Customer</th>
                <th className="p-3 font-bold uppercase tracking-wider text-blue-600">Sold By</th>
                <th className="p-3 text-right font-bold uppercase tracking-wider">Amount</th>
                <th className="p-3 text-center font-bold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-green-50/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-gray-600">#{sale.id.slice(-6)}</td>
                  <td className="p-3 font-medium text-gray-800">{sale.customerName}</td>
                  <td className="p-3 italic text-blue-500 font-medium">
                    {sale.soldBy || 'System/Admin'}
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900">
                    RS. {sale.total.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button 
                        onClick={() => setSelectedSale(sale.id)} 
                        className={`p-1.5 rounded-md transition-colors ${selectedSale === sale.id ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                      >
                        <FileText size={16}/>
                      </button>
                      <button 
                        onClick={() => printReceipt(sale)} 
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      >
                        <Printer size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSales.length === 0 && (
            <div className="p-20 text-center bg-gray-50/50">
              <p className="text-gray-400 text-xs italic">No sales transactions found.</p>
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg shadow-sm h-fit sticky top-4">
          {selectedSale ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 border-b pb-3">
                <CheckCircle2 size={18} />
                <h3 className="font-bold text-sm uppercase">Sale Summary</h3>
              </div>
              
              <div className="space-y-2">
                {(sales as any[]).find(s => s.id === selectedSale)?.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] border-b border-gray-50 pb-1">
                    <span className="text-gray-600">{item.productName} (x{item.quantity})</span>
                    <span className="font-bold">RS. {item.total}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between text-lg font-black text-gray-800">
                  <span>TOTAL</span>
                  <span>RS. {(sales as any[]).find(s => s.id === selectedSale)?.total.toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => printReceipt((sales as any[]).find(s => s.id === selectedSale))}
                  className="w-full mt-4 bg-gray-900 text-white py-2 rounded-md font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText size={20} className="text-gray-300" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Select a transaction from the list<br/>to see full items & print.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}