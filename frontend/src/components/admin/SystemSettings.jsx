// src/components/admin/SystemSettings.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function SystemSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // General
    store_name: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    
    // Business
    opening_hours: '',
    closing_hours: '',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    vat_rate: 10,
    
    // POS
    allow_order_cancellation: true,
    allow_price_edit: false,
    auto_print_invoice: false,
    
    // Security
    session_timeout: 30, // minutes
    password_min_length: 6,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.getAdminSettings();
      if (response.data) {
        setSettings({ ...settings, ...response.data });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // If settings don't exist, use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAdminSettings(settings);
      alert('Đã lưu cấu hình thành công!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Lỗi khi lưu cấu hình: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cấu hình hệ thống</h2>
        <p className="text-gray-600">Quản lý các thiết lập chung của hệ thống</p>
      </div>

      {/* General Settings */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Thông tin cửa hàng</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên cửa hàng *
            </label>
            <input
              type="text"
              value={settings.store_name}
              onChange={(e) => handleChange('store_name', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="DevCoffee"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <input
              type="text"
              value={settings.store_address}
              onChange={(e) => handleChange('store_address', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="123 Đường ABC, Quận XYZ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={settings.store_phone}
              onChange={(e) => handleChange('store_phone', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="0901234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={settings.store_email}
              onChange={(e) => handleChange('store_email', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="contact@coffeeshop.com"
            />
          </div>
        </div>
      </div>

      {/* Business Settings */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💼 Thông tin kinh doanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giờ mở cửa
            </label>
            <input
              type="time"
              value={settings.opening_hours}
              onChange={(e) => handleChange('opening_hours', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giờ đóng cửa
            </label>
            <input
              type="time"
              value={settings.closing_hours}
              onChange={(e) => handleChange('closing_hours', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Múi giờ
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đơn vị tiền tệ
            </label>
            <select
              value={settings.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="VND">VND (₫)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thuế VAT (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.vat_rate}
              onChange={(e) => handleChange('vat_rate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* POS Settings */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🛒 Cấu hình POS</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.allow_order_cancellation}
              onChange={(e) => handleChange('allow_order_cancellation', e.target.checked)}
              className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <div>
              <span className="font-medium text-gray-900">Cho phép hủy đơn</span>
              <p className="text-sm text-gray-600">Cho phép Manager/Admin hủy đơn hàng</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.allow_price_edit}
              onChange={(e) => handleChange('allow_price_edit', e.target.checked)}
              className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <div>
              <span className="font-medium text-gray-900">Cho phép chỉnh sửa giá</span>
              <p className="text-sm text-gray-600">Cho phép Cashier/Manager chỉnh sửa giá sản phẩm khi tạo đơn</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.auto_print_invoice}
              onChange={(e) => handleChange('auto_print_invoice', e.target.checked)}
              className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <div>
              <span className="font-medium text-gray-900">Tự động in hóa đơn</span>
              <p className="text-sm text-gray-600">Tự động in hóa đơn sau khi thanh toán</p>
            </div>
          </label>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 Bảo mật</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Timeout (phút)
            </label>
            <input
              type="number"
              min="5"
              max="480"
              value={settings.session_timeout}
              onChange={(e) => handleChange('session_timeout', parseInt(e.target.value) || 30)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Thời gian tự động đăng xuất khi không hoạt động</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Độ dài mật khẩu tối thiểu
            </label>
            <input
              type="number"
              min="4"
              max="20"
              value={settings.password_min_length}
              onChange={(e) => handleChange('password_min_length', parseInt(e.target.value) || 6)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-red-500 text-white border-2 border-red-500 rounded-lg font-semibold hover:bg-white hover:text-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Đang lưu...' : '💾 Lưu cấu hình'}
        </button>
      </div>
    </div>
  );
}

