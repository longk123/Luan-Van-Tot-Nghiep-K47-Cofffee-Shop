// src/components/PaymentQRPanel.jsx
// Design: Coffee POS theme - Tone nâu be, sang trọng
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function PaymentQRPanel({ 
  orderId, 
  amount, 
  onPaymentSuccess, 
  onShowToast,
  onClose
}) {
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [refCode, setRefCode] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Chỉ gọi 1 lần - tránh duplicate request
    if (!isCreating && !refCode) {
      createPayment();
    }
  }, [orderId, amount]);

  useEffect(() => {
    if (!refCode) return;

    // Auto-polling: Kiểm tra trạng thái mỗi 3 giây
    const pollInterval = setInterval(async () => {
      console.log('🔄 Auto-checking payment status...');
      await checkStatus();
    }, 3000);

    // Kết nối SSE để nhận realtime updates
    const eventSource = new EventSource('/api/v1/pos/events');

    eventSource.addEventListener('change', (e) => {
      try {
        const event = JSON.parse(e.data);
        
        if (event.type === 'PAYMENT_UPDATE' && event.refCode === refCode) {
          console.log('💰 Payment update received:', event);
          
          if (event.status === 'PAID') {
            setStatus('PAID');
            
            onShowToast?.({
              show: true,
              type: 'success',
              title: 'Thanh toán thành công!',
              message: `Đã nhận ${event.amount.toLocaleString()}đ qua PayOS`
            });
            
            // Callback để refresh order
            setTimeout(() => {
              onPaymentSuccess?.();
            }, 1500);
          } else if (event.status === 'FAILED') {
            setStatus('FAILED');
            setError('Thanh toán thất bại');
            
            onShowToast?.({
              show: true,
              type: 'error',
              title: 'Thanh toán thất bại',
              message: 'Vui lòng thử lại'
            });
          }
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    });

    eventSource.onerror = () => {
      console.warn('SSE connection error');
      eventSource.close();
    };

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
    };
  }, [refCode]);

  const createPayment = async () => {
    if (isCreating) return; // Prevent duplicate calls
    
    setIsCreating(true);
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.createPayOSPayment(orderId, amount);
      
      if (response.success) {
        const data = response.data;
        setQrUrl(data.qrUrl);
        setCheckoutUrl(data.checkoutUrl);
        setRefCode(data.refCode);
        setStatus('PENDING');
        
        // Lưu payment info vào localStorage để persist qua redirects
        localStorage.setItem('payos_pending_payment', JSON.stringify({
          orderId,
          refCode: data.refCode,
          amount,
          timestamp: Date.now()
        }));
        
        // Fade in animation
        setTimeout(() => setFadeIn(true), 100);
        
        console.log('✅ PayOS payment created:', data);
      } else {
        throw new Error(response.error || 'Không thể tạo thanh toán');
      }
    } catch (err) {
      console.error('❌ Error creating payment:', err);
      setError(err.message || 'Không thể tạo thanh toán');
      
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi tạo thanh toán',
        message: err.message || 'Vui lòng thử lại'
      });
    } finally {
      setLoading(false);
      setIsCreating(false);
    }
  };

  const checkStatus = async () => {
    if (!refCode) return;
    
    try {
      const response = await api.checkPayOSStatus(refCode);
      
      console.log('📊 Payment status check:', response);
      
      if (response.success) {
        const newStatus = response.data.status;
        setStatus(newStatus);
        
        if (newStatus === 'PAID' && status !== 'PAID') {
          console.log('✅ Payment confirmed as PAID!');
          
          // Hiển thị toast
          onShowToast?.({
            show: true,
            type: 'success',
            title: 'Thanh toán thành công!',
            message: `Đã nhận thanh toán qua PayOS`
          });
          
          // Callback để refresh order
          setTimeout(() => {
            onPaymentSuccess?.();
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 mb-4"></div>
          <p className="text-amber-900 font-medium">Đang tạo mã thanh toán...</p>
          <p className="text-sm text-amber-700 mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">❌</div>
          <div className="flex-1">
            <h4 className="font-bold text-red-900 mb-2">Không thể tạo thanh toán</h4>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={createPayment}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={() => onClose?.()}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'PAID') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4 animate-bounce">✅</div>
        <h3 className="text-2xl font-bold text-green-900 mb-2">Thanh toán thành công!</h3>
        <p className="text-green-700 text-lg font-semibold">
          Đã nhận {amount.toLocaleString()}đ
        </p>
        <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-lg">
          <p className="text-xs text-gray-600">Mã tham chiếu</p>
          <p className="text-sm font-mono font-semibold text-gray-800">{refCode}</p>
        </div>
      </div>
    );
  }

  // Pending state - hiển thị QR code theo phong cách Coffee POS
  return (
    <div className={`space-y-4 transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header - Tone Coffee */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-amber-900 text-lg flex items-center gap-2">
              <span>☕</span>
              <span>Thanh toán online</span>
            </h3>
            <p className="text-sm text-amber-700 mt-1">VietQR • MoMo • ZaloPay • Ví điện tử</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-amber-700">Số tiền</div>
            <div className="text-2xl font-bold text-orange-600">
              {amount.toLocaleString()}đ
            </div>
          </div>
        </div>
      </div>

      {/* QR Code - Card style giống hóa đơn */}
      {qrUrl && (
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              📱 Quét mã QR bằng app ngân hàng hoặc ví điện tử
            </p>
            {/* QR Image với viền giống thẻ */}
            <div className="inline-block bg-gradient-to-br from-amber-50 to-white p-4 rounded-xl border-2 border-amber-100 shadow-md">
              <img 
                src={qrUrl} 
                alt="QR Code Thanh toán" 
                className="w-56 h-56 object-contain mx-auto"
              />
            </div>
            {/* Ref code */}
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700 font-medium">Mã giao dịch</p>
              <p className="text-sm font-mono font-bold text-amber-900 mt-1">{refCode}</p>
            </div>
          </div>
        </div>
      )}

      {/* Checkout URL Button */}
      {checkoutUrl && (
        <button
          onClick={() => {
            // Mở trong tab mới để giữ session POS
            window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
            
            // Hiển thị hướng dẫn
            onShowToast?.({
              show: true,
              type: 'info',
              title: 'Đã mở trang thanh toán',
              message: 'Sau khi thanh toán xong, click "🔄 Kiểm tra" hoặc "✅ Demo OK"'
            });
          }}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <span>🌐</span>
          <span>Mở trang thanh toán (Tab mới)</span>
        </button>
      )}

      {/* Status - Waiting */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl animate-pulse">⏳</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-900">
              Đang chờ thanh toán...
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Hệ thống sẽ tự động cập nhật khi nhận được tiền
            </p>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex gap-2">
        <button
          onClick={() => onClose?.()}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors border border-gray-300"
        >
          ← Đóng
        </button>
      </div>

      {/* Info footer - tone coffee */}
      <div className="text-xs text-center space-y-1 text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
        <p className="font-medium">💡 Hướng dẫn thanh toán:</p>
        <p><strong>Cách 1:</strong> Quét QR bằng app ngân hàng/MoMo/ZaloPay</p>
        <p><strong>Cách 2:</strong> Click "Mở trang thanh toán" → Thanh toán online</p>
        <p className="text-green-700 font-semibold mt-2">
          ⚡ Hệ thống tự động cập nhật trong vài giây
        </p>
      </div>
    </div>
  );
}
