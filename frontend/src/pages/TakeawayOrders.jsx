// src/pages/TakeawayOrders.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import useSSE from '../hooks/useSSE.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import OrderDrawer from '../components/OrderDrawer.jsx';
import MenuPanel from '../components/MenuPanel.jsx';
import Toast from '../components/Toast.jsx';
import { getUser } from '../auth.js';

export default function TakeawayOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('TAKEAWAY'); // 'TAKEAWAY' or 'DELIVERY' or 'ALL'
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, order: null });
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [waiters, setWaiters] = useState([]);
  const [assigningOrder, setAssigningOrder] = useState(null);
  
  // Shift management - sử dụng ca của thu ngân
  const [shift, setShift] = useState(null);

  // Get user info and check view mode
  const user = getUser();
  const userRoles = user?.roles || [];

  // Check if user is Manager (View Only mode)
  const isManagerViewMode = userRoles.some(role =>
    ['manager', 'admin'].includes(role.toLowerCase())
  ) && !userRoles.some(role =>
    ['cashier'].includes(role.toLowerCase())
  );

  // Check if user is Waiter (View Only mode - không thể phân công giao hàng)
  const isWaiter = userRoles.some(role =>
    role.toLowerCase() === 'waiter'
  ) && !userRoles.some(role =>
    ['cashier', 'manager', 'admin'].includes(role.toLowerCase())
  );

  // Role-based access control - Takeaway chỉ dành cho thu ngân
  useEffect(() => {
    const isKitchenStaff = userRoles.some(role =>
      ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
    );

    if (isKitchenStaff) {
      // Redirect pha chế về trang kitchen
      console.log('🍳 Kitchen staff detected, redirecting to /kitchen');
      navigate('/kitchen', { replace: true });
    }
  }, [navigate, userRoles]);

  // Load shift information
  async function loadShift() {
    try {
      const res = await api.getCurrentShift();
      const shiftData = res?.data || res;
      
      // Kiểm tra shift có hợp lệ không
      if (shiftData && shiftData.id && shiftData.status === 'OPEN') {
        setShift(shiftData);
      } else {
        console.log('No valid shift found:', shiftData);
        setShift(null);
      }
    } catch (err) {
      console.error('Error loading shift:', err);
      setShift(null);
    }
  }

  async function loadOrders() {
    setLoading(true);
    try {
      // Lấy các đơn TAKEAWAY còn món chưa xong
      const takeawayRes = await api.get('/pos/takeaway-orders');
      setOrders(takeawayRes?.data || takeawayRes || []);
      
      // Lấy các đơn DELIVERY còn món chưa xong
      const deliveryRes = await api.get('/pos/delivery-orders');
      setDeliveryOrders(deliveryRes?.data || deliveryRes || []);
      
      // Lấy danh sách nhân viên phục vụ (nếu là Cashier/Manager, không phải Waiter)
      if (!isManagerViewMode && !isWaiter) {
        try {
          const waitersRes = await api.getWaiters();
          setWaiters(waitersRes?.data || waitersRes || []);
        } catch (err) {
          console.error('Error loading waiters:', err);
        }
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    loadOrders(); 
    loadShift();
  }, []);

  // SSE auto refresh
  useSSE('/api/v1/pos/events', (evt) => {
    if (evt.type === 'order.items.changed' || 
        evt.type === 'kitchen.line.updated' ||
        evt.type === 'order.confirmed' ||
        evt.type === 'order.completed' ||
        evt.type === 'order.created' ||
        evt.type === 'order.updated') {
      loadOrders();
    }
    
    // Reload shift when shift changes
    if (evt.type === 'shift.opened' || evt.type === 'shift.closed') {
      loadShift();
    }
  });

  const handleDeliver = async (order) => {
    try {
      await api.post(`/pos/orders/${order.id}/deliver`);
      setToast({
        show: true,
        type: 'success',
        title: 'Giao hàng thành công!',
        message: `Đơn #${order.id} đã giao cho khách`
      });
      loadOrders();
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể giao hàng'
      });
    }
  };

  const handleOpenOrder = (order) => {
    setDrawer({
      open: true,
      order: {
        id: order.id,
        order_type: order.order_type || order._type || 'TAKEAWAY'
      }
    });
  };

  const handleAssignDelivery = async (order, shipperId) => {
    try {
      await api.assignDeliveryOrder(order.id, shipperId);
      setToast({
        show: true,
        type: 'success',
        title: 'Phân công thành công!',
        message: `Đơn #${order.id} đã được phân công cho nhân viên phục vụ`
      });
      setAssigningOrder(null);
      loadOrders();
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể phân công đơn'
      });
    }
  };

  const OrderCard = ({ order }) => {
    const allDone = order.items?.every(item => item.trang_thai_che_bien === 'DONE');
    const isPaid = order.trang_thai === 'PAID';
    const itemCount = order.items?.length || 0;
    const hasManyItems = itemCount > 2;

    return (
      <div
        className={`bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-xl hover:border-[#c9975b] transition-all duration-200 ${(isManagerViewMode || isWaiter) ? 'cursor-default' : 'cursor-pointer'}`}
        onClick={(isManagerViewMode || isWaiter) ? undefined : () => handleOpenOrder(order)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-[#8b6f47] flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Đơn #{order.id}
              </h3>
              {order.is_pre_order && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-300">
                  Đặt trước
                </span>
              )}
            </div>
            <p className="text-sm text-[#8b6f47] font-medium">
              {new Date(order.opened_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            {/* Thông tin khách hàng (nếu có) */}
            {order.khach_hang_ten && (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  👤 {order.khach_hang_ten}
                </p>
                {order.khach_hang_phone && (
                  <p className="text-xs text-gray-600">
                    📞 {order.khach_hang_phone}
                  </p>
                )}
              </div>
            )}
            {/* Thông tin giao hàng (nếu là DELIVERY) */}
            {order.order_type === 'DELIVERY' && order.delivery_address && (
              <div className="mt-2 space-y-1 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-900">
                  📍 Địa chỉ giao hàng:
                </p>
                <p className="text-xs text-blue-800">
                  {order.delivery_address}
                </p>
                {order.delivery_phone && (
                  <p className="text-xs text-blue-700 mt-1">
                    📞 SĐT nhận: {order.delivery_phone}
                  </p>
                )}
                {order.distance_km && (
                  <p className="text-xs text-blue-600 mt-1">
                    📏 Cách quán: {parseFloat(order.distance_km).toFixed(2)}km
                  </p>
                )}
                {order.delivery_fee > 0 && (
                  <p className="text-xs text-blue-700 mt-1 font-semibold">
                    💰 Phí ship: {order.delivery_fee.toLocaleString('vi-VN')}đ
                  </p>
                )}
                {/* Thông tin shipper nếu đã được phân công */}
                {order.shipper_name && (
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <p className="text-xs text-blue-900 font-semibold">
                      👤 Nhân viên giao: {order.shipper_name}
                    </p>
                    {order.delivery_status && (
                      <p className="text-xs text-blue-700 mt-0.5">
                        Trạng thái: {
                          order.delivery_status === 'ASSIGNED' ? 'Đã phân công' :
                          order.delivery_status === 'OUT_FOR_DELIVERY' ? 'Đang giao hàng' :
                          order.delivery_status === 'DELIVERED' ? 'Đã giao' :
                          order.delivery_status === 'FAILED' ? 'Giao thất bại' :
                          'Chờ phân công'
                        }
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              isPaid
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 text-white'
            }`}>
              {isPaid ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Đã thanh toán
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Chưa thanh toán
                </>
              )}
            </span>
            {allDone && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Món đã xong
              </span>
            )}
          </div>
        </div>

        {/* Danh sách món - Chỉ hiển thị 2 món, scroll nếu nhiều hơn */}
        <div className={`space-y-2 mb-4 ${hasManyItems ? 'max-h-[160px] overflow-y-auto pr-2' : ''}`}>
          {order.items?.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {(item.mon_ten || item.ten_mon || item.ten_mon_snapshot || '').trim() || 'Món không tên'}
                  {item.bien_the_ten && (
                    <span className="text-gray-600 font-normal ml-2">• {item.bien_the_ten}</span>
                  )}
                </div>
                {item.ghi_chu && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {item.ghi_chu}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-700 font-semibold">×{item.so_luong}</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                  item.trang_thai_che_bien === 'DONE' ? 'bg-green-100 text-green-700' :
                  item.trang_thai_che_bien === 'MAKING' ? 'bg-blue-100 text-blue-700' :
                  item.trang_thai_che_bien === 'QUEUED' ? 'bg-gray-200 text-gray-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {item.trang_thai_che_bien === 'DONE' ? 'Xong' :
                   item.trang_thai_che_bien === 'MAKING' ? 'Đang làm' :
                   item.trang_thai_che_bien === 'QUEUED' ? 'Chờ' : 'Chưa xác nhận'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tổng tiền */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="flex items-center justify-between bg-[#c9975b] rounded-xl p-4">
            <span className="text-white font-bold text-base">Tổng cộng:</span>
            <span className="text-2xl font-bold text-white">
              {(order.grand_total || 0).toLocaleString()}₫
            </span>
          </div>
        </div>

        {/* Action buttons - stopPropagation để không trigger open drawer - ENHANCED */}
        {!isManagerViewMode && !isWaiter && allDone ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {/* Đối với đơn DELIVERY: Thu ngân chỉ phân công, không giao hàng */}
            {order.order_type === 'DELIVERY' ? (
              !order.shipper_id ? (
                /* Chưa được phân công → Hiển thị nút phân công */
                <div className="mb-2">
                  {assigningOrder === order.id ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Chọn nhân viên phục vụ:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {waiters.map(waiter => (
                          <button
                            key={waiter.user_id}
                            onClick={() => handleAssignDelivery(order, waiter.user_id)}
                            className="w-full px-3 py-2 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                          >
                            <p className="font-medium text-gray-900">{waiter.full_name}</p>
                            {waiter.phone && (
                              <p className="text-xs text-gray-600">📞 {waiter.phone}</p>
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setAssigningOrder(null)}
                        className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAssigningOrder(order.id)}
                      className="w-full py-3 rounded-xl font-semibold bg-purple-500 text-white border-2 border-purple-500
                      hover:bg-white hover:text-purple-600 hover:border-purple-500 hover:shadow-lg transition-all duration-200 shadow-md flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Phân công giao hàng
                    </button>
                  )}
                </div>
              ) : (
                /* Đã được phân công → Hiển thị thông tin, không có nút giao hàng (nhân viên phục vụ sẽ giao) */
                <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-semibold">
                    Đã phân công cho: {order.shipper_name || 'Nhân viên phục vụ'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Nhân viên phục vụ sẽ thực hiện giao hàng
                  </p>
                </div>
              )
            ) : (
              /* Đối với đơn TAKEAWAY: Thu ngân có thể thu tiền và giao tại quán */
              isPaid ? (
                /* Đã thanh toán → Giao cho khách tại quán */
                <button
                  onClick={() => handleDeliver(order)}
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-green-500 text-white border-2 border-green-500
                  hover:bg-white hover:text-green-600 hover:border-green-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500 disabled:hover:text-white transition-all duration-200 shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Giao cho khách
                </button>
              ) : (
                /* Chưa thanh toán → Chỉ thu tiền (không giao hàng vì là đơn mang đi tại quán) */
                <button
                  onClick={async () => {
                    // Mở drawer để thanh toán
                    handleOpenOrder(order);
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-amber-500 text-white border-2 border-amber-500
                  hover:bg-white hover:text-amber-600 hover:border-amber-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500 disabled:hover:text-white transition-all duration-200 shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Thu tiền
                </button>
              )
            )}
          </div>
        ) : (
          /* Món chưa xong → Tổng kết ưu tiên */
          <div className="text-center py-3 bg-amber-50 rounded-lg border border-amber-200">
            {order.items?.some(i => i.trang_thai_che_bien === 'PENDING') ? (
              <p className="text-sm text-amber-700 font-semibold flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Đơn chưa làm món xong
              </p>
            ) : (
              <p className="text-sm text-amber-700 font-semibold flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Đơn chưa làm món xong
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const rightPad = drawer.open ? '680px' : '0px';

  return (
    <AuthedLayout
      isManagerViewMode={isManagerViewMode}
      pageName="Đơn mang đi"
      backUrl="/manager"
    >
      {!drawer.open ? (
        /* Chế độ xem danh sách */
        <>
          {/* Header Card - Improved to match Dashboard style */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
            <div className="flex items-center justify-between gap-6">
              {/* Left: Title and Shift info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#c9975b] rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Đơn mang đi & Giao hàng</h2>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-[#c9975b] rounded-full animate-pulse"></span>
                      Quản lý đơn mang đi và giao hàng
                    </p>
                  </div>
                </div>

                {/* Shift info */}
                {shift && shift.id && (
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl shadow-sm font-bold">
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                      Ca #{shift.id} - {shift.nhan_vien?.full_name || shift.nhan_vien_ten || 'Unknown'}
                    </span>
                    <span className="text-[#8b6f47] font-medium">
                      Bắt đầu: {shift.started_at ? new Date(shift.started_at).toLocaleString('vi-VN') : '--'}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Action buttons */}
              <div className="flex flex-col items-end gap-3">
                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 justify-end">
                  {/* Nút Quay lại Manager Dashboard - Chỉ hiển thị cho Manager */}
                  {isManagerViewMode && (
                    <button
                      onClick={() => navigate('/manager')}
                      className="px-4 py-2.5 bg-blue-500 text-white border-2 border-blue-500 rounded-xl hover:bg-white hover:text-blue-600 hover:border-blue-500 hover:shadow-lg transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span>Quay lại Manager Dashboard</span>
                    </button>
                  )}

                  {/* Nút Quay lại Dashboard - Hiển thị cho cả Cashier và Manager */}
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2.5 bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Quay lại Dashboard</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs để chuyển giữa TAKEAWAY và DELIVERY - Với invert hover */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('TAKEAWAY')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 border-2 ${
                  activeTab === 'TAKEAWAY'
                    ? 'bg-[#c9975b] text-white border-[#c9975b] shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-[#c9975b] hover:text-white hover:border-[#c9975b]'
                }`}
              >
                Mang đi ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('DELIVERY')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 border-2 ${
                  activeTab === 'DELIVERY'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                }`}
              >
                Giao hàng ({deliveryOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 border-2 ${
                  activeTab === 'ALL'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-600 hover:text-white hover:border-purple-600'
                }`}
              >
                Tất cả ({orders.length + deliveryOrders.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#c9975b] mx-auto mb-6"></div>
              <p className="text-gray-600 font-semibold text-lg">Đang tải...</p>
            </div>
          ) : (activeTab === 'TAKEAWAY' && orders.length === 0) || 
              (activeTab === 'DELIVERY' && deliveryOrders.length === 0) ||
              (activeTab === 'ALL' && orders.length === 0 && deliveryOrders.length === 0) ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-200">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600 font-bold text-xl">
                {activeTab === 'TAKEAWAY' ? 'Không có đơn mang đi' :
                 activeTab === 'DELIVERY' ? 'Không có đơn giao hàng' :
                 'Không có đơn nào'}
              </p>
              <p className="text-gray-400 mt-2">Các đơn hàng sẽ xuất hiện ở đây khi được tạo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === 'TAKEAWAY' && orders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {activeTab === 'DELIVERY' && deliveryOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {activeTab === 'ALL' && [
                ...orders.map(order => ({ ...order, _type: 'TAKEAWAY' })),
                ...deliveryOrders.map(order => ({ ...order, _type: 'DELIVERY' }))
              ].sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at)).map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Chế độ làm việc với đơn (Menu + Drawer) */
        <>
          {/* Nút quay lại */}
          <div className="mb-4" style={{ paddingRight: rightPad, transition: 'padding-right 0.3s' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setDrawer({ open: false, order: null });
                  loadOrders();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold bg-[#c9975b] text-white border-2 border-[#c9975b] rounded-2xl
                hover:bg-white hover:text-[#c9975b] transition-all duration-200 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại danh sách
              </button>
              <div className="text-sm text-gray-500">
                Mang đi • Đơn #{drawer.order?.id}
              </div>
            </div>
          </div>

          {/* MenuPanel */}
          <div style={{ paddingRight: rightPad, transition: 'padding-right 0.3s' }}>
            <MenuPanel 
              orderId={drawer.order.id}
              onAdded={() => {
                // Force remount OrderDrawer bằng cách đóng và mở lại
                const currentOrder = drawer.order;
                setDrawer({ open: false, order: null });
                setTimeout(() => {
                  setDrawer({ open: true, order: currentOrder });
                }, 50);
              }}
              onShowToast={setToast}
            />
          </div>
        </>
      )}

      {/* OrderDrawer để xem chi tiết và tương tác */}
      <OrderDrawer
        key={drawer.order?.id}
        open={drawer.open}
        onClose={() => {
          setDrawer({ open: false, order: null });
          loadOrders(); // Reload sau khi đóng drawer
        }}
        order={drawer.order}
        onPaid={() => {
          loadOrders();
        }}
        refreshTick={refreshTick}
        width={680}
        docked={true}
        onShowToast={setToast}
      />

      <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />
    </AuthedLayout>
  );
}

