// Customer Portal - Order Success Page
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { CheckCircle, Package, ArrowRight, Home, ShoppingBag } from 'lucide-react';

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      navigate('/customer');
      return;
    }
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      const { data } = await customerApi.getOrderDetail(parseInt(orderId));
      setOrder(data);
    } catch (error) {
      console.error('Error loading order detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'OPEN': { text: 'Đang xử lý', color: 'bg-blue-100 text-blue-800' },
      'PAID': { text: 'Đã thanh toán', color: 'bg-green-100 text-green-800' },
      'CANCELLED': { text: 'Đã hủy', color: 'bg-red-100 text-red-800' },
      'COMPLETED': { text: 'Hoàn thành', color: 'bg-purple-100 text-purple-800' }
    };
    const statusInfo = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9975b] mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy đơn hàng</p>
          <Link
            to="/customer"
            className="inline-flex items-center px-4 py-2 bg-[#c9975b] text-white rounded-lg hover:bg-[#b8864a] transition"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Đặt hàng thành công!
          </h1>
          <p className="text-gray-600 mb-4">
            Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Package className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Mã đơn hàng:</span>
            <span className="text-lg font-semibold text-gray-900">#{order.order_id || orderId}</span>
          </div>
          {order.order_status && (
            <div className="mt-4">
              {getStatusBadge(order.order_status)}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin đơn hàng</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Loại đơn:</span>
              <span className="font-medium text-gray-900">
                {order.order_type === 'DINE_IN' ? 'Tại quán' : 'Mang đi'}
              </span>
            </div>
            
            {order.opened_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian đặt:</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.opened_at).toLocaleString('vi-VN')}
                </span>
              </div>
            )}

            {order.total_amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tổng tiền:</span>
                <span className="font-bold text-lg text-[#c9975b]">
                  {new Intl.NumberFormat('vi-VN').format(order.total_amount)} đ
                </span>
              </div>
            )}

            {order.total_discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá:</span>
                <span className="font-medium">
                  -{new Intl.NumberFormat('vi-VN').format(order.total_discount)} đ
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Chi tiết đơn hàng</h2>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.ten_mon}</div>
                    {item.ten_bien_the && (
                      <div className="text-sm text-gray-500">{item.ten_bien_the}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {item.so_luong} x {new Intl.NumberFormat('vi-VN').format(item.don_gia)} đ
                    </div>
                  </div>
                  <div className="font-medium text-gray-900">
                    {new Intl.NumberFormat('vi-VN').format(item.line_total)} đ
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            to="/customer/orders"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#c9975b] text-white rounded-lg hover:bg-[#b8864a] transition font-medium"
          >
            <Package className="w-5 h-5" />
            Xem lịch sử đơn hàng
          </Link>
          <Link
            to="/customer"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-[#c9975b] hover:text-[#c9975b] transition font-medium"
          >
            <Home className="w-5 h-5" />
            Về trang chủ
          </Link>
        </div>

        {/* Continue Shopping */}
        <div className="mt-6 text-center">
          <Link
            to="/customer/menu"
            className="inline-flex items-center gap-2 text-[#c9975b] hover:text-[#b8864a] font-medium transition"
          >
            <ShoppingBag className="w-5 h-5" />
            Tiếp tục mua sắm
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

