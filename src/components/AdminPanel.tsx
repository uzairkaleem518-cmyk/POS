import { useState, useEffect } from 'react';
import { adminApi } from '../utils/api';
import { Shield, Clock, CheckCircle, XCircle, Store, Calendar, AlertCircle, Eye, Ban, CheckSquare, RefreshCw } from 'lucide-react';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [approvedShops, setApprovedShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadPendingRequests(), loadApprovedShops()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const result = await adminApi.getPendingApprovals();
      setPendingRequests(result.pendingRequests || []);
    } catch (error: any) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const loadApprovedShops = async () => {
    try {
      const result = await adminApi.getApprovedShops();
      setApprovedShops(result.approvedShops || []);
    } catch (error: any) {
      console.error('Failed to load approved shops:', error);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!confirm('Have you received the payment confirmation?')) return;

    setProcessingId(userId);
    try {
      await adminApi.approveShop(userId, true);
      alert('Shop approved successfully! The owner can now sign in.');
      await loadData();
    } catch (error: any) {
      alert(`Failed to approve: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessingId(userId);
    try {
      await adminApi.rejectShop(userId, reason);
      alert('Shop registration rejected.');
      await loadData();
    } catch (error: any) {
      alert(`Failed to reject: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleStatus = async (shop: any) => {
    const newStatus = shop.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'reactivate' : 'suspend';
    
    if (!confirm(`Are you sure you want to ${action} "${shop.shopName}"?`)) return;

    setProcessingId(shop.id);
    try {
      await adminApi.updateShopStatus(shop.id, newStatus);
      alert(`Shop ${action}d successfully!`);
      await loadApprovedShops();
      setShowStatusModal(false);
    } catch (error: any) {
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExtendSubscription = async (shop: any) => {
  const days = prompt('Enter number of days to extend (1-365):', '1');
  if (!days || isNaN(Number(days)) || Number(days) < 1) return;

  setProcessingId(shop.id);
  try {
    await adminApi.extendSubscription(shop.id, Number(days)); // backend should expect days now
    alert(`Subscription extended by ${days} day(s)!`);
    await loadApprovedShops();
    setShowStatusModal(false);
  } catch (error: any) {
    alert(`Failed to extend subscription: ${error.message}`);
  } finally {
    setProcessingId(null);
  }
};


  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    
    const icons = {
      active: <CheckCircle size={14} />,
      inactive: <Ban size={14} />,
      pending: <Clock size={14} />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSubscriptionStatus = (shop: any) => {
    if (!shop.subscriptionEndDate) return { text: 'No subscription', color: 'text-gray-500' };
    
    const endDate = new Date(shop.subscriptionEndDate);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { text: `Expired ${Math.abs(daysLeft)} days ago`, color: 'text-red-600' };
    if (daysLeft === 0) return { text: 'Expires today', color: 'text-red-600' };
    if (daysLeft <= 7) return { text: `${daysLeft} days left`, color: 'text-orange-600' };
    if (daysLeft <= 30) return { text: `${daysLeft} days left`, color: 'text-yellow-600' };
    return { text: `${daysLeft} days left`, color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-3 rounded-lg">
            <Shield className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Super Admin Panel</h2>
            <p className="text-gray-600">Manage shop registrations and subscriptions</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock size={20} />
            Pending Approvals
            {pendingRequests.length > 0 && (
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'approved'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Store size={20} />
            Approved Shops
            {approvedShops.length > 0 && (
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {approvedShops.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6">
          {loading && !pendingRequests.length && !approvedShops.length ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : activeTab === 'pending' ? (
            /* Pending Requests */
            pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No pending approval requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{request.shopName}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-gray-700">
                          <strong>Owner:</strong> {request.ownerName}
                        </p>
                        <p className="text-gray-700">
                          <strong>Email:</strong> {request.email}
                        </p>
                        {request.phone && (
                          <p className="text-gray-700">
                            <strong>Phone:</strong> {request.phone}
                          </p>
                        )}
                        {request.address && (
                          <p className="text-gray-700">
                            <strong>Address:</strong> {request.address}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Requested on:</strong> {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={18} />
                        {processingId === request.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Approved Shops */
            approvedShops.length === 0 ? (
              <div className="text-center py-12">
                <Store className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No approved shops yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shop Details</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subscription</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dates</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {approvedShops.map((shop) => {
                      const subStatus = getSubscriptionStatus(shop);
                      return (
                        <tr key={shop.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-semibold text-gray-800">{shop.shopName}</p>
                              <p className="text-sm text-gray-600">{shop.ownerName}</p>
                              <p className="text-xs text-gray-500">{shop.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(shop.status || 'active')}
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className={`text-sm font-medium ${subStatus.color}`}>
                                {subStatus.text}
                              </p>
                              {shop.subscriptionEndDate && (
                                <p className="text-xs text-gray-500">
                                  Until: {formatDate(shop.subscriptionEndDate)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs space-y-1">
                              <p className="text-gray-600">
                                <strong>Approved:</strong> {formatDate(shop.approvedAt)}
                              </p>
                              {shop.lastReactivatedAt && (
                                <p className="text-green-600">
                                  <strong>Reactivated:</strong> {formatDate(shop.lastReactivatedAt)}
                                </p>
                              )}
                              {shop.lastSuspendedAt && (
                                <p className="text-red-600">
                                  <strong>Suspended:</strong> {formatDate(shop.lastSuspendedAt)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedShop(shop);
                                  setShowStatusModal(true);
                                }}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Manage Shop"
                              >
                                <Eye size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Shop Management Modal */}
      {showStatusModal && selectedShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Manage Shop</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{selectedShop.shopName}</h4>
                <p className="text-sm text-gray-600">{selectedShop.ownerName}</p>
                <p className="text-sm text-gray-600">{selectedShop.email}</p>
                <div className="mt-3">
                  {getStatusBadge(selectedShop.status || 'active')}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Subscription Status</p>
                <p className={`text-lg font-bold ${getSubscriptionStatus(selectedShop).color}`}>
                  {getSubscriptionStatus(selectedShop).text}
                </p>
                {selectedShop.subscriptionEndDate && (
                  <p className="text-xs text-blue-700 mt-1">
                    Expires: {formatDate(selectedShop.subscriptionEndDate)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleToggleStatus(selectedShop)}
                disabled={processingId === selectedShop.id}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                  selectedShop.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {selectedShop.status === 'active' ? (
                  <>
                    <Ban size={20} />
                    Suspend Shop
                  </>
                ) : (
                  <>
                    <CheckSquare size={20} />
                    Reactivate Shop
                  </>
                )}
              </button>

              <button
                onClick={() => handleExtendSubscription(selectedShop)}
                disabled={processingId === selectedShop.id}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <Calendar size={20} />
                Extend Subscription
              </button>

              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}