import { useState } from 'react';
import { useApp, Product } from './AppContext';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';

export function InventoryManagement() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    category: '',
    unit: 'kg',
    price: 0,
    stock: 0,
    minStock: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProduct(editingId, formData);
        setEditingId(null);
      } else {
        await addProduct(formData);
      }
      setFormData({ name: '', category: '', unit: 'kg', price: 0, stock: 0, minStock: 0 });
      setShowForm(false);
    } catch (error) {
      alert('Failed to save product. Please try again.');
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  return (
    <div className="space-y-6">
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Inventory Management</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Value: RS.{totalValue.toLocaleString()}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', category: '', unit: 'kg', price: 0, stock: 0, minStock: 0 });
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-wider">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h3>
          {/* Responsive Grid: 1 col on mobile, 2 cols on desktop */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Product Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="ltr">Liter (ltr)</option>
                <option value="bag">Bag</option>
                <option value="pcs">Pieces</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Price (RS.)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Current Stock</label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Min Stock Alert</label>
              <input
                type="number"
                required
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="order-2 sm:order-1 px-4 py-2 border border-gray-200 rounded text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="order-1 sm:order-2 px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 shadow-sm"
              >
                {editingId ? 'Update' : 'Add'} Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOBILE RESPONSIVE TABLE WRAPPER */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2 rounded hidden sm:block">
                        <Package className="text-green-600" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">{product.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-800">RS.{product.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">
                    {product.stock} <span className="text-[10px] text-gray-400">{product.unit}</span>
                  </td>
                  <td className="px-6 py-4">
                    {product.stock <= product.minStock ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-red-50 text-red-600 rounded-full border border-red-100 uppercase">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-green-50 text-green-600 rounded-full border border-green-100 uppercase">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-800">
                    RS.{(product.price * product.stock).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Swipe Hint for Mobile Users */}
        <div className="sm:hidden bg-gray-50 px-4 py-2 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-medium">Swipe left/right to view full table</p>
        </div>
      </div>
    </div>
  );
}