// src/components/pos/LineItemWithOptions.jsx
/**
 * Component hiển thị từng ly (line) kèm options và trạng thái chế biến
 * Hỗ trợ sửa/xóa khi line còn QUEUED và order chưa PAID
 */
export default function LineItemWithOptions({ 
  line, 
  orderStatus, 
  onEdit, 
  onDelete, 
  onChangeStatus,
  userRole = 'cashier' // 'cashier' | 'kitchen'
}) {
  const canEdit = line.trang_thai_che_bien === 'QUEUED' && orderStatus !== 'PAID';
  const canChangeStatus = userRole === 'kitchen' || userRole === 'admin';

  // Trạng thái mapping
  const statusConfig = {
    'QUEUED': {
      label: 'Chờ làm',
      color: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300'
    },
    'MAKING': {
      label: 'Đang làm',
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300'
    },
    'DONE': {
      label: 'Hoàn thành',
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300'
    },
    'CANCELLED': {
      label: 'Đã hủy',
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300'
    }
  };

  const status = statusConfig[line.trang_thai_che_bien] || statusConfig['QUEUED'];

  return (
    <div className={`flex items-start justify-between rounded-lg border-2 ${status.borderColor} ${status.bgColor} p-2.5 transition-all`}>
      <div className="flex-1 min-w-0">
        {/* Tên món + Size + Trạng thái + Độ ngọt + Mức đá */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{line.ten_mon}</span>
          {line.ten_bien_the && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
              {line.ten_bien_the}
            </span>
          )}
          {/* Pill trạng thái */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color} text-white flex items-center gap-1`}>
            {line.trang_thai_che_bien === 'MAKING' && (
              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {line.trang_thai_che_bien === 'DONE' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status.label}
          </span>
          
          {/* Options chips cùng dòng (PERCENT: Sugar, Ice) */}
          {line.options && line.options.filter(opt => opt.loai === 'PERCENT').map((opt, idx) => (
            <span 
              key={`${line.line_id}-percent-${opt.id || opt.ma || idx}`}
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                opt.ma === 'SUGAR' 
                  ? 'bg-amber-100 text-amber-700'
                  : opt.ma === 'ICE'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {opt.ten}: {opt.muc || `${Math.round(opt.he_so * 100)}%`}
            </span>
          ))}
        </div>

        {/* Topping (AMOUNT) */}
        {line.options && line.options.filter(opt => opt.loai === 'AMOUNT' && opt.so_luong > 0).length > 0 && (
          <div className="mt-1.5 text-xs text-emerald-700 bg-emerald-50/80 rounded px-2 py-1 border border-emerald-200">
            <div className="flex items-start gap-1">
              <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="leading-tight">
                <b>Topping:</b>{' '}
                {line.options
                  .filter(opt => opt.loai === 'AMOUNT' && opt.so_luong > 0)
                  .map((opt, idx) => (
                    <span key={`${line.line_id}-amount-${opt.id || opt.ma || opt.ten || idx}`}>
                      {idx > 0 && ' • '}
                      {opt.ten} × {opt.so_luong} {opt.don_vi}
                    </span>
                  ))
                }
              </span>
            </div>
          </div>
        )}

        {/* Ghi chú */}
        {line.ghi_chu && (
          <div className="mt-1.5 flex items-start gap-1 text-xs text-amber-700 bg-amber-50/80 rounded px-2 py-1 border border-amber-200">
            <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="italic leading-tight">{line.ghi_chu}</span>
          </div>
        )}
      </div>

      {/* Price + Actions */}
      <div className="text-right ml-2 flex-shrink-0">
        <div className="font-semibold text-gray-900 mb-1.5 text-sm">
          {(line.line_total_with_addons || line.line_total || 0).toLocaleString()}₫
        </div>
        {/* Hiển thị breakdown nếu có topping */}
        {line.topping_total > 0 && (
          <div className="text-[10px] text-emerald-600 mb-1">
            +{line.topping_total.toLocaleString()}đ topping
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          {/* Sửa/Xóa - chỉ cho cashier/admin khi còn QUEUED */}
          {!canChangeStatus && (
            <div className="flex gap-1">
              <button
                className="text-xs px-2 py-1 rounded bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors outline-none focus:outline-none"
                onClick={() => onEdit?.(line)}
                disabled={!canEdit}
                title={!canEdit ? 'Chỉ sửa được khi còn chờ làm' : 'Sửa món'}
              >
                Sửa
              </button>
              <button
                className="text-xs px-2 py-1 rounded bg-white border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors outline-none focus:outline-none"
                onClick={() => onDelete?.(line)}
                disabled={!canEdit}
                title={!canEdit ? 'Chỉ xóa được khi còn chờ làm' : 'Xóa món'}
              >
                Xóa
              </button>
            </div>
          )}

          {/* Đổi trạng thái - chỉ cho kitchen/admin */}
          {canChangeStatus && (
            <div className="flex flex-col gap-1">
              {line.trang_thai_che_bien === 'QUEUED' && (
                <button
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm outline-none focus:outline-none"
                  onClick={() => onChangeStatus?.(line, 'MAKING')}
                >
                  Bắt đầu làm
                </button>
              )}
              {line.trang_thai_che_bien === 'MAKING' && (
                <button
                  className="text-xs px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm outline-none focus:outline-none"
                  onClick={() => onChangeStatus?.(line, 'DONE')}
                >
                  Hoàn thành
                </button>
              )}
              {(line.trang_thai_che_bien === 'QUEUED' || line.trang_thai_che_bien === 'MAKING') && (
                <button
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-50 transition-colors outline-none focus:outline-none"
                  onClick={() => onChangeStatus?.(line, 'CANCELLED')}
                >
                  Hủy ly
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
