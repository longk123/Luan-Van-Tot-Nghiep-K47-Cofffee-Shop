// src/components/ReservationsList.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function ReservationsList({ open, onClose, onCheckIn, onReservationUpdated, onShowToast }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, CONFIRMED, SEATED
  const [noShowConfirm, setNoShowConfirm] = useState({ open: false, id: null });
  const [cancelDialog, setCancelDialog] = useState({ open: false, id: null, reason: '' });

  useEffect(() => {
    if (open) {
      // Lấy ngày hiện tại theo timezone Việt Nam
      const now = new Date();
      const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      
      const year = vietnamTime.getFullYear();
      const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
      const day = String(vietnamTime.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      setSelectedDate(today);
    }
  }, [open]);

  useEffect(() => {
    if (selectedDate) {
      fetchReservations();
    }
  }, [selectedDate]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await api.getReservationsByDate(selectedDate);
      const data = res?.data || res || [];
      setReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: error.message || 'Không thể tải danh sách đặt bàn'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await api.confirmReservation(id);
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã xác nhận',
        message: 'Đặt bàn đã được xác nhận'
      });
      fetchReservations();
      onReservationUpdated?.(); // Reload tables
    } catch (error) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi xác nhận',
        message: error.message
      });
    }
  };

  const handleCancel = (id) => {
    setCancelDialog({ open: true, id, reason: '' });
  };

  const confirmCancel = async () => {
    const { id, reason } = cancelDialog;
    setCancelDialog({ open: false, id: null, reason: '' });
    
    try {
      await api.cancelReservation(id, reason || null);
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã hủy',
        message: 'Đặt bàn đã được hủy'
      });
      fetchReservations();
      onReservationUpdated?.(); // Reload tables
    } catch (error) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi hủy',
        message: error.message
      });
    }
  };

  const handleNoShow = (id) => {
    setNoShowConfirm({ open: true, id });
  };

  const confirmNoShow = async () => {
    const id = noShowConfirm.id;
    setNoShowConfirm({ open: false, id: null });
    
    try {
      await api.markReservationNoShow(id);
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã đánh dấu',
        message: 'Đã đánh dấu khách không đến'
      });
      fetchReservations();
      onReservationUpdated?.(); // Reload tables
    } catch (error) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: error.message
      });
    }
  };

  if (!open) return null;

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border-yellow-400 shadow-sm',
      CONFIRMED: 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-400 shadow-sm',
      SEATED: 'bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-[#b88749] shadow-md',
      COMPLETED: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-400 shadow-sm',
      CANCELLED: 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-400 shadow-sm',
      NO_SHOW: 'bg-gradient-to-r from-orange-100 to-amber-50 text-amber-800 border-orange-400 shadow-sm'
    };
    
    const labels = {
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      SEATED: 'Đã check-in',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      NO_SHOW: 'Không đến'
    };

    return (
      <span className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold ${styles[status] || styles.PENDING}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredReservations = filter === 'ALL'
    ? reservations
    : reservations.filter(r => r.trang_thai === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border-2 border-[#d4a574]/30">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 bg-gradient-to-r from-[#c9975b] via-[#d4a574] to-[#c9975b] border-b-2 border-[#e7d4b8] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Danh sách đặt bàn
              </h3>
              <p className="text-white/90 text-sm font-medium mt-1">{reservations.length} đặt bàn</p>
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

          {/* Date picker & Filter */}
          <div className="flex gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 border-2 border-white/50 bg-white/90 rounded-xl text-[#8b6f47] font-semibold focus:outline-none focus:ring-2 focus:ring-white focus:border-white shadow-sm"
            />
            
            <div className="flex gap-2 flex-1">
              {['ALL', 'PENDING', 'CONFIRMED', 'SEATED'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all outline-none focus:outline-none shadow-sm ${
                    filter === status
                      ? 'bg-white text-[#c9975b] shadow-lg scale-105'
                      : 'bg-white/70 text-white hover:bg-white hover:text-[#c9975b] border border-white/50'
                  }`}
                >
                  {status === 'ALL' ? 'Tất cả' : status}
                </button>
              ))}
            </div>

            <button
              onClick={fetchReservations}
              className="px-4 py-2.5 bg-white/90 hover:bg-white rounded-xl text-[#c9975b] font-bold transition-all outline-none focus:outline-none shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-[#fef7ed]/30">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#e7d4b8] border-t-[#c9975b] mx-auto mb-4"></div>
              <p className="text-[#8b6f47] font-semibold text-lg">Đang tải dữ liệu...</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[#8b6f47] font-bold text-lg mb-2">Không có đặt bàn nào</p>
              <p className="text-[#c9975b]/70 text-sm">Chọn ngày khác để xem đặt bàn</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map(reservation => {
                const startTime = new Date(reservation.start_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(reservation.end_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div 
                    key={reservation.id}
                    className="bg-gradient-to-br from-white via-[#fffbf5] to-white border-2 border-[#e7d4b8] rounded-2xl p-5 hover:border-[#c9975b] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="font-black text-lg text-[#8b6f47] bg-gradient-to-r from-[#e7d4b8] to-[#fef7ed] px-3 py-1 rounded-lg shadow-sm">#{reservation.id}</span>
                          {getStatusBadge(reservation.trang_thai)}
                          <span className="text-[#8b6f47] font-bold">{reservation.khach}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                          <div className="flex items-center gap-2.5 text-[#8b6f47] font-medium">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] flex items-center justify-center shadow-sm">
                              <svg className="w-4 h-4 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            {startTime} - {endTime}
                          </div>
                          <div className="flex items-center gap-2.5 text-[#8b6f47] font-medium">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] flex items-center justify-center shadow-sm">
                              <svg className="w-4 h-4 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            {reservation.so_nguoi} người
                          </div>
                          <div className="flex items-center gap-2.5 text-[#8b6f47] font-medium">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] flex items-center justify-center shadow-sm">
                              <svg className="w-4 h-4 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            {reservation.sdt}
                          </div>
                          <div className="flex items-center gap-2.5 text-[#8b6f47] font-medium">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] flex items-center justify-center shadow-sm">
                              <svg className="w-4 h-4 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            {reservation.ban_names || 'Chưa chọn bàn'}
                          </div>
                        </div>

                        {reservation.ghi_chu && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-[#fef7ed] to-[#fffbf5] rounded-lg border border-[#e7d4b8]">
                            <div className="flex items-start gap-2 text-sm text-[#8b6f47]">
                              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <span className="font-medium italic">{reservation.ghi_chu}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        {reservation.trang_thai === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleConfirm(reservation.id)}
                              className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none hover:scale-110 active:scale-95 flex items-center justify-center"
                              title="Xác nhận"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none hover:scale-110 active:scale-95 flex items-center justify-center"
                              title="Hủy"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}

                        {reservation.trang_thai === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => onCheckIn?.(reservation)}
                              className="px-5 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] text-white border-2 border-[#c9975b] rounded-xl font-bold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Check-in
                            </button>
                            <button
                              onClick={() => handleNoShow(reservation.id)}
                              className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none hover:scale-110 active:scale-95 flex items-center justify-center"
                              title="No-show"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 8L22 12M22 8L18 12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none hover:scale-110 active:scale-95 flex items-center justify-center"
                              title="Hủy"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}

                        {reservation.trang_thai === 'SEATED' && (
                          <div className="px-5 py-2.5 bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white rounded-xl font-bold shadow-md flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Đang phục vụ
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#fef7ed] to-[#fffbf5] border-t-2 border-[#e7d4b8]">
          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] text-white border-2 border-[#c9975b] rounded-xl font-bold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Đóng
          </button>
        </div>
      </div>
      
      <ConfirmDialog
        open={noShowConfirm.open}
        title="Khách không đến"
        message="Xác nhận khách không đến? Bàn sẽ được giải phóng."
        confirmText="Xác nhận"
        type="warning"
        onConfirm={confirmNoShow}
        onCancel={() => setNoShowConfirm({ open: false, id: null })}
      />
      
      {/* Dialog hủy với input lý do */}
      {cancelDialog.open && (
        <>
          <div 
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md"
            onClick={() => setCancelDialog({ open: false, id: null, reason: '' })}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-2xl max-w-md w-full pointer-events-auto border-2 border-[#d4a574]/30 animate-fadeIn">
              <div className="px-6 py-5 bg-gradient-to-r from-[#c9975b] via-[#d4a574] to-[#c9975b] border-b-2 border-[#e7d4b8]">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Hủy đặt bàn
                </h3>
              </div>
              
              <div className="p-6">
                <label className="block text-sm font-bold text-[#8b6f47] mb-3">
                  Lý do hủy (tùy chọn)
                </label>
                <textarea
                  value={cancelDialog.reason}
                  onChange={(e) => setCancelDialog(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Khách thay đổi kế hoạch..."
                  className="w-full px-4 py-3 border-2 border-[#e7d4b8] bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] resize-none text-[#8b6f47] font-medium shadow-sm"
                  rows={3}
                  autoFocus
                />
              </div>
              
              <div className="px-6 py-4 bg-gradient-to-r from-[#fef7ed] to-[#fffbf5] border-t-2 border-[#e7d4b8] flex gap-3">
                <button
                  onClick={() => setCancelDialog({ open: false, id: null, reason: '' })}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 rounded-xl font-bold transition-all shadow-sm hover:shadow-md outline-none focus:outline-none"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Xác nhận hủy
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

