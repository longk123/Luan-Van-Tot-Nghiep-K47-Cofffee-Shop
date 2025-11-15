// === src/components/TableCard.jsx ===
import { useState } from 'react';

import { api } from '../api.js';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function TableCard({ table, onClick, onCloseTable, onLockTable, onUnlockTable, upcomingReservation, viewOnly = false }) {
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showReservationInfo, setShowReservationInfo] = useState(false);
  const [unlockConfirm, setUnlockConfirm] = useState(false);
  const [cleanConfirm, setCleanConfirm] = useState(false);
  // Backend trả về order_id hoặc current_order_id
  const orderId = table.order_id || table.current_order_id || table.don_hang_id;
  const isPaid = table.order_status === 'PAID';
  const hasOrder = orderId || table.trang_thai === 'DANG_DUNG';
  const isLocked = table.trang_thai === 'KHOA';
  
  // Debug logging
  console.log('TableCard debug:', {
    tableId: table.id,
    tableName: table.ten_ban,
    isPaid,
    all_items_done: table.all_items_done,
    item_count: table.item_count,
    done_count: table.done_count,
    pending_count: table.pending_count,
    q_count: table.q_count,
    m_count: table.m_count
  });
  
  // Kiểm tra reservation từ cột mới trong bảng ban
  const hasReservation = table.trang_thai_dat_ban || table.reservation_id;
  const reservationData = (table.trang_thai_dat_ban || table.reservation_id) ? {
    khach: table.reservation_guest,
    start_at: table.reservation_time,
    trang_thai: table.trang_thai_dat_ban,
    so_nguoi: upcomingReservation?.so_nguoi
  } : (upcomingReservation || null);
  
  // Màu card theo trạng thái bàn - NÂNG CẤP CHUYÊN NGHIỆP
  const getStatusColor = () => {
    if (table.trang_thai === 'KHOA') return 'bg-gradient-to-br from-red-50 via-red-50 to-rose-100 border-red-300 shadow-red-100/50';
    if (hasReservation && !hasOrder) return 'bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 border-indigo-300 shadow-indigo-100/50'; // Bàn đã đặt
    if (!hasOrder) return 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-green-300 shadow-green-100/50';
    if (isPaid) return 'bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 border-blue-300 shadow-blue-100/50';
    return 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-300 shadow-amber-100/50';
  };

  // Badge trạng thái bàn - NÂNG CẤP VỚI GRADIENT
  const getTableStatusBadge = () => {
    if (table.trang_thai === 'KHOA') return { text: 'KHÓA', color: 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-md' };
    if (hasReservation && !hasOrder) return { text: 'ĐÃ ĐẶT', color: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-md' };
    if (table.trang_thai === 'TRONG') return { text: 'TRỐNG', color: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold shadow-md' };
    if (table.trang_thai === 'DANG_DUNG') return { text: 'ĐANG DÙNG', color: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white font-bold shadow-md' };
    return { text: 'TRỐNG', color: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold shadow-md' };
  };

  // Badge trạng thái thanh toán (chỉ khi có đơn) - NÂNG CẤP
  const getPaymentStatusBadge = () => {
    if (!hasOrder) return null;
    if (isPaid) return { text: 'ĐÃ TT', color: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold shadow-md' };
    return { text: 'CHƯA TT', color: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-md' };
  };

  // Lấy màu nút phù hợp với màu nền của bàn
  const getButtonColor = () => {
    if (table.trang_thai === 'KHOA') {
      // Bàn KHÓA - red/rose background
      return {
        primary: 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600',
        secondary: 'bg-white text-red-500 border-red-500 hover:bg-red-500 hover:text-white hover:border-red-500'
      };
    }
    if (hasReservation && !hasOrder) {
      // Bàn ĐÃ ĐẶT - indigo/purple background
      return {
        primary: 'bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600',
        secondary: 'bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600',
        danger: 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600'
      };
    }
    if (!hasOrder) {
      // Bàn TRỐNG - emerald/green/teal background
      return {
        primary: 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
        secondary: 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
        danger: 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600'
      };
    }
    if (isPaid) {
      // Bàn ĐÃ TT - blue/sky/cyan background
      return {
        primary: 'bg-white text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600',
        secondary: 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
        danger: 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600'
      };
    }
    // Bàn CHƯA TT - amber/orange/yellow background
    return {
      primary: 'bg-white text-amber-600 border-amber-600 hover:bg-amber-600 hover:text-white hover:border-amber-600',
      secondary: 'bg-white text-amber-600 border-amber-600 hover:bg-amber-600 hover:text-white hover:border-amber-600'
    };
  };

  const tableStatusBadge = getTableStatusBadge();
  const paymentStatusBadge = getPaymentStatusBadge();
  const buttonColor = getButtonColor();

  const handleCardClick = () => {
    if (!isLocked) {
      onClick(table);
    }
  };

  return (
    <>
    <div
      onClick={handleCardClick}
      className={`p-5 rounded-2xl border-2 ${getStatusColor()} shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 text-left w-full ${
        isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
      }`}
    >
      {/* Dòng 1: Tên bàn + Status Badges */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-900 truncate">{table.ten_ban}</h3>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Badge trạng thái bàn */}
          <span className={`text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-wide ${tableStatusBadge.color}`}>
            {tableStatusBadge.text}
          </span>
          {/* Badge trạng thái thanh toán */}
          {paymentStatusBadge && (
            <span className={`text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-wide ${paymentStatusBadge.color}`}>
              {paymentStatusBadge.text}
            </span>
          )}
        </div>
      </div>

      {/* Dòng 2: Icons info */}
      <div className="flex items-center justify-between gap-3 text-xs mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-purple-700 font-semibold">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
            {table.suc_chua}
          </span>
          <span className="flex items-center gap-1 text-blue-700 font-semibold">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
            {table.item_count || 0} món
          </span>
        </div>
        {hasOrder && (table.grand_total > 0 || table.subtotal > 0) && (
          <span className="font-bold text-sm text-gray-900 bg-white/60 px-2.5 py-0.5 rounded-lg shadow-sm">
            {(table.grand_total || table.subtotal || 0).toLocaleString()}₫
          </span>
        )}
      </div>

      {/* Dòng 3: Action buttons hoặc info */}
      {isLocked ? (
        <div className="flex flex-col">
          {/* Spacer để nút nằm ngang hàng */}
          <div className="min-h-[40px]"></div>
          {viewOnly ? (
            <div className="text-center py-2 text-xs text-gray-500 italic">
              🔒 Bàn đã khóa
            </div>
          ) : (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setUnlockConfirm(true)}
                title="Mở khóa bàn"
                className={`flex-1 px-3 py-2.5 border-2 rounded-xl text-xs font-semibold transition-all duration-200 outline-none focus:outline-none shadow-lg flex items-center justify-center gap-1.5 ${buttonColor.primary}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Mở khóa
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReasonDialog(true);
                }}
                title="Xem lý do khóa"
                className={`px-3 py-2.5 border-2 rounded-xl text-xs font-semibold transition-all duration-200 outline-none focus:outline-none shadow-lg flex items-center justify-center gap-1.5 ${buttonColor.secondary}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : !hasOrder ? (
        <div className="flex flex-col">
          {/* Hiển thị thông tin đặt bàn nếu có */}
          {hasReservation && reservationData && reservationData.start_at ? (
            <>
              <div className="min-h-[40px] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowReservationInfo(true)}
                  title="Thông tin xác nhận"
                  className={`px-3 py-2 border-2 rounded-xl text-xs font-semibold transition-all duration-200 outline-none focus:outline-none shadow-lg flex items-center gap-1.5 ${buttonColor.primary}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Xác nhận
                </button>
              </div>
              {!viewOnly && (
                <div
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (table.reservation_id) {
                      try {
                        await api.checkInReservation(table.reservation_id, table.id);
                        onClick(table);
                      } catch (error) {
                        console.error('Lỗi check-in:', error);
                      }
                    }
                  }}
                  title="Tạo đơn hàng"
                  className={`w-full px-3 py-2.5 border-2 rounded-xl text-xs font-semibold text-center transition-all duration-200 cursor-pointer active:scale-95 shadow-lg flex items-center justify-center gap-1.5 ${buttonColor.secondary}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Tạo đơn
                </div>
              )}
            </>
          ) : (
            <>
              <div className="min-h-[40px]"></div>
              {!viewOnly && (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                    title="Tạo đơn hàng mới"
                    className={`flex-1 px-3 py-2.5 border-2 rounded-xl text-xs font-semibold text-center transition-all duration-200 cursor-pointer active:scale-95 shadow-lg flex items-center justify-center gap-1.5 ${buttonColor.primary}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo đơn
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLockDialog(true);
                    }}
                    title="Khóa bàn"
                    className={`px-3 py-2.5 border-2 rounded-xl text-xs font-semibold transition-all duration-200 outline-none focus:outline-none shadow-lg flex items-center justify-center ${buttonColor.danger || 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Status badges - Cố định chiều cao - NÂNG CẤP */}
          <div className="min-h-[40px] mb-0">
            <div className="flex flex-wrap gap-1.5">
              {table.q_count > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-gradient-to-r from-slate-500 to-gray-600 text-white font-bold shadow-md flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                  {table.q_count} chờ
                </span>
              )}
              {table.m_count > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold shadow-md flex items-center gap-1 animate-pulse">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd"/>
                  </svg>
                  {table.m_count} làm
                </span>
              )}
            </div>
          </div>
          
          {/* Action button for unpaid orders - NÂNG CẤP */}
          {!isPaid && !viewOnly && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              title="Xem đơn hàng và thanh toán"
              className={`w-full px-3 py-2.5 border-2 rounded-xl text-xs font-semibold text-center transition-all duration-200 cursor-pointer active:scale-95 shadow-lg flex items-center justify-center gap-1.5 ${buttonColor.primary}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Thanh toán
            </div>
          )}
          
          {/* Paid order - actions - NÂNG CẤP */}
          {isPaid && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
                title="Xem chi tiết đơn hàng"
                className={`flex-1 px-2.5 py-2.5 border-2 rounded-xl text-xs font-semibold transition-all duration-200 outline-none focus:outline-none shadow-lg flex items-center justify-center gap-1.5 ${buttonColor.primary}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Xem
              </button>
              {/* Chỉ hiển thị nút "Dọn" và "Khóa" khi tất cả món đã hoàn thành */}
              {table.all_items_done && (
                <>
                  <button
                    onClick={() => setCleanConfirm(true)}
                    title="Dọn bàn"
                    className={`flex-1 px-2.5 py-2.5 border-2 rounded-xl text-xs font-semibold transition-all duration-200 outline-none focus:outline-none shadow-lg flex items-center justify-center ${buttonColor.secondary}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLockDialog(true);
                    }}
                    title="Khóa bàn"
                    className={`flex-1 px-2.5 py-2.5 border-2 rounded-xl text-xs font-semibold transition-all duration-200 outline-none focus:outline-none shadow-lg flex items-center justify-center ${buttonColor.danger}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    
    {/* Dialog khóa bàn */}
    {showLockDialog && (
      <>
        <div 
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
          onClick={() => setShowLockDialog(false)}
        />
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
            <div className="px-6 py-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <h3 className="text-xl font-bold text-amber-900">Khóa bàn {table.ten_ban}</h3>
              <p className="text-sm text-amber-700 mt-1">Nhập lý do khóa bàn</p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-semibold text-amber-900 mb-2">
                Lý do khóa bàn
              </label>
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="VD: Bàn bị hỏng, đã được đặt trước..."
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl text-sm text-amber-900 placeholder-amber-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                rows={4}
                autoFocus
              />
            </div>
            
            <div className="px-6 py-4 border-t border-amber-200 bg-amber-50 flex gap-3">
              <button
                onClick={() => {
                  setShowLockDialog(false);
                  setLockReason('');
                }}
                className="flex-1 py-3 px-4 bg-white border-2 border-amber-300 text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-colors outline-none focus:outline-none"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await onLockTable?.(table.id, lockReason || null);
                  setShowLockDialog(false);
                  setLockReason('');
                }}
                className="flex-[2] py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none"
              >
                Xác nhận khóa
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    
    {/* Dialog xem lý do khóa */}
    {showReasonDialog && (
      <>
        <div 
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReasonDialog(false)}
        />
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
            <div className="px-6 py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
              <h3 className="text-xl font-bold text-blue-900">Lý do khóa bàn {table.ten_ban}</h3>
              <p className="text-sm text-blue-700 mt-1">Thông tin về lý do khóa bàn</p>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 whitespace-pre-wrap">
                  {table.ghi_chu || 'Không có lý do được ghi nhận.'}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-blue-200 bg-blue-50 flex justify-end">
              <button
                onClick={() => setShowReasonDialog(false)}
                className="py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    
    {/* Dialog xem thông tin đặt bàn */}
    {showReservationInfo && hasReservation && (
      <>
        <div 
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReservationInfo(false)}
        />
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
            <div className="px-6 py-4 border-b border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h3 className="text-xl font-bold text-indigo-900">Thông tin đặt bàn</h3>
              <p className="text-sm text-indigo-700 mt-1">{table.ten_ban}</p>
            </div>
            
            <div className="p-6 space-y-3">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                <div className="mb-3">
                  <div className="text-xs text-indigo-600 mb-1">Trạng thái</div>
                  <div className="text-sm font-bold text-indigo-900">
                    {table.trang_thai_dat_ban === 'CONFIRMED' ? '✅ ĐÃ XÁC NHẬN' : '⏳ CHỜ XÁC NHẬN'}
                  </div>
                </div>
                
                {table.reservation_time && (
                  <div className="mb-3">
                    <div className="text-xs text-indigo-600 mb-1">Thời gian</div>
                    <div className="text-sm font-semibold text-indigo-900">
                      🕐 {new Date(table.reservation_time).toLocaleString('vi-VN')}
                    </div>
                  </div>
                )}
                
                {table.reservation_guest && (
                  <div className="mb-3">
                    <div className="text-xs text-indigo-600 mb-1">Khách hàng</div>
                    <div className="text-sm font-semibold text-indigo-900">
                      👤 {table.reservation_guest}
                    </div>
                  </div>
                )}
                
                {table.reservation_phone && (
                  <div>
                    <div className="text-xs text-indigo-600 mb-1">Số điện thoại</div>
                    <div className="text-sm font-semibold text-indigo-900">
                      📞 {table.reservation_phone}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-indigo-200 bg-indigo-50 flex justify-end">
              <button
                onClick={() => setShowReservationInfo(false)}
                className="py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    
    {/* Confirm dialogs */}
    <ConfirmDialog
      open={unlockConfirm}
      title="Mở khóa bàn"
      message={`Bạn có chắc muốn mở khóa bàn ${table.ten_ban}?`}
      confirmText="Mở khóa"
      type="warning"
      onConfirm={async () => {
        setUnlockConfirm(false);
        await onUnlockTable?.(table.id);
      }}
      onCancel={() => setUnlockConfirm(false)}
    />
    
    <ConfirmDialog
      open={cleanConfirm}
      title="Dọn bàn"
      message={`Dọn bàn ${table.ten_ban} và chuyển về trạng thái trống?`}
      confirmText="Dọn bàn"
      type="success"
      onConfirm={async () => {
        setCleanConfirm(false);
        await onCloseTable?.(table.id, 'TRONG');
      }}
      onCancel={() => setCleanConfirm(false)}
    />
    </>
  );
}
