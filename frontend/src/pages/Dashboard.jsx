// === src/pages/Dashboard.jsx ===
import { useEffect, useMemo, useState } from 'react';
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

  // Role-based access control
  const [userRoles, setUserRoles] = useState([]);
  
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
  const rightPad = showWorkpane ? 640 : 0;

  return (
    <AuthedLayout shift={shift}>
      {/* Header with area info */}
      {!posMode && !showWorkpane && (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              Khu vực <span className="text-sm text-gray-500 font-normal ml-2">{areas.length} khu vực</span>
            </h2>
            <div className="flex gap-2">
              {/* Badge đơn từ ca trước */}
              {transferredOrders.length > 0 && (
                <button
                  onClick={() => setShowTransferredOrdersDialog(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2 animate-pulse"
                >
                  ⚠️ {transferredOrders.length} đơn từ ca trước
                </button>
              )}
              <button
                onClick={() => setShowReservationsList(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2"
              >
                📋 Danh sách đặt bàn
              </button>
              <button
                onClick={() => setShowReservationPanel(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2"
              >
                📅 Đặt bàn
              </button>
              <button
                onClick={handleCreateTakeaway}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium outline-none focus:outline-none"
              >
                + Đơn mang đi
              </button>
              <button
                onClick={() => window.location.href = '/takeaway'}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2"
              >
                📦 DS Mang đi
              </button>
              {canViewCurrentShiftOrders && (
                <button
                  onClick={() => setShowCurrentShiftOrders(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2"
                >
                  📊 Lịch sử đơn
                </button>
              )}
              {shift && shift.status === 'OPEN' ? (
                <button
                  onClick={() => setShowCloseShiftModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2"
                >
                  📊 Đóng ca
                </button>
              ) : (
                <button
                  onClick={() => setShowOpenShiftModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2"
                >
                  🚀 Mở ca
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-3">
            <AreaTabs areas={areas} activeId={activeArea} onChange={setActiveArea} />
          </div>
        </>
      )}

      {/* Workpane (Menu + back button) - Hiển thị khi có đơn đang mở */}
      {showWorkpane && (
        <div className="mb-4" style={{ paddingRight: rightPad }}>
          <div className="flex items-center justify-between">
            <button 
              disabled={drawerHasPendingItems}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-xl transition-colors outline-none focus:outline-none ${
                drawerHasPendingItems
                  ? 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
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
            <div className="text-sm text-gray-500">
              {drawer.order?.order_type === 'TAKEAWAY' 
                ? `Mang đi • Đơn #${drawer.order?.id}` 
                : `Bàn ${drawer.order?.ban_id} • Đơn #${drawer.order?.id}`
              }
            </div>
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
              <CurrentShiftOrders />
            </div>
          </div>
        </div>
      )}
    </AuthedLayout>
  );
}
