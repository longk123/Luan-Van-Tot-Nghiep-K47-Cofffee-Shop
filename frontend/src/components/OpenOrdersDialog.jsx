// src/components/OpenOrdersDialog.jsx
export default function OpenOrdersDialog({ 
  open, 
  orders = [], 
  onClose, 
  onForceClose, 
  onGoBack,
  loading,
  mode = 'close-shift' // 'close-shift' | 'view-only'
}) {
  if (!open) return null;
  
  const isViewOnly = mode === 'view-only';

  const formatMoney = (value) => {
    return (Number(value) || 0).toLocaleString('vi-VN') + 'đ';
  };

  const getOrderLabel = (order) => {
    if (order.order_type === 'TAKEAWAY') {
      return `Đơn mang đi #${order.id}`;
    }
    if (order.order_type === 'DELIVERY') {
      return `Đơn giao hàng #${order.id}`;
    }
    // DINE_IN
    return order.ten_ban || `Bàn #${order.ban_id}`;
  };

  const getOrderSubLabel = (order) => {
    if (order.order_type === 'DINE_IN' && order.ten_khu_vuc) {
      return `${order.ten_khu_vuc} • Đơn #${order.id}`;
    }
    return `Đơn #${order.id}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-accent-50 to-accent-100 border-b border-accent-200 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-accent-900 mb-1 flex items-center gap-2.5">
                <svg className="w-7 h-7 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Đơn hàng chưa thanh toán</span>
              </h3>
              <p className="text-sm text-accent-700">
                {orders.length} đơn cần xử lý
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {orders.map((order) => (
              <div 
                key={order.id}
                className="bg-white border-2 border-accent-200 rounded-xl p-4 hover:bg-accent-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {order.order_type === 'DINE_IN' && (
                        <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      )}
                      {order.order_type === 'TAKEAWAY' && (
                        <svg className="w-5 h-5 text-accent-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                      {order.order_type === 'DELIVERY' && (
                        <svg className="w-5 h-5 text-success-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                      )}
                      <span className="font-bold text-dark-900 text-lg">
                        {getOrderLabel(order)}
                      </span>
                    </div>
                    <p className="text-sm text-dark-600">
                      {getOrderSubLabel(order)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-dark-500 mb-1">Tổng tiền</p>
                    <p className="text-xl font-bold text-accent-700">
                      {formatMoney(order.tong_tien)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info box */}
          {!isViewOnly && (
            <div className="mt-6 bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 text-sm text-primary-900">
                  <p className="font-semibold mb-1">Bạn có 2 lựa chọn:</p>
                  <ul className="list-disc list-inside space-y-1 text-primary-800">
                    <li><strong>Quay lại xử lý:</strong> Thanh toán hoặc hủy các đơn này trước</li>
                    <li><strong>Chuyển đơn sang ca sau:</strong> Các đơn sẽ được chuyển sang ca tiếp theo để xử lý</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {isViewOnly && (
            <div className="mt-6 bg-accent-50 border-2 border-accent-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 text-sm text-accent-900">
                  <p className="font-semibold mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Đây là đơn từ ca trước</span>
                  </p>
                  <p className="text-accent-800">Click vào bàn tương ứng để xem chi tiết và thanh toán/hủy đơn.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-cream-50 border-t border-gray-200 rounded-b-3xl flex gap-3">
          {isViewOnly ? (
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl font-semibold transition-all shadow-md hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-lg outline-none focus:outline-none"
            >
              Đóng
            </button>
          ) : (
            <>
              <button
                onClick={onGoBack}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl font-semibold transition-all shadow-md hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gradient-to-r disabled:hover:from-[#d4a574] disabled:hover:via-[#c9975b] disabled:hover:to-[#d4a574] disabled:hover:text-white disabled:hover:border-[#c9975b] outline-none focus:outline-none flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Quay lại xử lý</span>
              </button>
              <button
                onClick={onForceClose}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-500 to-accent-600 text-white border-2 border-accent-500 rounded-xl font-semibold transition-all shadow-lg hover:bg-white hover:from-white hover:to-white hover:text-accent-600 hover:border-accent-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gradient-to-r disabled:hover:from-accent-500 disabled:hover:to-accent-600 disabled:hover:text-white disabled:hover:border-accent-500 outline-none focus:outline-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>Chuyển đơn sang ca sau</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

