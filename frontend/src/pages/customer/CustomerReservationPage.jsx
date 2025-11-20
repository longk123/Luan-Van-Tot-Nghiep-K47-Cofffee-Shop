// Customer Portal - Reservation Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { isCustomerLoggedIn, getCustomerInfo } from '../../auth/customerAuth';
import { Calendar, Clock, Users, MapPin, AlertCircle } from 'lucide-react';

export default function CustomerReservationPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    ten_khach: '',
    so_dien_thoai: '',
    email: '',
    so_nguoi: 2,
    khu_vuc_id: null,
    date: '',
    time: '',
    duration: 90, // minutes
    ghi_chu: ''
  });

  useEffect(() => {
    // Set default date/time (tomorrow, 1 hour from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(tomorrow.getHours() + 1, 0, 0, 0);
    
    const dateStr = tomorrow.toISOString().split('T')[0];
    const timeStr = `${String(tomorrow.getHours()).padStart(2, '0')}:${String(tomorrow.getMinutes()).padStart(2, '0')}`;
    
    setFormData(prev => ({
      ...prev,
      date: dateStr,
      time: timeStr
    }));

    // If logged in, fill customer info
    if (isCustomerLoggedIn()) {
      const customer = getCustomerInfo();
      if (customer) {
        setFormData(prev => ({
          ...prev,
          ten_khach: customer.fullName || '',
          so_dien_thoai: customer.phone || '',
          email: customer.email || ''
        }));
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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

      const reservationData = {
        ten_khach: formData.ten_khach,
        so_dien_thoai: formData.so_dien_thoai,
        email: formData.email || null,
        so_nguoi: formData.so_nguoi,
        khu_vuc_id: formData.khu_vuc_id || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        ghi_chu: formData.ghi_chu || null,
        nguon: 'ONLINE'
      };

      const response = await api.createReservation(reservationData);

      // Success
      alert(`Đặt bàn thành công! Mã đặt bàn: #${response.data.id}`);
      navigate('/customer');
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError(err.message || 'Không thể đặt bàn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Đặt bàn</h1>
        <p className="text-lg text-gray-600">Đặt bàn trước để đảm bảo chỗ ngồi</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer Info */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Thông tin khách hàng</span>
            </h2>
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
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Chi tiết đặt bàn</span>
            </h2>
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
                <div className="flex items-center space-x-2">
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

          {/* Notes */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={formData.ghi_chu}
              onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              placeholder="Yêu cầu đặc biệt, ví dụ: bàn gần cửa sổ, không gian yên tĩnh..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/customer')}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#c9975b] text-white font-semibold rounded-lg hover:bg-[#d4a574] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang xử lý...' : 'Đặt bàn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

