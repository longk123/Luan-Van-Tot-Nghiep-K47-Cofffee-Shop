/**
 * Component: ShipperWalletPanel
 * Hiển thị thông tin ví giao hàng cho Waiter
 */

import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ShipperWalletPanel({ onClose, onBalanceUpdate }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await api.getMyWallet();
      const data = res?.data || res || {};
      setWallet(data);
      if (onBalanceUpdate && data.balance !== undefined) { // ✅ Sửa: balance
        onBalanceUpdate(data.balance);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.syncWalletOrders();
      await loadWallet();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount) => {
    return parseInt(amount || 0).toLocaleString('vi-VN') + 'đ';
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#8b6f47] border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Ví Giao Hàng
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Số dư */}
          <div className="text-center">
            <p className="text-green-100 text-sm mb-1">Tiền đang giữ</p>
            <p className="text-4xl font-bold">
              {formatCurrency(wallet?.balance)}
            </p>
            {wallet?.wallet_limit && (
              <p className="text-green-200 text-sm mt-1">
                Hạn mức: {formatCurrency(wallet.wallet_limit)}
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {/* Thống kê hôm nay */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 p-3 rounded-xl text-center">
              <p className="text-2xl font-bold text-blue-600">
                {wallet?.today_orders || 0}
              </p>
              <p className="text-xs text-blue-500 mt-1">Đơn hôm nay</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-center">
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(wallet?.today_collected)}
              </p>
              <p className="text-xs text-emerald-500 mt-1">Đã thu</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl text-center">
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(wallet?.today_settled)}
              </p>
              <p className="text-xs text-purple-500 mt-1">Đã nộp</p>
            </div>
          </div>

          {/* Cảnh báo nếu gần hạn mức */}
          {wallet?.balance >= wallet?.wallet_limit * 0.8 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-700">Sắp đạt hạn mức ví!</p>
                <p className="text-sm text-amber-600">Vui lòng nộp tiền cho thu ngân để tiếp tục nhận đơn.</p>
              </div>
            </div>
          )}

          {/* Giao dịch hôm nay */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Giao dịch hôm nay</h3>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {syncing ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Đồng bộ
              </button>
            </div>

            {wallet?.transactions?.length > 0 ? (
              <div className="space-y-2">
                {wallet.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`p-3 rounded-lg border ${
                      tx.type === 'COLLECT' 
                        ? 'bg-green-50 border-green-200' 
                        : tx.type === 'SETTLE'
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tx.type === 'COLLECT' ? (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {tx.type === 'COLLECT' 
                              ? `Thu từ đơn #${tx.order_code || tx.order_id}` 
                              : tx.type === 'SETTLE'
                              ? 'Nộp tiền'
                              : 'Điều chỉnh'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(tx.created_at)}
                            {tx.delivery_address && (
                              <span className="ml-2">• {tx.delivery_address.substring(0, 30)}...</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          tx.type === 'COLLECT' ? 'text-green-600' : 'text-purple-600'
                        }`}>
                          {tx.type === 'COLLECT' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Sau: {formatCurrency(tx.balance_after)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>Chưa có giao dịch hôm nay</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Tổng đã thu (all time):</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(wallet?.total_collected)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
            <span>Tổng đã nộp (all time):</span>
            <span className="font-semibold text-purple-600">
              {formatCurrency(wallet?.total_settled)}
            </span>
          </div>
          
          <p className="text-xs text-gray-400 mt-3 text-center">
            💡 Vui lòng nộp tiền cho thu ngân trước khi tan ca
          </p>
        </div>
      </div>
    </div>
  );
}
