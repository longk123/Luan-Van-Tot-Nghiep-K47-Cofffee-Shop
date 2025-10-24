// src/components/OpenShiftModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { getUser } from '../auth.js';

export default function OpenShiftModal({ open, onClose, onSuccess, onShowToast }) {
  const [loading, setLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [userRole, setUserRole] = useState('cashier');
  
  // Detect user role
  useEffect(() => {
    const user = getUser();
    console.log('🔍 OpenShiftModal - User data:', user);
    
    // Check roles array instead of single role
    const userRoles = user?.roles || [];
    const isKitchenStaff = userRoles.some(role =>
      ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
    );
    
    console.log('🔍 OpenShiftModal - User roles:', userRoles);
    console.log('🔍 OpenShiftModal - Is kitchen staff:', isKitchenStaff);
    
    setUserRole(isKitchenStaff ? 'kitchen' : 'cashier');
  }, []);
  
  const isKitchenStaff = ['kitchen', 'barista', 'chef', 'cook'].includes(userRole);

  const handleOpen = async () => {
    if (!isKitchenStaff && (openingCash === '' || openingCash === null)) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập số tiền đầu ca (có thể là 0)'
      });
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/shifts/open', {
        opening_cash: isKitchenStaff ? 0 : (parseInt(openingCash) || 0),
        shift_type: isKitchenStaff ? 'KITCHEN' : 'CASHIER'
      });

      onShowToast?.({
        show: true,
        type: 'success',
        title: isKitchenStaff ? 'Bắt đầu ca thành công!' : 'Mở ca thành công!',
        message: isKitchenStaff 
          ? 'Ca làm việc đã được bắt đầu. Đang tải lại trang...' 
          : `Đã mở ca mới. Đang tải lại trang...`
      });

      // Wait a bit for toast to show, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error opening shift:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi mở ca',
        message: error.message || 'Không thể mở ca'
      });
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {isKitchenStaff ? '🎯 Bắt đầu ca làm việc' : '🚀 Mở ca làm việc'}
              </h3>
              <p className="text-sm text-gray-600">
                {isKitchenStaff ? 'Bắt đầu ca pha chế/chế biến' : 'Bắt đầu ca thu ngân mới'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-green-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
              <div>User Role: {userRole}</div>
              <div>Is Kitchen Staff: {isKitchenStaff ? 'Yes' : 'No'}</div>
            </div>
          )}
          
          {!isKitchenStaff ? (
            /* Thu ngân - cần nhập tiền */
            <>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-green-900">Tiền đầu ca</h4>
                    <p className="text-sm text-green-700">Số tiền mặt trong két lúc bắt đầu ca</p>
                  </div>
                </div>

                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="Nhập số tiền (VNĐ)..."
                  className="w-full px-4 py-3 text-lg border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold"
                  min="0"
                  autoFocus
                />
                
                <p className="text-xs text-gray-600 mt-2">
                  💡 Tip: Đếm tiền trong két trước khi bắt đầu ca để dễ đối chiếu khi đóng ca
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  ℹ️ Ca làm việc sẽ được gắn với tất cả đơn hàng bạn tạo ra cho đến khi đóng ca.
                </p>
              </div>
            </>
          ) : (
            /* Pha chế/Bếp - không cần nhập tiền */
            <>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border-2 border-blue-200 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900">Ca pha chế/Bếp</h4>
                    <p className="text-sm text-blue-700">Tracking thời gian làm việc và món đã làm</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-blue-900">
                    ✓ Giờ vào ca sẽ được ghi nhận<br/>
                    ✓ Hệ thống sẽ tính số món bạn làm trong ca<br/>
                    ✓ Thời gian làm việc sẽ được tracking
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-sm text-amber-800">
                  💡 Bạn không cần xử lý tiền mặt. Chỉ cần bắt đầu ca để tracking giờ làm.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors outline-none focus:outline-none"
          >
            Hủy
          </button>
          <button
            onClick={handleOpen}
            disabled={loading}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
          >
            {loading ? 'Đang xử lý...' : (isKitchenStaff ? '✓ Bắt đầu ca' : '✓ Mở ca thu ngân')}
          </button>
        </div>
      </div>
    </div>
  );
}

