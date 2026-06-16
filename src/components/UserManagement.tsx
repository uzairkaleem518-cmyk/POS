import { useState, useEffect } from 'react';
import { userApi } from '../utils/api';
import { Plus, Edit2, Trash2, User, UserCheck, Users, Phone, Mail, Shield } from 'lucide-react';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isOwner?: boolean;
  createdAt?: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'salesman',
    phone: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await userApi.getAll();
      setUsers(result.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userApi.create(formData);
      setFormData({ email: '', password: '', name: '', role: 'salesman', phone: '' });
      setShowForm(false);
      await loadUsers();
      alert('User created successfully!');
    } catch (error: any) {
      alert(`Failed to create user: ${error.message}`);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userApi.delete(userId);
      await loadUsers();
    } catch (error: any) {
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await userApi.updateRole(userId, newRole);
      await loadUsers();
    } catch (error: any) {
      alert(`Failed to update role: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Team Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage shop members and permissions</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto flex justify-center items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Role Info - Scrollable on Mobile */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-green-600" />
          Role Permissions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="font-bold text-blue-900 text-xs uppercase tracking-wider">Admin</p>
            <p className="text-xs text-blue-700 mt-1">Full control & Team management</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="font-bold text-green-900 text-xs uppercase tracking-wider">Manager</p>
            <p className="text-xs text-green-700 mt-1">Stock, Sales & Ledger access</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
            <p className="font-bold text-yellow-900 text-xs uppercase tracking-wider">Salesman</p>
            <p className="text-xs text-yellow-700 mt-1">Daily sales & Customers only</p>
          </div>
        </div>
      </div>

      {/* Stats - Grid layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: users.length, color: 'bg-gray-50 text-gray-700' },
          { label: 'Admins', count: users.filter(u => u.isOwner).length, color: 'bg-purple-50 text-purple-700' },
          { label: 'Managers', count: users.filter(u => u.role === 'manager').length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Salesmen', count: users.filter(u => u.role === 'salesman').length, color: 'bg-green-50 text-green-700' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} p-4 rounded-2xl border border-white/50 shadow-sm`}>
            <p className="text-2xl font-black">{stat.count}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Add User Form - Responsive Grid */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-6 animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-gray-800 mb-5">Create New Member</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Login Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                  placeholder="Min 6 chars"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Assign Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                >
                  <option value="salesman">Salesman</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-md transition-all"
              >
                Create Member
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List - Table on Desktop, Cards on Mobile */}
      <div className="space-y-4">
        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${user.isOwner ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                        {user.isOwner ? <UserCheck size={20} /> : <User size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{user.name}</p>
                        {user.isOwner && <p className="text-[10px] font-bold text-purple-500 uppercase">Owner</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-400">{user.phone || 'No phone'}</p>
                  </td>
                  <td className="px-6 py-4">
                    {user.isOwner ? (
                      <span className="text-xs font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase">Admin</span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-xs font-bold border-gray-200 rounded-lg focus:ring-green-500"
                      >
                        <option value="manager">Manager</option>
                        <option value="salesman">Salesman</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!user.isOwner && (
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {users.map((user) => (
            <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${user.isOwner ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                    {user.isOwner ? <UserCheck size={24} /> : <User size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{user.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {user.isOwner ? 'Shop Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </p>
                  </div>
                </div>
                {!user.isOwner && (
                  <button onClick={() => handleDelete(user.id)} className="p-2 text-red-500 bg-red-50 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="space-y-2 border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    {user.phone}
                  </div>
                )}
              </div>

              {!user.isOwner && (
                <div className="pt-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Change Role</label>
                   <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl font-bold text-sm py-2"
                  >
                    <option value="manager">Manager</option>
                    <option value="salesman">Salesman</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}