// src/components/OpenShiftModal.jsx
import { useState } from 'react';
import { api } from '../api.js';

export default function OpenShiftModal({ open, onClose, onSuccess, onShowToast }) {
  const [loading, setLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState('');

  const handleOpen = async () => {
    setLoading(true);
    try {
      await api.post('/shifts/open', {
        opening_cash: parseInt(openingCash) || 0
      });

      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Mở ca thành công!',
        message: `Đã mở ca mới với tiền đầu ca: ${parseInt(openingCash) || 0}đ`
      });

      onSuccess?.();
      onClose();
      setOpeningCash('');
    } catch (error) {
      console.error('Error opening shift:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi mở ca',
        message: error.message || 'Không thể mở ca'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">🚀 Mở ca làm việc</h3>
              <p className="text-sm text-gray-600">Bắt đầu ca làm việc mới</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-green-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-green-900">Tiền đầu ca</h4>
                <p className="text-sm text-green-700">Số tiền mặt trong két lúc bắt đầu ca</p>
              </div>
            </div>

            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="Nhập số tiền (VNĐ)..."
              className="w-full px-4 py-3 text-lg border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold"
              min="0"
              autoFocus
            />
            
            <p className="text-xs text-gray-600 mt-2">
              💡 Tip: Đếm tiền trong két trước khi bắt đầu ca để dễ đối chiếu khi đóng ca
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              ℹ️ Ca làm việc sẽ được gắn với tất cả đơn hàng bạn tạo ra cho đến khi đóng ca.
            </p>
          </div>
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
            onClick={handleOpen}
            disabled={loading}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
          >
            {loading ? 'Đang mở ca...' : '✓ Bắt đầu ca làm việc'}
          </button>
        </div>
      </div>
    </div>
  );
}

