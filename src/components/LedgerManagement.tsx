import { useState } from 'react';
import { useApp } from './AppContext';
import { Plus, Search, Truck, X, Calendar, TrendingUp } from 'lucide-react';

export function LedgerManagement() {
  const { 
    ledgerEntries, 
    customers, 
    suppliers, 
    accounts,
    accountTransactions, // Add this to get account-to-account transactions
    refreshData, 
    addAccountTransaction, 
    addPayment, 
    addSupplierPayment,
    getLiveBalance
  } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeForm, setActiveForm] = useState<'customer_payment' | 'supplier_payment' | 'expense' | null>(null);
  
  const [formData, setFormData] = useState({
    personId: '',
    bankAccountId: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const closeForm = () => {
    setActiveForm(null);
    setFormData({ 
        personId: '', 
        bankAccountId: '', 
        amount: 0, 
        description: '', 
        date: new Date().toISOString().split('T')[0] 
    });
  };

  // Filter to show only bank and cash accounts from the accounts list
  const liquidAccounts = (accounts || []).filter(acc => 
    acc && (acc.type === 'bank' || acc.type === 'cash')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0 || !formData.bankAccountId) {
      alert("Please fill all required fields");
      return;
    }

    // Get selected bank account for balance check
    const selectedAccount = liquidAccounts.find(acc => acc.id === formData.bankAccountId);
    const accountBalance = getLiveBalance(formData.bankAccountId, 'account');

    // Check for negative balance on withdrawal operations
    if ((activeForm === 'supplier_payment' || activeForm === 'expense') && accountBalance < formData.amount) {
      alert(`Insufficient balance. Available balance: RS. ${accountBalance.toLocaleString()}, but trying to withdraw: RS. ${formData.amount.toLocaleString()}`);
      return;
    }

    try {
      if (activeForm === 'customer_payment') {
        // 1. Direct increase to Bank. Use personId as the credit reference.
        await addAccountTransaction({
          debitAccountId: formData.bankAccountId, 
          creditAccountId: 'CUSTOMER_LEDGER', // Using a generic tag or the personId if your backend supports it
          amount: formData.amount,
          description: formData.description || `Payment from Customer`,
          date: formData.date,
          reference: formData.personId 
        });
        
        // 2. Update Customer Balance via the dedicated sub-ledger API
        await addPayment(formData.personId, formData.amount, formData.description || 'Payment Received');

      } else if (activeForm === 'supplier_payment') {
        // 1. Direct decrease from Bank.
        await addAccountTransaction({
          debitAccountId: 'SUPPLIER_LEDGER', 
          creditAccountId: formData.bankAccountId,
          amount: formData.amount,
          description: formData.description || `Payment to Supplier`,
          date: formData.date,
          reference: formData.personId
        });
        
        // 2. Update Supplier Balance via sub-ledger API
        await addSupplierPayment(formData.personId, formData.amount, formData.description || 'Payment Made');

      } else if (activeForm === 'expense') {
        // Find the Shop Expense account
        const expenseAccount = (accounts || []).find(acc => 
          acc.type === 'expense' && (acc.name.toLowerCase() === 'shop expense' || acc.name.toLowerCase().includes('expense'))
        );

        if (!expenseAccount) {
          alert('Shop Expense account not found. Please ensure it exists in your accounts.');
          return;
        }

        await addAccountTransaction({
          debitAccountId: expenseAccount.id,
          creditAccountId: formData.bankAccountId,
          amount: formData.amount,
          description: formData.description || 'Shop Expense',
          date: formData.date
        });
      }
      
      if (refreshData) await refreshData();
      closeForm();
    } catch (error) {
      console.error(error);
      alert('Transaction failed.');
    }
  };

  // Helper function to get account/customer/supplier name by ID
  const getEntityName = (id: string) => {
    const account = (accounts || []).find(a => a.id === id);
    if (account) return { name: account.name, type: 'account' };
    
    const customer = (customers || []).find(c => c.id === id);
    if (customer) return { name: customer.name, type: 'customer' };
    
    const supplier = (suppliers || []).find(s => s.id === id);
    if (supplier) return { name: supplier.name, type: 'supplier' };
    
    return { name: 'Unknown', type: 'unknown' };
  };

  // Merge ledgerEntries with accountTransactions
  const allTransactions = [
    // Existing ledger entries (from sales/purchases)
    ...(ledgerEntries || []).map(entry => ({
      ...entry,
      createdAt: (entry as any).createdAt || entry.date
    })),
    // Account transactions (expenses, transfers, etc.)
    ...(accountTransactions || []).map((tx: any) => {
      const debitEntity = getEntityName(tx.debitAccountId);
      const creditEntity = getEntityName(tx.creditAccountId);
      
      // Determine if this is money in or out based on account types
      // For expenses: debit=expense account, credit=bank (money OUT)
      // For income: debit=bank, credit=revenue (money IN)
      
      // More comprehensive expense detection
      const isExpense = (debitEntity.type === 'account' && 
                        (debitEntity.name.toLowerCase().includes('expense') || 
                         debitEntity.name.toLowerCase().includes('shop expense') ||
                         tx.debitAccountId === 'PURCHASE_EXPENSE')) ||
                       (creditEntity.type === 'account' && 
                        creditEntity.name.toLowerCase().includes('expense') &&
                        debitEntity.type !== 'account');
      
      const isIncome = creditEntity.type === 'account' && 
                      (creditEntity.name.toLowerCase().includes('revenue') || 
                       creditEntity.name.toLowerCase().includes('sales') ||
                       tx.creditAccountId === 'SALES_REVENUE');
      
      return {
        id: `tx-${tx.id}`,
        date: tx.date,
        createdAt: tx.createdAt || tx.date,
        description: tx.description || 'Account Transaction',
        debit: isExpense ? tx.amount : 0, // Expense = money OUT (should be positive)
        credit: isIncome ? tx.amount : 0, // Income = money IN (should be positive)
        balance: 0,
        accountName: isExpense ? creditEntity.name : (isIncome ? debitEntity.name : (creditEntity.type === 'account' ? creditEntity.name : debitEntity.name)),
        customerName: debitEntity.type === 'customer' ? debitEntity.name : (creditEntity.type === 'customer' ? creditEntity.name : null),
        supplierName: debitEntity.type === 'supplier' ? debitEntity.name : (creditEntity.type === 'supplier' ? creditEntity.name : null),
        type: 'account_transaction'
      };
    })
  ].sort((a, b) => {
    // Sort by date, newest first
    const dateA = new Date(a.createdAt || a.date).getTime();
    const dateB = new Date(b.createdAt || b.date).getTime();
    return dateB - dateA;
  });

  const filteredEntries = allTransactions.filter((entry: any) => {
    const matchesSearch = searchTerm.trim() === '' || 
      (entry.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.accountName?.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDate = true;
    if (startDate || endDate) {
      const entryDate = new Date(entry.date);
      if (startDate && entryDate < new Date(startDate)) matchesDate = false;
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (entryDate > endDateTime) matchesDate = false;
      }
    }
    return matchesSearch && matchesDate;
  });

  // Calculate global balance from ALL transactions (not filtered)
  const globalBalance = [...allTransactions]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return dateA - dateB; // Oldest first
    })
    .reduce((balance, entry) => {
      return balance + (entry.credit || 0) - (entry.debit || 0);
    }, 0);

  // Calculate running balance for filtered entries (for display in table)
  const entriesWithBalance = [...filteredEntries]
    .reverse() // Oldest first for calculation
    .reduce((acc, entry, index) => {
      const previousBalance = index === 0 ? 0 : acc[index - 1].runningBalance;
      const runningBalance = previousBalance + (entry.credit || 0) - (entry.debit || 0);
      acc.push({ ...entry, runningBalance });
      return acc;
    }, [] as any[])
    .reverse(); // Back to newest first for display

  const currentBalance = globalBalance;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 tracking-tight">Ledger Management</h2>
          <p className="text-xs text-gray-500 font-normal">Manage cash flow and business payments</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-blue-50 px-6 py-2 rounded-lg border border-blue-100 text-center">
            <p className="text-[10px] text-blue-400 uppercase font-semibold tracking-widest">Transactions</p>
            <p className="text-xl font-semibold text-blue-600">
              {filteredEntries.length}
            </p>
          </div>
          <div className="bg-gray-50 px-6 py-2 rounded-lg border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-widest">Global Balance</p>
            <p className={`text-xl font-semibold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              RS. {currentBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
        <button onClick={() => setActiveForm('customer_payment')} className="bg-green-600 text-white py-2.5 px-4 rounded-lg text-xs font-semibold hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
          <TrendingUp size={16}/> Customer Payment
        </button>
        <button onClick={() => setActiveForm('supplier_payment')} className="bg-blue-600 text-white py-2.5 px-4 rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
          <Truck size={16}/> Supplier Payment
        </button>
        <button onClick={() => setActiveForm('expense')} className="bg-red-600 text-white py-2.5 px-4 rounded-lg text-xs font-semibold hover:bg-red-700 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
          <Plus size={16}/> Shop Expense
        </button>
      </div>

      {activeForm && (
        <div className="bg-white p-5 rounded-xl border-2 border-blue-100 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
              <Plus size={16} className="text-blue-500" />
              {activeForm.replace('_', ' ')}
            </h3>
            <button onClick={closeForm} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeForm !== 'expense' && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Select {activeForm === 'customer_payment' ? 'Customer' : 'Supplier'}
                </label>
                <select 
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.personId}
                  onChange={(e) => setFormData({...formData, personId: e.target.value})}
                  required
                >
                  <option value="">Choose...</option>
                  {activeForm === 'customer_payment' 
                    ? (customers || []).map(c => <option key={c.id} value={c.id}>{c.name} (Bal: {c.balance})</option>)
                    : (suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name} (Bal: {s.balance})</option>)
                  }
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Deposit To / Pay From</label>
              <div className="flex flex-col gap-2">
                <select 
                  className="w-full p-2.5 border border-blue-200 bg-blue-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.bankAccountId}
                  onChange={(e) => setFormData({...formData, bankAccountId: e.target.value})}
                  required
                >
                  <option value="">Select Bank/Cash Account</option>
                  {liquidAccounts.length > 0 ? (
                    liquidAccounts.map(acc => {
                      const liveBalance = getLiveBalance(acc.id, 'account');
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Bal: RS. {Math.abs(liveBalance).toLocaleString()} {liveBalance < 0 ? '- NEGATIVE' : ''})
                        </option>
                      );
                    })
                  ) : (
                    <option value="" disabled>No bank/cash accounts available</option>
                  )}
                </select>
                {formData.bankAccountId && (
                  <div className="text-xs font-semibold text-blue-600 bg-blue-100 p-2 rounded">
                    Balance: RS. {Math.abs(getLiveBalance(formData.bankAccountId, 'account')).toLocaleString()} {getLiveBalance(formData.bankAccountId, 'account') < 0 ? '(NEGATIVE)' : ''}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Amount</label>
              <input 
                type="number" 
                placeholder="RS. 0"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold"
                value={formData.amount || ''}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
               <input 
                 type="date" 
                 value={formData.date} 
                 onChange={(e) => setFormData({...formData, date: e.target.value})} 
                 className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" 
               />
            </div>

            <div className="lg:col-span-3">
              <input 
                type="text" 
                placeholder="Note (e.g. Invoice #123 or Month Rent)" 
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <button 
              type="submit"
              className="bg-blue-600 text-white p-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
            >
              Update Balances
            </button>
          </form>
        </div>
      )}

      {/* Ledger Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50 text-gray-400 border-b border-gray-200">
              <tr className="text-[10px] font-semibold uppercase tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Out (-)</th>
                <th className="px-6 py-4 text-right">In (+)</th>
                <th className="px-6 py-4 text-right bg-blue-50/50">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entriesWithBalance.length > 0 ? (
                entriesWithBalance.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-gray-500">{entry.date}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{entry.description}</div>
                      <div className="text-[10px] font-bold uppercase">
                        {entry.customerName && <span className="text-green-600">CUST: {entry.customerName}</span>}
                        {entry.supplierName && <span className="text-blue-600">SUPP: {entry.supplierName}</span>}
                        {entry.accountName && <span className="text-red-600">ACCT: {entry.accountName}</span>}
                        {!entry.customerName && !entry.supplierName && !entry.accountName && <span className="text-gray-500">CASH</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-red-600 font-semibold">{entry.debit > 0 ? `-${entry.debit.toLocaleString()}` : '—'}</td>
                    <td className="px-6 py-4 text-right text-sm text-green-600 font-semibold">{entry.credit > 0 ? `+${entry.credit.toLocaleString()}` : '—'}</td>
                    <td className="px-6 py-4 text-right text-sm font-black bg-blue-50/10">
                      <span className={entry.runningBalance >= 0 ? 'text-gray-900' : 'text-red-600'}>
                        {entry.runningBalance.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LedgerManagement;