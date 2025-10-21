// src/components/ReservationsList.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ReservationsList({ open, onClose, onCheckIn, onShowToast }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, CONFIRMED, SEATED

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
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
    } catch (error) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi xác nhận',
        message: error.message
      });
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Lý do hủy (tùy chọn):');
    if (reason === null) return;

    try {
      await api.cancelReservation(id, reason || null);
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã hủy',
        message: 'Đặt bàn đã được hủy'
      });
      fetchReservations();
    } catch (error) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi hủy',
        message: error.message
      });
    }
  };

  const handleNoShow = async (id) => {
    if (!confirm('Xác nhận khách không đến?')) return;

    try {
      await api.markReservationNoShow(id);
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã đánh dấu',
        message: 'Đã đánh dấu khách không đến'
      });
      fetchReservations();
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
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      CONFIRMED: 'bg-green-100 text-green-700 border-green-300',
      SEATED: 'bg-blue-100 text-blue-700 border-blue-300',
      COMPLETED: 'bg-gray-100 text-gray-700 border-gray-300',
      CANCELLED: 'bg-red-100 text-red-700 border-red-300',
      NO_SHOW: 'bg-orange-100 text-orange-700 border-orange-300'
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
      <span className={`px-2 py-1 rounded-lg border text-xs font-medium ${styles[status] || styles.PENDING}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredReservations = filter === 'ALL'
    ? reservations
    : reservations.filter(r => r.trang_thai === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">📋 Danh sách đặt bàn</h3>
              <p className="text-gray-600 text-sm">{reservations.length} đặt bàn</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-indigo-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Date picker & Filter */}
          <div className="flex gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            <div className="flex gap-2 flex-1">
              {['ALL', 'PENDING', 'CONFIRMED', 'SEATED'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all outline-none focus:outline-none ${
                    filter === status
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-indigo-50 border border-indigo-200'
                  }`}
                >
                  {status === 'ALL' ? 'Tất cả' : status}
                </button>
              ))}
            </div>

            <button
              onClick={fetchReservations}
              className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-700 font-medium transition-colors outline-none focus:outline-none"
            >
              🔄 Làm mới
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải...</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 font-medium">Không có đặt bàn nào</p>
              <p className="text-gray-400 text-sm mt-1">Chọn ngày khác để xem</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map(reservation => {
                const startTime = new Date(reservation.start_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(reservation.end_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div 
                    key={reservation.id}
                    className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-lg text-gray-900">#{reservation.id}</span>
                          {getStatusBadge(reservation.trang_thai)}
                          <span className="text-gray-600 font-medium">{reservation.khach}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {startTime} - {endTime}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {reservation.so_nguoi} người
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {reservation.sdt}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {reservation.ban_names || 'Chưa chọn bàn'}
                          </div>
                        </div>

                        {reservation.ghi_chu && (
                          <div className="mt-2 text-sm text-gray-500 italic">
                            💬 {reservation.ghi_chu}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        {reservation.trang_thai === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleConfirm(reservation.id)}
                              className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors outline-none focus:outline-none"
                              title="Xác nhận"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors outline-none focus:outline-none"
                              title="Hủy"
                            >
                              ✕
                            </button>
                          </>
                        )}

                        {reservation.trang_thai === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => onCheckIn?.(reservation)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg outline-none focus:outline-none"
                            >
                              Check-in
                            </button>
                            <button
                              onClick={() => handleNoShow(reservation.id)}
                              className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors outline-none focus:outline-none"
                              title="No-show"
                            >
                              👤✕
                            </button>
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors outline-none focus:outline-none"
                              title="Hủy"
                            >
                              ✕
                            </button>
                          </>
                        )}

                        {reservation.trang_thai === 'SEATED' && (
                          <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                            Đang phục vụ
                          </span>
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
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors outline-none focus:outline-none"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

