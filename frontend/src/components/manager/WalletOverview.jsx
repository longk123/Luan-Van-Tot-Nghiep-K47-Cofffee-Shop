// src/components/manager/WalletOverview.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function WalletOverview() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingTotal, setPendingTotal] = useState({ shipper_count: 0, total_balance: 0 });
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [walletsRes, pendingRes] = await Promise.all([
        api.getAllWallets({ onlyActive: false }),
        api.getPendingWalletBalance()
      ]);
      setWallets(walletsRes?.data || walletsRes || []);
      setPendingTotal(pendingRes?.data || pendingRes || { shipper_count: 0, total_balance: 0 });
    } catch (error) {
      console.error('Error loading wallet data:', error);
      showToast('error', 'Không thể tải dữ liệu ví');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (walletId, userId) => {
    setTransactionsLoading(true);
    try {
      const res = await api.getWalletTransactions(userId, { limit: 50 });
      setTransactions(res?.data || res || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      showToast('error', 'Không thể tải lịch sử giao dịch');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleViewTransactions = (wallet) => {
    setSelectedWallet(wallet);
    setShowTransactions(true);
    loadTransactions(wallet.wallet_id, wallet.user_id);
  };

  const handleUpdateLimit = async () => {
    if (!selectedWallet || !newLimit) return;
    
    setActionLoading(true);
    try {
      await api.updateWalletLimit(selectedWallet.user_id, parseInt(newLimit));
      showToast('success', `Đã cập nhật hạn mức ví cho ${selectedWallet.shipper_name}`);
      setShowLimitModal(false);
      setNewLimit('');
      loadData();
    } catch (error) {
      console.error('Error updating limit:', error);
      showToast('error', error.message || 'Không thể cập nhật hạn mức');
    } finally {
      setActionLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3000);
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('vi-VN') + 'đ';
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="pb-32">
      {/* Toast notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border-l-4 border-amber-500 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-amber-700">Shipper có ví</div>
              <div className="text-2xl font-bold text-amber-900">{wallets.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-5 border-l-4 border-red-500 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-red-700">Shipper cần đối soát</div>
              <div className="text-2xl font-bold text-red-900">{pendingTotal.shipper_count}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-l-4 border-green-500 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-green-700">Tổng tiền cần thu</div>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(pendingTotal.total_balance)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Danh sách Ví Shipper
          </h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Chưa có dữ liệu ví shipper
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipper</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số dư</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn mức</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng đã thu</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng đã nộp</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hôm nay</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wallets.map((wallet) => {
                  const balancePercent = wallet.wallet_limit > 0 
                    ? (wallet.balance / wallet.wallet_limit) * 100 
                    : 0;
                  const isNearLimit = balancePercent >= 80;
                  const isOverLimit = balancePercent >= 100;

                  return (
                    <tr key={wallet.wallet_id} className={`hover:bg-gray-50 ${isOverLimit ? 'bg-red-50' : isNearLimit ? 'bg-amber-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-amber-700 font-semibold text-sm">
                              {wallet.shipper_name?.charAt(0)?.toUpperCase() || 'S'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{wallet.shipper_name}</div>
                            <div className="text-xs text-gray-500">@{wallet.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${
                          wallet.balance > 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {formatCurrency(wallet.balance)}
                        </span>
                        {wallet.wallet_limit > 0 && (
                          <div className="mt-1">
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(balancePercent, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {formatCurrency(wallet.wallet_limit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                        {formatCurrency(wallet.total_collected)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600">
                        {formatCurrency(wallet.total_settled)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{wallet.today_orders || 0} đơn</div>
                        <div className="text-xs text-gray-500">
                          Thu: {formatCurrency(wallet.today_collected)} | Nộp: {formatCurrency(wallet.today_settled)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {wallet.is_active ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Tạm khóa
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewTransactions(wallet)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem lịch sử"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWallet(wallet);
                              setNewLimit(wallet.wallet_limit?.toString() || '500000');
                              setShowLimitModal(true);
                            }}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Cập nhật hạn mức"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions Modal */}
      {showTransactions && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Lịch sử giao dịch - {selectedWallet.shipper_name}
                </h3>
                <p className="text-sm text-gray-600">Số dư hiện tại: {formatCurrency(selectedWallet.balance)}</p>
              </div>
              <button
                onClick={() => {
                  setShowTransactions(false);
                  setSelectedWallet(null);
                  setTransactions([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Chưa có giao dịch
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className={`p-4 rounded-lg border ${
                      tx.type === 'COLLECT' ? 'bg-green-50 border-green-200' : 
                      tx.type === 'SETTLE' ? 'bg-blue-50 border-blue-200' : 
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            tx.type === 'COLLECT' ? 'bg-green-500' : 
                            tx.type === 'SETTLE' ? 'bg-blue-500' : 
                            'bg-gray-500'
                          }`}>
                            {tx.type === 'COLLECT' ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            ) : tx.type === 'SETTLE' ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {tx.type === 'COLLECT' ? 'Thu tiền đơn giao hàng' : 
                               tx.type === 'SETTLE' ? 'Nộp tiền cho thu ngân' : 
                               'Điều chỉnh số dư'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {tx.order_code && `Đơn #${tx.order_code} • `}
                              {formatDateTime(tx.created_at)}
                            </div>
                            {tx.note && <div className="text-xs text-gray-400 mt-1">{tx.note}</div>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            tx.type === 'COLLECT' ? 'text-green-600' : 
                            tx.type === 'SETTLE' ? 'text-blue-600' : 
                            tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'COLLECT' ? '+' : tx.type === 'SETTLE' ? '-' : (tx.amount >= 0 ? '+' : '')}
                            {formatCurrency(Math.abs(tx.amount))}
                          </div>
                          <div className="text-xs text-gray-500">
                            Sau: {formatCurrency(tx.balance_after)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Limit Modal */}
      {showLimitModal && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Cập nhật hạn mức ví
              </h3>
              <p className="text-sm text-gray-600">{selectedWallet.shipper_name}</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hạn mức mới (VNĐ)
                </label>
                <input
                  type="number"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Nhập hạn mức mới"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Hạn mức hiện tại: {formatCurrency(selectedWallet.wallet_limit)}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setNewLimit('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateLimit}
                  disabled={actionLoading || !newLimit}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
