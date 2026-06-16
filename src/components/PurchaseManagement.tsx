import { useState } from 'react';
import { useApp } from './AppContext';
import { purchasesApi } from '../utils/api';
import { Search, Plus, Minus, Trash2, ShoppingBag, Truck, AlertTriangle, DollarSign } from 'lucide-react';

export function PurchaseManagement() {
  const { products, suppliers, accounts, addAccountTransaction, getLiveBalance, refreshData } = useApp();
  const [cart, setCart] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>(''); // New: Selected cash/bank account
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter to show only Cash and Bank accounts (not Shop Expense)
  const liquidAccounts = (accounts || []).filter(acc => 
    acc && (acc.type === 'bank' || acc.type === 'cash')
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.costPrice }
          : item
      ));
    } else {
      // Use current cost price or default to selling price if no cost price set
      const costPrice = (product as any).costPrice || product.price;
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        costPrice: costPrice, // Buying price (editable)
        sellingPrice: product.price, // Selling price (for reference)
        total: costPrice,
        unit: product.unit
      }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return item;
        return { ...item, quantity: newQuantity, total: newQuantity * item.costPrice };
      }
      return item;
    }));
  };

  const updateCostPrice = (productId: string, newCostPrice: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        return { ...item, costPrice: newCostPrice, total: item.quantity * newCostPrice };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal; 

  const handleCompletePurchase = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (!selectedSupplier) return alert('Please select a supplier');
    if (!selectedAccount) return alert('Please select a cash/bank account for this transaction');

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return;

    const paidAmount = paymentMethod === 'cash' ? total : amountPaid;
    const balance = total - paidAmount;

    // Check if account has sufficient balance
    const accountBalance = getLiveBalance(selectedAccount, 'account');
    if (accountBalance < paidAmount) {
      alert(`Insufficient balance in selected account!\n\nAvailable: RS. ${accountBalance.toLocaleString()}\nRequired: RS. ${paidAmount.toLocaleString()}\n\nPlease select a different account or reduce payment amount.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the purchase record (this updates supplier ledger and inventory)
      await purchasesApi.create({
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.costPrice, // Send cost price to backend
          total: item.total
        })),
        subtotal: subtotal,
        discount: 0,
        total: total,
        paymentMethod,
        amountPaid: paidAmount,
        balance: Math.max(0, balance),
      });

      // 2. Create account transaction to update bank/cash balance
      // This is separate from supplier ledger (which backend handles)
      if (paidAmount > 0) {
        await addAccountTransaction({
          debitAccountId: 'PURCHASE_EXPENSE', // Purchase expense
          creditAccountId: selectedAccount, // Money going OUT (credit decreases assets)
          amount: paidAmount,
          description: paymentMethod === 'cash'
            ? `Cash Purchase from ${supplier.name}`
            : `Payment to ${supplier.name}`,
          date: new Date().toISOString().split('T')[0],
          reference: supplier.id
        });
      }

      setCart([]);
      setSelectedSupplier('');
      setSelectedAccount('');
      setAmountPaid(0);
      setPaymentMethod('cash');
      await refreshData();
      alert('Purchase recorded and stock updated!');
    } catch (error: any) {
      alert(error.message || 'Failed to complete purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded">
              <Truck className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Add Stock / Purchase Order</h2>
              <p className="text-xs text-gray-500">Select products to restock from supplier</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products to restock..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredProducts.map(product => {
            const costPrice = (product as any).costPrice || 0;
            const sellingPrice = product.price;
            const profitMargin = costPrice > 0 ? ((sellingPrice - costPrice) / costPrice * 100) : 0;

            return (
              <div
                key={product.id}
                onClick={() => addToCart(product.id)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-center h-16 bg-blue-50 rounded mb-2">
                  <Package className="text-blue-600" size={28} />
                </div>
                <h3 className="font-semibold text-gray-800 text-xs mb-1">{product.name}</h3>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">{product.category}</p>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500">Last Cost:</span>
                    <span className="font-bold text-blue-600">RS.{costPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500">Sell Price:</span>
                    <span className="font-bold text-green-600">RS.{sellingPrice.toLocaleString()}</span>
                  </div>
                  {profitMargin > 0 && (
                    <div className="text-[9px] text-purple-600 font-medium text-center bg-purple-50 rounded px-1 py-0.5">
                      {profitMargin.toFixed(1)}% profit
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 text-center pt-1 border-t">
                    Current Stock: {product.stock} {product.unit}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Section */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="text-blue-600" size={18} />
            <h3 className="font-semibold text-gray-800 text-sm">Purchase Order ({cart.length})</h3>
          </div>

          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {cart.map(item => (
              <div key={item.productId} className="border border-gray-100 rounded p-2 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-xs text-gray-800">{item.productName}</p>
                    <p className="text-[10px] text-gray-400">Sell: RS.{item.sellingPrice}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)} 
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Editable Cost Price */}
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                    Cost Price (RS.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.costPrice}
                    onChange={(e) => updateCostPrice(item.productId, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-blue-200 rounded text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => updateQuantity(item.productId, -1)} 
                      className="p-1 hover:bg-gray-100 rounded border border-gray-200"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        if (newQty >= 1) {
                          setCart(cart.map(cartItem => 
                            cartItem.productId === item.productId
                              ? { ...cartItem, quantity: newQty, total: newQty * cartItem.costPrice }
                              : cartItem
                          ));
                        }
                      }}
                      className="w-16 px-2 py-1 text-xs font-bold text-center border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      onClick={() => updateQuantity(item.productId, 1)} 
                      className="p-1 hover:bg-gray-100 rounded border border-gray-200"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="font-bold text-sm text-blue-700">RS.{item.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-gray-400 text-center py-12 text-xs">No items in purchase order</p>
            )}
          </div>

          <div className="space-y-3 border-t pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Supplier</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Account selection - ALWAYS VISIBLE AND REQUIRED */}
            <div>
              <label className="block text-xs font-bold text-red-700 uppercase mb-1">
                💳 Pay From Account <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border-2 border-red-300 bg-red-50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                required
              >
                <option value="">-- Select Cash/Bank Account --</option>
                {liquidAccounts.map(acc => {
                  const balance = getLiveBalance(acc.id, 'account');
                  return (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Bal: RS. {balance.toLocaleString()})
                    </option>
                  );
                })}
              </select>
              {!selectedAccount && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Please select an account to proceed
                </p>
              )}
              {selectedAccount && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-red-700">Available Balance:</span>
                    <span className="font-bold text-red-900">RS. {getLiveBalance(selectedAccount, 'account').toLocaleString()}</span>
                  </div>
                  {paymentMethod === 'cash' && getLiveBalance(selectedAccount, 'account') < total && (
                    <p className="text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Insufficient funds! Need RS. {total.toLocaleString()}
                    </p>
                  )}
                  {paymentMethod === 'credit' && amountPaid > 0 && getLiveBalance(selectedAccount, 'account') < amountPaid && (
                    <p className="text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Insufficient funds! Need RS. {amountPaid.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
              <div className="flex gap-2">
                {(['cash', 'credit'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 px-3 py-2 rounded capitalize text-xs font-semibold ${
                      paymentMethod === method ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'credit' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid Now (RS.)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="space-y-1 text-sm bg-gray-50 p-3 rounded border border-gray-200">
              <div className="flex justify-between text-base font-bold">
                <span>Total Bill:</span>
                <span className="text-blue-700">RS.{total.toFixed(2)}</span>
              </div>
              {paymentMethod === 'credit' && (
                <div className="flex justify-between text-orange-600 text-xs">
                  <span>Balance Payable:</span>
                  <span className="font-bold">RS.{(total - amountPaid).toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              disabled={
                isSubmitting || 
                cart.length === 0 || 
                !selectedSupplier || 
                !selectedAccount ||
                (!!selectedAccount && getLiveBalance(selectedAccount, 'account') < (paymentMethod === 'cash' ? total : amountPaid))
              }
              onClick={handleCompletePurchase}
              className={`w-full py-3 rounded-lg font-bold transition-colors text-sm ${
                isSubmitting || 
                cart.length === 0 || 
                !selectedSupplier || 
                !selectedAccount ||
                (!!selectedAccount && getLiveBalance(selectedAccount, 'account') < (paymentMethod === 'cash' ? total : amountPaid))
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                'Processing...'
              ) : !selectedAccount ? (
                'Select Account First'
              ) : (!!selectedAccount && getLiveBalance(selectedAccount, 'account') < (paymentMethod === 'cash' ? total : amountPaid)) ? (
                'Insufficient Balance'
              ) : (
                'Complete Purchase & Update Stock'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Local Package SVG helper
function Package({ className, size }: { className?: string; size: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}