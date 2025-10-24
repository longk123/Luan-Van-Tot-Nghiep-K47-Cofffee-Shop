// src/components/CloseShiftModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function CloseShiftModal({ open, shift, onClose, onSuccess, onShowToast }) {
  const [step, setStep] = useState(1); // 1: Summary, 2: Input cash, 3: Confirm
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [actualCash, setActualCash] = useState('');
  const [note, setNote] = useState('');
  const [openOrdersError, setOpenOrdersError] = useState(null);

  // Fetch summary when modal opens
  useEffect(() => {
    if (open && shift?.id) {
      fetchSummary();
      // Scroll to top when modal opens
      setTimeout(() => {
        const modalContent = document.querySelector('.close-shift-modal-content');
        if (modalContent) {
          modalContent.scrollTop = 0;
        }
      }, 100);
    } else if (!open) {
      // Reset state when modal closes
      setSummary(null);
      setActualCash('');
      setNote('');
      setStep(1);
    }
  }, [open, shift?.id]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getShiftSummary(shift.id);
      setSummary(res.data);
    } catch (error) {
      console.error('Error fetching shift summary:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể tải thống kê ca làm'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (actualCash === '' || actualCash === null || actualCash === undefined) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập số tiền mặt thực tế (có thể là 0)'
      });
      return;
    }

    setLoading(true);
    setOpenOrdersError(null);
    
    try {
      const res = await api.closeShiftEnhanced(shift.id, {
        actual_cash: parseInt(actualCash) || 0,
        note: note || null
      });

      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đóng ca thành công!',
        message: `Ca #${shift.id} đã được đóng`
      });

      // Close modal first
      onClose();
      
      // Then trigger success callback (reload shift)
      setTimeout(() => {
        onSuccess?.();
      }, 100);
    } catch (error) {
      console.error('Error closing shift:', error);
      
      // Nếu lỗi do còn đơn OPEN
      if (error.code === 'OPEN_ORDERS_EXIST' || error.message?.includes('đơn hàng chưa thanh toán')) {
        setOpenOrdersError(error.message);
        setLoading(false);
        return;
      }
      
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi đóng ca',
        message: error.message || 'Không thể đóng ca'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleForceClose = async () => {
    setLoading(true);
    try {
      const res = await api.forceCloseShift(shift.id, {
        actual_cash: parseInt(actualCash) || 0,
        note: note || null,
        transfer_orders: true
      });

      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã đóng ca và chuyển đơn!',
        message: `Ca #${shift.id} đã đóng. Đơn chưa thanh toán sẽ chuyển sang ca tiếp theo.`
      });

      onClose();
      setTimeout(() => {
        onSuccess?.();
      }, 100);
    } catch (error) {
      console.error('Error force closing shift:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi đóng ca',
        message: error.message || 'Không thể đóng ca'
      });
    } finally {
      setLoading(false);
      setOpenOrdersError(null);
    }
  };

  const formatMoney = (value) => {
    return (value ?? 0).toLocaleString('vi-VN') + 'đ';
  };

  if (!open) return null;

  const openingCash = shift?.opening_cash || 0;
  const cashInShift = summary?.summary?.payments?.cash || 0;
  const totalExpected = openingCash + cashInShift;
  const cashDiff = (parseInt(actualCash) || 0) - totalExpected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">📊 Đóng ca làm việc</h3>
              <p className="text-sm text-gray-600">
                Ca #{shift?.id} • {shift?.nhan_vien?.full_name || 'N/A'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 close-shift-modal-content">
          {loading && !summary ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải thống kê...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Error: Còn đơn OPEN */}
              {openOrdersError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-2">{openOrdersError}</p>
                      <p className="text-sm text-red-700 mb-3">Bạn có thể:</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleForceClose}
                          disabled={loading}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 outline-none focus:outline-none text-sm"
                        >
                          ➡️ Chuyển đơn sang ca sau
                        </button>
                        <button
                          onClick={() => {
                            setOpenOrdersError(null);
                            onClose();
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors outline-none focus:outline-none text-sm"
                        >
                          🔙 Quay lại xử lý
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning nếu doanh thu = 0 */}
              {!openOrdersError && (summary?.summary?.totals?.total_orders || 0) === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-yellow-900">Ca chưa có đơn hàng nào</p>
                      <p className="text-sm text-yellow-700 mt-1">Bạn vẫn có thể đóng ca, nhưng doanh thu sẽ là 0đ.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Thống kê tổng quan */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border-2 border-purple-200">
                <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Tổng quan ca làm
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/70 rounded-xl p-3 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {summary?.summary?.totals?.total_orders || 0}
                    </p>
                  </div>
                  
                  <div className="bg-white/70 rounded-xl p-3 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Doanh thu</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatMoney(summary?.summary?.totals?.net)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phân loại thanh toán */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Phân loại thanh toán
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-gray-700 font-medium">💵 Tiền mặt</span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(summary?.summary?.payments?.cash)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-gray-700 font-medium">💳 Thẻ</span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(summary?.summary?.payments?.card)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-gray-700 font-medium">🏦 Chuyển khoản</span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(summary?.summary?.payments?.transfer)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-gray-700 font-medium">📱 Online (PayOS)</span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(summary?.summary?.payments?.online)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form nhập tiền đếm thực tế */}
              <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-300">
                <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Kiểm đếm tiền mặt
                </h4>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border-2 border-amber-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Tiền đầu ca</p>
                        <p className="text-lg font-bold text-gray-700">{formatMoney(openingCash)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Thu trong ca</p>
                        <p className="text-lg font-bold text-blue-700">{formatMoney(cashInShift)}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t-2 border-amber-200">
                      <p className="text-xs text-gray-600 mb-1">Tổng tiền phải có</p>
                      <p className="text-2xl font-bold text-amber-900">{formatMoney(totalExpected)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tiền mặt thực tế (đếm trong két) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      placeholder="Nhập số tiền đếm được..."
                      className="w-full px-4 py-3 text-lg border-2 border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                      min="0"
                    />
                  </div>
                  
                  {actualCash && (
                    <div className={`p-4 rounded-xl border-2 ${
                      cashDiff === 0 
                        ? 'bg-green-50 border-green-300' 
                        : cashDiff > 0 
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-red-50 border-red-300'
                    }`}>
                      <p className="text-sm font-medium text-gray-700 mb-1">Chênh lệch:</p>
                      <p className={`text-2xl font-bold ${
                        cashDiff === 0 
                          ? 'text-green-700' 
                          : cashDiff > 0 
                          ? 'text-blue-700'
                          : 'text-red-700'
                      }`}>
                        {cashDiff > 0 ? '+' : ''}{formatMoney(cashDiff)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {cashDiff === 0 && '✅ Khớp chính xác'}
                        {cashDiff > 0 && '⬆️ Thừa tiền'}
                        {cashDiff < 0 && '⬇️ Thiếu tiền'}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ghi chú
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú về ca làm việc..."
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors outline-none focus:outline-none"
          >
            Hủy
          </button>
          <button
            onClick={handleClose}
            disabled={loading || actualCash === ''}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
          >
            {loading ? 'Đang đóng ca...' : '✓ Xác nhận đóng ca'}
          </button>
        </div>
      </div>
    </div>
  );
}

