// src/components/TakeawayOrderCard.jsx
import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function TakeawayOrderCard({ 
  order, 
  onOpenOrder, 
  onDeliver, 
  onUpdateDeliveryStatus,
  isManagerViewMode = false,
  isWaiter = false,
  selectedDeliveryOrders = [],
  selectedTakeawayOrders = [],
  onToggleSelectOrder,
  onToggleSelectTakeaway,
  onClaimOrder
}) {
  const allDone = order.items?.every(item => item.trang_thai_che_bien === 'DONE');
  const isPaid = order.trang_thai === 'PAID';
  const itemCount = order.items?.length || 0;
  const hasManyItems = itemCount > 2;
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  
  // Kiểm tra đơn có thể claim không (DELIVERY, PENDING, chưa có shipper)
  const canClaim = isWaiter && 
    order.order_type === 'DELIVERY' && 
    allDone &&
    (order.delivery_status === 'PENDING' || !order.delivery_status || !order.shipper_id);
  const isDeliverySelected = selectedDeliveryOrders.includes(order.id);
  
  // Kiểm tra đơn mang đi có thể giao cho khách (đã thanh toán và món đã xong)
  const canDeliverTakeaway = order.order_type === 'TAKEAWAY' && isPaid && allDone;
  const isTakeawaySelected = selectedTakeawayOrders.includes(order.id);
  
  const orderTotal = (order.grand_total || 0) + (order.delivery_fee || 0);

  return (
    <div
      className={`bg-white rounded-2xl shadow-md border-2 p-6 hover:shadow-xl transition-all duration-200 ${
        isDeliverySelected || isTakeawaySelected
          ? isDeliverySelected ? 'border-blue-500 bg-blue-50' : 'border-emerald-500 bg-emerald-50'
          : 'border-gray-200 hover:border-[#c9975b]'
      } cursor-pointer`}
      onClick={() => onOpenOrder?.(order)}
    >
      {/* Checkbox cho đơn TAKEAWAY sẵn sàng giao */}
      {canDeliverTakeaway && (
        <div className="flex items-center justify-end mb-2" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTakeawaySelected}
              onChange={() => onToggleSelectTakeaway?.(order.id)}
              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-emerald-700">Chọn giao</span>
          </label>
        </div>
      )}
      {/* Checkbox cho waiter để chọn nhiều đơn (chỉ hiển thị cho đơn DELIVERY PENDING) */}
      {canClaim && (
        <div className="flex items-center justify-end mb-2" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDeliverySelected}
              onChange={() => onToggleSelectOrder?.(order.id)}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Chọn đơn</span>
          </label>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-[#8b6f47] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Đơn #{order.id}
            </h3>
            {order.is_pre_order && order.order_type === 'TAKEAWAY' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-300">
                Lại lấy
              </span>
            )}
          </div>
          <p className="text-sm text-[#8b6f47] font-medium">
            {new Date(order.opened_at).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          {/* Thông tin khách hàng (nếu có) */}
          {order.khach_hang_ten && (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                👤 {order.khach_hang_ten}
              </p>
              {order.khach_hang_phone && (
                <p className="text-xs text-gray-600">
                  📞 {order.khach_hang_phone}
                </p>
              )}
            </div>
          )}
          {/* Thông tin giao hàng (nếu là DELIVERY) */}
          {order.order_type === 'DELIVERY' && order.delivery_address && (
            <div className="mt-2 space-y-1 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900">
                📍 Địa chỉ giao hàng:
              </p>
              <p className="text-xs text-blue-800">
                {order.delivery_address}
              </p>
              {order.delivery_phone && (
                <p className="text-xs text-blue-700 mt-1">
                  📞 SĐT nhận: {order.delivery_phone}
                </p>
              )}
              {order.distance_km && (
                <p className="text-xs text-blue-600 mt-1">
                  📏 Cách quán: {parseFloat(order.distance_km).toFixed(2)}km
                </p>
              )}
              {order.delivery_fee > 0 && (
                <p className="text-xs text-blue-700 mt-1 font-semibold">
                  💰 Phí ship: {order.delivery_fee.toLocaleString('vi-VN')}đ
                </p>
              )}
              {/* Thông tin shipper nếu đã được phân công */}
              {order.shipper_name && (
                <div className="mt-2 pt-2 border-t border-blue-300">
                  <p className="text-xs text-blue-900 font-semibold">
                    👤 Nhân viên giao: {order.shipper_name}
                  </p>
                  {order.delivery_status && (
                    <p className="text-xs text-blue-700 mt-0.5">
                      Trạng thái: {
                        order.delivery_status === 'ASSIGNED' ? 'Đã phân công' :
                        order.delivery_status === 'OUT_FOR_DELIVERY' ? 'Đang giao hàng' :
                        order.delivery_status === 'DELIVERED' ? 'Đã giao' :
                        order.delivery_status === 'FAILED' ? 'Giao thất bại' :
                        'Chờ phân công'
                      }
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
            isPaid
              ? 'bg-green-500 text-white'
              : 'bg-amber-500 text-white'
          }`}>
            {isPaid ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Đã thanh toán
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Chưa thanh toán
              </>
            )}
          </span>
          {allDone && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Món đã xong
            </span>
          )}
        </div>
      </div>

      {/* Danh sách món - Chỉ hiển thị 2 món, scroll nếu nhiều hơn */}
      <div className={`space-y-2 mb-4 ${hasManyItems ? 'max-h-[160px] overflow-y-auto pr-2' : ''}`}>
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {(item.mon_ten || item.ten_mon || item.ten_mon_snapshot || '').trim() || 'Món không tên'}
                {item.bien_the_ten && (
                  <span className="text-gray-600 font-normal ml-2">• {item.bien_the_ten}</span>
                )}
              </div>
              {item.ghi_chu && (
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {item.ghi_chu}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-700 font-semibold">×{item.so_luong}</span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                item.trang_thai_che_bien === 'DONE' ? 'bg-green-100 text-green-700' :
                item.trang_thai_che_bien === 'MAKING' ? 'bg-blue-100 text-blue-700' :
                item.trang_thai_che_bien === 'QUEUED' ? 'bg-gray-200 text-gray-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {item.trang_thai_che_bien === 'DONE' ? 'Xong' :
                 item.trang_thai_che_bien === 'MAKING' ? 'Đang làm' :
                 item.trang_thai_che_bien === 'QUEUED' ? 'Chờ' : 'Chưa xác nhận'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tổng tiền */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex items-center justify-between bg-[#c9975b] rounded-xl p-4">
          <div className="flex flex-col">
            <span className="text-white font-bold text-base">Tổng cộng:</span>
            {order.order_type === 'DELIVERY' && order.delivery_fee > 0 && (
              <span className="text-xs text-white/80 mt-0.5">
                (Bao gồm phí ship: {order.delivery_fee.toLocaleString('vi-VN')}đ)
              </span>
            )}
          </div>
          <span className="text-2xl font-bold text-white">
            {orderTotal.toLocaleString('vi-VN')}₫
          </span>
        </div>
      </div>

      {/* Nút Xem chi tiết - luôn hiển thị */}
      <div className="mb-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onOpenOrder?.(order)}
          className="w-full py-2.5 rounded-lg font-semibold bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b]
          hover:bg-white hover:from-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] transition-all duration-200 shadow-md flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Xem chi tiết đơn
        </button>
      </div>

      {/* Action buttons - stopPropagation để không trigger open drawer */}
      {!isManagerViewMode && allDone ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          {/* Đối với đơn DELIVERY */}
          {order.order_type === 'DELIVERY' ? (
            isWaiter ? (
              /* Waiter: Cập nhật trạng thái giao hàng */
              order.shipper_id ? (
                <div className="space-y-2">
                  {order.delivery_status === 'ASSIGNED' && (
                    <button
                      onClick={() => onUpdateDeliveryStatus(order, 'OUT_FOR_DELIVERY')}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-2 border-blue-600
                      hover:bg-white hover:from-white hover:to-white hover:text-blue-600 hover:border-blue-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Bắt đầu giao hàng
                    </button>
                  )}
                  {order.delivery_status === 'OUT_FOR_DELIVERY' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => onUpdateDeliveryStatus(order, 'DELIVERED')}
                        className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-600
                        hover:bg-white hover:from-white hover:to-white hover:text-green-600 hover:border-green-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Đã giao hàng
                      </button>
                      <button
                        onClick={() => setShowFailureDialog(true)}
                        className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-rose-500 text-white border-2 border-red-600
                        hover:bg-white hover:from-white hover:to-white hover:text-red-600 hover:border-red-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Giao thất bại
                      </button>
                    </div>
                  )}
                  {(order.delivery_status === 'DELIVERED' || order.delivery_status === 'FAILED') && (
                    <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 font-semibold">
                        {order.delivery_status === 'DELIVERED' ? '✅ Đã giao hàng thành công' : '❌ Giao hàng thất bại'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Waiter: Có thể claim đơn PENDING */
                canClaim ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClaimOrder?.(order.id);
                    }}
                    className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white border-2 border-emerald-600
                    hover:bg-white hover:from-white hover:to-white hover:text-emerald-600 hover:border-emerald-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nhận đơn ({orderTotal.toLocaleString('vi-VN')}đ)
                  </button>
                ) : (
                  <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 font-semibold">
                      Chờ được phân công giao hàng
                    </p>
                  </div>
                )
              )
            ) : (
              /* Cashier: Chỉ xem, không có action (waiter sẽ tự claim) */
              <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-semibold">
                  {order.shipper_id 
                    ? `Đã được nhận bởi: ${order.shipper_name || 'Nhân viên phục vụ'}`
                    : 'Chờ nhân viên phục vụ nhận đơn'
                  }
                </p>
                {!order.shipper_id && (
                  <p className="text-xs text-blue-600 mt-1">
                    Nhân viên phục vụ sẽ tự nhận đơn từ danh sách
                  </p>
                )}
              </div>
            )
          ) : (
            /* Đối với đơn TAKEAWAY */
            isPaid ? (
              /* Đã thanh toán → Waiter và Cashier đều có thể giao cho khách tại quán */
              <button
                onClick={() => onDeliver(order)}
                className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-600
                hover:bg-white hover:from-white hover:to-white hover:text-green-600 hover:border-green-600 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Giao cho khách
              </button>
            ) : (
              /* Chưa thanh toán */
              isWaiter ? (
                /* Waiter: Chỉ xem, không thu tiền */
                <div className="text-center py-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700 font-semibold">
                    Chờ thanh toán
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Thu ngân sẽ xử lý thanh toán
                  </p>
                </div>
              ) : (
                /* Cashier: Thu tiền */
                <button
                  onClick={async () => {
                    // Mở drawer để thanh toán
                    onOpenOrder(order);
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white border-2 border-amber-600
                  hover:bg-white hover:from-white hover:to-white hover:text-amber-600 hover:border-amber-600 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Thu tiền
                </button>
              )
            )
          )}
        </div>
      ) : (
        /* Món chưa xong → Tổng kết ưu tiên */
        <div className="text-center py-3 bg-amber-50 rounded-lg border border-amber-200">
          {order.items?.some(i => i.trang_thai_che_bien === 'PENDING') ? (
            <p className="text-sm text-amber-700 font-semibold flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Đơn chưa làm món xong
            </p>
          ) : (
            <p className="text-sm text-amber-700 font-semibold flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Đơn chưa làm món xong
            </p>
          )}
        </div>
      )}

      {/* Dialog nhập lý do giao thất bại */}
      <ConfirmDialog
        open={showFailureDialog}
        title="Giao hàng thất bại"
        message={
          <div className="space-y-4">
            <p className="text-gray-700">Vui lòng nhập lý do giao hàng thất bại:</p>
            <textarea
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="Nhập lý do giao hàng thất bại (bắt buộc)..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              rows={4}
              autoFocus
            />
            {!failureReason.trim() && (
              <p className="text-sm text-red-600">Vui lòng nhập lý do giao hàng thất bại</p>
            )}
          </div>
        }
        onConfirm={() => {
          if (failureReason.trim()) {
            onUpdateDeliveryStatus(order, 'FAILED', failureReason.trim());
            setShowFailureDialog(false);
            setFailureReason('');
          }
        }}
        onCancel={() => {
          setShowFailureDialog(false);
          setFailureReason('');
        }}
        confirmText="Xác nhận"
        cancelText="Hủy"
        type="error"
        disabled={!failureReason.trim()}
      />
    </div>
  );
}

