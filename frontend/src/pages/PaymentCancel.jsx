// src/pages/PaymentCancel.jsx
import { useEffect } from 'react';

export default function PaymentCancel() {
  useEffect(() => {
    // Tự động đóng tab sau 1.5 giây
    const timer = setTimeout(() => {
      window.close();
      
      // Nếu window.close() không hoạt động (một số browser chặn)
      // Hiển thị hướng dẫn đóng tay
      setTimeout(() => {
        const canClose = window.closed;
        if (!canClose) {
          console.log('Cannot auto-close - browser blocked');
          // Tab vẫn mở - user phải đóng tay
        }
      }, 500);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-amber-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-12 text-center shadow-2xl max-w-md w-full border-4 border-amber-200">
        <div className="text-8xl mb-6">⚠️</div>
        <h1 className="text-3xl font-bold text-amber-700 mb-4">
          Đã hủy thanh toán
        </h1>
        <p className="text-gray-600 text-lg mb-6">
          Giao dịch đã bị hủy bỏ
        </p>
        <div className="inline-block">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-amber-700">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-700 border-t-transparent"></div>
              <span className="text-sm font-medium">Đang đóng tab...</span>
            </div>
            <p className="text-xs text-gray-500">Hoặc bạn có thể đóng tab này thủ công</p>
          </div>
        </div>
      </div>
    </div>
  );
}

