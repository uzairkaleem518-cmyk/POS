import { useState } from 'react';
import { useApp, Customer } from './AppContext';
import { Plus, Edit2, Trash2, User, Phone, MapPin } from 'lucide-react';

export function CustomerManagement() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCustomer(editingId, formData);
        setEditingId(null);
      } else {
        await addCustomer(formData);
      }
      setFormData({ name: '', phone: '', address: '' });
      setShowForm(false);
    } catch (error) {
      alert('Failed to save customer. Please try again.');
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
      } catch (error) {
        alert('Failed to delete customer. Please try again.');
      }
    }
  };

  const totalReceivables = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Customer Management</h2>
          <p className="text-gray-600 mt-1">Total Receivables: RS.{totalReceivables.toFixed(2)}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', phone: '', address: '' });
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          Add Customer
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editingId ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {editingId ? 'Update' : 'Add'} Customer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <User className="text-green-600" size={24} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(customer)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-800 text-lg mb-3">{customer.name}</h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{customer.address}</span>
              </div>
            </div>

            <div className={`p-3 rounded ${
              customer.balance > 0 ? 'bg-orange-50' : 'bg-green-50'
            }`}>
              <p className="text-xs text-gray-600 mb-1">Outstanding Balance</p>
              <p className={`font-bold text-lg ${
                customer.balance > 0 ? 'text-orange-700' : 'text-green-700'
              }`}>
                RS.{customer.balance.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <User className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">No customers yet. Add your first customer to get started.</p>
        </div>
      )}
    </div>
  );
}