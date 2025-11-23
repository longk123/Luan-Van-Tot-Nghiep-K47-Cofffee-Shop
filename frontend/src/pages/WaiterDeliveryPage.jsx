// Trang cho nhân viên phục vụ xem và cập nhật đơn giao hàng được phân công
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import useSSE from '../hooks/useSSE.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import Toast from '../components/Toast.jsx';
import { getUser } from '../auth.js';

export default function WaiterDeliveryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ASSIGNED, OUT_FOR_DELIVERY

  const user = getUser();
  const userRoles = user?.roles || [];
  const isWaiter = userRoles.some(role => role.toLowerCase() === 'waiter');

  useEffect(() => {
    // Waiter có thể truy cập cả Dashboard và Delivery page
    // Không redirect nữa, chỉ load orders
    loadOrders();
  }, [statusFilter]);

  async function loadOrders() {
    setLoading(true);
    try {
      const status = statusFilter === 'ALL' ? null : statusFilter;
      const res = await api.getMyAssignedDeliveries(status);
      setOrders(res?.data || res || []);
    } catch (err) {
      console.error('Error loading assigned deliveries:', err);
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách đơn'
      });
    } finally {
      setLoading(false);
    }
  }

  // SSE auto refresh
  useSSE('/api/v1/pos/events', (evt) => {
    if (evt.type === 'delivery.assigned' || 
        evt.type === 'delivery.status.updated' ||
        evt.type === 'order.items.changed' ||
        evt.type === 'order.updated') {
      loadOrders();
    }
  });

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.updateDeliveryStatus(orderId, newStatus);
      setToast({
        show: true,
        type: 'success',
        title: 'Cập nhật thành công!',
        message: `Đã cập nhật trạng thái đơn #${orderId}`
      });
      loadOrders();
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể cập nhật trạng thái'
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'PENDING': { text: 'Chờ phân công', color: 'bg-gray-100 text-gray-700' },
      'ASSIGNED': { text: 'Đã phân công', color: 'bg-blue-100 text-blue-700' },
      'OUT_FOR_DELIVERY': { text: 'Đang giao hàng', color: 'bg-yellow-100 text-yellow-700' },
      'DELIVERED': { text: 'Đã giao', color: 'bg-green-100 text-green-700' },
      'FAILED': { text: 'Giao thất bại', color: 'bg-red-100 text-red-700' }
    };
    const statusInfo = statusMap[status] || statusMap['PENDING'];
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AuthedLayout
      pageName="Đơn giao hàng của tôi"
      backUrl="/dashboard"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/60 p-8 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Đơn giao hàng của tôi</h2>
            <p className="text-sm text-gray-600">Xem và cập nhật trạng thái đơn được phân công</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tất cả ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('ASSIGNED')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'ASSIGNED'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Đã phân công ({orders.filter(o => o.delivery_status === 'ASSIGNED').length})
          </button>
          <button
            onClick={() => setStatusFilter('OUT_FOR_DELIVERY')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              statusFilter === 'OUT_FOR_DELIVERY'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Đang giao ({orders.filter(o => o.delivery_status === 'OUT_FOR_DELIVERY').length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-16 bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-xl border-2 border-[#e7d4b8]">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#d4a574] border-t-[#c9975b] mx-auto mb-6"></div>
          <p className="text-[#8b6f47] font-bold text-lg">Đang tải...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-xl border-2 border-[#e7d4b8]">
          <svg className="w-24 h-24 mx-auto text-[#d4a574] mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-[#8b6f47] font-bold text-xl">Chưa có đơn được phân công</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-xl transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#8b6f47]">Đơn #{order.id}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDateTime(order.opened_at)}
                  </p>
                </div>
                {getStatusBadge(order.delivery_status || 'PENDING')}
              </div>

              {/* Customer Info */}
              {order.khach_hang_ten && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-900">👤 {order.khach_hang_ten}</p>
                  {order.khach_hang_phone && (
                    <p className="text-sm text-gray-600 mt-1">📞 {order.khach_hang_phone}</p>
                  )}
                </div>
              )}

              {/* Delivery Address */}
              {order.delivery_address && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-1">📍 Địa chỉ giao hàng:</p>
                  <p className="text-sm text-blue-800">{order.delivery_address}</p>
                  {order.delivery_phone && (
                    <p className="text-xs text-blue-700 mt-1">📞 SĐT nhận: {order.delivery_phone}</p>
                  )}
                  {order.distance_km && (
                    <p className="text-xs text-blue-600 mt-1">📏 Cách quán: {parseFloat(order.distance_km).toFixed(2)}km</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Món đặt:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <span className="text-gray-700">
                          {item.mon_ten || 'Món không tên'}
                          {item.bien_the_ten && ` • ${item.bien_the_ten}`}
                        </span>
                        <span className="font-semibold text-gray-900 ml-2">×{item.so_luong}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        item.trang_thai_che_bien === 'DONE' 
                          ? 'bg-green-100 text-green-700' 
                          : item.trang_thai_che_bien === 'MAKING'
                          ? 'bg-blue-100 text-blue-700'
                          : item.trang_thai_che_bien === 'QUEUED'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.trang_thai_che_bien === 'DONE' ? '✓ Xong' :
                         item.trang_thai_che_bien === 'MAKING' ? 'Đang làm' :
                         item.trang_thai_che_bien === 'QUEUED' ? 'Chờ' :
                         'Chưa xác nhận'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="mb-4 p-3 bg-[#c9975b] rounded-lg">
                <div className="flex items-center justify-between text-white">
                  <span className="font-semibold">Tổng cộng:</span>
                  <span className="text-xl font-bold">
                    {(order.grand_total || 0).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {order.delivery_status === 'ASSIGNED' && (() => {
                  // Kiểm tra tất cả món đã xong chưa
                  const allItemsDone = order.items?.every(item => item.trang_thai_che_bien === 'DONE') ?? false;
                  const hasItems = order.items && order.items.length > 0;
                  
                  if (!hasItems) {
                    return (
                      <div className="text-center py-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-700 font-semibold">Đơn chưa có món</p>
                      </div>
                    );
                  }
                  
                  if (!allItemsDone) {
                    return (
                      <div className="text-center py-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-700 font-semibold flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Chờ món làm xong
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Tất cả món phải hoàn tất trước khi bắt đầu giao hàng
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-2 border-yellow-600
                      hover:bg-white hover:from-white hover:to-white hover:text-yellow-600 hover:border-yellow-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md"
                    >
                      Bắt đầu giao hàng
                    </button>
                  );
                })()}
                {order.delivery_status === 'OUT_FOR_DELIVERY' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-600
                      hover:bg-white hover:from-white hover:to-white hover:text-green-600 hover:border-green-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md"
                    >
                      ✓ Đã giao hàng
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'FAILED')}
                      className="w-full py-2 rounded-lg font-medium bg-red-50 text-red-700 border border-red-300
                      hover:bg-red-100 transition"
                    >
                      Giao hàng thất bại
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </AuthedLayout>
  );
}

