import { useState } from 'react';
import { X, Info } from 'lucide-react';

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">Welcome to Fertilizer Shop POS - Multi-Tenant SaaS</h3>
          <p className="text-sm text-blue-800 mb-2">
            Each shop owner has their own isolated account with complete data privacy. Your inventory, customers, sales, and ledger are completely separate from other shops.
          </p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>POS:</strong> Process sales with cash or credit payment options</li>
            <li>• <strong>Inventory:</strong> Track product stock with low stock alerts</li>
            <li>• <strong>Ledger:</strong> Complete financial tracking with income/expense management</li>
            <li>• <strong>Customers:</strong> Manage customer accounts and track outstanding balances</li>
          </ul>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-600 hover:text-blue-800 flex-shrink-0"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
