/**
 * Component: WalletSettlementPanel
 * Cho phép thu ngân/manager xác nhận nộp tiền từ shipper
 */

import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function WalletSettlementPanel({ onClose, onShowToast }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const res = await api.getAllWallets({ hasBalance: true });
      const data = res?.data || res || [];
      setWallets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWallet = async (wallet) => {
    setSelectedWallet(wallet);
    setSettleAmount(wallet.balance.toString());
    setSettleNote('');
    setError(null);
    setSuccess(null);
  };

  const handleSettle = async (settleAll = false) => {
    if (!selectedWallet) return;
    
    try {
      setSettling(true);
      setError(null);
      
      let result;
      if (settleAll) {
        result = await api.settleAllWallet(selectedWallet.user_id);
      } else {
        const amount = parseInt(settleAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Số tiền không hợp lệ');
        }
        if (amount > parseInt(selectedWallet.balance)) {
          throw new Error('Số tiền nộp lớn hơn số dư ví');
        }
        const res = await api.settleWallet(selectedWallet.user_id, amount, settleNote);
        result = res?.data || res;
      }
      
      setSuccess('Đã xác nhận nộp tiền thành công!');
      
      // Reload wallets
      await loadWallets();
      setSelectedWallet(null);
      setSettleAmount('');
      
      if (onShowToast) {
        onShowToast({
          show: true,
          type: 'success',
          title: 'Thành công',
          message: `Đã nhận ${formatCurrency(result?.amount || settleAmount)} từ ${selectedWallet.shipper_name || selectedWallet.username}`
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSettling(false);
    }
  };

  const formatCurrency = (amount) => {
    return parseInt(amount || 0).toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Đối Soát Tiền Thu Hộ
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
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg">Không có tiền cần đối soát</p>
              <p className="text-gray-400 text-sm mt-1">Tất cả nhân viên đã nộp đủ tiền</p>
            </div>
          ) : selectedWallet ? (
            /* Form nộp tiền */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedWallet(null)}
                className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Quay lại
              </button>

              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedWallet.shipper_name || selectedWallet.display_name}</p>
                    <p className="text-sm text-gray-500">@{selectedWallet.username}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-gray-500">Số dư ví</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(selectedWallet.balance)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số tiền nộp
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="Nhập số tiền..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-lg font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">đ</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="VD: Nộp cuối ca..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleSettle(false)}
                  disabled={settling || !settleAmount}
                  className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {settling ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Xác nhận nộp
                </button>
                <button
                  onClick={() => handleSettle(true)}
                  disabled={settling}
                  className="py-3 px-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Nộp tất cả
                </button>
              </div>
            </div>
          ) : (
            /* Danh sách shipper có tiền chưa nộp */
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Chọn nhân viên để xác nhận nộp tiền:
              </p>
              
              {wallets.map((wallet) => (
                <div
                  key={wallet.wallet_id || wallet.user_id}
                  onClick={() => handleSelectWallet(wallet)}
                  className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {wallet.shipper_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{wallet.shipper_name}</p>
                        <p className="text-sm text-gray-500">
                          {wallet.today_orders || 0} đơn hôm nay
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-500">
                        {formatCurrency(wallet.balance)}
                      </p>
                      <p className="text-xs text-gray-400">Chưa nộp</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Summary */}
        {!loading && wallets.length > 0 && !selectedWallet && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tổng tiền chưa nộp:</span>
              <span className="text-xl font-bold text-red-500">
                {formatCurrency(wallets.reduce((sum, w) => sum + parseInt(w.balance || 0), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
