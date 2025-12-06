// Customer Profile Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Lock, Save, LogOut, ShoppingBag, Calendar, Edit2 } from 'lucide-react';
import { isCustomerLoggedIn, getCustomerInfo, clearCustomerToken } from '../../auth/customerAuth';
import { customerApi } from '../../api/customerApi';
import { useToast } from '../../components/CustomerToast';

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    totalReservations: 0
  });

  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      navigate('/customer/login?returnUrl=/customer/profile');
      return;
    }
    loadProfile();
    loadStats();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const customerInfo = getCustomerInfo();
      if (customerInfo) {
        setCustomer(customerInfo);
        setFormData({
          fullName: customerInfo.fullName || '',
          phone: customerInfo.phone || '',
          email: customerInfo.email || '',
          address: customerInfo.address || ''
        });
      }
      
      // Also fetch latest from API
      try {
        const { data } = await customerApi.getProfile();
        if (data) {
          setCustomer(data);
          setFormData({
            fullName: data.fullName || data.full_name || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || ''
          });
        }
      } catch (err) {
        console.log('Could not fetch profile from API, using cached data');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Không thể tải thông tin tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load order history to calculate stats
      const { data: ordersData } = await customerApi.getOrders({ limit: 100 });
      const orders = ordersData || [];
      
      const totalOrders = orders.length;
      // Đảm bảo parse số đúng cách (có thể là string từ database)
      const totalSpent = orders.reduce((sum, order) => {
        const orderTotal = parseFloat(order.total) || parseFloat(order.grand_total) || 0;
        return sum + orderTotal;
      }, 0);
      
      // Load reservations to count
      let totalReservations = 0;
      try {
        const { data: reservationsData } = await customerApi.getReservations({ limit: 100 });
        totalReservations = (reservationsData || []).length;
      } catch (err) {
        console.log('Could not load reservations count');
      }
      
      setStats({
        totalOrders,
        totalSpent,
        totalReservations
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }

    setSaving(true);
    try {
      const { data } = await customerApi.updateProfile(formData);
      
      // Update local storage
      const currentInfo = getCustomerInfo();
      const updatedInfo = { ...currentInfo, ...formData };
      localStorage.setItem('customer_info', JSON.stringify(updatedInfo));
      
      setCustomer(updatedInfo);
      setIsEditing(false);
      toast.success('Cập nhật thông tin thành công!');
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!passwordData.newPassword) {
      toast.error('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setSaving(true);
    try {
      await customerApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      toast.success('Đổi mật khẩu thành công!');
    } catch (error) {
      toast.error(error.message || 'Không thể đổi mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearCustomerToken();
    toast.success('Đã đăng xuất');
    navigate('/customer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9975b]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#c9975b] to-[#d4a574] rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{customer?.fullName || customer?.full_name || 'Khách hàng'}</h1>
              <p className="text-white/80 mt-1">{customer?.phone}</p>
              {customer?.email && (
                <p className="text-white/80">{customer.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                <p className="text-sm text-gray-500">Đơn hàng</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">₫</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSpent.toLocaleString('vi-VN')}</p>
                <p className="text-sm text-gray-500">Tổng chi tiêu</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReservations}</p>
                <p className="text-sm text-gray-500">Đặt bàn</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-[#c9975b] hover:bg-[#c9975b]/10 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
                Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#c9975b] text-white rounded-lg hover:bg-[#b8864a] transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Họ và tên
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Số điện thoại
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Địa chỉ
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
                placeholder="Nhập địa chỉ của bạn"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Bảo mật</h2>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-2 px-4 py-2 text-[#c9975b] hover:bg-[#c9975b]/10 rounded-lg transition"
            >
              <Lock className="w-4 h-4" />
              Đổi mật khẩu
            </button>
          </div>

          {showPasswordForm && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="w-full py-3 bg-[#c9975b] text-white rounded-lg hover:bg-[#b8864a] transition disabled:opacity-50"
              >
                {saving ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Liên kết nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/customer/orders')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#c9975b] hover:bg-[#c9975b]/5 transition text-left"
            >
              <ShoppingBag className="w-6 h-6 text-[#c9975b]" />
              <div>
                <p className="font-medium text-gray-900">Lịch sử đơn hàng</p>
                <p className="text-sm text-gray-500">Xem các đơn hàng đã đặt</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/customer/reservation')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#c9975b] hover:bg-[#c9975b]/5 transition text-left"
            >
              <Calendar className="w-6 h-6 text-[#c9975b]" />
              <div>
                <p className="font-medium text-gray-900">Đặt bàn</p>
                <p className="text-sm text-gray-500">Đặt bàn trước khi đến</p>
              </div>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
