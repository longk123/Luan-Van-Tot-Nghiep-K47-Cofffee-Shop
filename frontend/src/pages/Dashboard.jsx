// === src/pages/Dashboard.jsx ===
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import { api } from '../api.js';
import { getUser } from '../auth.js';
import AreaTabs from '../components/AreaTabs.jsx';
import TableCard from '../components/TableCard.jsx';
import OrderDrawer from '../components/OrderDrawer.jsx';
import useSSE from '../hooks/useSSE.js';
import MenuPanel from '../components/MenuPanel.jsx';
import Toast from '../components/Toast.jsx';
import ReservationPanel from '../components/ReservationPanel.jsx';
import ReservationsList from '../components/ReservationsList.jsx';
import CloseShiftModal from '../components/CloseShiftModal.jsx';
import OpenShiftModal from '../components/OpenShiftModal.jsx';
import OpenOrdersDialog from '../components/OpenOrdersDialog.jsx';
import CurrentShiftOrders from '../components/CurrentShiftOrders.jsx';

export default function Dashboard({ defaultMode = 'dashboard' }) {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [activeArea, setActiveArea] = useState(null);
  const [tables, setTables] = useState([]);
  const [drawer, setDrawer] = useState({ open: false, order: null });
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [shift, setShift] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  const [triggerCancelDialog, setTriggerCancelDialog] = useState(false);
  const [drawerHasItems, setDrawerHasItems] = useState(false);
  const [drawerHasPendingItems, setDrawerHasPendingItems] = useState(false);
  
  // POS mode states
  const [posMode, setPosMode] = useState(defaultMode === 'pos');
  
  // Confirmation dialog states
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [pendingOrderCreation, setPendingOrderCreation] = useState(null); // { type: 'table', table } hoặc { type: 'takeaway' }

  // Reservation states
  const [showReservationPanel, setShowReservationPanel] = useState(false);
  const [showReservationsList, setShowReservationsList] = useState(false);
  
  // Shift management states
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  
  // Transferred orders tracking
  const [transferredOrders, setTransferredOrders] = useState([]);
  const [showTransferredOrdersDialog, setShowTransferredOrdersDialog] = useState(false);
  
  // Current shift orders
  const [showCurrentShiftOrders, setShowCurrentShiftOrders] = useState(false);
  const [shiftOrdersRefreshKey, setShiftOrdersRefreshKey] = useState(0);
  const [user, setUser] = useState(null);

  // Role-based access control
  const [userRoles, setUserRoles] = useState([]);
  
  // Load user data
  useEffect(() => {
    const userData = getUser();
    console.log('🔍 Dashboard - User data:', userData);
    setUser(userData);
  }, []);
  
  useEffect(() => {
    const user = getUser();
    const roles = user?.roles || [];
    setUserRoles(roles);
    
    const isKitchenStaff = roles.some(role => 
      ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
    );
    
    if (isKitchenStaff) {
      // Redirect pha chế về trang kitchen
      console.log('🍳 Kitchen staff detected, redirecting to /kitchen');
      navigate('/kitchen', { replace: true });
    }
  }, [navigate]);
  
  // Check if user can view current shift orders (cashier, manager, admin)
  const canViewCurrentShiftOrders = userRoles.some(role => 
    ['cashier', 'manager', 'admin'].includes(role.toLowerCase())
  );

  // Debug: Log drawer state changes
  useEffect(() => {
    console.log('📦 Drawer state changed:', drawer);
  }, [drawer]);

  async function loadAreas() {
    const res = await api.get('/areas');
    const data = res?.data || res || [];
    setAreas(data);
    if (!activeArea && data.length) setActiveArea(data[0].id);
  }

  async function loadTables() {
    setLoading(true);
    try {
      const res = await api.getPosTables();
      setTables(res?.data || res || []);
    } finally { setLoading(false); }
  }

  async function loadShift() {
    try {
      const res = await api.getCurrentShift();
      const shiftData = res?.data || res || null;
      console.log('📊 Loaded shift:', shiftData);
      setShift(shiftData);
      
      // Load transferred orders (orders from previous shift)
      if (shiftData?.id) {
        loadTransferredOrders(shiftData.id);
      }
    } catch (err) {
      console.error('Error loading shift:', err);
      setShift(null);
    }
  }
  
  async function loadTransferredOrders(shiftId) {
    try {
      const res = await api.getTransferredOrders(shiftId);
      const data = res?.data || res || { orders: [] };
      setTransferredOrders(data.orders || []);
      
      if (data.count > 0) {
        console.log(`📋 Loaded ${data.count} orders from previous shift`);
      }
    } catch (err) {
      console.error('Error loading transferred orders:', err);
      setTransferredOrders([]);
    }
  }

  useEffect(() => { loadAreas(); }, []);
  useEffect(() => { loadTables(); }, []);

  // Load shift info
  useEffect(() => {
    loadShift();

    // Detect payment redirect từ PayOS (kiểm tra localStorage)
    const paymentResult = localStorage.getItem('payos_payment_result');
    
    if (paymentResult) {
      try {
        const result = JSON.parse(paymentResult);
        const age = Date.now() - result.timestamp;
        
        // Chỉ hiển thị nếu < 30 giây (tránh hiển thị lại khi refresh)
        if (age < 30000) {
          if (result.status === 'success') {
            setToast({
              show: true,
              type: 'success',
              title: 'Thanh toán thành công!',
              message: `Đã nhận ${result.orderCode ? 'đơn #' + result.orderCode : 'thanh toán'} qua PayOS - Status: ${result.paymentStatus || 'PAID'}`
            });
            
            // Refresh tables để cập nhật order status
            setTimeout(() => loadTables(), 500);
          } else if (result.status === 'cancel') {
            setToast({
              show: true,
              type: 'warning',
              title: 'Đã hủy thanh toán',
              message: `Đơn ${result.orderCode || ''} đã bị hủy - Status: ${result.paymentStatus || 'CANCELLED'}`
            });
          } else if (result.status === 'pending') {
            setToast({
              show: true,
              type: 'info',
              title: 'Đang xử lý thanh toán',
              message: 'Thanh toán đang được xử lý, vui lòng đợi'
            });
          }
        }
        
        // Xóa payment result khỏi localStorage
        localStorage.removeItem('payos_payment_result');
      } catch (err) {
        console.error('Error parsing payment result:', err);
      }
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // SSE for real-time updates
  useSSE('/api/v1/pos/events', (evt) => {
    if (['table.updated','order.updated','order.closed','order.items.changed'].includes(evt.type)) {
      loadTables();
      if (drawer.open) {
        setRefreshTick((x) => x + 1);
      }
      // Reload transferred orders khi có thay đổi
      if (shift?.id) {
        loadTransferredOrders(shift.id);
      }
    }
  }, [shift?.id]);

  // Group tables by area
  const tablesByArea = useMemo(() => {
    const map = new Map();
    areas.forEach((a) => map.set(a.id, { ...a, tables: [] }));
    tables.forEach((t) => {
      const key = t.khu_vuc_id || 0;
      if (!map.has(key)) map.set(key, { id: key, ten: t.khu_vuc || "Khác", tables: [] });
      map.get(key).tables.push(t);
    });
    return Array.from(map.values()).sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0));
  }, [areas, tables]);

  // Current area tables
  const currentAreaTables = useMemo(() => {
    if (posMode) return tables;
    return tables.filter(t => t.khu_vuc_id === activeArea);
  }, [tables, activeArea, posMode]);

  async function handleTableClick(table) {
    console.log('=== TableCard clicked ===');
    console.log('Table:', table);
    
    // Backend trả về order_id hoặc current_order_id
    const orderId = table.order_id || table.current_order_id || table.don_hang_id;
    console.log('Has order ID?', orderId);
    console.log('Table status:', table.trang_thai);
    
    // Nếu bàn có đơn (dù thanh toán hay chưa), mở drawer để xem chi tiết
    if (orderId) {
      console.log('✅ Opening drawer for order:', orderId);
      const drawerData = { 
        open: true, 
        order: { 
          id: orderId, 
          ban_id: table.id, 
          order_type: 'DINE_IN',
          trang_thai: table.order_status,
          status: table.order_status
        } 
      };
      console.log('Setting drawer:', drawerData);
      setDrawer(drawerData);
      console.log('Drawer state should be updated now');
    } 
    // Nếu bàn trống, hiển thị dialog xác nhận trước khi tạo đơn
    else if (table.trang_thai === 'TRONG') {
      console.log('📋 Showing confirmation for table:', table.id);
      setPendingOrderCreation({ type: 'table', table });
      setShowCreateConfirm(true);
    } else {
      console.log('⚠️ Table not clickable. Status:', table.trang_thai, 'Order ID:', orderId);
    }
  }

  // Hàm xác nhận tạo đơn cho bàn
  async function confirmCreateTableOrder() {
    const table = pendingOrderCreation?.table;
    if (!table) return;
    
    console.log('✅ Creating new order for table:', table.id);
    setShowCreateConfirm(false);
    
    try {
      const res = await api.createOrderForTable(table.id);
      const newOrder = res?.data || res;
      console.log('New order created:', newOrder);
      
      const drawerData = { 
        open: true, 
        order: { 
          id: newOrder.id,
          ban_id: table.id, 
          order_type: 'DINE_IN' 
        } 
      };
      console.log('Setting drawer:', drawerData);
      setDrawer(drawerData);
      
      loadTables();
      setToast({
        show: true,
        type: 'success',
        title: 'Tạo đơn thành công',
        message: `Đơn hàng cho ${table.ten_ban} đã được tạo.`
      });
    } catch (err) {
      console.error('❌ Error creating order:', err);
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi tạo đơn',
        message: err.message || 'Không thể tạo đơn hàng mới.'
      });
    } finally {
      setPendingOrderCreation(null);
    }
  }

  const createTakeaway = async () => {
    try {
      const res = await api.createTakeawayOrder();
      setDrawer({ open: true, order: { id: res.data.id, order_type: 'TAKEAWAY' } });
    } catch (error) {
      console.error('Error creating takeaway:', error);
      alert('Lỗi khi tạo đơn mang đi: ' + error.message);
    }
  };

  async function handleCreateTakeaway() {
    // Hiển thị dialog xác nhận
    setPendingOrderCreation({ type: 'takeaway' });
    setShowCreateConfirm(true);
  }

  // Hàm xác nhận tạo đơn mang đi
  async function confirmCreateTakeawayOrder() {
    setShowCreateConfirm(false);
    
    try {
      const res = await api.createTakeawayOrder();
      const newOrder = res?.data || res;
      
      setDrawer({ 
        open: true, 
        order: { 
          id: newOrder.id,
          order_type: 'TAKEAWAY' 
        } 
      });
      
      loadTables();
      setToast({
        show: true,
        type: 'success',
        title: 'Đơn mang đi',
        message: `Đã tạo đơn mang đi #${newOrder.id}`
      });
    } catch (err) {
      console.error('Error creating takeaway order:', err);
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi tạo đơn',
        message: err.message || 'Không thể tạo đơn mang đi.'
      });
    } finally {
      setPendingOrderCreation(null);
    }
  }

  async function handleCloseTable(tableId, toStatus = 'TRONG') {
    try {
      await api.closeTableAfterPaid(tableId, toStatus);
      await loadTables();
      setToast({
        show: true,
        type: 'success',
        title: 'Dọn bàn thành công',
        message: `Bàn đã được chuyển về trạng thái ${toStatus === 'TRONG' ? 'trống' : toStatus}.`
      });
    } catch (err) {
      console.error('Error closing table:', err);
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi dọn bàn',
        message: err.message || 'Không thể dọn bàn.'
      });
    }
  }

  async function handleLockTable(tableId, reason = null) {
    try {
      await api.lockTable(tableId, reason);
      await loadTables();
      setToast({
        show: true,
        type: 'success',
        title: 'Khóa bàn thành công',
        message: reason ? `Bàn đã khóa. Lý do: ${reason}` : 'Bàn đã được khóa.'
      });
    } catch (err) {
      console.error('Error locking table:', err);
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi khóa bàn',
        message: err.message || 'Không thể khóa bàn.'
      });
    }
  }

  async function handleUnlockTable(tableId) {
    try {
      await api.unlockTable(tableId);
      await loadTables();
      setToast({
        show: true,
        type: 'success',
        title: 'Mở khóa thành công',
        message: 'Bàn đã được mở khóa và chuyển về trạng thái trống.'
      });
    } catch (err) {
      console.error('Error unlocking table:', err);
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi mở khóa',
        message: err.message || 'Không thể mở khóa bàn.'
      });
    }
  }

  // Callback khi đổi bàn thành công - mở drawer với bàn mới
  async function handleTableChanged(newTableId, orderId) {
    console.log('Table changed, opening drawer for new table:', newTableId, 'with order:', orderId);
    
    // Reload tables để có dữ liệu mới nhất
    await loadTables();
    
    // Mở drawer với đơn hàng đã đổi sang bàn mới
    setDrawer({ 
      open: true, 
      order: { 
        id: orderId, 
        ban_id: newTableId, 
        order_type: 'DINE_IN' 
      } 
    });
  }

  const showWorkpane = drawer.open; // Hiển thị menu khi có drawer mở (dù mode nào)
  const drawerWidth = posMode ? 680 : 640;
  const rightPad = showWorkpane ? drawerWidth + 16 : 0; // Thêm 16px khoảng cách để scrollbar nằm giữa

  return (
    <AuthedLayout shift={shift}>
      <div style={{ marginRight: showWorkpane ? `${drawerWidth + 16}px` : '0' }}>
      {/* Header with area info */}
      {!posMode && !showWorkpane && (
        <>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/60 p-8 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-6">
              {/* Left: Area info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-xl blur-lg opacity-20"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Quản lý Khu vực</h2>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      {areas.length} khu vực đang hoạt động
                    </p>
                  </div>
                </div>
                
                {/* Shift info */}
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

              {/* Right: Action buttons - Redesigned with invert hover */}
              <div className="flex flex-col items-end gap-3">
                {/* Warning badges */}
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

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 justify-end">
              {/* Badge đơn từ ca trước */}
              {transferredOrders.length > 0 && (
                <button
                  onClick={() => setShowTransferredOrdersDialog(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-2 border-amber-500 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-amber-600 hover:border-amber-500 hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 animate-pulse shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{transferredOrders.length} đơn từ ca trước</span>
                </button>
              )}
              <button
                onClick={() => setShowReservationsList(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Danh sách đặt bàn</span>
              </button>
              <button
                onClick={() => setShowReservationPanel(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Đặt bàn</span>
              </button>
              <button
                onClick={() => window.location.href = '/takeaway'}
                className="px-4 py-2.5 bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>DS Mang đi</span>
              </button>
              {canViewCurrentShiftOrders && (
                <button
                  onClick={() => {
                    setShiftOrdersRefreshKey(prev => prev + 1);
                    setShowCurrentShiftOrders(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Lịch sử đơn</span>
                </button>
              )}
              {shift && shift.status === 'OPEN' ? (
                <button
                  onClick={() => setShowCloseShiftModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-2 border-purple-600 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-purple-700 hover:border-purple-600 hover:shadow-xl hover:scale-105 transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Đóng ca</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowOpenShiftModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-600 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-green-700 hover:border-green-600 hover:shadow-xl hover:scale-105 transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Mở ca</span>
                </button>
              )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Area Tabs - Improved */}
          <div className="mt-6">
            <AreaTabs areas={areas} activeId={activeArea} onChange={setActiveArea} />
          </div>
        </>
      )}

      {/* Workpane (Menu + back button) - Hiển thị khi có đơn đang mở */}
      {showWorkpane && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <button 
              disabled={drawerHasPendingItems}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border-2 transition-all duration-200 outline-none focus:outline-none ${
                drawerHasPendingItems
                  ? 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-[#c9975b] hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl hover:-translate-y-0.5 active:scale-95'
              }`}
              title={drawerHasPendingItems ? 'Vui lòng xác nhận đơn trước khi quay lại' : undefined}
              onClick={() => {
                if (drawerHasPendingItems) return;
                // Nếu là đơn mang đi chưa có món → Hỏi có hủy không
                if (drawer.order?.order_type === 'TAKEAWAY' && !drawerHasItems) {
                  setTriggerCancelDialog(true);
                } else {
                  // Đơn bàn hoặc đơn mang đi đã có món → Đóng luôn
                  setDrawer({ open: false, order: null });
                }
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {posMode ? 'Danh sách bàn' : 'Quay lại'}
            </button>
          </div>
          
          <div className="mt-4">
            <MenuPanel
              orderId={drawer.order?.id}
              onAdded={() => setRefreshTick((x) => x + 1)}
              onShowToast={setToast}
              disabled={drawer.order?.trang_thai === 'PAID' || drawer.order?.status === 'PAID'}
            />
          </div>
        </div>
      )}

      {/* Tables grid */}
      {!showWorkpane && (
        <div className="mt-6">
          {loading ? (
            <div className="p-6 text-gray-500">Đang tải bàn...</div>
          ) : posMode ? (
            // POS mode - all tables by area
            <div className="space-y-6">
              {tablesByArea.map(area => (
                <div key={area.id}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    {area.ten} ({area.tables.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {area.tables.map((t) => (
                      <TableCard 
                        key={t.id} 
                        table={t} 
                        onClick={handleTableClick}
                        onCloseTable={handleCloseTable}
                        onLockTable={handleLockTable}
                        onUnlockTable={handleUnlockTable}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Dashboard mode - current area only
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentAreaTables.map((t) => (
                <TableCard 
                  key={t.id} 
                  table={t} 
                  onClick={handleTableClick}
                  onCloseTable={handleCloseTable}
                  onLockTable={handleLockTable}
                  onUnlockTable={handleUnlockTable}
                />
              ))}
              {!currentAreaTables.length && <div className="text-gray-500">Không có bàn.</div>}
            </div>
          )}
        </div>
      )}

      {/* OrderDrawer */}
      <OrderDrawer
        key={drawer.order?.id || 'empty'}
        open={drawer.open}
        order={drawer.order}
        onClose={(info) => {
          // Reset pending state
          setDrawerHasPendingItems(false);
          
          // Nếu là object info từ TAKEAWAY
          if (typeof info === 'object' && info.orderType === 'TAKEAWAY') {
            if (!info.hasItems) {
              setTriggerCancelDialog(true);
            } else {
              setDrawer({ open: false, order: null });
              loadTables();
            }
          } else {
            // Đơn bàn: Đóng luôn
            setDrawer({ open: false, order: null });
            loadTables();
          }
        }}
        onPendingItemsChange={(hasPending) => setDrawerHasPendingItems(hasPending)}
        onPaid={async (data) => {
          console.log('onPaid callback received:', data);
          await loadTables();
        }}
        refreshTick={refreshTick}
        width={posMode ? 680 : 640}
        docked
        shift={shift}
        reloadTables={loadTables}
        onShowToast={setToast}
        triggerCancelDialog={triggerCancelDialog}
        onTriggerCancelDialog={() => setTriggerCancelDialog(false)}
        onTableChanged={handleTableChanged}
        onItemsChange={(hasItems) => setDrawerHasItems(hasItems)}
      />

      {/* Confirmation Dialog */}
      {showCreateConfirm && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => {
              setShowCreateConfirm(false);
              setPendingOrderCreation(null);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Tạo đơn hàng mới
              </h3>
              <p className="text-gray-600 text-center text-sm leading-relaxed">
                {pendingOrderCreation?.type === 'takeaway' 
                  ? 'Bạn có chắc chắn muốn tạo đơn mang đi mới?'
                  : `Bạn có chắc chắn muốn tạo đơn cho ${pendingOrderCreation?.table?.ten_ban}?`
                }
              </p>
            </div>
            
            {/* Order Info Card */}
            {pendingOrderCreation?.type === 'table' && (
              <div className="mx-6 mb-6">
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Bàn:</span>
                      <span className="font-bold text-gray-900">
                        {pendingOrderCreation.table.ten_ban}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Khu vực:</span>
                      <span className="font-bold text-gray-900">
                        {pendingOrderCreation.table.khu_vuc || 'Không rõ'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Sức chứa:</span>
                      <span className="font-bold text-emerald-600 text-lg">
                        {pendingOrderCreation.table.suc_chua} người
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pendingOrderCreation?.type === 'takeaway' && (
              <div className="mx-6 mb-6">
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Loại đơn:</span>
                      <span className="font-bold text-emerald-600 text-lg">
                        Mang đi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="px-6 pb-6">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateConfirm(false);
                    setPendingOrderCreation(null);
                  }}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 hover:shadow-md outline-none focus:outline-none"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (pendingOrderCreation?.type === 'takeaway') {
                      confirmCreateTakeawayOrder();
                    } else if (pendingOrderCreation?.type === 'table') {
                      confirmCreateTableOrder();
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] outline-none focus:outline-none"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast({ show: false, type: 'success', title: '', message: '' })}
      />

      {/* Reservation Panel */}
      <ReservationPanel
        open={showReservationPanel}
        onClose={() => setShowReservationPanel(false)}
        onSuccess={() => {
          setShowReservationPanel(false);
          loadTables();
        }}
        onShowToast={setToast}
        areas={areas}
      />

      {/* Reservations List */}
      <ReservationsList
        open={showReservationsList}
        onClose={() => setShowReservationsList(false)}
        onReservationUpdated={async () => {
          await loadTables(); // Reload tables khi confirm/cancel/no-show
        }}
        onCheckIn={async (reservation) => {
          // Check-in: tạo order và mở drawer
          try {
            const primaryTableId = reservation.ban_ids?.[0];
            if (!primaryTableId) {
              setToast({
                show: true,
                type: 'error',
                title: 'Lỗi check-in',
                message: 'Đặt bàn chưa có bàn nào'
              });
              return;
            }

            const res = await api.checkInReservation(reservation.id, primaryTableId);
            const result = res?.data || res;

            setToast({
              show: true,
              type: 'success',
              title: 'Check-in thành công!',
              message: `Đã tạo đơn #${result.don_hang_id} cho ${reservation.khach}`
            });

            setShowReservationsList(false);
            await loadTables();

            // Mở drawer với order vừa tạo
            setDrawer({
              open: true,
              order: {
                id: result.don_hang_id,
                ban_id: primaryTableId,
                order_type: 'DINE_IN'
              }
            });
          } catch (error) {
            console.error('Error check-in:', error);
            setToast({
              show: true,
              type: 'error',
              title: 'Lỗi check-in',
              message: error.message || 'Không thể check-in'
            });
          }
        }}
        onShowToast={setToast}
      />

      {/* Open Shift Modal */}
      <OpenShiftModal
        open={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        onSuccess={() => {
          loadShift();
          loadTables();
        }}
        onShowToast={setToast}
      />

      {/* Close Shift Modal */}
      <CloseShiftModal
        open={showCloseShiftModal}
        shift={shift}
        onClose={() => setShowCloseShiftModal(false)}
        onSuccess={() => {
          // Reload shift info after closing
          loadShift();
          // Optionally reload tables as shift status affects business logic
          loadTables();
        }}
        onShowToast={setToast}
      />

      {/* Transferred Orders Dialog */}
      <OpenOrdersDialog
        open={showTransferredOrdersDialog}
        orders={transferredOrders}
        mode="view-only"
        onClose={() => setShowTransferredOrdersDialog(false)}
        onForceClose={() => setShowTransferredOrdersDialog(false)}
        onGoBack={() => setShowTransferredOrdersDialog(false)}
        loading={false}
      />

      {/* Current Shift Orders Modal */}
      {showCurrentShiftOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Lịch sử đơn hàng ca hiện tại</h2>
              <button
                onClick={() => setShowCurrentShiftOrders(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <CurrentShiftOrders key={shiftOrdersRefreshKey} />
            </div>
          </div>
        </div>
      )}

      {/* Floating Manager Dashboard Button - only for manager/admin */}
      {(user?.roles?.includes('manager') || user?.roles?.includes('admin')) && (
        <button
          onClick={() => navigate('/manager')}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 24px',
            backgroundColor: '#9333ea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(147, 51, 234, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 1000,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#7e22ce';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(147, 51, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#9333ea';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(147, 51, 234, 0.4)';
          }}
        >
          📊 Trang quản lý
        </button>
      )}

      {/* Floating Action Button - Đơn mang đi - ENHANCED */}
      <div className="fixed bottom-6 right-6 z-[1000] group">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none transform group-hover:-translate-y-1">
          <div className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap">
            Tạo đơn mang đi mới
            <div className="absolute top-full right-6 -mt-1">
              <div className="w-3 h-3 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        </div>
        
        {/* Button với glow effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity animate-pulse"></div>
          <button
            onClick={handleCreateTakeaway}
            className="relative w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 text-white rounded-full shadow-2xl hover:from-emerald-500 hover:to-green-500 hover:shadow-emerald-500/50 transition-all duration-300 outline-none focus:outline-none flex items-center justify-center hover:scale-110 active:scale-95"
            title="Tạo đơn mang đi mới"
          >
            <svg className="w-7 h-7 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
      </div> {/* End of content wrapper with marginRight */}
    </AuthedLayout>
  );
}
