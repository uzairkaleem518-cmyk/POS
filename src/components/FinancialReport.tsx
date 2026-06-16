import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "./AppContext";
import { Search, ArrowRightLeft, CreditCard, User, Truck, Printer } from "lucide-react";

interface EntityListItem {
  id: string;
  name: string;
  type: "customer" | "supplier" | "account";
  currentBal: number;
}

const toNum = (v: any) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.-]+/g, "");
  return Number(cleaned) || 0;
};

export function AccountHistoryView() {
  const {
    customers = [],
    suppliers = [],
    accounts = [],
    accountTransactions = [],
    sales = [],
    purchases = [],
    addAccount,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<EntityListItem | null>(null);
  const expenseAccountCreatedRef = useRef(false);
  const cashAccountCreatedRef = useRef(false);

  // Auto-create Shop Expense account if it doesn't exist
  useEffect(() => {
    if (expenseAccountCreatedRef.current || !addAccount) return;
    
    const hasExpense = accounts.some(acc => acc.type === 'expense' && acc.name.toLowerCase() === 'shop expense');
    if (!hasExpense) {
      expenseAccountCreatedRef.current = true;
      addAccount({
        name: 'Shop Expense',
        type: 'expense',
        category: 'Expenses',
        balance: 0,
        description: 'Default expense account for shop operations'
      }).catch(() => {
        expenseAccountCreatedRef.current = false; // Reset on error to retry
      });
    } else {
      expenseAccountCreatedRef.current = true;
    }
  }, [accounts.length, addAccount]);

  // Auto-create Cash account if it doesn't exist
  useEffect(() => {
    if (cashAccountCreatedRef.current || !addAccount) return;
    
    const hasCash = accounts.some(acc => acc.type === 'cash' && acc.name.toLowerCase() === 'cash');
    if (!hasCash) {
      cashAccountCreatedRef.current = true;
      addAccount({
        name: 'Cash',
        type: 'cash',
        category: 'Assets',
        balance: 0,
        description: 'Default cash account for POS sales'
      }).catch(() => {
        cashAccountCreatedRef.current = false; // Reset on error to retry
      });
    } else {
      cashAccountCreatedRef.current = true;
    }
  }, [accounts.length, addAccount]);

  const handlePrint = () => {
    window.print();
  };

  // Helper function to calculate live balance for accounts based on transactions ONLY
  // The base balance should be 0 if all transactions are properly tracked
  const getAccountLiveBalance = (accountId: string) => {
    let balance = 0; // Start from 0, only count transactions
    accountTransactions.forEach(tx => {
      if (tx.debitAccountId === accountId) {
        balance += toNum(tx.amount);
      }
      if (tx.creditAccountId === accountId) {
        balance -= toNum(tx.amount);
      }
    });
    return balance;
  };

  const allEntities = useMemo(() => {
    const list: EntityListItem[] = [
      ...customers.map((c) => ({ id: c.id, name: c.name || "Unnamed Customer", type: "customer" as const, currentBal: toNum(c.balance) })),
      ...suppliers.map((s) => ({ id: s.id, name: s.name || "Unnamed Supplier", type: "supplier" as const, currentBal: toNum(s.balance) })),
      ...accounts.map((a) => ({ id: a.id, name: a.name || "Unnamed Account", type: "account" as const, currentBal: getAccountLiveBalance(a.id) })),
    ];
    const term = searchTerm.toLowerCase().trim();
    return term ? list.filter((item) => item.name.toLowerCase().includes(term)) : list;
  }, [customers, suppliers, accounts, accountTransactions, searchTerm]);

  const { ledger, currentBalance } = useMemo(() => {
    if (!selectedEntity) return { ledger: [] };

    const targetId = selectedEntity.id;
    const txns: any[] = [];

    // --- 1. CORE DOUBLE-ENTRY LOGIC (The Fix) ---
    // We check EVERY transaction. If our selected entity is on either side (Debit or Credit), we show it.
    accountTransactions.forEach(at => {
      // Helper function to get entity name (bank, customer, or supplier)
      const getEntityName = (refId: string) => {
        const account = accounts.find(a => a.id === refId);
        if (account) return account.name;
        const customer = customers.find(c => c.id === refId);
        if (customer) return customer.name;
        const supplier = suppliers.find(s => s.id === refId);
        if (supplier) return supplier.name;
        return null;
      };

      // Case 1: Transaction involves the selected entity as a debit or credit account
      if (at.debitAccountId === targetId) {
        let desc = at.description || "Payment Received";
        // If this is a customer payment (creditAccountId is CUSTOMER_LEDGER), show customer name
        if (at.creditAccountId === 'CUSTOMER_LEDGER' && at.reference) {
          const entityName = getEntityName(at.reference);
          if (entityName) {
            desc = `Payment received from ${entityName}`;
          }
        }
        // If this is a supplier payment (debitAccountId is SUPPLIER_LEDGER), show supplier name
        else if (at.debitAccountId === 'SUPPLIER_LEDGER' && at.reference) {
          const entityName = getEntityName(at.reference);
          if (entityName) {
            desc = `Payment to ${entityName}`;
          }
        }
        txns.push({
          id: at.id,
          date: at.date,
          createdAt: at.createdAt || at.date,
          desc: desc,
          debit: toNum(at.amount),
          credit: 0,
          ref: at.reference || "TXN"
        });
      } else if (at.creditAccountId === targetId) {
        let desc = at.description || "Payment Given/Settled";
        // If this is a customer payment (creditAccountId is CUSTOMER_LEDGER), show customer name
        if (at.creditAccountId === 'CUSTOMER_LEDGER' && at.reference) {
          const entityName = getEntityName(at.reference);
          if (entityName) {
            desc = `Payment received from ${entityName}`;
          }
        }
        // If this is a supplier payment (debitAccountId is SUPPLIER_LEDGER), show supplier name
        else if (at.debitAccountId === 'SUPPLIER_LEDGER' && at.reference) {
          const entityName = getEntityName(at.reference);
          if (entityName) {
            desc = `Payment to ${entityName}`;
          }
        }
        txns.push({
          id: at.id,
          date: at.date,
          createdAt: at.createdAt || at.date,
          desc: desc,
          debit: 0,
          credit: toNum(at.amount),
          ref: at.reference || "TXN"
        });
      }
      // Case 2: Selected entity is a customer/supplier referenced in a CUSTOMER_LEDGER or SUPPLIER_LEDGER transaction
      else if ((at.creditAccountId === 'CUSTOMER_LEDGER' || at.debitAccountId === 'SUPPLIER_LEDGER') && at.reference === targetId) {
        const bankName = getEntityName(at.debitAccountId === 'CUSTOMER_LEDGER' ? at.debitAccountId : (at.debitAccountId !== 'SUPPLIER_LEDGER' ? at.debitAccountId : at.creditAccountId));
        const bankAccountId = at.debitAccountId === 'CUSTOMER_LEDGER' ? at.debitAccountId : (at.debitAccountId !== 'SUPPLIER_LEDGER' ? at.debitAccountId : at.creditAccountId);
        
        // For customer: customer payment to bank should be a credit (payment out)
        if (at.creditAccountId === 'CUSTOMER_LEDGER') {
          const bankAcct = accounts.find(a => a.id === at.debitAccountId);
          const bankName = bankAcct ? bankAcct.name : "Unknown Bank";
          txns.push({
            id: at.id,
            date: at.date,
            createdAt: at.createdAt || at.date,
            desc: `Payment to ${bankName}`,
            debit: 0,
            credit: toNum(at.amount),
            ref: at.debitAccountId
          });
        }
        // For supplier: payment from bank should be a debit (payment out of pocket)
        else if (at.debitAccountId === 'SUPPLIER_LEDGER') {
          const bankAcct = accounts.find(a => a.id === at.creditAccountId);
          const bankName = bankAcct ? bankAcct.name : "Unknown Bank";
          txns.push({
            id: at.id,
            date: at.date,
            createdAt: at.createdAt || at.date,
            desc: `Payment from ${bankName}`,
            debit: toNum(at.amount),
            credit: 0,
            ref: at.creditAccountId
          });
        }
      }
    });

    // --- 2. SALES MODULE DATA ---
    if (selectedEntity.type === "customer") {
      sales.filter(s => s.customerId === targetId).forEach(s => {
        txns.push({ id: `sale-${s.id}`, date: s.date, createdAt: s.date, desc: `Sales Invoice #${String(s.id).slice(-4)}`, debit: toNum(s.total), credit: 0, ref: "INV" });
        // Only add direct cash payments recorded in the sale here
        if (toNum(s.amountPaid) > 0) {
          txns.push({ id: `sale-pay-${s.id}`, date: s.date, createdAt: s.date, desc: `Direct Payment`, debit: 0, credit: toNum(s.amountPaid), ref: "RCPT" });
        }
      });
    }

    // --- 3. PURCHASES MODULE DATA ---
    if (selectedEntity.type === "supplier") {
      purchases.filter(p => p.supplierId === targetId).forEach(p => {
        txns.push({ id: `pur-${p.id}`, date: p.date, createdAt: p.date, desc: `Purchase Bill #${String(p.id).slice(-4)}`, debit: 0, credit: toNum(p.total), ref: "BILL" });
        if (toNum(p.amountPaid) > 0) {
          txns.push({ id: `pur-pay-${p.id}`, date: p.date, createdAt: p.date, desc: `Direct Payment`, debit: toNum(p.amountPaid), credit: 0, ref: "PAY" });
        }
      });
    }

    // --- 4. CALCULATION & REVERSE ---
    // First, sort chronologically by createdAt (oldest first) to establish true sequence
    const chronoSorted = txns.sort((a, b) => {
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      return createdA - createdB; // Ascending (oldest first)
    });

    // Calculate balance from oldest to newest
    // Start from 0 - all transactions should be in the system
    let rolling = 0;
    
    const ledgerWithBalance = chronoSorted.map((t) => {
      if (selectedEntity.type === "supplier") {
        rolling += (t.credit - t.debit);
      } else {
        // For Banks AND Customers, Debit increases and Credit decreases
        rolling += (t.debit - t.credit);
      }
      return { ...t, runningBalance: rolling };
    });

    // Reverse for display (newest first)
    const reversed = ledgerWithBalance.reverse();
    const currentBalance = reversed.length > 0 ? reversed[0].runningBalance : 0;
    
    return { ledger: reversed, currentBalance };
  }, [selectedEntity, accountTransactions, sales, purchases]);

  return (
    <>
      <style>{`
        @media print {
          .print-sidebar {
            display: none !important;
          }
          .print-content {
            width: 100% !important;
            max-width: 100% !important;
          }
          body {
            background: white !important;
          }
          .p-6 {
            padding: 0.5rem !important;
          }
          table {
            font-size: 12px !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex flex-col lg:flex-row gap-6 p-6 bg-slate-50 h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="print-sidebar lg:w-1/4 shrink-0 bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search ledgers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {allEntities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => setSelectedEntity(entity)}
              className={`w-full p-4 flex flex-col gap-1 border-b text-left transition-colors ${
                selectedEntity?.id === entity.id ? "bg-blue-600 text-white" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm truncate w-32">{entity.name}</span>
                <span className="text-[10px] font-black uppercase opacity-60">{entity.type}</span>
              </div>
              <span className={`text-xs font-black ${selectedEntity?.id === entity.id ? "text-blue-100" : "text-slate-600"}`}>
                RS. {toNum(selectedEntity?.id === entity.id ? currentBalance : entity.currentBal).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Content */}
      <div className="print-content lg:w-3/4 flex-1 bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        {selectedEntity ? (
          <>
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  {selectedEntity.type === 'customer' ? <User size={24} /> : selectedEntity.type === 'supplier' ? <Truck size={24} /> : <CreditCard size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-none">{selectedEntity.name}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">General Ledger History</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrint}
                  className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  title="Print ledger"
                >
                  <Printer size={20} />
                  <span className="text-sm font-bold hidden sm:inline">Print</span>
                </button>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Balance</p>
                  <p className="text-2xl font-black text-blue-600">RS. {toNum(currentBalance || selectedEntity.currentBal).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full">
                  <thead className="bg-slate-50 border-b sticky top-0 z-20">
                    <tr className="text-[10px] font-black text-slate-500 uppercase">
                      <th className="px-6 py-4 text-left">Date</th>
                      <th className="px-6 py-4 text-left">Description</th>
                      <th className="px-6 py-4 text-right">Debit (In/+)</th>
                      <th className="px-6 py-4 text-right">Credit (Out/-)</th>
                      <th className="px-6 py-4 text-right bg-blue-50/50">Running Bal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.map((row) => {
                      // Determine the ref badge text
                      let refText = row.ref;
                      let refColor = "bg-slate-100 text-slate-500";
                      
                      if (row.ref && row.ref !== "TXN") {
                        const customer = customers.find(c => c.id === row.ref);
                        const supplier = suppliers.find(s => s.id === row.ref);
                        
                        if (customer) {
                          refText = `CUST: ${customer.name}`;
                          refColor = "bg-green-100 text-green-700";
                        } else if (supplier) {
                          refText = `SUPP: ${supplier.name}`;
                          refColor = "bg-blue-100 text-blue-700";
                        }
                      }
                      
                      return (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{row.desc}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${refColor}`}>{refText}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">
                          {row.debit > 0 ? row.debit.toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-rose-600">
                          {row.credit > 0 ? row.credit.toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-black text-slate-900 bg-blue-50/10">
                          {row.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <ArrowRightLeft size={48} className="opacity-10 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest opacity-30">Select a ledger to view details</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}