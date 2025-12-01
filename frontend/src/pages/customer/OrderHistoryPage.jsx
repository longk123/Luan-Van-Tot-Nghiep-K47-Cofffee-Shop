// Customer Portal - Order History Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { isCustomerLoggedIn } from '../../auth/customerAuth';
import { Package, Clock, CheckCircle, XCircle, Eye, X, Truck, MapPin } from 'lucide-react';

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      setShowModal(true);
      const { data } = await customerApi.getOrderDetail(orderId);
      setOrderDetail(data);
      setSelectedOrder(orderId);
    } catch (error) {
      console.error('Error loading order detail:', error);
      alert('Không thể tải chi tiết đơn hàng');
      setShowModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
    setOrderDetail(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  <div className="font-medium text-sm">{formatDate(order.opened_at)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Loại đơn</div>
                  <div className="font-medium flex items-center gap-1">
                    {order.order_type === 'DELIVERY' ? (
                      <>
                        <Truck className="w-4 h-4 text-blue-500" />
                        <span>Giao hàng</span>
                      </>
                    ) : (
                      <span>Mang đi</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Tổng tiền</div>
                  <div className="text-xl font-bold text-[#c9975b]">
                    {order.total?.toLocaleString('vi-VN') || '0'}đ
                  </div>
                </div>
                <button
                  onClick={() => loadOrderDetail(order.id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#c9975b] text-white rounded-lg hover:bg-[#b8864a] transition"
                >
                  <Eye className="w-5 h-5" />
                  <span>Chi tiết</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={closeModal}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#c9975b] to-[#d4a574]">
              <div className="text-white">
                <h2 className="text-2xl font-bold">Chi tiết đơn hàng</h2>
                {orderDetail && (
                  <p className="text-white/80">Mã đơn: #{orderDetail.id}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingDetail ? (
                <div className="text-center py-12">
                  <div className="inline-block w-10 h-10 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-500">Đang tải...</p>
                </div>
              ) : orderDetail ? (
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-1">Trạng thái</div>
                      {getStatusBadge(orderDetail.trang_thai)}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-1">Loại đơn</div>
                      <div className="font-medium flex items-center gap-2">
                        {orderDetail.order_type === 'DELIVERY' ? (
                          <>
                            <Truck className="w-5 h-5 text-blue-500" />
                            <span>Giao hàng</span>
                          </>
                        ) : (
                          <span>Mang đi</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-1">Thời gian đặt</div>
                      <div className="font-medium text-sm">{formatDate(orderDetail.opened_at)}</div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {orderDetail.delivery_address && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Địa chỉ giao hàng</div>
                          <div className="font-medium">{orderDetail.delivery_address}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Sản phẩm đã đặt</h3>
                    <div className="space-y-4">
                      {orderDetail.items?.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">
                                {item.ten_mon}
                                {item.ten_bien_the && (
                                  <span className="text-gray-500 font-normal"> ({item.ten_bien_the})</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Số lượng: <span className="text-[#c9975b] font-medium">{item.so_luong}</span> x {item.don_gia?.toLocaleString('vi-VN')}đ
                              </div>
                              
                              {/* Options (Độ ngọt, Mức đá) */}
                              {item.options && item.options.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.options.map((opt, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      {opt.ten_tuy_chon}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Toppings */}
                              {item.toppings && item.toppings.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.toppings.map((t, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                      + {t.ten_tuy_chon}
                                      {t.so_luong > 1 && ` x${t.so_luong}`}
                                      {t.gia_them > 0 && ` (+${t.gia_them.toLocaleString('vi-VN')}đ)`}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Ghi chú */}
                              {item.ghi_chu && (
                                <div className="mt-2 text-sm text-orange-600 italic">
                                  📝 {item.ghi_chu}
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-bold text-lg text-[#c9975b]">
                                {item.line_total?.toLocaleString('vi-VN')}đ
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tạm tính</span>
                        <span>{orderDetail.subtotal?.toLocaleString('vi-VN') || '0'}đ</span>
                      </div>
                      {orderDetail.delivery_fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phí giao hàng</span>
                          <span>{orderDetail.delivery_fee?.toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                      {orderDetail.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Giảm giá</span>
                          <span>-{orderDetail.discount_amount.toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-3 border-t border-gray-300">
                        <span className="font-bold text-lg">Tổng cộng</span>
                        <span className="font-bold text-2xl text-[#c9975b]">
                          {orderDetail.total?.toLocaleString('vi-VN') || '0'}đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Không có thông tin đơn hàng</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

