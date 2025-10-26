// src/pages/Kitchen.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import useSSE from '../hooks/useSSE.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import OpenShiftModal from '../components/OpenShiftModal.jsx';
import CloseShiftModal from '../components/CloseShiftModal.jsx';
import OpenOrdersDialog from '../components/OpenOrdersDialog.jsx';
import CustomSelect from '../components/CustomSelect.jsx';
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
  const [refreshTick, setRefreshTick] = useState(0);

  // Role-based access control
  useEffect(() => {
    const user = getUser();
    console.log('🔍 User data:', user);
    
    // Kiểm tra roles array - cho phép kitchen staff, manager và admin
    const userRoles = user?.roles || [];
    const hasAccess = userRoles.some(role => 
      ['kitchen', 'barista', 'chef', 'cook', 'manager', 'admin'].includes(role.toLowerCase())
    );
    
    console.log('🔍 Kitchen access check:', { userRoles, hasAccess });
    
    if (!hasAccess) {
      console.log('❌ User không có quyền truy cập Kitchen, redirect về dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

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
  
  const handleRefresh = () => {
    loadQueue(true);
  };

  useEffect(() => {
    loadAreas();
    loadShift();
  }, []);

  // Force re-render when shift state changes
  useEffect(() => {
    console.log('🔄 Shift state changed:', shift);
    console.log('🔄 Force re-render triggered');
    
    // Force component re-render
    if (shift && shift.status === 'OPEN') {
      console.log('🔄 Shift is OPEN, should show close button');
    } else {
      console.log('🔄 No shift or shift not OPEN, should show open button');
    }
    
    // Force re-render by updating a dummy state
    setRefreshTick(prev => prev + 1);
  }, [shift]);
  
  // Debug: Log when shift becomes null
  useEffect(() => {
    if (shift === null) {
      console.log('🔄 Shift is now NULL - UI should show open button');
    }
  }, [shift]);
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

  const KitchenColumn = ({ title, data, bgColor, actions }) => (
    <div className={`flex-1 ${bgColor} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-white text-lg">{title}</h3>
        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {data.length}
        </span>
      </div>
      
      <div 
        className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2"
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
          <div className="text-center text-white/60 py-12">
            <svg className="w-16 h-16 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Không có món</p>
          </div>
        ) : (
          data.map(item => (
            <div key={item.id} className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-1">
                    {item.mon_ten} {item.bien_the_ten && <span className="text-blue-600">• {item.bien_the_ten}</span>}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {item.ten_ban || 'Mang đi'}
                    </span>
                    {item.khu_vuc_ten && (
                      <span className="text-purple-600">📍 {item.khu_vuc_ten}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
                    ×{item.so_luong}
                  </div>
                </div>
              </div>

              {item.ghi_chu && (
                <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <p className="text-sm text-yellow-800">📝 {item.ghi_chu}</p>
                </div>
              )}

              {item.created_at && (
                <div className="mb-3 text-xs text-gray-600">
                  ⏱️ Đặt lúc: {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  {item.started_at && ` • Bắt đầu: ${new Date(item.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              )}

              <div className="flex gap-2">
                {actions?.map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => handleAction(item.id, btn.action)}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${btn.className} outline-none focus:outline-none`}
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
    <AuthedLayout shift={shift}>
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🍳 Bếp / Pha chế</h2>
            <p className="text-sm text-gray-600">Kitchen Display System</p>
            {shift && shift.status === 'OPEN' && (
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Ca #{shift.id} - {shift.nhan_vien?.full_name || 'Unknown'}
                </span>
                <span className="text-gray-500">
                  Bắt đầu: {shift.started_at ? new Date(shift.started_at).toLocaleString('vi-VN') : 'Invalid Date'}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Nút mở/đóng ca */}
            {shift?.status === 'OPEN' ? (
              <button
                key={`close-${shift.id}-${refreshTick}`}
                onClick={() => setShowCloseShift(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Đóng ca
              </button>
            ) : (
              <button
                key={`open-${refreshTick}`}
                onClick={() => setShowOpenShift(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium outline-none focus:outline-none flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m-6 0h6m0 0h6" />
                </svg>
                Mở ca
              </button>
            )}
            
            {/* Dropdown khu vực */}
            <CustomSelect
              value={selectedArea || ''}
              onChange={value => setSelectedArea(value ? parseInt(value) : null)}
              options={[
                { value: '', label: '📍 Tất cả khu vực' },
                ...areas.map(area => ({
                  value: area.id,
                  label: area.ten
                }))
              ]}
              placeholder="📍 Tất cả khu vực"
              className="min-w-[200px] max-w-[300px]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <KitchenColumn
            title="📋 Chờ làm"
            data={queued}
            bgColor="bg-gradient-to-br from-amber-600 to-amber-700"
            actions={[
              { label: '▶️ Bắt đầu', action: 'start', className: 'bg-amber-700 hover:bg-amber-800 text-white' }
            ]}
          />
          
          <KitchenColumn
            title="🔥 Đang làm"
            data={making}
            bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
            actions={[
              { label: '✅ Hoàn tất', action: 'done', className: 'bg-green-500 hover:bg-green-600 text-white' },
              { label: '❌ Hủy', action: 'cancel', className: 'bg-red-500 hover:bg-red-600 text-white' }
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

      {/* Floating Manager Dashboard Button - only for manager/admin */}
      {(() => {
        const user = getUser();
        const roles = user?.roles || [];
        const isManager = roles.some(role => ['manager', 'admin'].includes(role.toLowerCase()));
        
        if (!isManager) return null;
        
        return (
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
        );
      })()}
    </AuthedLayout>
  );
}

