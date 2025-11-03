// src/components/manager/PromotionFormModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function PromotionFormModal({ promotion, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    ma: '',
    ten: '',
    mo_ta: '',
    loai: 'PERCENT',
    gia_tri: '',
    max_giam: '',
    dieu_kien: '',
    bat_dau: '',
    ket_thuc: '',
    active: true,
    stackable: false,
    usage_limit: ''
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (promotion) {
      setFormData({
        ma: promotion.ma || '',
        ten: promotion.ten || '',
        mo_ta: promotion.mo_ta || '',
        loai: promotion.loai || 'PERCENT',
        gia_tri: promotion.gia_tri || '',
        max_giam: promotion.max_giam || '',
        dieu_kien: promotion.dieu_kien || '',
        bat_dau: promotion.bat_dau ? new Date(promotion.bat_dau).toISOString().slice(0, 16) : '',
        ket_thuc: promotion.ket_thuc ? new Date(promotion.ket_thuc).toISOString().slice(0, 16) : '',
        active: promotion.active !== undefined ? promotion.active : true,
        stackable: promotion.stackable !== undefined ? promotion.stackable : false,
        usage_limit: promotion.usage_limit || ''
      });
    }
  }, [promotion]);

  const validate = () => {
    const newErrors = {};

    // Mã khuyến mãi
    if (formData.ma && !/^[A-Z0-9_]+$/.test(formData.ma)) {
      newErrors.ma = 'Mã chỉ được chứa chữ hoa, số và dấu gạch dưới';
    }

    // Tên
    if (!formData.ten.trim()) {
      newErrors.ten = 'Vui lòng nhập tên chương trình';
    }

    // Giá trị
    const giaTriNum = parseFloat(formData.gia_tri);
    if (!formData.gia_tri || isNaN(giaTriNum)) {
      newErrors.gia_tri = 'Vui lòng nhập giá trị hợp lệ';
    } else if (formData.loai === 'PERCENT' && (giaTriNum <= 0 || giaTriNum > 100)) {
      newErrors.gia_tri = 'Giá trị phần trăm phải từ 0 đến 100';
    } else if (formData.loai === 'AMOUNT' && giaTriNum < 0) {
      newErrors.gia_tri = 'Số tiền giảm không được âm';
    }

    // Max giảm (chỉ cho PERCENT)
    if (formData.loai === 'PERCENT' && formData.max_giam) {
      const maxGiamNum = parseFloat(formData.max_giam);
      if (isNaN(maxGiamNum) || maxGiamNum < 0) {
        newErrors.max_giam = 'Số tiền giảm tối đa phải >= 0';
      }
    }

    // Điều kiện
    if (formData.dieu_kien) {
      const dieuKienNum = parseFloat(formData.dieu_kien);
      if (isNaN(dieuKienNum) || dieuKienNum < 0) {
        newErrors.dieu_kien = 'Giá trị đơn tối thiểu phải >= 0';
      }
    }

    // Thời gian
    if (formData.bat_dau && formData.ket_thuc) {
      const start = new Date(formData.bat_dau);
      const end = new Date(formData.ket_thuc);
      if (end <= start) {
        newErrors.ket_thuc = 'Thời gian kết thúc phải sau thời gian bắt đầu';
      }
    }

    // Giới hạn sử dụng
    if (formData.usage_limit) {
      const limitNum = parseInt(formData.usage_limit);
      if (isNaN(limitNum) || limitNum <= 0) {
        newErrors.usage_limit = 'Giới hạn sử dụng phải là số nguyên dương';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ma: formData.ma || null,
        ten: formData.ten.trim(),
        mo_ta: formData.mo_ta.trim() || null,
        loai: formData.loai,
        gia_tri: parseFloat(formData.gia_tri),
        max_giam: formData.max_giam ? parseFloat(formData.max_giam) : null,
        dieu_kien: formData.dieu_kien ? parseFloat(formData.dieu_kien) : null,
        bat_dau: formData.bat_dau || null,
        ket_thuc: formData.ket_thuc || null,
        active: formData.active,
        stackable: formData.stackable,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null
      };

      if (promotion) {
        await api.updatePromotion(promotion.id, payload);
        alert('Cập nhật khuyến mãi thành công');
      } else {
        await api.createPromotion(payload);
        alert('Tạo khuyến mãi thành công');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert(error.message || 'Không thể lưu khuyến mãi');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Preview calculation
  const calculatePreview = (orderAmount) => {
    if (!formData.gia_tri) return 0;
    
    const giaTriNum = parseFloat(formData.gia_tri);
    let discount = 0;

    if (formData.loai === 'PERCENT') {
      discount = orderAmount * (giaTriNum / 100);
      if (formData.max_giam) {
        const maxGiamNum = parseFloat(formData.max_giam);
        discount = Math.min(discount, maxGiamNum);
      }
    } else {
      discount = giaTriNum;
    }

    return Math.min(discount, orderAmount);
  };

  const previewOrders = [100000, 200000, 500000, 1000000];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#d4a574] to-[#c9975b]">
          <h2 className="text-xl font-bold text-white">
            {promotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Mã khuyến mãi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã khuyến mãi
              </label>
              <input
                type="text"
                value={formData.ma}
                onChange={(e) => setFormData({ ...formData, ma: e.target.value.toUpperCase() })}
                placeholder="VD: SUMMER2024"
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                  errors.ma ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.ma && <p className="mt-1 text-sm text-red-600">{errors.ma}</p>}
              <p className="mt-1 text-xs text-gray-500">Để trống để tự động tạo mã</p>
            </div>

            {/* Tên chương trình */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên chương trình <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ten}
                onChange={(e) => setFormData({ ...formData, ten: e.target.value })}
                placeholder="VD: Giảm giá mùa hè"
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                  errors.ten ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.ten && <p className="mt-1 text-sm text-red-600">{errors.ten}</p>}
            </div>

            {/* Loại khuyến mãi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại khuyến mãi <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.loai}
                onChange={(e) => setFormData({ ...formData, loai: e.target.value, max_giam: '' })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="AMOUNT">Số tiền cố định (VNĐ)</option>
              </select>
            </div>

            {/* Giá trị */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá trị <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.gia_tri}
                onChange={(e) => setFormData({ ...formData, gia_tri: e.target.value })}
                placeholder={formData.loai === 'PERCENT' ? '10' : '50000'}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                  errors.gia_tri ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.gia_tri && <p className="mt-1 text-sm text-red-600">{errors.gia_tri}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {formData.loai === 'PERCENT' ? 'Từ 0 đến 100%' : 'Số tiền giảm (VNĐ)'}
              </p>
            </div>

            {/* Giảm tối đa (chỉ cho PERCENT) */}
            {formData.loai === 'PERCENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giảm tối đa (VNĐ)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={formData.max_giam}
                  onChange={(e) => setFormData({ ...formData, max_giam: e.target.value })}
                  placeholder="100000"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                    errors.max_giam ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.max_giam && <p className="mt-1 text-sm text-red-600">{errors.max_giam}</p>}
                <p className="mt-1 text-xs text-gray-500">Để trống nếu không giới hạn</p>
              </div>
            )}

            {/* Điều kiện áp dụng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá trị đơn tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                step="1000"
                value={formData.dieu_kien}
                onChange={(e) => setFormData({ ...formData, dieu_kien: e.target.value })}
                placeholder="0"
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                  errors.dieu_kien ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.dieu_kien && <p className="mt-1 text-sm text-red-600">{errors.dieu_kien}</p>}
              <p className="mt-1 text-xs text-gray-500">Áp dụng cho đơn từ mức này trở lên</p>
            </div>

            {/* Thời gian bắt đầu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian bắt đầu
              </label>
              <input
                type="datetime-local"
                value={formData.bat_dau}
                onChange={(e) => setFormData({ ...formData, bat_dau: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Để trống để áp dụng ngay</p>
            </div>

            {/* Thời gian kết thúc */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian kết thúc
              </label>
              <input
                type="datetime-local"
                value={formData.ket_thuc}
                onChange={(e) => setFormData({ ...formData, ket_thuc: e.target.value })}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                  errors.ket_thuc ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.ket_thuc && <p className="mt-1 text-sm text-red-600">{errors.ket_thuc}</p>}
              <p className="mt-1 text-xs text-gray-500">Để trống nếu không giới hạn</p>
            </div>

            {/* Giới hạn sử dụng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giới hạn số lần sử dụng
              </label>
              <input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                placeholder="100"
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                  errors.usage_limit ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.usage_limit && <p className="mt-1 text-sm text-red-600">{errors.usage_limit}</p>}
              <p className="mt-1 text-xs text-gray-500">Để trống nếu không giới hạn</p>
            </div>

            {/* Mô tả */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                value={formData.mo_ta}
                onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
                rows={3}
                placeholder="Mô tả chi tiết về chương trình khuyến mãi..."
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              />
            </div>

            {/* Checkboxes */}
            <div className="col-span-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 text-[#c9975b] border-gray-300 rounded focus:ring-[#c9975b]"
                />
                <span className="text-sm font-medium text-gray-700">Kích hoạt ngay</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.stackable}
                  onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
                  className="w-5 h-5 text-[#c9975b] border-gray-300 rounded focus:ring-[#c9975b]"
                />
                <span className="text-sm font-medium text-gray-700">Cho phép áp dụng cùng khuyến mãi khác</span>
              </label>
            </div>

            {/* Preview */}
            {formData.gia_tri && (
              <div className="col-span-2 bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Xem trước mức giảm:</h3>
                <div className="grid grid-cols-4 gap-3">
                  {previewOrders.map(amount => {
                    const discount = calculatePreview(amount);
                    // Kiểm tra điều kiện: nếu dieu_kien trống hoặc là số 0 hoặc amount >= dieu_kien
                    const dieuKienStr = String(formData.dieu_kien || '').trim();
                    const dieuKienNum = dieuKienStr && dieuKienStr !== '' ? parseFloat(dieuKienStr) : null;
                    // Đủ điều kiện nếu: không có điều kiện (null) HOẶC điều kiện = 0 HOẶC amount >= điều kiện
                    const meetsCondition = dieuKienNum === null || dieuKienNum === 0 || (isNaN(dieuKienNum) ? true : amount >= dieuKienNum);
                    
                    return (
                      <div key={amount} className={`p-3 rounded-lg ${meetsCondition ? 'bg-white border-2 border-green-200' : 'bg-gray-100 border-2 border-gray-200'}`}>
                        <div className="text-xs text-gray-600 mb-1">Đơn {formatCurrency(amount)}</div>
                        <div className="text-sm font-bold text-[#c9975b]">
                          {meetsCondition ? `- ${formatCurrency(discount)}` : 'Không đủ điều kiện'}
                        </div>
                        {meetsCondition && (
                          <div className="text-xs text-gray-500 mt-1">
                            Còn {formatCurrency(amount - discount)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{promotion ? 'Cập nhật' : 'Tạo mới'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
