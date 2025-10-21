// === src/components/TableCard.jsx ===
import { useState } from 'react';

export default function TableCard({ table, onClick, onCloseTable, onLockTable, onUnlockTable }) {
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  // Backend trả về order_id hoặc current_order_id
  const orderId = table.order_id || table.current_order_id || table.don_hang_id;
  const isPaid = table.order_status === 'PAID';
  const hasOrder = orderId || table.trang_thai === 'DANG_DUNG';
  const isLocked = table.trang_thai === 'KHOA';
  
  // Màu card theo trạng thái bàn
  const getStatusColor = () => {
    if (table.trang_thai === 'KHOA') return 'bg-red-50 border-red-200';
    if (!hasOrder) return 'bg-green-50 border-green-200';
    if (isPaid) return 'bg-blue-50 border-blue-200';
    return 'bg-amber-50 border-amber-200';
  };

  // Badge trạng thái bàn
  const getTableStatusBadge = () => {
    if (table.trang_thai === 'KHOA') return { text: 'KHÓA', color: 'bg-red-100 text-red-700' };
    if (table.trang_thai === 'TRONG') return { text: 'TRỐNG', color: 'bg-green-100 text-green-700' };
    if (table.trang_thai === 'DANG_DUNG') return { text: 'ĐANG DÙNG', color: 'bg-purple-100 text-purple-700' };
    return { text: 'TRỐNG', color: 'bg-green-100 text-green-700' };
  };

  // Badge trạng thái thanh toán (chỉ khi có đơn)
  const getPaymentStatusBadge = () => {
    if (!hasOrder) return null;
    if (isPaid) return { text: 'ĐÃ TT', color: 'bg-blue-100 text-blue-700' };
    return { text: 'CHƯA TT', color: 'bg-amber-100 text-amber-700' };
  };

  const tableStatusBadge = getTableStatusBadge();
  const paymentStatusBadge = getPaymentStatusBadge();

  const handleCardClick = () => {
    console.log('Card clicked, table:', table);
    console.log('Detected orderId:', orderId);
    console.log('hasOrder:', hasOrder);
    console.log('isPaid:', isPaid);
    if (!isLocked) {
      console.log('Calling onClick with table');
      onClick(table);
    } else {
      console.log('Card is locked, ignoring click');
    }
  };

  return (
    <>
    <div
      onClick={handleCardClick}
      className={`p-4 rounded-xl border-2 ${getStatusColor()} hover:shadow-lg transition-all text-left w-full ${
        isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Dòng 1: Tên bàn + Status Badges */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-gray-900 truncate">{table.ten_ban}</h3>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {/* Badge trạng thái bàn */}
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${tableStatusBadge.color}`}>
            {tableStatusBadge.text}
          </span>
          {/* Badge trạng thái thanh toán */}
          {paymentStatusBadge && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${paymentStatusBadge.color}`}>
              {paymentStatusBadge.text}
            </span>
          )}
        </div>
      </div>

      {/* Dòng 2: Icons info */}
      <div className="flex items-center justify-between gap-3 text-xs text-amber-700 mb-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="text-purple-600">👥</span> {table.suc_chua}
          </span>
          <span className="flex items-center gap-1">
            <span>📋</span> {table.item_count || 0} món
          </span>
          {table.done_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-green-600">🟢</span> {table.done_count}d
            </span>
          )}
        </div>
        {hasOrder && table.subtotal > 0 && (
          <span className="font-bold text-gray-900">
            {table.subtotal.toLocaleString()}₫
          </span>
        )}
      </div>

      {/* Dòng 3: Action buttons hoặc info */}
      {isLocked ? (
        <div className="flex flex-col">
          {/* Spacer để nút nằm ngang hàng */}
          <div className="min-h-[40px]"></div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={async () => {
                if (confirm(`Mở khóa bàn ${table.ten_ban}?`)) {
                  await onUnlockTable?.(table.id);
                }
              }}
              className="flex-1 px-3 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-50 transition-colors outline-none focus:outline-none"
            >
              Mở khóa
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReasonDialog(true);
              }}
              className="px-3 py-2.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors outline-none focus:outline-none"
            >
              Lý do
            </button>
          </div>
        </div>
      ) : !hasOrder ? (
        <div className="flex flex-col">
          {/* Spacer để nút nằm ngang hàng */}
          <div className="min-h-[40px]"></div>
          <div 
            onClick={(e) => {
              console.log('Button "Tạo đơn" clicked');
              e.stopPropagation();
              handleCardClick();
            }}
            className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white rounded-lg text-sm font-semibold text-center transition-all cursor-pointer active:scale-95"
          >
            Tạo đơn
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Status badges - Cố định chiều cao */}
          <div className="min-h-[40px] mb-0">
            <div className="flex flex-wrap gap-1">
              {table.q_count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                  {table.q_count} chờ
                </span>
              )}
              {table.m_count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-700 font-medium">
                  {table.m_count} làm
                </span>
              )}
              {table.done_count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-200 text-green-700 font-medium">
                  {table.done_count} xong
                </span>
              )}
            </div>
          </div>
          
          {/* Action button for unpaid orders */}
          {!isPaid && (
            <div 
              onClick={(e) => {
                console.log('Button "Xem đơn & Thanh toán" clicked');
                e.stopPropagation();
                handleCardClick();
              }}
              className="w-full px-3 py-2.5 bg-amber-600 hover:bg-amber-700 hover:shadow-md text-white rounded-lg text-sm font-semibold text-center transition-all cursor-pointer active:scale-95"
            >
              Xem đơn & Thanh toán
            </div>
          )}
          
          {/* Paid order - actions */}
          {isPaid && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="flex-1 px-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors outline-none focus:outline-none"
              >
                Xem
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Dọn bàn ${table.ten_ban} và chuyển về trạng thái trống?`)) {
                    await onCloseTable?.(table.id, 'TRONG');
                  }
                }}
                className="flex-1 px-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors outline-none focus:outline-none"
              >
                Dọn
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLockDialog(true);
                }}
                className="flex-1 px-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors outline-none focus:outline-none"
              >
                Khóa
              </button>
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
    </>
  );
}
