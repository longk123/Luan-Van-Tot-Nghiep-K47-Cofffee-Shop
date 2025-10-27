// src/components/ReservationPanel.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import CustomSelect from './CustomSelect.jsx';

export default function ReservationPanel({ open, onClose, onSuccess, onShowToast, areas }) {
  const [step, setStep] = useState(1); // 1: Info, 2: Select Tables, 3: Confirm
  const [loading, setLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    ten_khach: '',
    so_dien_thoai: '',
    so_nguoi: 1,
    khu_vuc_id: null,
    date: '',
    time: '',
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
        so_nguoi: 1,
        khu_vuc_id: null, // Tất cả khu vực
        date: dateStr,
        time: timeStr,
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
    
    if (field === 'so_nguoi') {
      // Đặc biệt xử lý số người - luôn phải >= 1
      if (typeof value === 'string') {
        const parsed = parseInt(value);
        cleanValue = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      } else if (typeof value === 'number') {
        cleanValue = isNaN(value) || value < 1 ? 1 : value;
      } else {
        cleanValue = 1;
      }
    } else if (field === 'khu_vuc_id' || field === 'duration' || field === 'dat_coc') {
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
    // End_at = cuối ngày (23:59:59)
    const end = new Date(`${formData.date}T23:59:59`);
    
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border-2 border-[#d4a574]/30">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 bg-gradient-to-r from-[#c9975b] via-[#d4a574] to-[#c9975b] border-b-2 border-[#e7d4b8] shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Đặt bàn mới
              </h3>
              <p className="text-white/90 text-sm font-medium">Bước {step}/2 - {step === 1 ? 'Thông tin' : 'Chọn bàn'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-all outline-none focus:outline-none hover:scale-110 active:scale-95"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-[#fef7ed]/30">
          {step === 1 && (
            <div className="space-y-6">
              {/* Thông tin khách hàng */}
              <div className="bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-2xl p-5 border-2 border-[#c9975b]/30 shadow-sm">
                <h4 className="font-bold text-[#8b6f47] mb-3 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#c9975b] to-[#d4a574] flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Thông tin khách hàng
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                      Tên khách hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.ten_khach}
                      onChange={(e) => handleInputChange('ten_khach', e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-3 border-2 border-[#e7d4b8] bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] text-[#8b6f47] font-medium shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.so_dien_thoai}
                      onChange={(e) => handleInputChange('so_dien_thoai', e.target.value)}
                      placeholder="0901234567"
                      className="w-full px-4 py-3 border-2 border-[#e7d4b8] bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] text-[#8b6f47] font-medium shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Thời gian & Số người */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                    Ngày đặt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-[#e7d4b8] bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] text-[#8b6f47] font-medium shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                    Giờ đặt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#e7d4b8] bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] text-[#8b6f47] font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                    Số người <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = Math.max(1, (formData.so_nguoi || 1) - 1);
                        handleInputChange('so_nguoi', newValue);
                      }}
                      disabled={formData.so_nguoi <= 1}
                      className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] hover:from-[#d4a574] hover:to-[#e7d4b8] disabled:from-gray-100 disabled:to-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl font-bold text-xl text-[#c9975b] outline-none focus:outline-none transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 disabled:scale-100"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={formData.so_nguoi || 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        handleInputChange('so_nguoi', isNaN(val) ? 1 : Math.max(1, val));
                      }}
                      className="flex-1 text-center px-3 py-2 border-2 border-[#e7d4b8] bg-white rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] h-10 text-[#8b6f47] shadow-sm"
                      min="1"
                      max="50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = (formData.so_nguoi || 1) + 1;
                        handleInputChange('so_nguoi', newValue);
                      }}
                      className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#c9975b] to-[#d4a574] hover:from-[#b88749] hover:to-[#c9975b] rounded-xl font-bold text-xl text-white outline-none focus:outline-none transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                    Khu vực
                  </label>
                  <CustomSelect
                    value={formData.khu_vuc_id || ''}
                    onChange={(val) => {
                      if (val === '' || val === 'null' || !val) {
                        handleInputChange('khu_vuc_id', null);
                      } else {
                        const parsed = parseInt(val);
                        handleInputChange('khu_vuc_id', isNaN(parsed) ? null : parsed);
                      }
                    }}
                    options={[
                      { value: '', label: 'Tất cả' },
                      ...(areas || []).map(area => ({
                        value: area.id,
                        label: area.ten
                      }))
                    ]}
                    placeholder="Tất cả"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Đặt cọc & Ghi chú */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                    Đặt cọc (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={formData.dat_coc}
                    onChange={(e) => handleInputChange('dat_coc', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-[#e7d4b8] bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] text-[#8b6f47] font-medium shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                    Nguồn
                  </label>
                  <CustomSelect
                    value={formData.nguon}
                    onChange={(val) => handleInputChange('nguon', val)}
                    options={[
                      { value: 'PHONE', label: 'Điện thoại' },
                      { value: 'WALKIN', label: 'Tại quán' },
                      { value: 'ONLINE', label: 'Online' }
                    ]}
                    placeholder="Chọn nguồn"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#8b6f47] mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={formData.ghi_chu}
                  onChange={(e) => handleInputChange('ghi_chu', e.target.value)}
                  placeholder="VD: Gần cửa sổ, yên tĩnh..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-[#e7d4b8] bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] resize-none text-[#8b6f47] font-medium shadow-sm"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#c9975b] to-[#d4a574] rounded-xl p-5 border-2 border-[#b88749] shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Chọn bàn ({selectedTables.length} đã chọn)
                  </h4>
                  <span className="text-sm text-white/90 font-medium">
                    {formData.date} • {formData.time} • {areaName}
                  </span>
                </div>
                <p className="text-sm text-white/90 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {formData.so_nguoi} người • {availableTables.length} bàn trống
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#e7d4b8] border-t-[#c9975b] mx-auto mb-4"></div>
                  <p className="text-[#8b6f47] font-semibold text-lg">Đang tìm bàn trống...</p>
                </div>
              ) : availableTables.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-12 h-12 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[#8b6f47] font-bold text-lg mb-2">Không có bàn trống</p>
                  <p className="text-[#c9975b]/70 text-sm">Vui lòng chọn thời gian khác</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableTables.map(table => (
                    <button
                      key={table.ban_id}
                      onClick={() => handleToggleTable(table.ban_id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left outline-none focus:outline-none shadow-sm hover:shadow-md transform ${
                        selectedTables.includes(table.ban_id)
                          ? 'border-[#c9975b] bg-gradient-to-br from-[#c9975b] to-[#d4a574] scale-105 shadow-lg'
                          : 'border-[#e7d4b8] bg-gradient-to-br from-white to-[#fffbf5] hover:border-[#c9975b] hover:scale-105'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${selectedTables.includes(table.ban_id) ? 'text-white' : 'text-[#8b6f47]'}`}>
                          {table.ten_ban}
                        </span>
                        {selectedTables.includes(table.ban_id) && (
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className={`text-sm font-medium flex items-center gap-1.5 ${selectedTables.includes(table.ban_id) ? 'text-white/90' : 'text-[#c9975b]'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {table.suc_chua} chỗ
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#fef7ed] to-[#fffbf5] border-t-2 border-[#e7d4b8] flex gap-3">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 rounded-xl font-bold transition-all shadow-sm hover:shadow-md outline-none focus:outline-none"
              >
                Hủy
              </button>
              <button
                onClick={handleSearchTables}
                disabled={loading || !formData.date || !formData.time}
                className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] text-white border-2 border-[#c9975b] rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Đang tìm...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Tìm bàn trống
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 rounded-xl font-bold transition-all shadow-sm hover:shadow-md outline-none focus:outline-none flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Quay lại
              </button>
              <button
                onClick={handleCreateReservation}
                disabled={loading || selectedTables.length === 0}
                className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Xác nhận đặt bàn ({selectedTables.length} bàn)
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

