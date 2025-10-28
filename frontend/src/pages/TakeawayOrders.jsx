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
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, order: null });
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  
  // Shift management - sử dụng ca của thu ngân
  const [shift, setShift] = useState(null);

  // Role-based access control - Takeaway chỉ dành cho thu ngân
  useEffect(() => {
    const user = getUser();
    const userRoles = user?.roles || [];
    const isKitchenStaff = userRoles.some(role => 
      ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
    );
    
    if (isKitchenStaff) {
      // Redirect pha chế về trang kitchen
      console.log('🍳 Kitchen staff detected, redirecting to /kitchen');
      navigate('/kitchen', { replace: true });
    }
  }, [navigate]);

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
      const res = await api.get('/pos/takeaway-orders');
      setOrders(res?.data || res || []);
    } catch (err) {
      console.error('Error loading takeaway orders:', err);
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
        evt.type === 'order.completed') {
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
        order_type: 'TAKEAWAY'
      }
    });
  };

  const OrderCard = ({ order }) => {
    const allDone = order.items?.every(item => item.trang_thai_che_bien === 'DONE');
    const isPaid = order.trang_thai === 'PAID';
    
    return (
      <div 
        className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-lg border-2 border-[#d4a574]/30 p-6 hover:shadow-2xl hover:border-[#c9975b] transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
        onClick={() => handleOpenOrder(order)}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-2xl font-bold text-[#8b6f47] flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Đơn #{order.id}
            </h3>
            <p className="text-sm text-[#c9975b] font-medium mt-1">
              {new Date(order.opened_at).toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md ${
              isPaid 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
            }`}>
              {isPaid ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
            </span>
            {allDone && (
              <span className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md">
                ✅ Món đã xong
              </span>
            )}
          </div>
        </div>

        {/* Danh sách món - ENHANCED */}
        <div className="space-y-3 mb-5">
          {order.items?.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gradient-to-br from-white to-[#fef7ed] rounded-2xl border-2 border-[#e7d4b8] shadow-sm">
              <div className="flex-1">
                <span className="font-bold text-[#8b6f47]">
                  {item.mon_ten} {item.bien_the_ten && `• ${item.bien_the_ten}`}
                </span>
                {item.ghi_chu && (
                  <p className="text-xs text-[#c9975b] mt-1 font-medium">📝 {item.ghi_chu}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#8b6f47] font-bold text-lg">×{item.so_luong}</span>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                  item.trang_thai_che_bien === 'DONE' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                  item.trang_thai_che_bien === 'MAKING' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                  item.trang_thai_che_bien === 'QUEUED' ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                  'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
                }`}>
                  {item.trang_thai_che_bien === 'DONE' ? 'Hoàn thành' :
                   item.trang_thai_che_bien === 'MAKING' ? 'Đang làm' :
                   item.trang_thai_che_bien === 'QUEUED' ? 'Chờ làm' : 'Chưa xác nhận'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tổng tiền - ENHANCED */}
        <div className="border-t-2 border-[#e7d4b8] pt-4 mb-4">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#fef7ed] to-[#e7d4b8] rounded-2xl p-4">
            <span className="text-[#8b6f47] font-bold text-lg">Tổng cộng:</span>
            <span className="text-3xl font-bold text-[#c9975b]">
              {(order.grand_total || 0).toLocaleString()}₫
            </span>
          </div>
        </div>

        {/* Action buttons - stopPropagation để không trigger open drawer - ENHANCED */}
        {allDone ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {isPaid ? (
              /* Đã thanh toán → Chỉ cần giao */
              <button
                onClick={() => handleDeliver(order)}
                className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-600
                hover:bg-white hover:text-green-600 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                ✓ Giao hàng
              </button>
            ) : (
              /* Chưa thanh toán → Nút giao & thu tiền */
              <button
                onClick={async () => {
                  // Mở drawer để thanh toán
                  handleOpenOrder(order);
                }}
                className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white border-2 border-amber-600
                hover:bg-white hover:text-amber-600 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                💰 Thu tiền & Giao hàng
              </button>
            )}
          </div>
        ) : (
          /* Món chưa xong → Tổng kết ưu tiên */
          <div className="text-center py-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200">
            {order.items?.some(i => i.trang_thai_che_bien === 'PENDING') ? (
              <p className="text-sm text-amber-700 font-bold flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ⏸️ Chưa xác nhận đơn
              </p>
            ) : (
              <p className="text-sm text-[#c9975b] font-bold flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ⏳ Đơn chưa làm món xong
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const rightPad = drawer.open ? '680px' : '0px';

  return (
    <AuthedLayout>
      {!drawer.open ? (
        /* Chế độ xem danh sách */
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold text-[#8b6f47] bg-gradient-to-r from-white to-[#fef7ed] border-2 border-[#d4a574] rounded-2xl
                    hover:bg-gradient-to-r hover:from-[#c9975b] hover:to-[#d4a574] hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Trở lại Dashboard
                  </button>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-[#8b6f47] to-[#c9975b] bg-clip-text text-transparent flex items-center gap-2">
                    <svg className="w-8 h-8 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Đơn mang đi
                  </h2>
                </div>
                <p className="text-sm text-[#c9975b] font-medium">Quản lý đơn takeaway</p>
                {shift && shift.id && (
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-md font-bold">
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                      Ca #{shift.id} - {shift.nhan_vien?.full_name || shift.nhan_vien_ten || 'Unknown'}
                    </span>
                    <span className="text-[#8b6f47] font-medium">
                      Bắt đầu: {shift.started_at ? new Date(shift.started_at).toLocaleString('vi-VN') : 'Invalid Date'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {!shift && (
                  <div className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-2xl border-2 border-amber-500 flex items-center gap-2 shadow-lg font-bold">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>⚠️ Chưa mở ca</span>
                  </div>
                )}
                {shift && shift.status !== 'OPEN' && (
                  <div className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-2xl border-2 border-red-600 flex items-center gap-2 shadow-lg font-bold">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>❌ Ca đã đóng</span>
                  </div>
                )}
              </div>
            </div>
          </div>

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
              <p className="text-[#8b6f47] font-bold text-xl">Không có đơn mang đi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map(order => (
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
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold text-[#8b6f47] bg-gradient-to-r from-white to-[#fef7ed] border-2 border-[#d4a574] rounded-2xl
                hover:bg-gradient-to-r hover:from-[#c9975b] hover:to-[#d4a574] hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
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

