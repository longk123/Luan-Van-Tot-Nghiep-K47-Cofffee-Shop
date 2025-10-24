// src/pages/TakeawayOrders.jsx
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import useSSE from '../hooks/useSSE.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import OrderDrawer from '../components/OrderDrawer.jsx';
import MenuPanel from '../components/MenuPanel.jsx';
import Toast from '../components/Toast.jsx';

export default function TakeawayOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, order: null });
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

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

  useEffect(() => { loadOrders(); }, []);

  // SSE auto refresh
  useSSE('/api/v1/pos/events', (evt) => {
    if (evt.type === 'order.items.changed' || 
        evt.type === 'kitchen.line.updated' ||
        evt.type === 'order.confirmed' ||
        evt.type === 'order.completed') {
      loadOrders();
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
        className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-5 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer"
        onClick={() => handleOpenOrder(order)}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Đơn #{order.id}
            </h3>
            <p className="text-sm text-gray-600">
              {new Date(order.opened_at).toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              isPaid 
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-amber-100 text-amber-700 border border-amber-300'
            }`}>
              {isPaid ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
            </span>
            {allDone && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-300">
                ✅ Món đã xong
              </span>
            )}
          </div>
        </div>

        {/* Danh sách món */}
        <div className="space-y-2 mb-4">
          {order.items?.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <span className="font-medium text-gray-900">
                  {item.mon_ten} {item.bien_the_ten && `• ${item.bien_the_ten}`}
                </span>
                {item.ghi_chu && (
                  <p className="text-xs text-gray-600 mt-1">📝 {item.ghi_chu}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-700 font-semibold">×{item.so_luong}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  item.trang_thai_che_bien === 'DONE' ? 'bg-green-100 text-green-700' :
                  item.trang_thai_che_bien === 'MAKING' ? 'bg-blue-100 text-blue-700' :
                  item.trang_thai_che_bien === 'QUEUED' ? 'bg-gray-100 text-gray-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {item.trang_thai_che_bien === 'DONE' ? 'Hoàn thành' :
                   item.trang_thai_che_bien === 'MAKING' ? 'Đang làm' :
                   item.trang_thai_che_bien === 'QUEUED' ? 'Chờ làm' : 'Chưa xác nhận'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tổng tiền */}
        <div className="border-t-2 border-gray-200 pt-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">Tổng cộng:</span>
            <span className="text-2xl font-bold text-gray-900">
              {(order.grand_total || 0).toLocaleString()}đ
            </span>
          </div>
        </div>

        {/* Action buttons - stopPropagation để không trigger open drawer */}
        {allDone ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {isPaid ? (
              /* Đã thanh toán → Chỉ cần giao */
              <button
                onClick={() => handleDeliver(order)}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 outline-none focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 px-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 outline-none focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                💰 Thu tiền & Giao hàng
              </button>
            )}
          </div>
        ) : (
          /* Món chưa xong → Tổng kết ưu tiên */
          <div className="text-center py-2">
            {order.items?.some(i => i.trang_thai_che_bien === 'PENDING') ? (
              <p className="text-sm text-amber-700 font-semibold">⏸️ Chưa xác nhận đơn</p>
            ) : (
              <p className="text-sm text-gray-600 font-medium">⏳ Đơn chưa làm món xong</p>
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
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📦 Đơn mang đi</h2>
                <p className="text-sm text-gray-600">Quản lý đơn takeaway</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 font-medium">Không có đơn mang đi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <button
              onClick={() => {
                setDrawer({ open: false, order: null });
                loadOrders();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-colors outline-none focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại danh sách
            </button>
            <div className="text-sm text-gray-500 mt-2">
              Mang đi • Đơn #{drawer.order?.id}
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

