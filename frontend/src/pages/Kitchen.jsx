// src/pages/Kitchen.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import useSSE from '../hooks/useSSE.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import OpenShiftModal from '../components/OpenShiftModal.jsx';
import CloseShiftModal from '../components/CloseShiftModal.jsx';
import OpenOrdersDialog from '../components/OpenOrdersDialog.jsx';
import Toast from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getUser } from '../auth.js';

export default function Kitchen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Chế độ xem (view only) - Manager xem giao diện nhân viên mà không thao tác được
  const isViewOnly = searchParams.get('viewOnly') === 'true';
  
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groupByOrder, setGroupByOrder] = useState(false); // Gom nhóm theo đơn hàng
  const [selectedItems, setSelectedItems] = useState(new Set()); // Checkbox selection
  
  // Filter states - separate for each column
  const [queuedFilter, setQueuedFilter] = useState({ orderType: 'ALL', search: '' });
  const [makingFilter, setMakingFilter] = useState({ orderType: 'ALL', search: '' });
  
  const scrollRefs = useRef({});

  // Shift management states
  const [shift, setShift] = useState(null);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showOpenOrdersDialog, setShowOpenOrdersDialog] = useState(false);
  const [openOrders, setOpenOrders] = useState([]);
  const [transferredOrders, setTransferredOrders] = useState([]);
  const [showTransferredOrdersDialog, setShowTransferredOrdersDialog] = useState(false);
  
  // Cancel dialog state
  const [cancelDialog, setCancelDialog] = useState({ open: false, lineId: null, itemName: '' });
  const [cancelReason, setCancelReason] = useState('');
  
  // Item detail dialog state
  const [itemDetailDialog, setItemDetailDialog] = useState({ open: false, item: null });
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  
  // Confirm dialog state (for shift opening)
  const [confirmDialog, setConfirmDialog] = useState({ 
    open: false, 
    title: '', 
    message: '', 
    onConfirm: null 
  });

  // Get user info
  const user = getUser();
  const userRoles = user?.roles || [];

  // Check if user is Manager (View Only mode) - hoặc khi có ?viewOnly=true
  const isManagerViewMode = isViewOnly || (userRoles.some(role =>
    ['manager', 'admin'].includes(role.toLowerCase())
  ) && !userRoles.some(role =>
    ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
  ));

  // Role-based access control
  useEffect(() => {
    console.log('🔍 User data:', user);

    // Kiểm tra roles array - cho phép kitchen staff, manager và admin
    const hasAccess = userRoles.some(role =>
      ['kitchen', 'barista', 'chef', 'cook', 'manager', 'admin'].includes(role.toLowerCase())
    );

    console.log('🔍 Kitchen access check:', { userRoles, hasAccess });

    if (!hasAccess) {
      console.log('❌ User không có quyền truy cập Kitchen, redirect về dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user, userRoles]);

  async function loadAreas() {
    try {
      const res = await api.get('/areas');
      setAreas(res?.data || res || []);
    } catch (err) {
      console.error('Error loading areas:', err);
    }
  }

  async function loadShift() {
    try {
      console.log('🔄 API call: getCurrentShift()');
      const res = await api.getCurrentShift();
      console.log('🔄 API response:', res);
      console.log('🔄 API response type:', typeof res);
      console.log('🔄 API response keys:', Object.keys(res || {}));
      
      const shiftData = res?.data;
      console.log('🔄 Parsed shift data:', shiftData);
      console.log('🔄 Shift exists:', !!shiftData);
      console.log('🔄 Shift ID:', shiftData?.id);
      console.log('🔄 Shift type:', shiftData?.shift_type);
      console.log('🔄 Shift status:', shiftData?.status);
      
      // Debug: Log the exact structure
      console.log('🔄 Full shift data structure:', JSON.stringify(shiftData, null, 2));
      
      // Debug: Check if shiftData is null/undefined
      if (shiftData === null || shiftData === undefined) {
        console.log('🔄 Shift data is null/undefined');
      } else if (shiftData === '') {
        console.log('🔄 Shift data is empty string');
      } else if (Array.isArray(shiftData) && shiftData.length === 0) {
        console.log('🔄 Shift data is empty array');
      } else if (typeof shiftData === 'object' && Object.keys(shiftData).length === 0) {
        console.log('🔄 Shift data is empty object');
      }
      
      // Force set to null if no valid shift data
      if (!shiftData || !shiftData.id) {
        console.log('🔄 No valid shift, setting to null');
        setShift(null);
        setTransferredOrders([]);
        return;
      }
      
      // Check if shift is actually closed
      if (shiftData.status === 'CLOSED') {
        console.log('🔄 Shift is CLOSED, setting to null');
        setShift(null);
        setTransferredOrders([]);
        return;
      }
      
      // Check if this is a kitchen shift that should be closed
      if (shiftData.shift_type === 'KITCHEN' && shiftData.status === 'OPEN') {
        console.log('🔄 Kitchen shift is OPEN, checking if it should be closed');
        // For now, let's assume it's valid and show the close button
        console.log('🔄 Kitchen shift is valid, showing close button');
      }
      
      // Debug: Log the exact API response after close
      console.log('🔄 Full API response after close:', JSON.stringify(res, null, 2));
      
      console.log('🔄 Setting shift to:', shiftData);
      setShift(shiftData);
      
      // Debug: Log when shift is set
      if (shiftData && shiftData.id) {
        console.log('🔄 Shift is now SET - UI should show close button');
      }
      
      loadTransferredOrders(shiftData.id);
    } catch (err) {
      console.error('Error loading shift:', err);
      console.log('🔄 Error occurred, setting shift to null');
      setShift(null);
      setTransferredOrders([]);
    }
  }

  async function loadTransferredOrders(shiftId) {
    try {
      const res = await api.getTransferredOrders(shiftId);
      const data = res?.data || res || { orders: [] };
      setTransferredOrders(data.orders || []);
    } catch (err) {
      console.error('Error loading transferred orders:', err);
      setTransferredOrders([]);
    }
  }

  async function loadQueue(silent = false) {
    if (!silent) setLoading(true);
    
    try {
      const res = await api.getKitchenQueue({ 
        areaId: selectedArea 
      });
      const newItems = res?.data || res || [];
      
      // Chỉ update nếu có thay đổi (tránh re-render không cần thiết)
      const currentIds = items.map(i => i.id).sort().join(',');
      const newIds = newItems.map(i => i.id).sort().join(',');
      
      if (currentIds !== newIds || !silent) {
        setItems(newItems);
      }
    } catch (err) {
      console.error('Error loading kitchen queue:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadAreas();
    loadShift();
  }, []);


  useEffect(() => { loadQueue(); }, [selectedArea]);
  
  // TẮT auto update thời gian để tránh re-render
  // Thay vào đó, dùng CSS animation hoặc update manual
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setCurrentTime(Date.now());
  //   }, 1000);
  //   return () => clearInterval(timer);
  // }, []);

  // SSE for realtime updates - Silent refresh
  useSSE('/api/v1/pos/events', (evt) => {
    // Cập nhật queue khi có thay đổi về món
    if (evt.type === 'order.confirmed' || 
        evt.type === 'order.items.added' ||
        evt.type === 'kitchen.line.updated' ||
        evt.type === 'order.items.changed' ||
        evt.type === 'order.item.updated' ||
        evt.type === 'order.item.status.updated' ||
        evt.type === 'order.item.deleted' ||
        evt.type === 'order.item.options.updated') {
      console.log('🔄 Kitchen: SSE event received, refreshing queue:', evt.type);
      loadQueue(true);
    }
    
    if (evt.type === 'shift.opened' || evt.type === 'shift.closed') {
      loadShift();
    }
    
    if (shift?.id) {
      loadTransferredOrders(shift.id);
    }
  }, [shift?.id]);

  async function handleAction(lineId, action, reason = null) {
    try {
      await api.updateKitchenLine(lineId, action, reason);
      // Force reload ngay sau action (không dùng silent)
      await loadQueue(false);
      
      // Hiển thị thông báo thành công
      setToast({
        show: true,
        type: 'success',
        title: 'Thành công',
        message: action === 'start' ? 'Đã bắt đầu làm món' : 
                 action === 'done' ? 'Đã hoàn thành món' : 
                 'Đã hủy món'
      });
    } catch (err) {
      console.error(`Error ${action}:`, err);
      const errorMessage = err.message || 'Không thể cập nhật';
      
      // Nếu lỗi là chưa mở ca, hiển thị dialog xác nhận đẹp và gợi ý mở ca
      if (errorMessage.includes('chưa mở ca') || errorMessage.includes('Bạn chưa mở ca') || 
          errorMessage.includes('phải mở ca KITCHEN')) {
        setConfirmDialog({
          open: true,
          title: 'Chưa mở ca',
          message: `${errorMessage}\n\nBạn có muốn mở ca ngay bây giờ không?`,
          onConfirm: () => {
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
            setShowOpenShift(true);
          }
        });
      } else {
        // Hiển thị toast lỗi
        setToast({
          show: true,
          type: 'error',
          title: 'Lỗi',
          message: errorMessage
        });
      }
    }
  }

  const handleCancelClick = (item) => {
    setCancelDialog({ open: true, lineId: item.id, itemName: item.mon_ten });
    setCancelReason('');
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy món');
      return;
    }
    
    try {
      await handleAction(cancelDialog.lineId, 'cancel', cancelReason.trim());
      setCancelDialog({ open: false, lineId: null, itemName: '' });
      setCancelReason('');
    } catch (err) {
      // Error đã được xử lý trong handleAction
    }
  };

  // Batch action handlers
  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllInColumn = (columnItems) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      columnItems.forEach(item => newSet.add(item.id));
      return newSet;
    });
  };

  const deselectAllInColumn = (columnItems) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      columnItems.forEach(item => newSet.delete(item.id));
      return newSet;
    });
  };

  const handleBatchAction = async (action, columnItems) => {
    const selectedInColumn = columnItems.filter(item => selectedItems.has(item.id));
    if (selectedInColumn.length === 0) {
      setToast({ show: true, type: 'warning', title: 'Chưa chọn món', message: 'Vui lòng chọn ít nhất 1 món' });
      return;
    }

    // Process all selected items WITHOUT reloading each time
    let successCount = 0;
    let failCount = 0;
    const successIds = [];
    
    for (const item of selectedInColumn) {
      try {
        // Call API directly without triggering loadQueue
        await api.updateKitchenLine(item.id, action);
        successCount++;
        successIds.push(item.id);
      } catch (err) {
        console.error(`Error ${action} item ${item.id}:`, err);
        failCount++;
      }
    }

    // Remove successful items from selection
    if (successIds.length > 0) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        successIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }

    // Load queue ONCE after all actions complete
    await loadQueue(false);

    // Show result toast
    if (successCount > 0) {
      const actionText = action === 'start' ? 'Bắt đầu' : action === 'done' ? 'Hoàn tất' : 'Xử lý';
      setToast({ 
        show: true, 
        type: failCount > 0 ? 'warning' : 'success', 
        title: `${actionText} ${successCount} món`, 
        message: failCount > 0 ? `${failCount} món thất bại` : 'Thành công!' 
      });
    }
  };

  // Apply filters to items for a specific column
  const applyColumnFilter = (itemsList, filter) => {
    return itemsList.filter(item => {
      // Filter by order type
      if (filter.orderType !== 'ALL') {
        if (filter.orderType === 'DINE_IN' && item.order_type !== null && item.order_type !== 'DINE_IN') return false;
        if (filter.orderType === 'TAKEAWAY' && item.order_type !== 'TAKEAWAY') return false;
        if (filter.orderType === 'DELIVERY' && item.order_type !== 'DELIVERY') return false;
      }
      
      // Filter by order ID search
      if (filter.search.trim()) {
        const searchNum = filter.search.replace('#', '').trim();
        if (!item.don_hang_id.toString().includes(searchNum)) return false;
      }
      
      return true;
    });
  };

  // Raw data by status
  const allQueued = items.filter(x => x.trang_thai_che_bien === 'QUEUED');
  const allMaking = items.filter(x => x.trang_thai_che_bien === 'MAKING');
  
  // Filtered data
  const queued = applyColumnFilter(allQueued, queuedFilter);
  const making = applyColumnFilter(allMaking, makingFilter);

  const handleOpenShift = async (data) => {
    try {
      console.log('🚀 Opening shift with data:', data);
      await api.openShift(data);
      console.log('✅ Shift opened, reloading page...');
      
      // Force reload page để UI cập nhật chắc chắn
      window.location.reload();
    } catch (err) {
      console.error('Error opening shift:', err);
      throw err;
    }
  };

  const handleCloseShift = async (data) => {
    try {
      console.log('🔒 Closing shift with data:', data);
      await api.closeShift(data);
      console.log('✅ Shift closed, reloading page...');
      
      // Force reload page để UI cập nhật chắc chắn
      window.location.reload();
    } catch (err) {
      console.error('Error closing shift:', err);
      if (err.code === 'OPEN_ORDERS_EXIST' && err.openOrders) {
        setOpenOrders(err.openOrders);
        setShowOpenOrdersDialog(true);
        return;
      }
      throw err;
    }
  };

  const handleForceClose = async () => {
    try {
      await api.forceCloseShift();
      console.log('✅ Force closed, reloading page...');
      
      // Force reload page
      window.location.reload();
    } catch (err) {
      console.error('Error force closing shift:', err);
      throw err;
    }
  };

  // Helper function to format wait time nicely
  const formatWaitTime = (seconds) => {
    if (!seconds || seconds < 0) return '0s';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const KitchenColumn = ({ title, data, allData, bgColor, icon, actions, groupByOrder, filter, setFilter }) => {
    // Count selected items in this column
    const selectedCount = data.filter(item => selectedItems.has(item.id)).length;
    const allSelected = data.length > 0 && selectedCount === data.length;
    
    // Count items by order type (from unfiltered data)
    const dineInCount = allData.filter(x => !x.order_type || x.order_type === 'DINE_IN').length;
    const takeawayCount = allData.filter(x => x.order_type === 'TAKEAWAY').length;
    const deliveryCount = allData.filter(x => x.order_type === 'DELIVERY').length;
    const hasFilter = filter.orderType !== 'ALL' || filter.search.trim();
    
    // Gom nhóm items theo đơn hàng nếu enabled
    const groupedData = groupByOrder
      ? data.reduce((acc, item) => {
          const orderId = item.don_hang_id;
          if (!acc[orderId]) {
            acc[orderId] = {
              orderId,
              items: [],
              orderType: item.order_type,
              tenBan: item.ten_ban,
              khuVucTen: item.khu_vuc_ten,
              donHangTrangThai: item.don_hang_trang_thai,
              maxWaitSeconds: item.wait_seconds,
              createdAt: item.created_at
            };
          }
          acc[orderId].items.push(item);
          if (item.wait_seconds > acc[orderId].maxWaitSeconds) {
            acc[orderId].maxWaitSeconds = item.wait_seconds;
          }
          if (new Date(item.created_at) < new Date(acc[orderId].createdAt)) {
            acc[orderId].createdAt = item.created_at;
          }
          return acc;
        }, {})
      : null;

    const orderGroups = groupByOrder ? Object.values(groupedData).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];

    return (
    <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b-2 border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Select All Checkbox */}
            {!isManagerViewMode && data.length > 0 && (
              <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? deselectAllInColumn(data) : selectAllInColumn(data)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            )}
            <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center shadow-md`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              <p className="text-gray-600 text-sm font-medium">
                {hasFilter ? `${data.length}/${allData.length}` : data.length} món
                {groupByOrder && orderGroups.length > 0 && ` (${orderGroups.length} đơn)`}
                {selectedCount > 0 && <span className="text-indigo-600 ml-1">• {selectedCount} chọn</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Batch Action Buttons */}
            {!isManagerViewMode && selectedCount > 0 && (
              <div className="flex gap-1.5">
                {actions?.map(btn => (
                  <button
                    key={`batch-${btn.action}`}
                    onClick={() => handleBatchAction(btn.action, data)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${btn.className}`}
                    title={`${btn.action === 'start' ? 'Bắt đầu' : btn.action === 'done' ? 'Hoàn tất' : 'Hủy'} ${selectedCount} món`}
                  >
                    {selectedCount}× {btn.action === 'start' ? '▶' : btn.action === 'done' ? '✓' : '✕'}
                  </button>
                ))}
              </div>
            )}
            <div className={`${bgColor} text-white px-4 py-2 rounded-xl font-bold text-lg min-w-[50px] text-center shadow-md`}>
              {allData.length}
            </div>
          </div>
        </div>
        
        {/* Filter Bar - Inside each column */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="#..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-20 pl-7 pr-2 py-1 text-xs border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
            />
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Order Type Buttons */}
          <button
            onClick={() => setFilter({ ...filter, orderType: 'ALL' })}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              filter.orderType === 'ALL' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả
          </button>
          {dineInCount > 0 && (
            <button
              onClick={() => setFilter({ ...filter, orderType: 'DINE_IN' })}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                filter.orderType === 'DINE_IN' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tại bàn ({dineInCount})
            </button>
          )}
          {takeawayCount > 0 && (
            <button
              onClick={() => setFilter({ ...filter, orderType: 'TAKEAWAY' })}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                filter.orderType === 'TAKEAWAY' ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
              }`}
            >
              Mang đi ({takeawayCount})
            </button>
          )}
          {deliveryCount > 0 && (
            <button
              onClick={() => setFilter({ ...filter, orderType: 'DELIVERY' })}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                filter.orderType === 'DELIVERY' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              Giao hàng ({deliveryCount})
            </button>
          )}
          
          {/* Clear filter */}
          {hasFilter && (
            <button
              onClick={() => setFilter({ orderType: 'ALL', search: '' })}
              className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div
        className="p-4 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto"
        style={{ scrollBehavior: 'auto' }}
        ref={el => {
          if (el) {
            const key = `${title}-scroll`;
            scrollRefs.current[key] = el;
            if (el._savedScroll !== undefined) {
              el.scrollTop = el._savedScroll;
            }
          }
        }}
        onScroll={(e) => {
          e.target._savedScroll = e.target.scrollTop;
        }}
      >
        {data.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Không có món nào</p>
            <p className="text-gray-400 text-sm mt-1">Danh sách trống</p>
          </div>
        ) : groupByOrder ? (
          /* Grouped by Order View */
          orderGroups.map(group => (
            <div key={group.orderId} className={`rounded-xl border-2 overflow-hidden ${
              group.maxWaitSeconds > 600 ? 'border-red-400 bg-red-50' :
              group.maxWaitSeconds > 300 ? 'border-yellow-400 bg-yellow-50' :
              'border-indigo-200 bg-indigo-50'
            }`}>
              {/* Order Group Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">#{group.orderId}</span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                    group.orderType === 'DELIVERY' ? 'bg-orange-500' :
                    group.orderType === 'TAKEAWAY' ? 'bg-cyan-500' :
                    'bg-gray-500'
                  }`}>
                    {group.orderType === 'DELIVERY' ? '🚚 Giao' :
                     group.orderType === 'TAKEAWAY' ? '🥡 Đi' : '🍽️ Bàn'}
                  </span>
                  {group.tenBan && (
                    <span className="px-2 py-0.5 bg-white/20 rounded text-xs">{group.tenBan}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{group.items.length} món</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    group.maxWaitSeconds > 600 ? 'bg-red-500 animate-pulse' :
                    group.maxWaitSeconds > 300 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}>
                    {formatWaitTime(group.maxWaitSeconds)}
                  </span>
                </div>
              </div>
              {/* Items in Group */}
              <div className="p-3 space-y-2">
                {group.items.map(item => {
                  const options = typeof item.options === 'string' ? JSON.parse(item.options || '[]') : (item.options || []);
                  const sugarOption = options.find(opt => opt.ma === 'SUGAR');
                  const iceOption = options.find(opt => opt.ma === 'ICE');
                  const toppings = options.filter(opt => opt.loai === 'AMOUNT' && opt.ma !== 'SUGAR' && opt.ma !== 'ICE');
                  
                  return (
                    <div key={item.id} className={`bg-white rounded-lg p-3 border flex items-center justify-between gap-3 ${
                      selectedItems.has(item.id) ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-gray-200'
                    }`}>
                      {/* Checkbox */}
                      {!isManagerViewMode && (
                        <label className="flex items-center cursor-pointer flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="w-4 h-4 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 truncate">{item.mon_ten}</span>
                          {item.bien_the_ten && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{item.bien_the_ten}</span>
                          )}
                          <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-sm font-bold">×{item.so_luong}</span>
                        </div>
                        {/* Options compact */}
                        {(sugarOption || iceOption || toppings.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {sugarOption && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Đường: {sugarOption.muc_ten || `${Math.round((sugarOption.he_so || 0) * 100)}%`}</span>}
                            {iceOption && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Đá: {iceOption.muc_ten || `${Math.round((iceOption.he_so || 0) * 100)}%`}</span>}
                            {toppings.map((t, i) => <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{t.ten}: {t.so_luong}</span>)}
                          </div>
                        )}
                        {item.ghi_chu && (
                          <p className="text-xs text-amber-700 mt-1 italic">📝 {item.ghi_chu}</p>
                        )}
                      </div>
                      {/* Compact action buttons */}
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {actions?.map(btn => {
                          const isPaid = item.don_hang_trang_thai === 'PAID';
                          const isCancelDisabled = btn.action === 'cancel' && isPaid;
                          return (
                            <button
                              key={btn.action}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${btn.className} ${isCancelDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={() => !isCancelDisabled && handleAction(item, btn.action)}
                              disabled={isCancelDisabled}
                              title={isCancelDisabled ? 'Không thể hủy món đã thanh toán' : ''}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          /* Individual Item View */
          data.map(item => {
            // Parse options nếu là string
            const options = typeof item.options === 'string' ? JSON.parse(item.options || '[]') : (item.options || []);
            
            // Tách options theo loại
            const sugarOption = options.find(opt => opt.ma === 'SUGAR');
            const iceOption = options.find(opt => opt.ma === 'ICE');
            const toppings = options.filter(opt => opt.loai === 'AMOUNT' && opt.ma !== 'SUGAR' && opt.ma !== 'ICE');
            
            return (
            <div
              key={item.id}
              className={`bg-white rounded-xl p-5 border-2 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                // Highlight if selected
                selectedItems.has(item.id) ? 'ring-2 ring-indigo-500 border-indigo-400' :
                // Color-code border based on wait time
                item.wait_seconds > 600 ? 'border-red-400 bg-red-50' :
                item.wait_seconds > 300 ? 'border-yellow-400 bg-yellow-50' :
                'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setItemDetailDialog({ open: true, item })}
            >
              {/* Order ID Badge - Nổi bật */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  {!isManagerViewMode && (
                    <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    #{item.don_hang_id}
                  </span>
                  {/* Loại đơn hàng */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    item.order_type === 'DELIVERY' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                    item.order_type === 'TAKEAWAY' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' :
                    'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {item.order_type === 'DELIVERY' ? '🚚 Giao hàng' :
                     item.order_type === 'TAKEAWAY' ? '🥡 Mang đi' : '🍽️ Tại bàn'}
                  </span>
                </div>
                {/* Thời gian chờ với màu */}
                {item.wait_seconds !== undefined && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
                    item.wait_seconds > 600 ? 'bg-red-500 text-white animate-pulse' :
                    item.wait_seconds > 300 ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatWaitTime(item.wait_seconds)}
                  </span>
                )}
              </div>

              {/* Header: Tên món & Số lượng */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-2 leading-tight">
                    {item.mon_ten}
                  </h4>
                  {item.bien_the_ten && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold mb-2 border border-blue-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {item.bien_the_ten}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    {/* Chỉ hiện tên bàn nếu là đơn tại bàn */}
                    {item.ten_ban && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {item.ten_ban}
                      </span>
                    )}
                    {item.khu_vuc_ten && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium border border-purple-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.khu_vuc_ten}
                      </span>
                    )}
                    {item.don_hang_trang_thai === 'PAID' && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg font-bold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Đã thanh toán
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <div className="bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-xl shadow-md min-w-[70px] text-center border-2 border-emerald-600">
                    ×{item.so_luong}
                  </div>
                </div>
              </div>

              {/* Options: Đường, Đá, Topping */}
              {(sugarOption || iceOption || toppings.length > 0) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {sugarOption && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold border border-yellow-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Đường: {sugarOption.muc_ten || `${Math.round((sugarOption.he_so || 0) * 100)}%`}
                    </div>
                  )}
                  {iceOption && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      Đá: {iceOption.muc_ten || `${Math.round((iceOption.he_so || 0) * 100)}%`}
                    </div>
                  )}
                  {toppings.map((topping, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      {topping.ten}: {topping.so_luong || 0} {topping.don_vi || ''}
                    </div>
                  ))}
                </div>
              )}

              {/* Ghi chú */}
              {item.ghi_chu && (
                <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-sm text-amber-900 font-medium leading-relaxed">{item.ghi_chu}</p>
                  </div>
                </div>
              )}

              {/* Thời gian */}
              {item.created_at && (
                <div className="mb-4 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Đặt: {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {item.started_at && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Bắt đầu: {new Date(item.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {actions?.map(btn => {
                  // Disable nút Hủy cho món thuộc đơn đã thanh toán
                  const isPaid = item.don_hang_trang_thai === 'PAID';
                  const isCancelDisabled = btn.action === 'cancel' && isPaid;
                  
                  return (
                    <button
                      key={btn.label}
                      onClick={() => {
                        if (isCancelDisabled) return;
                        if (btn.action === 'cancel') {
                          handleCancelClick(item);
                        } else {
                          handleAction(item.id, btn.action);
                        }
                      }}
                      disabled={isCancelDisabled}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md ${btn.className} outline-none focus:outline-none ${
                        isCancelDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title={isCancelDisabled ? 'Đơn đã thanh toán, không thể hủy món' : undefined}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );};

  return (
    <AuthedLayout
      shift={shift}
      isManagerViewMode={isManagerViewMode}
      pageName="Kitchen"
      backUrl="/manager"
    >
      {/* View Only Banner */}
      {isViewOnly && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-blue-800">Chế độ xem</h3>
              <p className="text-sm text-blue-600">Bạn đang xem giao diện pha chế. Không thể thao tác.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/manager')}
            className="px-4 py-2.5 bg-blue-500 text-white border-2 border-blue-500 rounded-xl hover:bg-white hover:text-blue-500 transition-all duration-200 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Quay lại Manager</span>
          </button>
        </div>
      )}

      {/* Header Card - Đồng bộ 100% với Dashboard và Takeaway */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Title and Shift info */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#c9975b] rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Bếp / Pha chế</h2>
                <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#c9975b] rounded-full animate-pulse"></span>
                  Kitchen Display System
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

          {/* Right: Actions */}
          <div className="flex flex-col items-end gap-3">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-end">
              {/* Nút Quay lại Manager Dashboard - chỉ hiển thị khi Manager đang xem */}
              {isManagerViewMode && (
                <button
                  onClick={() => navigate('/manager')}
                  className="px-4 py-2.5 bg-blue-500 text-white border-2 border-blue-500 rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Quay lại Manager Dashboard</span>
                </button>
              )}

              {/* Nút Mở ca / Đóng ca - chỉ hiển thị khi KHÔNG phải Manager view */}
              {!isManagerViewMode && (
                shift && shift.status === 'OPEN' ? (
                  <button
                    onClick={() => setShowCloseShift(true)}
                    className="px-4 py-2.5 bg-purple-600 text-white border-2 border-purple-600 rounded-xl hover:bg-white hover:text-purple-700 transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Đóng ca</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowOpenShift(true)}
                    className="px-4 py-2.5 bg-green-600 text-white border-2 border-green-600 rounded-xl hover:bg-white hover:text-green-700 transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Mở ca</span>
                  </button>
                )
              )}

              {/* Dropdown khu vực */}
              <div className="relative min-w-[200px] max-w-[300px]">
                <select
                  value={selectedArea || ''}
                  onChange={(e) => setSelectedArea(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:border-[#c9975b] focus:outline-none focus:border-[#c9975b] focus:ring-2 focus:ring-[#c9975b]/20 transition-all duration-200 appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">
                    Tất cả khu vực
                  </option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.ten}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              {/* Toggle Group by Order */}
              <button
                onClick={() => setGroupByOrder(!groupByOrder)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm ${
                  groupByOrder 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-indigo-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Gom theo đơn
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium text-lg">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <KitchenColumn
            title="Chờ làm"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
            data={queued}
            allData={allQueued}
            bgColor="bg-[#c9975b]"
            filter={queuedFilter}
            setFilter={setQueuedFilter}
            actions={isManagerViewMode ? [] : [
              {
                label: (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Bắt đầu
                  </span>
                ),
                action: 'start',
                className: 'bg-[#c9975b] text-white border-2 border-[#c9975b] hover:bg-white hover:text-[#c9975b] hover:border-[#c9975b]'
              },
              {
                label: (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hủy
                  </span>
                ),
                action: 'cancel',
                className: 'bg-red-500 text-white border-2 border-red-500 hover:bg-white hover:text-red-600 hover:border-red-500'
              }
            ]}
            groupByOrder={groupByOrder}
          />

          <KitchenColumn
            title="Đang làm"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            }
            data={making}
            allData={allMaking}
            bgColor="bg-blue-500"
            filter={makingFilter}
            setFilter={setMakingFilter}
            actions={isManagerViewMode ? [] : [
              {
                label: (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hoàn tất
                  </span>
                ),
                action: 'done',
                className: 'bg-green-500 text-white border-2 border-green-500 hover:bg-white hover:text-green-600 hover:border-green-500'
              }
            ]}
            groupByOrder={groupByOrder}
          />
        </div>
      )}

      {/* Modals và Dialogs */}
      <OpenShiftModal
        open={showOpenShift}
        onClose={() => setShowOpenShift(false)}
        onSubmit={handleOpenShift}
      />

      {/* Item Detail Dialog */}
      {itemDetailDialog.open && itemDetailDialog.item && (() => {
        const item = itemDetailDialog.item;
        const options = typeof item.options === 'string' ? JSON.parse(item.options || '[]') : (item.options || []);
        const sugarOption = options.find(opt => opt.ma === 'SUGAR');
        const iceOption = options.find(opt => opt.ma === 'ICE');
        const toppings = options.filter(opt => opt.loai === 'AMOUNT' && opt.ma !== 'SUGAR' && opt.ma !== 'ICE');
        const otherOptions = options.filter(opt => opt.loai === 'PERCENT' && opt.ma !== 'SUGAR' && opt.ma !== 'ICE');
        
        return (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 bg-blue-50 border-b border-blue-200 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2.5">
                      <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Chi tiết món
                    </h3>
                    <p className="text-sm text-gray-600">{item.mon_ten}</p>
                  </div>
                  <button
                    onClick={() => setItemDetailDialog({ open: false, item: null })}
                    className="p-2 hover:bg-blue-100 rounded-full transition-colors outline-none focus:outline-none"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Thông tin cơ bản */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-gray-900 text-lg mb-3">Thông tin cơ bản</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Tên món</p>
                      <p className="font-semibold text-gray-900">{item.mon_ten}</p>
                    </div>
                    {item.bien_the_ten && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Biến thể</p>
                        <p className="font-semibold text-gray-900">{item.bien_the_ten}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Số lượng</p>
                      <p className="font-semibold text-gray-900">×{item.so_luong}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Bàn/Khu vực</p>
                      <p className="font-semibold text-gray-900">
                        {item.ten_ban || 'Mang đi'} {item.khu_vuc_ten && `• ${item.khu_vuc_ten}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Trạng thái</p>
                      <p className="font-semibold text-gray-900">
                        {item.trang_thai_che_bien === 'QUEUED' ? 'Chờ làm' : 
                         item.trang_thai_che_bien === 'MAKING' ? 'Đang làm' : 
                         item.trang_thai_che_bien}
                      </p>
                    </div>
                    {item.don_hang_trang_thai === 'PAID' && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Thanh toán</p>
                        <p className="font-semibold text-green-600">Đã thanh toán</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tùy chọn */}
                {options.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-gray-900 text-lg mb-3">Tùy chọn</h4>
                    <div className="space-y-3">
                      {sugarOption && (
                        <div className="bg-white rounded-lg p-3 border border-yellow-200">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="font-semibold text-gray-900">Độ ngọt</span>
                          </div>
                          <p className="text-gray-700">
                            {sugarOption.muc_ten || `${Math.round((sugarOption.he_so || 0) * 100)}%`}
                          </p>
                        </div>
                      )}
                      {iceOption && (
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                            <span className="font-semibold text-gray-900">Mức đá</span>
                          </div>
                          <p className="text-gray-700">
                            {iceOption.muc_ten || `${Math.round((iceOption.he_so || 0) * 100)}%`}
                          </p>
                        </div>
                      )}
                      {toppings.map((topping, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            <span className="font-semibold text-gray-900">{topping.ten}</span>
                          </div>
                          <p className="text-gray-700">
                            {topping.so_luong || 0} {topping.don_vi || ''}
                          </p>
                        </div>
                      ))}
                      {otherOptions.map((opt, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{opt.ten}</span>
                          </div>
                          <p className="text-gray-700">
                            {opt.muc_ten || `${Math.round((opt.he_so || 0) * 100)}%`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ghi chú */}
                {item.ghi_chu && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-amber-900 mb-1">Ghi chú</p>
                        <p className="text-sm text-amber-800 leading-relaxed">{item.ghi_chu}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thời gian */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 text-lg mb-3">Thời gian</h4>
                  <div className="space-y-2">
                    {item.created_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 w-24">Đặt lúc:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                    {item.started_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 w-24">Bắt đầu:</span>
                        <span className="font-semibold text-green-600">
                          {new Date(item.started_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                    {item.finished_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 w-24">Hoàn tất:</span>
                        <span className="font-semibold text-blue-600">
                          {new Date(item.finished_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-3xl">
                <button
                  onClick={() => setItemDetailDialog({ open: false, item: null })}
                  className="w-full py-3 px-4 bg-blue-600 text-white border-2 border-blue-600 rounded-xl font-semibold transition-all duration-200 hover:bg-white hover:text-blue-600 outline-none focus:outline-none"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cancel Dialog */}
      {cancelDialog.open && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 bg-red-50 border-b border-red-200 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-red-900 mb-1 flex items-center gap-2.5">
                    <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hủy món
                  </h3>
                  <p className="text-sm text-red-700">Nhập lý do hủy món</p>
                </div>
                <button
                  onClick={() => setCancelDialog({ open: false, lineId: null, itemName: '' })}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors outline-none focus:outline-none"
                >
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Món cần hủy:</p>
                <p className="font-bold text-gray-900 text-lg">{cancelDialog.itemName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lý do hủy <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy món (ví dụ: Hết nguyên liệu, Khách hủy đơn, Lỗi đặt hàng...)"
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-3xl flex gap-3">
              <button
                onClick={() => setCancelDialog({ open: false, lineId: null, itemName: '' })}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-white hover:text-gray-700 text-dark-700 border-2 border-gray-300 rounded-xl font-semibold transition-all duration-200 hover:border-gray-700 hover:shadow-lg outline-none focus:outline-none"
              >
                Hủy
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-[2] py-3 px-4 bg-red-500 text-white border-2 border-red-500 rounded-xl font-semibold transition-all duration-200 hover:bg-white hover:text-red-600 outline-none focus:outline-none flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <CloseShiftModal
        open={showCloseShift}
        onClose={() => setShowCloseShift(false)}
        onSubmit={handleCloseShift}
        shift={shift}
      />
      
      <OpenOrdersDialog
        open={showOpenOrdersDialog}
        orders={openOrders}
        onClose={() => setShowOpenOrdersDialog(false)}
        onForceClose={handleForceClose}
        onGoBack={() => {
          setShowOpenOrdersDialog(false);
          setShowCloseShift(false);
        }}
        loading={false}
      />

      <OpenOrdersDialog
        open={showTransferredOrdersDialog}
        orders={transferredOrders}
        mode="view-only"
        onClose={() => setShowTransferredOrdersDialog(false)}
        onForceClose={() => setShowTransferredOrdersDialog(false)}
        onGoBack={() => setShowTransferredOrdersDialog(false)}
        loading={false}
      />

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          show={toast.show}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Confirm Dialog for Shift Opening */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Mở ca ngay"
        cancelText="Để sau"
        type="info"
        onConfirm={confirmDialog.onConfirm || (() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null }))}
        onCancel={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })}
      />
    </AuthedLayout>
  );
}

