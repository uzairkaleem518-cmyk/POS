import { useState } from 'react';
import { useApp } from './AppContext';
import { Trash2, Edit2, User, Phone, DollarSign, MapPin, Plus } from 'lucide-react';

export function SupplierManagement() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
      } else {
        await addSupplier(formData);
      }
      setShowForm(false);
      setEditingSupplier(null);
      setFormData({ name: '', contact: '', phone: '', address: '' });
    } catch (error: any) {
      alert(error.message || 'Failed to save supplier');
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      address: supplier.address,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteSupplier(id);
      } catch (error: any) {
        alert(error.message || 'Failed to delete supplier');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Supplier Management</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage your procurement and payables</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingSupplier(null);
            setFormData({ name: '', contact: '', phone: '', address: '' });
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm font-semibold text-sm"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {/* Add/Edit Form - Responsive Grid */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 transition-all">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            {editingSupplier ? 'Modify Supplier Details' : 'Register New Supplier'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Supplier Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="ABC Fertilizers"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Manager Name"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="0300-1234567"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Business Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Warehouse Location"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 shadow-sm"
              >
                {editingSupplier ? 'Update' : 'Save'} Supplier
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSupplier(null);
                }}
                className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-gray-600 rounded text-sm font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suppliers Table with Horizontal Scroll */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Supplier Info</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Person</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Balance Due</th>
                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center text-gray-400">
                      <User size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-medium">No suppliers registered in the system</p>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded hidden sm:block">
                          <User className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{supplier.name}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <MapPin size={10} /> {supplier.address || 'No address'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600">
                      {supplier.contact}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <Phone size={12} className="text-gray-400" />
                        {supplier.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${supplier.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          RS.{supplier.balance.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Swipe Indicator */}
        <div className="sm:hidden bg-gray-50 px-4 py-2 border-t border-gray-100 text-center">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Swipe for more info</p>
        </div>
      </div>
    </div>
  );
}