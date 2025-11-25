// === src/pages/Dashboard.jsx ===
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import TakeawayOrderCard from '../components/TakeawayOrderCard.jsx';

export default function Dashboard({ defaultMode = 'dashboard' }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Đọc tab từ URL query hoặc defaultMode
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'takeaway') return 'takeaway';
    if (defaultMode === 'takeaway') return 'takeaway';
    return 'tables';
  };
  
  const initialTab = getInitialTab();
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
  
  // Tab state for Cashier Dashboard
  const [activeTab, setActiveTab] = useState(initialTab); // 'tables' or 'takeaway'
  
  // Cập nhật URL khi đổi tab (nhưng không reload page)
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (activeTab === 'takeaway' && currentTab !== 'takeaway') {
      searchParams.set('tab', 'takeaway');
      setSearchParams(searchParams, { replace: true });
    } else if (activeTab === 'tables' && currentTab === 'takeaway') {
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);
  
  // Takeaway orders state (for takeaway tab)
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [takeawayLoading, setTakeawayLoading] = useState(false);
  const [takeawayFilterTab, setTakeawayFilterTab] = useState('TAKEAWAY'); // 'TAKEAWAY', 'DELIVERY'
  const [selectedDeliveryOrders, setSelectedDeliveryOrders] = useState([]); // Các đơn DELIVERY đã chọn để claim
  const [deliveryFilterTab, setDeliveryFilterTab] = useState('ALL'); // 'ALL', 'HUNTING', 'MY_CLAIMED' - Filter cho tab Giao hàng
  
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

  // Reload shift khi userRoles thay đổi (để detect Waiter)
  useEffect(() => {
    if (userRoles.length > 0) {
      loadShift();
    }
  }, [userRoles.length]);

  // Check if user can view current shift orders (cashier, waiter, manager, admin)
  // Waiter có thể xem để theo dõi đơn mình tạo
  const canViewCurrentShiftOrders = userRoles.some(role =>
    ['cashier', 'waiter', 'manager', 'admin'].includes(role.toLowerCase())
  );

  // Check if user is Manager (View Only mode)
  const isManagerViewMode = userRoles.some(role =>
    ['manager', 'admin'].includes(role.toLowerCase())
  ) && !userRoles.some(role =>
    ['cashier'].includes(role.toLowerCase())
  );

  // Check if user is Waiter
  const isWaiter = userRoles.some(role =>
    role.toLowerCase() === 'waiter'
  ) && !userRoles.some(role =>
    ['cashier', 'manager', 'admin'].includes(role.toLowerCase())
  );

  // Debug: Log drawer state changes
  useEffect(() => {
    console.log('📦 Drawer state changed:', drawer);
  }, [drawer]);

  async function loadAreas() {
    const res = await api.get('/areas');
    const data = res?.data || res || [];
    // Chỉ lấy các khu vực đang active cho cashier dashboard
    const activeAreas = data.filter(a => a.active !== false);
    setAreas(activeAreas);
    if (!activeArea && activeAreas.length) setActiveArea(activeAreas[0].id);
  }

  async function loadTables() {
    setLoading(true);
    try {
      const res = await api.getPosTables();
      setTables(res?.data || res || []);
    } finally { setLoading(false); }
  }

  async function loadTakeawayOrders() {
    setTakeawayLoading(true);
    try {
      // Lấy các đơn TAKEAWAY còn món chưa xong
      const takeawayRes = await api.get('/pos/takeaway-orders');
      const takeawayData = takeawayRes?.data || takeawayRes || [];
      console.log('📦 Takeaway orders loaded:', takeawayData.length, takeawayData);
      setTakeawayOrders(takeawayData);
      
      // Lấy các đơn DELIVERY còn món chưa xong
      const deliveryRes = await api.get('/pos/delivery-orders');
      const deliveryData = deliveryRes?.data || deliveryRes || [];
      console.log('🚚 Delivery orders loaded:', deliveryData.length, deliveryData);
      setDeliveryOrders(deliveryData);
      
      // Lấy danh sách nhân viên phục vụ (nếu là Cashier/Manager, không phải Waiter)
      if (!isManagerViewMode && !isWaiter) {
      }
    } catch (err) {
      console.error('Error loading takeaway orders:', err);
    } finally {
      setTakeawayLoading(false);
    }
  }

  const handleDeliver = async (order) => {
    try {
      await api.post(`/pos/orders/${order.id}/deliver`);
      setToast({
        show: true,
        type: 'success',
        title: 'Giao hàng thành công!',
        message: `Đơn #${order.id} đã giao cho khách`
      });
      loadTakeawayOrders();
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể giao hàng'
      });
    }
  };


  const handleUpdateDeliveryStatus = async (order, status, failureReason = null) => {
    try {
      await api.updateDeliveryStatus(order.id, status, failureReason);
      setToast({
        show: true,
        type: 'success',
        title: 'Cập nhật thành công!',
        message: `Đã cập nhật trạng thái giao hàng cho đơn #${order.id}`
      });
      loadTakeawayOrders();
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể cập nhật trạng thái giao hàng'
      });
    }
  };

  async function loadShift() {
    try {
      // Nếu là Waiter, ưu tiên lấy ca của chính mình, nếu không có thì lấy ca Cashier
      const isWaiterUser = userRoles.some(role =>
        role.toLowerCase() === 'waiter'
      ) && !userRoles.some(role =>
        ['cashier', 'manager', 'admin'].includes(role.toLowerCase())
      );
      
      if (isWaiterUser) {
        // Ưu tiên lấy ca của chính waiter
        const myShiftRes = await api.getMyOpenShift();
        const myShift = myShiftRes?.data || myShiftRes || null;
        
        if (myShift) {
          console.log('📊 Loaded waiter own shift:', myShift);
          setShift(myShift);
          if (myShift.id) {
            loadTransferredOrders(myShift.id);
          }
        } else {
          // Nếu waiter chưa mở ca, lấy ca Cashier đang mở (nếu có)
          const cashierShiftRes = await api.getOpenCashierShift();
          const cashierShift = cashierShiftRes?.data || cashierShiftRes || null;
          console.log('📊 Waiter has no shift, loaded cashier shift:', cashierShift);
          setShift(cashierShift);
          if (cashierShift?.id) {
            loadTransferredOrders(cashierShift.id);
          }
        }
      } else {
        const res = await api.getCurrentShift();
        const shiftData = res?.data || res || null;
        console.log('📊 Loaded shift:', shiftData);
        setShift(shiftData);
        
        // Load transferred orders (orders from previous shift)
        if (shiftData?.id) {
          loadTransferredOrders(shiftData.id);
        }
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

  useEffect(() => { 
    loadAreas(); 
  }, []);
  
  useEffect(() => {
    if (activeTab === 'tables') {
      loadTables();
    } else if (activeTab === 'takeaway') {
      loadTakeawayOrders();
    }
  }, [activeTab, refreshTick]);
  
  // SSE auto refresh
  useSSE('/api/v1/pos/events', (evt) => {
    // Refresh takeaway orders when in takeaway tab
    if (activeTab === 'takeaway' && (
      evt.type === 'order.items.changed' || 
      evt.type === 'kitchen.line.updated' ||
      evt.type === 'order.confirmed' ||
      evt.type === 'order.completed' ||
      evt.type === 'order.created' ||
      evt.type === 'order.updated' ||
      evt.type === 'delivery.assigned' ||
      evt.type === 'delivery.status.updated'
    )) {
      loadTakeawayOrders();
    }
    // Auto refresh tables when order changes
    if (activeTab === 'tables' && (
      evt.type === 'order.updated' ||
      evt.type === 'table.updated'
    )) {
      loadTables();
    }
  });

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

  // Group tables by area - chỉ hiển thị areas active (backend đã filter bàn của area inactive)
  const tablesByArea = useMemo(() => {
    const map = new Map();
    // Chỉ map các areas đang active (backend đã đảm bảo chỉ trả về bàn của area active)
    areas.forEach((a) => map.set(a.id, { ...a, tables: [] }));
    tables.forEach((t) => {
      const key = t.khu_vuc_id || 0;
      if (!map.has(key)) {
        // Fallback cho trường hợp đặc biệt (không nên xảy ra nếu backend filter đúng)
        map.set(key, { id: key, ten: t.khu_vuc_ten || t.khu_vuc || "Khác", tables: [] });
      }
      map.get(key).tables.push(t);
    });
    // Chỉ trả về areas có bàn
    return Array.from(map.values())
      .filter(area => area.tables.length > 0)
      .sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0));
  }, [areas, tables]);

  // Current area tables
  const currentAreaTables = useMemo(() => {
    if (posMode) return tables;
    return tables.filter(t => t.khu_vuc_id === activeArea);
  }, [tables, activeArea, posMode]);

  async function handleTableClick(table) {
    console.log('=== TableCard clicked ===');
    console.log('Table:', table);
    
    // Kiểm tra có ca đang mở không
    if (!shift || shift.status !== 'OPEN') {
      setToast({
        show: true,
        type: 'warning',
        title: 'Chưa mở ca',
        message: 'Vui lòng mở ca làm việc trước khi thao tác với đơn hàng.'
      });
      return;
    }
    
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
      // Waiter có thể dùng ca của chính mình hoặc ca cashier (nếu có)
      let shiftId = null;
      if (isWaiter) {
        // Waiter có thể dùng ca của chính mình
        if (shift && shift.status === 'OPEN') {
          shiftId = shift.id;
        }
      }
      
      const res = await api.createOrderForTable(table.id, {
        ca_lam_id: shiftId
      });
      const newOrder = res?.data || res;
      console.log('New order created:', newOrder);
      
      const drawerData = { 
        open: true, 
        order: { 
          id: newOrder.id,
          ban_id: table.id, 
          order_type: 'DINE_IN',
          trang_thai: newOrder.trang_thai || 'OPEN',
          status: newOrder.status || newOrder.trang_thai || 'OPEN',
          nhan_vien_id: newOrder.nhan_vien_id
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
    // Kiểm tra có ca đang mở không (waiter có thể dùng ca của chính mình)
    if (!shift || shift.status !== 'OPEN') {
      setToast({
        show: true,
        type: 'warning',
        title: 'Chưa mở ca',
        message: 'Vui lòng mở ca làm việc trước khi tạo đơn hàng.'
      });
      return;
    }
    
    // Hiển thị dialog xác nhận
    setPendingOrderCreation({ type: 'takeaway' });
    setShowCreateConfirm(true);
  }

  // Hàm xác nhận tạo đơn mang đi
  async function confirmCreateTakeawayOrder() {
    setShowCreateConfirm(false);
    
    try {
      // Waiter có thể dùng ca của chính mình
      const shiftId = (shift && shift.status === 'OPEN') ? shift.id : null;
      
      const res = await api.createTakeawayOrder(shiftId ? { ca_lam_id: shiftId } : {});
      const newOrder = res?.data || res;
      
      setDrawer({ 
        open: true, 
        order: { 
          id: newOrder.id,
          order_type: newOrder.order_type || 'TAKEAWAY',
          trang_thai: newOrder.trang_thai || 'OPEN',
          status: newOrder.status || newOrder.trang_thai || 'OPEN',
          nhan_vien_id: newOrder.nhan_vien_id
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

  // Hàm mở đơn mang đi/giao hàng
  function handleOpenOrder(order) {
    setDrawer({
      open: true,
      order: {
        id: order.id,
        order_type: order.order_type || order._type || 'TAKEAWAY',
        nhan_vien_id: order.nhan_vien_id, // Truyền nhan_vien_id để kiểm tra quyền chỉnh sửa
        trang_thai: order.trang_thai || 'OPEN',
        status: order.status || order.trang_thai || 'OPEN',
        ban_id: order.ban_id
      }
    });
  }

  const showWorkpane = drawer.open; // Hiển thị menu khi có drawer mở (dù mode nào)
  const drawerWidth = posMode ? 680 : 640;
  const rightPad = showWorkpane ? drawerWidth + 16 : 0; // Thêm 16px khoảng cách để scrollbar nằm giữa

  return (
    <AuthedLayout
      shift={shift}
      isManagerViewMode={isManagerViewMode}
      pageName="Dashboard Cashier"
      backUrl="/manager"
    >
      <div style={{
        marginRight: showWorkpane ? `${drawerWidth + 16}px` : '0'
      }}>
      {/* Header with area info */}
      {!posMode && !showWorkpane && (
        <>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/60 p-8 mb-6 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-6">
              {/* Left: Area info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#c9975b] rounded-xl blur-lg opacity-20"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-[#c9975b] via-[#b8864a] to-[#8b6f47] rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Quản lý Khu vực</h2>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-[#c9975b] rounded-full animate-pulse"></span>
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
                      Bắt đầu: {shift.started_at ? new Date(shift.started_at).toLocaleString('vi-VN') : '--'}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Action buttons - Redesigned with invert hover */}
              <div className="flex flex-col items-end gap-3">
                {/* Warning badges - Tách riêng để không ảnh hưởng layout */}
                <div className="flex items-center gap-3">
                  {!shift && (
                    <div className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-2xl border-2 border-amber-500 flex items-center gap-2 shadow-lg font-bold">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>⚠️ Chưa mở ca</span>
                    </div>
                  )}
                  {/* Badge đơn từ ca trước - Đặt ở đây để không ảnh hưởng đến action buttons bên dưới */}
                  {transferredOrders.length > 0 && (
                    <button
                      onClick={() => setShowTransferredOrdersDialog(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white border-2 border-amber-500 rounded-xl hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-amber-600 hover:border-amber-500 hover:shadow-lg transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="whitespace-nowrap">{transferredOrders.length} đơn từ ca trước</span>
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 justify-end">
              {/* Nút Quay lại Manager Dashboard - chỉ hiển thị khi Manager đang xem */}
              {isManagerViewMode && (
                <button
                  onClick={() => navigate('/manager')}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="whitespace-nowrap">Quay lại Manager Dashboard</span>
                </button>
              )}
              {/* Thứ tự: Đặt bàn -> DS Đặt bàn -> Lịch sử đơn -> Mở/Đóng ca */}
              {/* Waiter không cần đặt bàn, chỉ cần xem danh sách đặt bàn */}
              {!isManagerViewMode && !isWaiter && (
                <button
                  onClick={() => setShowReservationPanel(true)}
                  className="px-4 py-2.5 bg-indigo-600 text-white border-2 border-indigo-600 rounded-xl hover:bg-white hover:text-indigo-600 hover:border-indigo-600 hover:shadow-lg transition-all duration-200 font-semibold outline-none focus:outline-none focus:ring-2 focus:ring-indigo-300 flex items-center gap-2.5 shadow-md"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="whitespace-nowrap">Đặt bàn</span>
                </button>
              )}
              <button
                onClick={() => setShowReservationsList(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="whitespace-nowrap">DS Đặt bàn</span>
              </button>
              {canViewCurrentShiftOrders && (
                <button
                  onClick={() => {
                    setShiftOrdersRefreshKey(prev => prev + 1);
                    setShowCurrentShiftOrders(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="whitespace-nowrap">Lịch sử đơn</span>
                </button>
              )}
              {!isManagerViewMode && (
                shift && shift.status === 'OPEN' ? (
                  <button
                    onClick={() => setShowCloseShiftModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white border-2 border-red-600 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-red-600 hover:border-red-600 hover:shadow-lg transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="whitespace-nowrap">Đóng ca</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowOpenShiftModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-2 border-emerald-600 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-emerald-600 hover:border-emerald-600 hover:shadow-lg transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="whitespace-nowrap">Mở ca</span>
                  </button>
                )
              )}
              </div>
                </div>
              </div>
          </div>
          
          {/* Main Tabs - Bàn và Đơn mang đi */}
          {!isManagerViewMode && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
              <div className="flex border-b border-gray-200 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('tables')}
                  className={`flex-1 px-6 py-4 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === 'tables'
                      ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gradient-to-r hover:from-[#f5e6d3] hover:via-[#f0ddc4] hover:to-[#f5e6d3] hover:text-[#c9975b]'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Bàn</span>
                </button>
                <button
                  onClick={() => setActiveTab('takeaway')}
                  className={`flex-1 px-6 py-4 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === 'takeaway'
                      ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gradient-to-r hover:from-[#f5e6d3] hover:via-[#f0ddc4] hover:to-[#f5e6d3] hover:text-[#c9975b]'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Đơn mang đi</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Area Tabs - Only show for tables tab */}
          {activeTab === 'tables' && (
            <div className="mt-6">
              <AreaTabs areas={areas} activeId={activeArea} onChange={setActiveArea} />
            </div>
          )}
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
              disabled={
                drawer.order?.trang_thai === 'PAID' || 
                drawer.order?.status === 'PAID' || 
                !shift || 
                shift.status !== 'OPEN' ||
                (isWaiter && drawer.order?.nhan_vien_id !== getUser()?.user_id) // Waiter chỉ có thể thêm món vào đơn do mình tạo
              }
            />
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {!showWorkpane && (
        <div className="mt-6">
          {activeTab === 'tables' ? (
            // Tables tab
            loading ? (
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
                        onClick={isManagerViewMode ? null : handleTableClick}
                        onCloseTable={isManagerViewMode ? null : handleCloseTable}
                        onLockTable={isManagerViewMode ? null : handleLockTable}
                        onUnlockTable={isManagerViewMode ? null : handleUnlockTable}
                        viewOnly={isManagerViewMode || !shift || shift.status !== 'OPEN'}
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
                  onClick={isManagerViewMode ? null : handleTableClick}
                  onCloseTable={isManagerViewMode ? null : handleCloseTable}
                  onLockTable={isManagerViewMode ? null : handleLockTable}
                  onUnlockTable={isManagerViewMode ? null : handleUnlockTable}
                  viewOnly={isManagerViewMode || !shift || shift.status !== 'OPEN'}
                />
              ))}
              {!currentAreaTables.length && <div className="text-gray-500">Không có bàn.</div>}
            </div>
          )
          ) : (
            // Takeaway orders tab
            takeawayLoading ? (
              <div className="p-6 text-gray-500">Đang tải đơn mang đi...</div>
            ) : (
              <div className="space-y-4">
                {/* Filter Tabs - Mang đi / Giao hàng */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setTakeawayFilterTab('TAKEAWAY')}
                      className={`flex-1 min-w-[100px] px-4 py-3 rounded-lg font-semibold transition-all ${
                        takeawayFilterTab === 'TAKEAWAY'
                          ? 'bg-[#c9975b] text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Mang đi ({takeawayOrders.length})
                    </button>
                    <button
                      onClick={() => {
                        setTakeawayFilterTab('DELIVERY');
                        setDeliveryFilterTab('ALL'); // Reset filter khi chuyển sang tab Giao hàng
                      }}
                      className={`flex-1 min-w-[100px] px-4 py-3 rounded-lg font-semibold transition-all ${
                        takeawayFilterTab === 'DELIVERY'
                          ? 'bg-[#c9975b] text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Giao hàng ({deliveryOrders.length})
                    </button>
                  </div>
                </div>

                {/* Filter cho tab Giao hàng (chỉ hiển thị khi tab DELIVERY được chọn) */}
                {takeawayFilterTab === 'DELIVERY' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setDeliveryFilterTab('ALL')}
                        className={`flex-1 min-w-[100px] px-4 py-3 rounded-lg font-semibold transition-all ${
                          deliveryFilterTab === 'ALL'
                            ? 'bg-[#c9975b] text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Tất cả ({deliveryOrders.length})
                      </button>
                      {isWaiter && (
                        <>
                          <button
                            onClick={() => setDeliveryFilterTab('HUNTING')}
                            className={`flex-1 min-w-[100px] px-4 py-3 rounded-lg font-semibold transition-all ${
                              deliveryFilterTab === 'HUNTING'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            Săn đơn ({(() => {
                              const huntingOrders = deliveryOrders.filter(
                                o => o.order_type === 'DELIVERY' && 
                                (o.delivery_status === 'PENDING' || !o.delivery_status || !o.shipper_id)
                              );
                              return huntingOrders.length;
                            })()})
                          </button>
                          <button
                            onClick={() => setDeliveryFilterTab('MY_CLAIMED')}
                            className={`flex-1 min-w-[100px] px-4 py-3 rounded-lg font-semibold transition-all ${
                              deliveryFilterTab === 'MY_CLAIMED'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            Đơn đã nhận ({(() => {
                              const myClaimedOrders = deliveryOrders.filter(
                                o => o.order_type === 'DELIVERY' && 
                                o.shipper_id === getUser()?.user_id
                              );
                              return myClaimedOrders.length;
                            })()})
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Filtered Orders */}
                {(() => {
                  let filteredOrders = takeawayFilterTab === 'TAKEAWAY' 
                    ? takeawayOrders 
                    : takeawayFilterTab === 'DELIVERY' 
                    ? (() => {
                        // Filter cho tab DELIVERY
                        if (deliveryFilterTab === 'HUNTING' && isWaiter) {
                          // Săn đơn: chỉ đơn PENDING (chưa có shipper_id)
                          return deliveryOrders.filter(
                            o => o.order_type === 'DELIVERY' && 
                            (o.delivery_status === 'PENDING' || !o.delivery_status || !o.shipper_id)
                          );
                        } else if (deliveryFilterTab === 'MY_CLAIMED' && isWaiter) {
                          // Đơn đã nhận: chỉ đơn đã được waiter này claim
                          return deliveryOrders.filter(
                            o => o.order_type === 'DELIVERY' && 
                            o.shipper_id === getUser()?.user_id
                          );
                        } else {
                          // Tất cả: tất cả đơn DELIVERY chưa giao xong
                          // Sắp xếp: đơn chưa được nhận trước, đơn đã được nhận/đang giao ở cuối
                          return [...deliveryOrders].sort((a, b) => {
                            const aIsPending = (a.delivery_status === 'PENDING' || !a.delivery_status || !a.shipper_id);
                            const bIsPending = (b.delivery_status === 'PENDING' || !b.delivery_status || !b.shipper_id);
                            
                            // Đơn chưa được nhận (PENDING) hiển thị trước
                            if (aIsPending && !bIsPending) return -1;
                            if (!aIsPending && bIsPending) return 1;
                            
                            // Nếu cùng trạng thái, sắp xếp theo ID (mới nhất trước)
                            return b.id - a.id;
                          });
                        }
                      })()
                    : takeawayOrders; // Default to TAKEAWAY if invalid tab

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="text-center py-16 bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-xl border-2 border-[#e7d4b8]">
                        <svg className="w-24 h-24 mx-auto text-[#d4a574] mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p className="text-[#8b6f47] font-bold text-xl">
                          {takeawayFilterTab === 'TAKEAWAY' ? 'Chưa có đơn mang đi' :
                           takeawayFilterTab === 'DELIVERY' ? (
                             deliveryFilterTab === 'HUNTING' ? 'Chưa có đơn nào để săn' :
                             deliveryFilterTab === 'MY_CLAIMED' ? 'Chưa có đơn nào bạn đã nhận' :
                             'Chưa có đơn giao hàng'
                           ) :
                           'Chưa có đơn nào'}
                        </p>
                      </div>
                    );
                  }

                  // Tính tổng tiền cho các đơn đã chọn (chỉ cho waiter và đơn DELIVERY)
                  const pendingDeliveryOrders = filteredOrders.filter(
                    o => o.order_type === 'DELIVERY' && 
                    (o.delivery_status === 'PENDING' || !o.delivery_status || !o.shipper_id)
                  );
                  const selectedPendingOrders = pendingDeliveryOrders.filter(
                    o => selectedDeliveryOrders.includes(o.id)
                  );
                  const totalAmount = selectedPendingOrders.reduce((sum, order) => {
                    const orderTotal = order.grand_total || 0;
                    const deliveryFee = order.delivery_fee || 0;
                    return sum + orderTotal + deliveryFee;
                  }, 0);

                  return (
                    <>
                      {/* Hiển thị tổng tiền và nút "Nhận tất cả đã chọn" khi có đơn được chọn */}
                      {isWaiter && selectedPendingOrders.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-lg border-2 border-blue-600 p-4 mb-4 sticky top-4 z-10">
                          <div className="flex items-center justify-between">
                            <div className="text-white">
                              <p className="text-sm font-medium opacity-90">Đã chọn {selectedPendingOrders.length} đơn</p>
                              <p className="text-2xl font-bold mt-1">
                                Tổng: {totalAmount.toLocaleString('vi-VN')}đ
                              </p>
                              <p className="text-xs opacity-75 mt-1">
                                (Bao gồm phí ship)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedDeliveryOrders([])}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all border border-white/30"
                              >
                                Bỏ chọn
                              </button>
                              <button
                                onClick={async () => {
                                  if (selectedPendingOrders.length === 0) return;
                                  try {
                                    // Đảm bảo orderIds là array of integers
                                    const orderIds = selectedPendingOrders.map(o => parseInt(o.id)).filter(id => !isNaN(id));
                                    if (orderIds.length === 0) {
                                      throw new Error('Không có đơn nào được chọn');
                                    }
                                    await api.claimDeliveryOrders(orderIds);
                                    setToast({
                                      show: true,
                                      type: 'success',
                                      title: 'Nhận đơn thành công!',
                                      message: `Đã nhận ${selectedPendingOrders.length} đơn giao hàng`
                                    });
                                    setSelectedDeliveryOrders([]);
                                    loadTakeawayOrders();
                                  } catch (err) {
                                    setToast({
                                      show: true,
                                      type: 'error',
                                      title: 'Lỗi',
                                      message: err.message || 'Không thể nhận đơn'
                                    });
                                  }
                                }}
                                disabled={selectedPendingOrders.length === 0 || selectedPendingOrders.length > 10}
                                className="px-6 py-2 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Nhận {selectedPendingOrders.length} đơn
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredOrders.map((order) => (
                          <TakeawayOrderCard
                            key={order.id}
                            order={order}
                          onOpenOrder={handleOpenOrder}
                          onDeliver={handleDeliver}
                          onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
                          isManagerViewMode={isManagerViewMode}
                          isWaiter={isWaiter}
                            selectedDeliveryOrders={selectedDeliveryOrders}
                            onToggleSelectOrder={(orderId) => {
                              setSelectedDeliveryOrders(prev => {
                                if (prev.includes(orderId)) {
                                  return prev.filter(id => id !== orderId);
                                } else {
                                  if (prev.length >= 10) {
                                    setToast({
                                      show: true,
                                      type: 'warning',
                                      title: 'Giới hạn',
                                      message: 'Chỉ có thể chọn tối đa 10 đơn mỗi lần'
                                    });
                                    return prev;
                                  }
                                  return [...prev, orderId];
                                }
                              });
                            }}
                            onClaimOrder={async (orderId) => {
                              try {
                                // Đảm bảo orderId là integer
                                const id = parseInt(orderId);
                                if (isNaN(id)) {
                                  throw new Error('ID đơn hàng không hợp lệ');
                                }
                                await api.claimDeliveryOrders([id]);
                                setToast({
                                  show: true,
                                  type: 'success',
                                  title: 'Nhận đơn thành công!',
                                  message: `Đã nhận đơn #${orderId}`
                                });
                                loadTakeawayOrders();
                              } catch (err) {
                                setToast({
                                  show: true,
                                  type: 'error',
                                  title: 'Lỗi',
                                  message: err.message || 'Không thể nhận đơn'
                                });
                              }
                            }}
                          />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )
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
              if (activeTab === 'tables') {
                loadTables();
              } else if (activeTab === 'takeaway') {
                loadTakeawayOrders();
              }
            }
          } else {
            // Đơn bàn: Đóng luôn
            setDrawer({ open: false, order: null });
            if (activeTab === 'tables') {
              loadTables();
            } else if (activeTab === 'takeaway') {
              loadTakeawayOrders();
            }
          }
        }}
        onPendingItemsChange={(hasPending) => setDrawerHasPendingItems(hasPending)}
        onOrderUpdate={(updatedOrder) => {
          // Cập nhật drawer.order với thông tin đầy đủ từ OrderDrawer
          setDrawer(prev => ({
            ...prev,
            order: updatedOrder
          }));
        }}
        onPaid={async (data) => {
          console.log('onPaid callback received:', data);
          if (activeTab === 'tables') {
            await loadTables();
          } else if (activeTab === 'takeaway') {
            await loadTakeawayOrders();
          }
          // Reload transferred orders vì đơn đã PAID sẽ không còn trong danh sách transferred orders
          if (shift?.id) {
            await loadTransferredOrders(shift.id);
          }
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
        viewOnly={isManagerViewMode || !shift || shift.status !== 'OPEN'}
        userRoles={userRoles}
        isWaiter={isWaiter}
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
                  className="flex-1 py-3 px-4 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-700 hover:text-white hover:border-gray-700 hover:shadow-lg outline-none focus:outline-none"
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
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-2 border-emerald-600 rounded-xl font-semibold transition-all duration-200 hover:bg-white hover:from-white hover:to-white hover:text-emerald-600 hover:border-emerald-600 hover:shadow-lg outline-none focus:outline-none"
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
          // Kiểm tra có ca đang mở không
          if (!shift || shift.status !== 'OPEN') {
            setToast({
              show: true,
              type: 'warning',
              title: 'Chưa mở ca',
              message: 'Vui lòng mở ca làm việc trước khi check-in đặt bàn.'
            });
            return;
          }
          
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
              <CurrentShiftOrders key={shiftOrdersRefreshKey} viewOnly={isManagerViewMode} isWaiter={isWaiter} />
            </div>
          </div>
        </div>
      )}



      {/* Floating Action Button - Đơn mang đi - ENHANCED - Only for Cashier */}
      {!isManagerViewMode && (
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
              disabled={!shift || shift.status !== 'OPEN'}
              className={`relative w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 text-white rounded-full shadow-2xl hover:from-emerald-500 hover:to-green-500 hover:shadow-emerald-500/50 transition-all duration-300 outline-none focus:outline-none flex items-center justify-center hover:scale-110 active:scale-95 ${
                !shift || shift.status !== 'OPEN' ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
              }`}
              title={!shift || shift.status !== 'OPEN' ? 'Vui lòng mở ca làm việc trước khi tạo đơn' : 'Tạo đơn mang đi mới'}
            >
              <svg className="w-7 h-7 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}
      </div> {/* End of content wrapper with marginRight */}
    </AuthedLayout>
  );
}