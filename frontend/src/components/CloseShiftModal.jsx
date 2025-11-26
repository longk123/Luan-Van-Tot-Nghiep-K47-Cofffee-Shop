// src/components/CloseShiftModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import OpenOrdersDialog from './OpenOrdersDialog.jsx';
import { getUser } from '../auth.js';

export default function CloseShiftModal({ open, shift, onClose, onSuccess, onShowToast }) {
  const [step, setStep] = useState(1); // 1: Summary, 2: Input cash, 3: Confirm
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [actualCash, setActualCash] = useState('');
  const [note, setNote] = useState('');
  const [showOpenOrdersDialog, setShowOpenOrdersDialog] = useState(false);
  const [openOrders, setOpenOrders] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [walletInfo, setWalletInfo] = useState(null); // Thông tin ví waiter
  
  // Check user role to determine if this is a waiter
  const user = getUser();
  const userRoles = user?.roles || [];
  const isWaiterUser = userRoles.some(role =>
    role.toLowerCase() === 'waiter'
  ) && !userRoles.some(role =>
    ['cashier', 'manager', 'admin'].includes(role.toLowerCase())
  );
  
  // Check if this is a kitchen or waiter shift (both don't need cash input)
  const isKitchenShift = shift?.shift_type === 'KITCHEN';
  const isWaiterShift = shift?.shift_type === 'WAITER' || (isWaiterUser && shift?.nhan_vien_id === user?.user_id);
  // Nếu user là waiter, luôn coi như non-cash shift (không cần nhập tiền)
  const isNonCashShift = isKitchenShift || isWaiterUser;

  // Fetch summary when modal opens
  useEffect(() => {
    if (open && shift?.id) {
      fetchSummary();
      // Fetch wallet info nếu là waiter
      if (isWaiterUser) {
        fetchWalletInfo();
      }
      // Scroll to top when modal opens
      setTimeout(() => {
        const modalContent = document.querySelector('.close-shift-modal-content');
        if (modalContent) {
          modalContent.scrollTop = 0;
        }
      }, 100);
    } else if (!open) {
      // Reset state when modal closes
      setSummary(null);
      setActualCash('');
      setNote('');
      setStep(1);
      setShowOpenOrdersDialog(false);
      setOpenOrders([]);
      setWalletInfo(null);
    }
  }, [open, shift?.id]);

  const fetchWalletInfo = async () => {
    try {
      const res = await api.getMyWallet();
      setWalletInfo(res?.data || res);
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getShiftSummary(shift.id);
      setSummary(res.data);
    } catch (error) {
      console.error('Error fetching shift summary:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể tải thống kê ca làm'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!isNonCashShift && (actualCash === '' || actualCash === null || actualCash === undefined)) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập số tiền mặt thực tế (có thể là 0)'
      });
      return;
    }

    setLoading(true);
    
    try {
      await api.closeShiftEnhanced(shift.id, {
        actual_cash: isNonCashShift ? 0 : (parseInt(actualCash) || 0),
        note: note || null
      });

      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đóng ca thành công!',
        message: `Ca #${shift.id} đã được đóng. Đang tải lại trang...`
      });

      // Wait a bit for toast to show, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error closing shift:', error);
      
      if (error.code === 'OPEN_ORDERS_EXIST' && error.openOrders) {
        setOpenOrders(error.openOrders);
        setShowOpenOrdersDialog(true);
        setLoading(false);
        return;
      }
      
      if (error.code === 'PENDING_DELIVERIES_EXIST' && error.pendingDeliveries) {
        setPendingDeliveries(error.pendingDeliveries);
        onShowToast?.({
          show: true,
          type: 'error',
          title: 'Không thể đóng ca',
          message: error.message || `Còn ${error.pendingDeliveries.length} đơn giao hàng chưa hoàn thành. Vui lòng cập nhật trạng thái giao hàng trước khi đóng ca.`
        });
        setLoading(false);
        return;
      }
      
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi đóng ca',
        message: error.message || 'Không thể đóng ca'
      });
    } finally {
      setLoading(false); // ✅ Luôn reset loading state
    }
  };
  
  const handleForceClose = async () => {
    setLoading(true);
    try {
      await api.forceCloseShift(shift.id, {
        actual_cash: isNonCashShift ? 0 : (parseInt(actualCash) || 0),
        note: note || null,
        transfer_orders: true
      });

      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã đóng ca và chuyển đơn!',
        message: `Ca #${shift.id} đã đóng. Đang tải lại trang...`
      });

      // Wait a bit for toast to show, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error force closing shift:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi đóng ca',
        message: error.message || 'Không thể đóng ca'
      });
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return (value ?? 0).toLocaleString('vi-VN') + 'đ';
  };

  if (!open) return null;

  const openingCash = shift?.opening_cash || 0;
  const cashInShift = summary?.summary?.payments?.cash || 0;
  const totalExpected = openingCash + cashInShift;
  const cashDiff = (parseInt(actualCash) || 0) - totalExpected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-primary-900 mb-1 flex items-center gap-2.5">
                {isNonCashShift ? (
                  <>
                    <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{isKitchenShift ? 'Kết thúc ca làm việc' : 'Kết thúc ca phục vụ'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Đóng ca làm việc</span>
                  </>
                )}
              </h3>
              <p className="text-sm text-dark-600">
                Ca #{shift?.id} • {shift?.nhan_vien?.full_name || 'N/A'}
                {isKitchenShift && <span className="ml-2 text-primary-600">(Pha chế/Bếp)</span>}
                {isWaiterUser && <span className="ml-2 text-primary-600">(Phục vụ)</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-primary-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 close-shift-modal-content">
          {loading && !summary ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-dark-600">Đang tải thống kê...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Thống kê tổng quan */}
              {isNonCashShift ? (
                isWaiterUser ? (
                  /* Phục vụ - Hiển thị thống kê giao hàng */
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-5 border-2 border-primary-200">
                    <h4 className="font-bold text-primary-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Thống kê ca phục vụ
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                        <p className="text-sm text-dark-600 mb-1">Tổng đơn giao hàng</p>
                        <p className="text-2xl font-bold text-primary-900">
                          {summary?.summary?.totals?.total_orders || summary?.waiterStats?.total_deliveries || 0}
                        </p>
                      </div>
                      
                      <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                        <p className="text-sm text-dark-600 mb-1">Đã giao thành công</p>
                        <p className="text-2xl font-bold text-success-700">
                          {summary?.summary?.totals?.delivered_orders || summary?.waiterStats?.delivered_count || 0}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-3 border border-primary-200">
                        <p className="text-sm text-dark-600 mb-1">Thời gian làm việc</p>
                        <p className="text-lg font-bold text-primary-900">
                          {shift?.started_at ? (
                            Math.round((new Date() - new Date(shift.started_at)) / 1000 / 60 / 60 * 10) / 10
                          ) : 0}h
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-xl p-3 border border-red-200">
                        <p className="text-sm text-dark-600 mb-1">Giao thất bại</p>
                        <p className="text-lg font-bold text-red-600">
                          {summary?.summary?.totals?.failed_deliveries || summary?.waiterStats?.failed_count || 0}
                        </p>
                      </div>
                    </div>
                    
                    {/* Thông tin ví tiền thu hộ */}
                    {walletInfo && walletInfo.current_balance > 0 && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl border-2 border-amber-300">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span className="font-bold text-amber-800">Tiền thu hộ chưa nộp</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-amber-700">Số dư ví hiện tại</p>
                            <p className="text-2xl font-bold text-amber-900">
                              {parseInt(walletInfo.current_balance || 0).toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-amber-600">Tổng đã thu: {parseInt(walletInfo.total_collected || 0).toLocaleString('vi-VN')}đ</p>
                            <p className="text-xs text-amber-600">Đã nộp: {parseInt(walletInfo.total_settled || 0).toLocaleString('vi-VN')}đ</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-amber-700 italic">
                          ⚠️ Vui lòng nộp tiền cho thu ngân trước khi kết thúc ca
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                /* Pha chế/Bếp - Hiển thị hiệu suất */
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-5 border-2 border-primary-200">
                  <h4 className="font-bold text-primary-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Hiệu suất ca làm
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                      <p className="text-sm text-dark-600 mb-1">Món đã làm</p>
                      <p className="text-2xl font-bold text-primary-900">
                        {summary?.kitchenStats?.total_items_made || 0}
                      </p>
                    </div>
                    
                    <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                      <p className="text-sm text-dark-600 mb-1">Thời gian TB/món</p>
                      <p className="text-2xl font-bold text-primary-700">
                        {summary?.kitchenStats?.avg_prep_time_seconds ? `${Math.round(summary.kitchenStats.avg_prep_time_seconds / 60)}m` : '--'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-3 border border-primary-200">
                      <p className="text-sm text-dark-600 mb-1">Thời gian làm việc</p>
                      <p className="text-lg font-bold text-primary-900">
                        {shift?.started_at ? (
                          Math.round((new Date() - new Date(shift.started_at)) / 1000 / 60 / 60 * 10) / 10
                        ) : 0}h
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-3 border border-red-200">
                      <p className="text-sm text-dark-600 mb-1">Món bị hủy</p>
                      <p className="text-lg font-bold text-red-600">
                        {summary?.kitchenStats?.total_items_cancelled || 0}
                      </p>
                    </div>
                  </div>
                </div>
                )
              ) : (
                /* Thu ngân - Hiển thị doanh thu */
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-5 border-2 border-primary-200">
                  <h4 className="font-bold text-primary-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Tổng quan ca làm
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                      <p className="text-sm text-dark-600 mb-1">Tổng đơn hàng</p>
                      <p className="text-2xl font-bold text-primary-900">
                        {summary?.summary?.totals?.total_orders || 0}
                      </p>
                    </div>
                    
                    <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                      <p className="text-sm text-dark-600 mb-1">Doanh thu</p>
                      <p className="text-2xl font-bold text-success-700">
                        {formatMoney(summary?.summary?.totals?.net)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Phân loại thanh toán - CHỈ cho Thu ngân */}
              {!isNonCashShift && (
              <div className="bg-cream-50 rounded-2xl p-5 border border-gray-200">
                <h4 className="font-bold text-dark-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Phân loại thanh toán
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-dark-700 font-medium">💵 Tiền mặt</span>
                    <span className="font-bold text-dark-900">
                      {formatMoney(summary?.summary?.payments?.cash)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-dark-700 font-medium">💳 Thẻ</span>
                    <span className="font-bold text-dark-900">
                      {formatMoney(summary?.summary?.payments?.card)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-dark-700 font-medium">🏦 Chuyển khoản</span>
                    <span className="font-bold text-dark-900">
                      {formatMoney(summary?.summary?.payments?.transfer)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                    <span className="text-dark-700 font-medium">📱 Online (PayOS)</span>
                    <span className="font-bold text-dark-900">
                      {formatMoney(summary?.summary?.payments?.online)}
                    </span>
                  </div>
                </div>
              </div>
              )}

              {/* Form nhập tiền đếm thực tế - CHỈ cho Thu ngân */}
              {!isNonCashShift && (
              <div className="bg-accent-50 rounded-2xl p-5 border-2 border-accent-300">
                <h4 className="font-bold text-accent-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Kiểm đếm tiền mặt
                </h4>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border-2 border-accent-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-dark-600">Tiền đầu ca</p>
                        </div>
                        <p className="text-lg font-bold text-dark-700">{formatMoney(openingCash)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-dark-600">Thu trong ca</p>
                        </div>
                        <p className="text-lg font-bold text-primary-700">{formatMoney(cashInShift)}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t-2 border-accent-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <svg className="w-4 h-4 text-accent-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-dark-600">Tổng tiền phải có</p>
                      </div>
                      <p className="text-2xl font-bold text-accent-900">{formatMoney(totalExpected)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 mb-2">
                      Tiền mặt thực tế (đếm trong két) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      placeholder="Nhập số tiền đếm được..."
                      className="w-full px-4 py-3 text-lg border-2 border-accent-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 font-semibold"
                      min="0"
                    />
                  </div>
                  
                  {actualCash && (
                    <div className={`p-4 rounded-xl border-2 ${
                      cashDiff === 0 
                        ? 'bg-success-50 border-success-300' 
                        : cashDiff > 0 
                        ? 'bg-primary-50 border-primary-300'
                        : 'bg-red-50 border-red-300'
                    }`}>
                      <p className="text-sm font-medium text-dark-700 mb-1">Chênh lệch:</p>
                      <p className={`text-2xl font-bold ${
                        cashDiff === 0 
                          ? 'text-success-700' 
                          : cashDiff > 0 
                          ? 'text-primary-700'
                          : 'text-red-700'
                      }`}>
                        {cashDiff > 0 ? '+' : ''}{formatMoney(cashDiff)}
                      </p>
                      <p className="text-xs text-dark-600 mt-1">
                        {cashDiff === 0 && '✅ Khớp chính xác'}
                        {cashDiff > 0 && '⬆️ Thừa tiền'}
                        {cashDiff < 0 && '⬇️ Thiếu tiền'}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 mb-2">
                      Ghi chú
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú về ca làm việc..."
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-cream-50 border-t border-gray-200 rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-200 hover:bg-white hover:text-gray-700 text-dark-700 border-2 border-gray-300 rounded-xl font-semibold transition-all duration-200 hover:border-gray-700 hover:shadow-lg outline-none focus:outline-none"
          >
            Hủy
          </button>
          <button
            onClick={handleClose}
            disabled={loading || (!isNonCashShift && actualCash === '')}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] text-white border-2 border-[#c9975b] rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gradient-to-r disabled:hover:from-[#d4a574] disabled:hover:via-[#c9975b] disabled:hover:to-[#d4a574] disabled:hover:text-white disabled:hover:border-[#c9975b] outline-none focus:outline-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isNonCashShift ? 'Đang kết thúc ca...' : 'Đang đóng ca...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>{isNonCashShift ? (isKitchenShift ? 'Kết thúc ca' : 'Kết thúc ca phục vụ') : 'Xác nhận đóng ca'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Open Orders Dialog */}
      <OpenOrdersDialog
        open={showOpenOrdersDialog}
        orders={openOrders}
        onClose={() => setShowOpenOrdersDialog(false)}
        onForceClose={handleForceClose}
        onGoBack={() => {
          setShowOpenOrdersDialog(false);
          onClose();
        }}
        loading={loading}
      />
    </div>
  );
}

