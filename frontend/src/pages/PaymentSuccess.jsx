// src/pages/PaymentSuccess.jsx
import { useEffect } from 'react';
import { getToken } from '../auth.js';

export default function PaymentSuccess() {
  useEffect(() => {
    // Đọc query params từ PayOS
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const paymentLinkId = urlParams.get('id');
    const cancel = urlParams.get('cancel') === 'true';
    const status = urlParams.get('status');
    const orderCode = urlParams.get('orderCode');
    
    console.log('PayOS redirect params:', { code, paymentLinkId, cancel, status, orderCode });
    
    // Xác định trạng thái thật sự
    const isSuccess = code === '00' && status === 'PAID' && !cancel;
    const isCancelled = cancel === true || status === 'CANCELLED';
    
    // Lưu payment result vào localStorage
    localStorage.setItem('payos_payment_result', JSON.stringify({
      status: isSuccess ? 'success' : (isCancelled ? 'cancel' : 'pending'),
      code,
      paymentLinkId,
      orderCode,
      paymentStatus: status,
      timestamp: Date.now()
    }));

    // Nếu thanh toán thành công, gọi API để update DB ngay
    // KHÔNG dùng api.js để tránh bị redirect khi 401
    if (isSuccess && orderCode) {
      (async () => {
        try {
          const response = await fetch(`/api/v1/payments/payos/process-return/${orderCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              status,
              paymentLinkId,
              orderCode
            })
          });
          const data = await response.json();
          console.log('✅ Payment processed from return URL:', data);
        } catch (err) {
          console.error('❌ Error updating payment from return URL:', err);
        }
      })();
    }

    // Kiểm tra token
    const token = getToken();
    
    // Auto redirect (có hoặc không có token đều redirect)
    const timer = setTimeout(() => {
      if (token) {
        // Có token → về dashboard
        window.location.href = `/dashboard?from=payment`;
      } else {
        // Không có token → về login (localStorage đã lưu payment result)
        window.location.href = '/login';
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const token = getToken();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-12 text-center shadow-2xl max-w-md w-full">
        <div className="text-8xl mb-6 animate-bounce">✅</div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Thanh toán thành công!
        </h1>
        <p className="text-gray-600 text-lg mb-6">
          Cảm ơn bạn đã thanh toán qua PayOS
        </p>
        <div className="inline-block">
          {token ? (
            <div className="flex items-center gap-2 text-purple-600">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent"></div>
              <span className="text-sm font-medium">Đang chuyển về trang POS...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-amber-700">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-700 border-t-transparent"></div>
                <span className="text-sm font-medium">Đang chuyển về trang đăng nhập...</span>
              </div>
              <p className="text-xs text-gray-500">Vui lòng đăng nhập lại để xem kết quả</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

