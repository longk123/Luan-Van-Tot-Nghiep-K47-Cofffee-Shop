// Customer Portal - Reservation Page
// Tích hợp: Xem đặt bàn hiện tại + Lịch sử + Form đặt mới
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { customerApi } from '../../api/customerApi';
import { isCustomerLoggedIn, getCustomerInfo } from '../../auth/customerAuth';
import useSSE from '../../hooks/useSSE';
import { 
  Calendar, Clock, Users, AlertCircle, CheckCircle, XCircle, 
  Plus, History, CalendarCheck, Phone, Mail, MapPin, Loader2, Armchair
} from 'lucide-react';

export default function CustomerReservationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Đặt bàn hiện tại (PENDING hoặc CONFIRMED)
  const [activeReservation, setActiveReservation] = useState(null);
  // Lịch sử đặt bàn (COMPLETED, CANCELLED, NO_SHOW, SEATED)
  const [reservationHistory, setReservationHistory] = useState([]);
  // Hiển thị form đặt mới
  const [showNewForm, setShowNewForm] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    ten_khach: '',
    so_dien_thoai: '',
    email: '',
    so_nguoi: 2,
    khu_vuc_id: null,
    ban_id: null, // Bàn chọn tùy chọn
    date: '',
    time: '',
    duration: 90,
    ghi_chu: ''
  });

  // Danh sách bàn trống
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    loadReservations();
    initFormData();
  }, []);

  // SSE để cập nhật real-time trạng thái đặt bàn
  useSSE('/api/v1/pos/events', (evt) => {
    if (evt.type === 'reservation.created' || 
        evt.type === 'reservation.updated' ||
        evt.type === 'reservation.cancelled' ||
        evt.type === 'reservation.confirmed' ||
        evt.type === 'reservation.checked_in' ||
        evt.type === 'reservation.completed' ||
        evt.type === 'reservation.no_show') {
      // Reload danh sách đặt bàn
      loadReservations();
    }
  });

  // Load bàn trống khi thay đổi số người hoặc ngày/giờ
  useEffect(() => {
    if (formData.so_nguoi && showNewForm) {
      loadAvailableTables();
    }
  }, [formData.so_nguoi, formData.date, formData.time, showNewForm]);

  const loadAvailableTables = async () => {
    try {
      setLoadingTables(true);
      const { data } = await customerApi.getAvailableTables({ minCapacity: formData.so_nguoi });
      setAvailableTables(data || []);
    } catch (err) {
      console.error('Error loading tables:', err);
      setAvailableTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const initFormData = () => {
    // Set default date/time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const dateStr = tomorrow.toISOString().split('T')[0];
    const timeStr = '10:00';
    
    // Fill customer info if logged in
    const customer = isCustomerLoggedIn() ? getCustomerInfo() : null;
    
    setFormData({
      ten_khach: customer?.fullName || '',
      so_dien_thoai: customer?.phone || '',
      email: customer?.email || '',
      so_nguoi: 2,
      khu_vuc_id: null,
      ban_id: null,
      date: dateStr,
      time: timeStr,
      duration: 90,
      ghi_chu: ''
    });
  };

  const loadReservations = async () => {
    try {
      setLoading(true);
      
      if (!isCustomerLoggedIn()) {
        // Khách vãng lai không được đặt bàn - yêu cầu đăng nhập
        navigate('/customer/login?return=/customer/reservation&message=Vui lòng đăng nhập để đặt bàn');
        return;
      }
      
      const { data } = await customerApi.getReservations({ limit: 50 });
      const reservations = data || [];
      
      // Tìm đặt bàn đang hoạt động (PENDING hoặc CONFIRMED)
      const active = reservations.find(r => 
        ['PENDING', 'CONFIRMED'].includes(r.status)
      );
      
      // Lịch sử (các trạng thái khác)
      const history = reservations.filter(r => 
        !['PENDING', 'CONFIRMED'].includes(r.status)
      );
      
      setActiveReservation(active || null);
      setReservationHistory(history);
      
      // Nếu không có đặt bàn active, hiển thị form đặt mới
      if (!active) {
        setShowNewForm(true);
      }
    } catch (err) {
      console.error('Error loading reservations:', err);
      setShowNewForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.ten_khach || !formData.so_dien_thoai) {
      setError('Vui lòng nhập đầy đủ thông tin khách hàng');
      return;
    }

    if (!formData.date || !formData.time) {
      setError('Vui lòng chọn ngày và giờ');
      return;
    }

    // Calculate start_at and end_at
    const [year, month, day] = formData.date.split('-').map(Number);
    const [hours, minutes] = formData.time.split(':').map(Number);
    const startAt = new Date(year, month - 1, day, hours, minutes);
    const endAt = new Date(startAt.getTime() + formData.duration * 60000);

    // Check if date is in the past
    if (startAt < new Date()) {
      setError('Không thể đặt bàn trong quá khứ');
      return;
    }

    try {
      setSubmitting(true);

      const customer = isCustomerLoggedIn() ? getCustomerInfo() : null;

      const reservationData = {
        ten_khach: formData.ten_khach,
        so_dien_thoai: formData.so_dien_thoai,
        email: formData.email || null,
        so_nguoi: formData.so_nguoi,
        khu_vuc_id: formData.khu_vuc_id || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        ghi_chu: formData.ghi_chu || null,
        nguon: 'ONLINE',
        customer_account_id: customer?.id || null,
        table_ids: formData.ban_id ? [formData.ban_id] : [] // Chuyển ban_id thành array
      };

      const response = await api.createReservation(reservationData);

      setSuccess(`Đặt bàn thành công! Mã đặt bàn: #${response.data.id}`);
      setShowNewForm(false);
      
      // Reload để cập nhật active reservation
      await loadReservations();
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError(err.message || 'Không thể đặt bàn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!activeReservation) return;
    
    if (!window.confirm('Bạn có chắc muốn hủy đặt bàn này?')) return;
    
    try {
      setCancelling(true);
      await api.cancelReservation(activeReservation.id, 'Khách hàng tự hủy');
      setSuccess('Đã hủy đặt bàn thành công');
      await loadReservations();
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      setError('Không thể hủy đặt bàn. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      CONFIRMED: { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      SEATED: { text: 'Đã đến', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      COMPLETED: { text: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { text: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: XCircle },
      NO_SHOW: { text: 'Không đến', color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };
    
    const info = statusMap[status] || statusMap.PENDING;
    const Icon = info.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${info.color}`}>
        <Icon className="w-4 h-4" />
        {info.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#c9975b]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Đặt bàn</h1>
        <p className="text-lg text-gray-600">Đặt bàn trước để đảm bảo chỗ ngồi</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Active Reservation Card */}
      {activeReservation && (
        <div className="mb-8 bg-gradient-to-r from-[#c9975b] to-[#d4a574] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-6 h-6" />
              Đặt bàn hiện tại
            </h2>
            {getStatusBadge(activeReservation.status)}
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Ngày</p>
                  <p className="font-semibold">{formatDate(activeReservation.start_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Giờ</p>
                  <p className="font-semibold">
                    {formatTime(activeReservation.start_at)} - {formatTime(activeReservation.end_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Số người</p>
                  <p className="font-semibold">{activeReservation.party_size} người</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-sm opacity-80">Khu vực</p>
                  <p className="font-semibold">{activeReservation.area_name || 'Chưa xác định'}</p>
                </div>
              </div>
            </div>
            
            {activeReservation.notes && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm opacity-80">Ghi chú:</p>
                <p className="font-medium">{activeReservation.notes}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm opacity-80">
              Mã đặt bàn: <span className="font-bold">#{activeReservation.id}</span>
            </p>
            {activeReservation.status === 'PENDING' && (
              <button
                onClick={handleCancelReservation}
                disabled={cancelling}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition disabled:opacity-50"
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đặt bàn'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* New Reservation Form */}
      {showNewForm && !activeReservation && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Đặt bàn mới
          </h2>
          
          <form onSubmit={handleSubmit}>
            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#c9975b]" />
                Thông tin khách hàng
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ten_khach}
                    onChange={(e) => setFormData({ ...formData, ten_khach: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.so_dien_thoai}
                    onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (tùy chọn)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Reservation Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#c9975b]" />
                Chi tiết đặt bàn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giờ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số người <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, so_nguoi: Math.max(1, formData.so_nguoi - 1) })}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={formData.so_nguoi}
                      onChange={(e) => setFormData({ ...formData, so_nguoi: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="20"
                      className="w-20 px-4 py-3 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, so_nguoi: Math.min(20, formData.so_nguoi + 1) })}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời lượng
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  >
                    <option value="60">1 giờ</option>
                    <option value="90">1.5 giờ</option>
                    <option value="120">2 giờ</option>
                    <option value="180">3 giờ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Chọn bàn (Tùy chọn) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Armchair className="w-5 h-5 text-[#c9975b]" />
                Chọn bàn 
                <span className="text-sm font-normal text-gray-500">(tùy chọn)</span>
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                Bạn có thể chọn bàn yêu thích hoặc để trống - nhân viên sẽ sắp xếp bàn phù hợp khi bạn đến.
              </p>
              
              {loadingTables ? (
                <div className="flex items-center justify-center py-6 bg-gray-50 rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-[#c9975b] mr-2" />
                  <span className="text-gray-500">Đang tải danh sách bàn...</span>
                </div>
              ) : availableTables.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <Armchair className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Không có bàn trống phù hợp với {formData.so_nguoi} người.</p>
                  <p className="text-xs text-gray-400 mt-1">Bạn vẫn có thể đặt và nhân viên sẽ sắp xếp.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {/* Option không chọn bàn */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ban_id: null })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.ban_id === null
                        ? 'border-[#c9975b] bg-[#fef7ed] text-[#8b6f47]'
                        : 'border-gray-200 hover:border-[#c9975b]/50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-sm">Để nhân viên chọn</div>
                    <div className="text-xs text-gray-500 mt-1">Tự động sắp xếp</div>
                  </button>
                  
                  {/* Danh sách bàn trống */}
                  {availableTables.map(table => (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, ban_id: table.id })}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        formData.ban_id === table.id
                          ? 'border-[#c9975b] bg-[#fef7ed] text-[#8b6f47]'
                          : 'border-gray-200 hover:border-[#c9975b]/50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold">{table.ten_ban}</div>
                      <div className="text-xs text-gray-500">{table.khu_vuc_ten}</div>
                      <div className="text-xs text-gray-400">{table.suc_chua} chỗ</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={formData.ghi_chu}
                onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                placeholder="Yêu cầu đặc biệt, ví dụ: bàn gần cửa sổ..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CalendarCheck className="w-5 h-5" />
                  Đặt bàn
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Message when has active reservation */}
      {activeReservation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
          <p className="text-yellow-800 text-center">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            Bạn đang có một đặt bàn chưa hoàn thành. Vui lòng hủy hoặc chờ hoàn thành trước khi đặt bàn mới.
          </p>
        </div>
      )}

      {/* Reservation History */}
      {reservationHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch sử đặt bàn
          </h2>
          
          <div className="space-y-4">
            {reservationHistory.map((reservation) => (
              <div 
                key={reservation.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">#{reservation.id}</span>
                  {getStatusBadge(reservation.status)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(reservation.start_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(reservation.start_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {reservation.party_size} người
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {reservation.area_name || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeReservation && reservationHistory.length === 0 && !showNewForm && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Bạn chưa có đặt bàn nào</p>
        </div>
      )}
    </div>
  );
}

