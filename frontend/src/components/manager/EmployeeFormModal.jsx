// src/components/manager/EmployeeFormModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { getUser } from '../../auth.js';

export default function EmployeeFormModal({ employee, roles, onClose, onSuccess }) {
  const isEdit = !!employee;
  
  // Check if current user is admin
  const user = getUser();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    phone: '',
    roles: [],
    is_active: true
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        username: employee.username || '',
        password: '',
        confirmPassword: '',
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        roles: employee.roles?.map(r => r.role_id) || [],
        is_active: employee.is_active ?? true
      });
    }
  }, [employee]);

  const validate = async () => {
    const newErrors = {};

    // Username
    if (!formData.username.trim()) {
      newErrors.username = 'Username là bắt buộc';
    } else if (!isEdit) {
      // Check username availability for new employees
      try {
        const res = await api.checkUsername(formData.username);
        if (!res.available) {
          newErrors.username = 'Username đã tồn tại';
        }
      } catch (error) {
        console.error('Error checking username:', error);
      }
    }

    // Password (required for new employee, optional for edit)
    if (!isEdit && !formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    // Confirm Password
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    // Full name
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Họ tên là bắt buộc';
    }

    // Email (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Roles
    if (formData.roles.length === 0) {
      newErrors.roles = 'Phải chọn ít nhất một vai trò';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!(await validate())) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        roles: formData.roles,
        is_active: formData.is_active
      };

      // Add password only if provided
      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEdit) {
        await api.updateUser(employee.user_id, payload);
        alert('Cập nhật nhân viên thành công');
      } else {
        await api.createUser(payload);
        alert('Thêm nhân viên thành công');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(id => id !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEdit ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:text-[#c9975b] rounded-full p-1 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={isEdit}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                errors.username ? 'border-red-500' : 'border-gray-200'
              } ${isEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="username123"
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            {isEdit && <p className="text-gray-500 text-xs mt-1">Username không thể thay đổi</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder={isEdit ? 'Để trống nếu không đổi mật khẩu' : '••••••'}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          {formData.password && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="••••••"
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                errors.full_name ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Nguyễn Văn A"
            />
            {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              placeholder="0901234567"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {roles.map(role => {
                const roleName = role.role_name.toLowerCase();
                const isManagerOrAdmin = roleName === 'manager' || roleName === 'admin';
                const isDisabled = isManagerOrAdmin && !isAdmin;
                
                return (
                  <label
                    key={role.role_id}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg ${
                      isDisabled 
                        ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60' 
                        : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role.role_id)}
                      onChange={() => handleRoleToggle(role.role_id)}
                      disabled={isDisabled}
                      className="w-4 h-4 text-[#c9975b] border-gray-300 rounded focus:ring-[#c9975b] disabled:cursor-not-allowed"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {role.role_name}
                      {isDisabled && (
                        <span className="ml-2 text-xs text-gray-500">(Chỉ Admin)</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.roles && <p className="text-red-500 text-sm mt-1">{errors.roles}</p>}
          </div>

          {/* Status (only for edit) */}
          {isEdit && (
            <div>
              <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#c9975b] border-gray-300 rounded focus:ring-[#c9975b]"
                />
                <span className="text-sm font-medium text-gray-700">Tài khoản đang hoạt động</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
