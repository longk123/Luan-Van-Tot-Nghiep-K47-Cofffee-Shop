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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-red-900 mb-1">
                ⚠️ Đơn hàng chưa thanh toán
              </h3>
              <p className="text-sm text-red-700">
                {orders.length} đơn cần xử lý
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="bg-white border-2 border-red-200 rounded-xl p-4 hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {order.order_type === 'DINE_IN' && (
                        <span className="text-blue-600">🪑</span>
                      )}
                      {order.order_type === 'TAKEAWAY' && (
                        <span className="text-orange-600">📦</span>
                      )}
                      {order.order_type === 'DELIVERY' && (
                        <span className="text-green-600">🚚</span>
                      )}
                      <span className="font-bold text-gray-900 text-lg">
                        {getOrderLabel(order)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {getOrderSubLabel(order)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Tổng tiền</p>
                    <p className="text-xl font-bold text-red-700">
                      {formatMoney(order.tong_tien)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info box */}
          {!isViewOnly && (
            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 text-sm text-blue-900">
                  <p className="font-semibold mb-1">Bạn có 2 lựa chọn:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li><strong>Quay lại xử lý:</strong> Thanh toán hoặc hủy các đơn này trước</li>
                    <li><strong>Chuyển đơn sang ca sau:</strong> Các đơn sẽ được chuyển sang ca tiếp theo để xử lý</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {isViewOnly && (
            <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 text-sm text-amber-900">
                  <p className="font-semibold mb-1">💡 Đây là đơn từ ca trước</p>
                  <p className="text-amber-800">Click vào bàn tương ứng để xem chi tiết và thanh toán/hủy đơn.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-3xl flex gap-3">
          {isViewOnly ? (
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors outline-none focus:outline-none"
            >
              Đóng
            </button>
          ) : (
            <>
              <button
                onClick={onGoBack}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
              >
                🔙 Quay lại xử lý
              </button>
              <button
                onClick={onForceClose}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
              >
                {loading ? 'Đang xử lý...' : '➡️ Chuyển đơn sang ca sau'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

