// src/components/ReservationPanel.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ReservationPanel({ open, onClose, onSuccess, onShowToast, areas }) {
  const [step, setStep] = useState(1); // 1: Info, 2: Select Tables, 3: Confirm
  const [loading, setLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    ten_khach: '',
    so_dien_thoai: '',
    so_nguoi: 2,
    khu_vuc_id: null,
    date: '',
    time: '',
    duration: 90, // minutes
    ghi_chu: '',
    dat_coc: 0,
    nguon: 'PHONE'
  });

  // Initialize date/time to now + 1 hour (Vietnam timezone)
  useEffect(() => {
    if (open) {
      // Lấy giờ hiện tại của Việt Nam (UTC+7)
      const now = new Date();
      const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      
      // Cộng 1 tiếng
      vietnamTime.setHours(vietnamTime.getHours() + 1);
      vietnamTime.setMinutes(0);
      vietnamTime.setSeconds(0);
      
      // Format ngày: YYYY-MM-DD
      const year = vietnamTime.getFullYear();
      const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
      const day = String(vietnamTime.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Format giờ: HH:MM
      const hours = String(vietnamTime.getHours()).padStart(2, '0');
      const minutes = String(vietnamTime.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      // Reset toàn bộ form
      setFormData({
        ten_khach: '',
        so_dien_thoai: '',
        so_nguoi: 2,
        khu_vuc_id: areas && areas.length > 0 ? areas[0].id : null,
        date: dateStr,
        time: timeStr,
        duration: 90,
        ghi_chu: '',
        dat_coc: 0,
        nguon: 'PHONE'
      });
      
      setStep(1);
      setSelectedTables([]);
      setAvailableTables([]);
    }
  }, [open, areas]);

  const handleInputChange = (field, value) => {
    // Đảm bảo không có NaN trong state
    let cleanValue = value;
    
    if (field === 'khu_vuc_id' || field === 'so_nguoi' || field === 'duration' || field === 'dat_coc') {
      // Nếu là số, parse an toàn
      if (typeof value === 'string') {
        const parsed = parseInt(value);
        cleanValue = isNaN(parsed) ? null : parsed;
      } else if (typeof value === 'number' && isNaN(value)) {
        cleanValue = null;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: cleanValue }));
  };

  const getStartEndTime = () => {
    if (!formData.date || !formData.time) return null;
    
    const start = new Date(`${formData.date}T${formData.time}`);
    const end = new Date(start.getTime() + formData.duration * 60000);
    
    return {
      start_at: start.toISOString(),
      end_at: end.toISOString()
    };
  };

  const handleSearchTables = async () => {
    console.log('🔍 handleSearchTables called');
    console.log('📋 Current formData:', formData);
    
    const times = getStartEndTime();
    console.log('⏰ Times:', times);
    
    if (!times) {
      console.log('❌ No times, showing error toast');
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn ngày và giờ'
      });
      return;
    }

    setLoading(true);
    console.log('⏳ Loading started');
    
    try {
      // Đảm bảo khu_vuc_id là null hoặc số hợp lệ
      let areaId = formData.khu_vuc_id;
      console.log('🏢 Original areaId:', areaId, 'type:', typeof areaId);
      
      if (areaId === '' || areaId === 'null' || areaId === undefined || (typeof areaId === 'number' && isNaN(areaId))) {
        areaId = null;
      }
      
      console.log('✅ Cleaned areaId:', areaId);
      console.log('📡 Calling API with:', { start: times.start_at, end: times.end_at, areaId });
      
      const res = await api.searchAvailableTables(
        times.start_at,
        times.end_at,
        areaId
      );
      
      console.log('📥 API Response:', res);
      console.log('📥 Response type:', typeof res, 'success:', res?.success, 'data:', res?.data);
      
      const tables = res?.data || res || [];
      console.log('🏠 Tables found:', tables.length, tables);
      console.log('🏠 Tables is array?', Array.isArray(tables));
      
      setAvailableTables(tables);
      setStep(2);
      console.log('✅ Moved to step 2');
      
      if (tables.length === 0) {
        onShowToast?.({
          show: true,
          type: 'warning',
          title: 'Không có bàn trống',
          message: 'Không tìm thấy bàn trống trong khung giờ này'
        });
      }
    } catch (error) {
      console.error('❌ Error searching tables:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi tìm kiếm',
        message: error.message || 'Không thể tìm bàn trống'
      });
    } finally {
      console.log('🏁 Search completed, loading:', false);
      setLoading(false);
    }
  };

  const handleToggleTable = (tableId) => {
    setSelectedTables(prev => 
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleCreateReservation = async () => {
    // Validation
    if (!formData.ten_khach || !formData.so_dien_thoai) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập tên và số điện thoại khách hàng'
      });
      return;
    }

    if (selectedTables.length === 0) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Chưa chọn bàn',
        message: 'Vui lòng chọn ít nhất 1 bàn'
      });
      return;
    }

    const times = getStartEndTime();
    if (!times) return;

    setLoading(true);
    try {
      const payload = {
        ten_khach: formData.ten_khach,
        so_dien_thoai: formData.so_dien_thoai,
        so_nguoi: formData.so_nguoi,
        khu_vuc_id: formData.khu_vuc_id || null,
        start_at: times.start_at,
        end_at: times.end_at,
        ghi_chu: formData.ghi_chu || null,
        dat_coc: formData.dat_coc || 0,
        nguon: formData.nguon,
        table_ids: selectedTables
      };

      const res = await api.createReservation(payload);
      const reservation = res?.data || res;

      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đặt bàn thành công!',
        message: `Đã tạo đặt bàn #${reservation.id} cho ${formData.ten_khach}`
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi đặt bàn',
        message: error.message || 'Không thể tạo đặt bàn'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const areaName = areas?.find(a => a.id === formData.khu_vuc_id)?.ten || 'Tất cả';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">📅 Đặt bàn mới</h3>
              <p className="text-gray-600 text-sm">Bước {step}/2 - {step === 1 ? 'Thông tin' : 'Chọn bàn'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Thông tin khách hàng */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-200">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Thông tin khách hàng
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên khách hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.ten_khach}
                      onChange={(e) => handleInputChange('ten_khach', e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.so_dien_thoai}
                      onChange={(e) => handleInputChange('so_dien_thoai', e.target.value)}
                      placeholder="0901234567"
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thời gian & Số người */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngày đặt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giờ đặt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số người
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInputChange('so_nguoi', Math.max(1, formData.so_nguoi - 1))}
                      className="w-10 h-10 bg-blue-100 hover:bg-blue-200 rounded-lg font-bold text-blue-700 outline-none focus:outline-none"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={formData.so_nguoi}
                      onChange={(e) => handleInputChange('so_nguoi', Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center px-3 py-2 border-2 border-gray-300 rounded-lg font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                    <button
                      onClick={() => handleInputChange('so_nguoi', formData.so_nguoi + 1)}
                      className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold text-white outline-none focus:outline-none"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Thời lượng (phút)
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="60">60 phút</option>
                    <option value="90">90 phút</option>
                    <option value="120">120 phút</option>
                    <option value="150">150 phút</option>
                    <option value="180">180 phút</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Khu vực
                  </label>
                  <select
                    value={formData.khu_vuc_id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === 'null' || !val) {
                        handleInputChange('khu_vuc_id', null);
                      } else {
                        const parsed = parseInt(val);
                        handleInputChange('khu_vuc_id', isNaN(parsed) ? null : parsed);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    {areas && areas.map(area => (
                      <option key={area.id} value={area.id}>{area.ten}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Đặt cọc & Ghi chú */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Đặt cọc (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={formData.dat_coc}
                    onChange={(e) => handleInputChange('dat_coc', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nguồn
                  </label>
                  <select
                    value={formData.nguon}
                    onChange={(e) => handleInputChange('nguon', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PHONE">Điện thoại</option>
                    <option value="WALKIN">Tại quán</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={formData.ghi_chu}
                  onChange={(e) => handleInputChange('ghi_chu', e.target.value)}
                  placeholder="VD: Gần cửa sổ, yên tĩnh..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-blue-900">Chọn bàn ({selectedTables.length} đã chọn)</h4>
                  <span className="text-sm text-blue-700">
                    {formData.date} • {formData.time} • {formData.duration}' • {areaName}
                  </span>
                </div>
                <p className="text-sm text-blue-600">
                  👥 {formData.so_nguoi} người • {availableTables.length} bàn trống
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tìm bàn trống...</p>
                </div>
              ) : availableTables.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 font-medium">Không có bàn trống</p>
                  <p className="text-gray-400 text-sm mt-1">Vui lòng chọn thời gian khác</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableTables.map(table => (
                    <button
                      key={table.ban_id}
                      onClick={() => handleToggleTable(table.ban_id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left outline-none focus:outline-none ${
                        selectedTables.includes(table.ban_id)
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{table.ten_ban}</span>
                        {selectedTables.includes(table.ban_id) && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        👥 {table.suc_chua} chỗ
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors outline-none focus:outline-none"
              >
                Hủy
              </button>
              <button
                onClick={handleSearchTables}
                disabled={loading || !formData.date || !formData.time}
                className="flex-[2] py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
              >
                {loading ? 'Đang tìm...' : 'Tìm bàn trống →'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors outline-none focus:outline-none"
              >
                ← Quay lại
              </button>
              <button
                onClick={handleCreateReservation}
                disabled={loading || selectedTables.length === 0}
                className="flex-[2] py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
              >
                {loading ? 'Đang tạo...' : `✓ Xác nhận đặt bàn (${selectedTables.length} bàn)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

