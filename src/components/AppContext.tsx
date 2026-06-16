import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { 
  productsAPI, customerApi, salesApi, ledgerApi, authApi, 
  suppliersApi, purchasesApi, accountsAPI, accountTransactionsAPI, 
  trialBalanceAPI, banksApi 
} from "../utils/api";

// --- Interfaces ---
export interface Product { id: string; name: string; category: string; unit: string; price: number; stock: number; minStock: number; }
export interface Supplier { id: string; name: string; contact: string; phone: string; address: string; balance: number; createdAt: string; }
export interface Customer { id: string; name: string; phone: string; address: string; balance: number; }
export interface Account { id: string; name: string; type: "bank" | "receivable" | "payable" | "cash" | "expense" | "other"; category: "Assets" | "Liabilities" | "Expenses" | "Equity"; balance: number; description?: string; createdAt: string; }
export interface AccountTransaction { id: string; date: string; description: string; debitAccountId: string; creditAccountId: string; amount: number; reference?: string; createdAt: string; createdBy: string; }
export interface Sale { id: string; date: string; customerId: string; customerName: string; items: any[]; subtotal: number; discount: number; total: number; paymentMethod: "cash" | "credit"; amountPaid: number; balance: number; soldBy?: string; }
export interface Purchase { id: string; supplierId: string; supplierName: string; items: any[]; subtotal: number; discount: number; total: number; paymentMethod: "cash" | "credit"; amountPaid: number; balance: number; date: string; }
export interface LedgerEntry { id: string; date: string; type: string; description: string; debit: number; credit: number; balance: number; customerName?: string; supplierName?: string; accountName?: string; }
export interface Shop { id: string; shopName: string; ownerName: string; email: string; phone: string; address: string; role?: string; createdAt: string; }

interface AppContextType {
  shop: Shop | null; userName: string; userEmail: string; products: Product[]; customers: Customer[]; sales: Sale[]; ledgerEntries: LedgerEntry[]; suppliers: Supplier[]; purchases: Purchase[]; accounts: Account[]; accountTransactions: AccountTransaction[]; loading: boolean;
  getLiveBalance: (entityId: string, type: 'customer' | 'supplier' | 'account') => number;
  addProduct: (p: any) => Promise<void>; updateProduct: (id: string, p: any) => Promise<void>; deleteProduct: (id: string) => Promise<void>; addCustomer: (c: any) => Promise<void>; updateCustomer: (id: string, c: any) => Promise<void>; deleteCustomer: (id: string) => Promise<void>; addSale: (s: any) => Promise<void>; addLedgerEntry: (e: any) => Promise<void>; addPayment: (cId: string, amt: number, desc: string) => Promise<void>; addSupplier: (s: any) => Promise<void>; updateSupplier: (id: string, s: any) => Promise<void>; deleteSupplier: (id: string) => Promise<void>; addPurchase: (p: any) => Promise<void>; addSupplierPayment: (sId: string, amt: number, desc: string) => Promise<void>; addAccount: (a: any) => Promise<void>; updateAccount: (id: string, u: any) => Promise<void>; deleteAccount: (id: string) => Promise<void>; addAccountTransaction: (t: any) => Promise<void>; deleteAccountTransaction: (id: string) => Promise<void>; addBank: (bank: any) => Promise<any>; updateBank: (id: string, updates: any) => Promise<any>; deleteBank: (id: string) => Promise<void>; depositToBank: (bankId: string, amount: number, description?: string) => Promise<void>; withdrawFromBank: (bankId: string, amount: number, description?: string) => Promise<void>; getTrialBalance: () => Promise<any>; refreshData: () => Promise<void>; signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const toNum = (v: any) => (v == null ? 0 : typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]+/g, "")) || 0);

export function AppProvider({ children, initialShop, userName, userEmail, onSignOut }: { children: ReactNode; initialShop: Shop | null; userName: string; userEmail: string; onSignOut: () => void }) {
  const [shop] = useState<Shop | null>(initialShop);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        productsAPI.getAll(), customerApi.getAll(), salesApi.getAll(), ledgerApi.getAll(), 
        suppliersApi.getAll(), purchasesApi.getAll(), accountsAPI.getAll(), banksApi.getAll(), 
        accountTransactionsAPI.getAll(),
      ]);
      const getData = (index: number, key: string) => {
        const res = results[index];
        if (res && res.status === "fulfilled" && res.value) {
          const val = res.value;
          return val[key] || (val.data && val.data[key]) || (Array.isArray(val) ? val : []);
        }
        return [];
      };

      const fetchedAccounts = getData(6, 'accounts');
      const fetchedBanksRaw = results[7] && results[7].status === 'fulfilled' ? results[7].value : [];
      const fetchedBanks = Array.isArray(fetchedBanksRaw) ? fetchedBanksRaw : (fetchedBanksRaw?.banks || fetchedBanksRaw?.data?.banks || []);
      const accountsMap = new Map<string, Account>();
      (Array.isArray(fetchedAccounts) ? fetchedAccounts : []).forEach((a: any) => { if (a?.id) accountsMap.set(a.id, a); });
      (Array.isArray(fetchedBanks) ? fetchedBanks : []).forEach((b: any) => { if (b?.id) accountsMap.set(b.id, { ...b, type: 'bank', category: 'Assets' }); });

      setProducts(getData(0, 'products'));
      setCustomers(getData(1, 'customers'));
      setSales(getData(2, 'sales'));
      setLedgerEntries(getData(3, 'ledger'));
      setSuppliers(getData(4, 'suppliers'));
      setPurchases(getData(5, 'purchases'));
      setAccounts(Array.from(accountsMap.values()));
      setAccountTransactions(getData(8, 'transactions'));
    } catch (error) { console.error("Sync Error:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // THE CHAIN FIX: This function now rebuilds the balance from 0 using all sources
  const getLiveBalance = useCallback((entityId: string, type: 'customer' | 'supplier' | 'account') => {
    let rolling = 0;
    // 1. Transactions
    accountTransactions.forEach(at => {
      if (at.debitAccountId === entityId) rolling += toNum(at.amount);
      if (at.creditAccountId === entityId) rolling -= toNum(at.amount);
    });
    // 2. Sales
    if (type === 'customer') {
      sales.filter(s => s.customerId === entityId).forEach(s => {
        rolling += toNum(s.total);
        rolling -= toNum(s.amountPaid);
      });
    }
    // 3. Purchases
    if (type === 'supplier') {
      purchases.filter(p => p.supplierId === entityId).forEach(p => {
        rolling += toNum(p.total);
        rolling -= toNum(p.amountPaid);
      });
    }
    // Final logic adjustment for suppliers (Credit balance is positive debt)
    return type === 'supplier' ? (rolling * -1) : rolling;
  }, [accountTransactions, sales, purchases]);

  const refreshData = async () => await loadData();
  const addBank = async (bank: any) => { const res = await banksApi.create({ ...bank, type: "bank", category: "Assets" }); await refreshData(); return res; };
  const updateBank = async (id: string, updates: any) => { const res = await banksApi.update(id, updates); await refreshData(); return res; };
  const deleteBank = async (id: string) => { await banksApi.delete(id); await refreshData(); };
  const depositToBank = async (id: string, amt: number, desc?: string) => { await banksApi.deposit(id, amt, desc); await refreshData(); };
  const withdrawFromBank = async (id: string, amt: number, desc?: string) => { await banksApi.withdraw(id, amt, desc); await refreshData(); };
  const addAccountTransaction = async (t: any) => { await accountTransactionsAPI.create(t); await refreshData(); };
  const addAccount = async (a: any) => { await accountsAPI.create(a); await refreshData(); };
  const updateAccount = async (id: string, u: any) => { await accountsAPI.update(id, u); await refreshData(); };
  const deleteAccount = async (id: string) => { await accountsAPI.delete(id); await refreshData(); };
  const deleteAccountTransaction = async (id: string) => { await accountTransactionsAPI.delete(id); await refreshData(); };
  const getTrialBalance = async () => await trialBalanceAPI.get();
  const addPayment = async (cId: string, amt: number, desc: string) => { await ledgerApi.paymentMethod(cId, amt, desc); await refreshData(); };
  const addSupplierPayment = async (sId: string, amt: number, desc: string) => { await ledgerApi.supplierPayment(sId, amt, desc); await refreshData(); };
  const addProduct = async (p: any) => { await productsAPI.create(p); await refreshData(); };
  const updateProduct = async (id: string, p: any) => { await productsAPI.update(id, p); await refreshData(); };
  const deleteProduct = async (id: string) => { await productsAPI.delete(id); await refreshData(); };
  const addCustomer = async (c: any) => { await customerApi.create(c); await refreshData(); };
  const updateCustomer = async (id: string, c: any) => { await customerApi.update(id, c); await refreshData(); };
  const deleteCustomer = async (id: string) => { await customerApi.delete(id); await refreshData(); };
  const addSupplier = async (s: any) => { await suppliersApi.create(s); await refreshData(); };
  const updateSupplier = async (id: string, s: any) => { await suppliersApi.update(id, s); await refreshData(); };
  const deleteSupplier = async (id: string) => { await suppliersApi.delete(id); await refreshData(); };
  const addSale = async (s: any) => { await salesApi.create({ ...s, soldBy: userName }); await refreshData(); };
  const addPurchase = async (p: any) => { await purchasesApi.create(p); await refreshData(); };
  const signOut = async () => { try { await authApi.signout(); onSignOut(); } catch (e) { onSignOut(); } };

  return (
    <AppContext.Provider value={{
      shop, userName, userEmail, products, customers, sales, ledgerEntries, suppliers, purchases, accounts, accountTransactions, loading, getLiveBalance,
      addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer, addSale,
      addLedgerEntry: async (e: any) => { await ledgerApi.addEntry(e); await refreshData(); },
      addPayment, addSupplier, updateSupplier, deleteSupplier, addPurchase, addSupplierPayment, addAccount, updateAccount, deleteAccount, addAccountTransaction, deleteAccountTransaction, addBank, updateBank, deleteBank, depositToBank, withdrawFromBank, getTrialBalance, refreshData, signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};