// src/pages/Kitchen.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import useSSE from '../hooks/useSSE.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import OpenShiftModal from '../components/OpenShiftModal.jsx';
import CloseShiftModal from '../components/CloseShiftModal.jsx';
import OpenOrdersDialog from '../components/OpenOrdersDialog.jsx';
import { getUser } from '../auth.js';

export default function Kitchen() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRefs = useRef({});

  // Shift management states
  const [shift, setShift] = useState(null);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showOpenOrdersDialog, setShowOpenOrdersDialog] = useState(false);
  const [openOrders, setOpenOrders] = useState([]);
  const [transferredOrders, setTransferredOrders] = useState([]);
  const [showTransferredOrdersDialog, setShowTransferredOrdersDialog] = useState(false);

  // Get user info
  const user = getUser();
  const userRoles = user?.roles || [];

  // Check if user is Manager (View Only mode)
  const isManagerViewMode = userRoles.some(role =>
    ['manager', 'admin'].includes(role.toLowerCase())
  ) && !userRoles.some(role =>
    ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
  );

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
    if (evt.type === 'order.confirmed' || 
        evt.type === 'order.items.added' ||
        evt.type === 'kitchen.line.updated' ||
        evt.type === 'order.items.changed') {
      loadQueue(true);
    }
    
    if (evt.type === 'shift.opened' || evt.type === 'shift.closed') {
      loadShift();
    }
    
    if (shift?.id) {
      loadTransferredOrders(shift.id);
    }
  }, [shift?.id]);

  async function handleAction(lineId, action) {
    try {
      await api.updateKitchenLine(lineId, action);
      // Force reload ngay sau action (không dùng silent)
      await loadQueue(false);
    } catch (err) {
      console.error(`Error ${action}:`, err);
      alert(`Lỗi: ${err.message || 'Không thể cập nhật'}`);
    }
  }

  const queued = items.filter(x => x.trang_thai_che_bien === 'QUEUED');
  const making = items.filter(x => x.trang_thai_che_bien === 'MAKING');

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

  const KitchenColumn = ({ title, data, bgColor, icon, actions }) => (
    <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      {/* Header - Đơn giản và chuyên nghiệp */}
      <div className="px-6 py-4 bg-gray-50 border-b-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center shadow-md`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              <p className="text-gray-600 text-sm font-medium">{data.length} món</p>
            </div>
          </div>
          <div className={`${bgColor} text-white px-4 py-2 rounded-xl font-bold text-lg min-w-[50px] text-center shadow-md`}>
            {data.length}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div
        className="p-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto"
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
        ) : (
          data.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
            >
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
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {item.ten_ban || 'Mang đi'}
                    </span>
                    {item.khu_vuc_ten && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium border border-purple-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.khu_vuc_ten}
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
              <div className="flex gap-2">
                {actions?.map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => handleAction(item.id, btn.action)}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md ${btn.className} outline-none focus:outline-none`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <AuthedLayout
      shift={shift}
      isManagerViewMode={isManagerViewMode}
      pageName="Kitchen"
      backUrl="/manager"
    >
      {/* Header Card - Đồng bộ 100% với Dashboard và Takeaway */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/60 p-8 mb-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Title and Shift info */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#c9975b] rounded-xl blur-lg opacity-20"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-[#8b6f47] via-[#c9975b] to-[#d4a574] rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
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

          {/* Right: Actions */}
          <div className="flex flex-col items-end gap-3">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-end">
              {/* Nút Quay lại Manager Dashboard - chỉ hiển thị khi Manager đang xem */}
              {isManagerViewMode && (
                <button
                  onClick={() => navigate('/manager')}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-2 border-blue-500 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-blue-600 hover:border-blue-500 hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold outline-none focus:outline-none flex items-center gap-2.5 shadow-md"
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
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-2 border-purple-600 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-purple-700 hover:border-purple-600 hover:shadow-xl hover:scale-105 transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Đóng ca</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowOpenShift(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-600 rounded-xl hover:bg-white hover:from-white hover:to-white hover:text-green-700 hover:border-green-600 hover:shadow-xl hover:scale-105 transition-all duration-200 font-bold outline-none focus:outline-none flex items-center gap-2.5 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Bắt đầu ca</span>
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
            bgColor="bg-[#c9975b]"
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
              }
            ]}
          />

          <KitchenColumn
            title="Đang làm"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            }
            data={making}
            bgColor="bg-blue-500"
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
          />
        </div>
      )}

      {/* Modals và Dialogs */}
      <OpenShiftModal
        open={showOpenShift}
        onClose={() => setShowOpenShift(false)}
        onSubmit={handleOpenShift}
      />

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
    </AuthedLayout>
  );
}

