// Trang cập nhật thông tin cá nhân cho nhân viên
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import Toast from '../components/Toast.jsx';
import { getUser, setUser } from '../auth.js';

export default function UserProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    username: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await api.getMyProfile();
      const user = res?.user || res?.data || getUser();
      
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        username: user.username || ''
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể tải thông tin cá nhân'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    // Validate
    if (!formData.full_name?.trim()) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Vui lòng nhập họ tên'
      });
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Email không hợp lệ'
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateMyProfile({
        full_name: formData.full_name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null
      });

      // Cập nhật thông tin trong localStorage
      const currentUser = getUser();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          full_name: res.data.full_name || res.data.fullName,
          email: res.data.email,
          phone: res.data.phone
        };
        setUser(updatedUser);
        
        // Reload page to refresh user info in all components
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

      setToast({
        show: true,
        type: 'success',
        title: 'Thành công!',
        message: 'Đã cập nhật thông tin cá nhân'
      });
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể cập nhật thông tin'
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    // Validate
    if (!passwordData.current_password) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Vui lòng nhập mật khẩu hiện tại'
      });
      return;
    }

    if (!passwordData.new_password || passwordData.new_password.length < 6) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Mật khẩu xác nhận không khớp'
      });
      return;
    }

    setSaving(true);
    try {
      await api.updateMyProfile({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      setToast({
        show: true,
        type: 'success',
        title: 'Thành công!',
        message: 'Đã đổi mật khẩu'
      });

      // Reset password form
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setShowPasswordSection(false);
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể đổi mật khẩu'
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AuthedLayout pageName="Thông tin cá nhân" backUrl="/dashboard">
        <div className="text-center py-16 bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-xl border-2 border-[#e7d4b8]">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#d4a574] border-t-[#c9975b] mx-auto mb-6"></div>
          <p className="text-[#8b6f47] font-bold text-lg">Đang tải...</p>
        </div>
      </AuthedLayout>
    );
  }

  return (
    <AuthedLayout pageName="Thông tin cá nhân" backUrl="/dashboard">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/60 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thông tin cá nhân</h2>
          <p className="text-sm text-gray-600">Cập nhật thông tin và mật khẩu của bạn</p>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Thông tin cơ bản
          </h3>

          <div className="space-y-6">
            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={formData.username}
                disabled
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Tên đăng nhập không thể thay đổi</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] transition"
                placeholder="Nhập họ và tên"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] transition"
                placeholder="Nhập email (tùy chọn)"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] transition"
                placeholder="Nhập số điện thoại (tùy chọn)"
              />
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#c9975b] to-[#8b6f47] text-white border-2 border-[#8b6f47]
                hover:bg-white hover:from-white hover:to-white hover:text-[#8b6f47] hover:border-[#8b6f47] hover:scale-105 active:scale-95 
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-xl"
              >
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Đổi mật khẩu
            </h3>
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="px-4 py-2 text-sm font-semibold text-[#c9975b] hover:bg-[#c9975b] hover:text-white rounded-lg transition"
            >
              {showPasswordSection ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          {showPasswordSection && (
            <div className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] transition"
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] transition"
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] transition"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              {/* Change Password Button */}
              <div className="pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-indigo-700
                  hover:bg-white hover:from-white hover:to-white hover:text-indigo-600 hover:border-indigo-600 hover:scale-105 active:scale-95 
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-xl"
                >
                  {saving ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </AuthedLayout>
  );
}

