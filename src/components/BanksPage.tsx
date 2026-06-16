import { useState, useMemo } from "react";
import { useApp } from "./AppContext";
import {
  Plus,
  Edit2,
  Trash2,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  RefreshCw
} from "lucide-react";

const toNum = (v: any) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(String(v).replace(/[^0-9.-]+/g, "")) || 0;
};

export default function BanksPage() {
  const {
    accounts = [],
    accountTransactions = [],
    addBank,
    updateBank,
    deleteBank,
    addAccountTransaction,
    loading,
    refreshData
  } = useApp();

  // ✅ EXACT SAME LOGIC AS AccountHistoryView
  const banks = useMemo(() => {
    return accounts
      .filter((a: any) => a?.type === "bank" || a?.type === "cash")
      .map(bank => {
        let balance = 0; // 🔥 START FROM ZERO

        accountTransactions.forEach(tx => {
          if (tx.debitAccountId === bank.id) {
            balance += toNum(tx.amount);
          }
          if (tx.creditAccountId === bank.id) {
            balance -= toNum(tx.amount);
          }
        });

        return {
          ...bank,
          calculatedBalance: balance
        };
      });
  }, [accounts, accountTransactions]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransactionType] =
    useState<"deposit" | "withdraw">("deposit");
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [amount, setAmount] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    accountNumber: "",
    balance: "0" // informational only
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", accountNumber: "", balance: "0" });
    setEditingId(null);
    setShowForm(false);
  };

  // ⚠️ DO NOT CREATE TRANSACTION FOR OPENING BALANCE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const desc = formData.accountNumber
      ? `${formData.description} | AC: ${formData.accountNumber}`
      : formData.description;

    if (editingId) {
      await updateBank(editingId, {
        name: formData.name,
        description: desc
      });
    } else {
      await addBank({
        name: formData.name,
        description: desc,
        type: "bank",
        balance: 0 // ignored forever
      });
    }

    resetForm();
  };

  const openModal = (bank: any, type: "deposit" | "withdraw") => {
    setSelectedBank(bank);
    setTransactionType(type);
    setSourceAccountId("");
    setAmount("");
    setShowModal(true);
  };

  const submitTransfer = async () => {
    if (!selectedBank || !sourceAccountId) {
      alert("Select source account");
      return;
    }

    const amt = toNum(amount);
    if (amt <= 0) {
      alert("Invalid amount");
      return;
    }

    const source = banks.find(b => b.id === sourceAccountId);
    if (!source) return;

    if (transactionType === "deposit" && source.calculatedBalance < amt) {
      alert("Insufficient source balance");
      return;
    }

    if (transactionType === "withdraw" && selectedBank.calculatedBalance < amt) {
      alert("Insufficient bank balance");
      return;
    }

    await addAccountTransaction({
      debitAccountId:
        transactionType === "deposit" ? selectedBank.id : source.id,
      creditAccountId:
        transactionType === "deposit" ? source.id : selectedBank.id,
      amount: amt,
      date: new Date().toISOString().split("T")[0],
      description: "Bank transfer"
    });

    await refreshData?.();
    setShowModal(false);
  };

  if (loading) {
    return <div className="p-20 text-center">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black italic uppercase">
          Financial Accounts
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black"
        >
          {showForm ? "Cancel" : "Add Bank"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {banks.map(bank => (
          <div key={bank.id} className="bg-white p-6 rounded-3xl shadow">
            <div className="flex items-center gap-3 mb-4">
              <Landmark />
              <h3 className="font-black">{bank.name}</h3>
            </div>

            <p className="text-3xl font-black">
              RS. {bank.calculatedBalance.toLocaleString()}
            </p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => openModal(bank, "deposit")}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl"
              >
                IN
              </button>
              <button
                onClick={() => openModal(bank, "withdraw")}
                className="flex-1 bg-rose-500 text-white py-3 rounded-xl"
              >
                OUT
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md">
            <h3 className="font-black mb-4 flex items-center gap-2">
              <RefreshCw /> Transfer
            </h3>

            <select
              value={sourceAccountId}
              onChange={e => setSourceAccountId(e.target.value)}
              className="w-full border p-3 rounded mb-4"
            >
              <option value="">Select Account</option>
              {banks
                .filter(b => b.id !== selectedBank.id)
                .map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} (RS {b.calculatedBalance})
                  </option>
                ))}
            </select>

            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border p-3 rounded mb-4"
              placeholder="Amount"
            />

            <div className="flex gap-3">
              <button
                onClick={submitTransfer}
                className="flex-1 bg-blue-600 text-white py-3 rounded"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
