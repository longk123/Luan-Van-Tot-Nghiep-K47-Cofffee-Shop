// Customer Portal - Order History Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { isCustomerLoggedIn } from '../../auth/customerAuth';
import { Package, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      navigate('/customer/login?return=/customer/orders');
      return;
    }
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data } = await customerApi.getOrders({ limit: 50 });
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      if (error.message.includes('401') || error.message.includes('Token')) {
        navigate('/customer/login?return=/customer/orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetail = async (orderId) => {
    try {
      setLoadingDetail(true);
      const { data } = await customerApi.getOrderDetail(orderId);
      setOrderDetail(data);
      setSelectedOrder(orderId);
    } catch (error) {
      console.error('Error loading order detail:', error);
      alert('Không thể tải chi tiết đơn hàng');
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      OPEN: { text: 'Đang xử lý', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      PAID: { text: 'Đã hoàn thành', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { text: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const statusInfo = statusMap[status] || statusMap.OPEN;
    const Icon = statusInfo.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        <Icon className="w-4 h-4" />
        <span>{statusInfo.text}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Lịch sử đơn hàng</h1>
        <p className="text-lg text-gray-600">Xem tất cả đơn hàng của bạn</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Chưa có đơn hàng</h2>
          <p className="text-lg text-gray-600 mb-8">
            Bạn chưa có đơn hàng nào. Hãy đặt hàng ngay!
          </p>
          <button
            onClick={() => navigate('/customer/menu')}
            className="px-8 py-3 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition"
          >
            Xem thực đơn
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-2 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Mã đơn hàng</div>
                    <div className="text-xl font-bold text-gray-900">#{order.id}</div>
                  </div>
                  {getStatusBadge(order.trang_thai)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Ngày đặt</div>
                    <div className="font-medium">{formatDate(order.opened_at)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Loại đơn</div>
                    <div className="font-medium">
                      {order.order_type === 'TAKEAWAY' ? 'Mang đi' : 'Tại quán'}
                    </div>
                  </div>
                </div>

                {order.table_name && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-1">Bàn</div>
                    <div className="font-medium">{order.table_name}</div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Tổng tiền</div>
                    <div className="text-2xl font-bold text-[#c9975b]">
                      {order.total?.toLocaleString('vi-VN') || '0'}đ
                    </div>
                  </div>
                  <button
                    onClick={() => loadOrderDetail(order.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Eye className="w-5 h-5" />
                    <span>Xem chi tiết</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Detail Sidebar */}
          {selectedOrder && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Chi tiết đơn hàng</h2>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setOrderDetail(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : orderDetail ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Mã đơn</div>
                      <div className="font-bold text-lg">#{orderDetail.id}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500 mb-2">Sản phẩm</div>
                      <div className="space-y-2">
                        {orderDetail.items?.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.ten_mon} x{item.so_luong}
                            </span>
                            <span className="font-medium">
                              {item.line_total?.toLocaleString('vi-VN') || '0'}đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Tạm tính</span>
                        <span>{orderDetail.subtotal?.toLocaleString('vi-VN') || '0'}đ</span>
                      </div>
                      {orderDetail.discount_amount > 0 && (
                        <div className="flex justify-between mb-2 text-green-600">
                          <span>Giảm giá</span>
                          <span>-{orderDetail.discount_amount.toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-bold">Tổng cộng</span>
                        <span className="text-xl font-bold text-[#c9975b]">
                          {orderDetail.total?.toLocaleString('vi-VN') || '0'}đ
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">Không có thông tin</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

