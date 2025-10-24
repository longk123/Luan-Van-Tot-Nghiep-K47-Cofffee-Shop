// src/pages/Kitchen.jsx
import { useEffect, useState, useRef } from 'react';
import { api } from '../api.js';
import useSSE from '../hooks/useSSE.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';

export default function Kitchen() {
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRefs = useRef({});

  async function loadAreas() {
    try {
      const res = await api.get('/areas');
      setAreas(res?.data || res || []);
    } catch (err) {
      console.error('Error loading areas:', err);
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

  useEffect(() => { loadAreas(); }, []);
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
        evt.type === 'kitchen.line.updated') {
      console.log('🔔 Kitchen update:', evt.type);
      loadQueue(true); // silent = true, không hiện loading, chỉ update data
    }
  });

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
            // Khôi phục scroll khi mount
            if (el._savedScroll !== undefined) {
              el.scrollTop = el._savedScroll;
            }
          }
        }}
        onScroll={(e) => {
          // Lưu scroll position
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
    <AuthedLayout>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🍳 Bếp / Pha chế</h2>
            <p className="text-sm text-gray-600">Kitchen Display System</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedArea || ''} 
              onChange={e => setSelectedArea(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">📍 Tất cả khu vực</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.ten}</option>
              ))}
            </select>
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
    </AuthedLayout>
  );
}

