// === src/components/OrderDrawer.jsx ===
// File path: D:\my-thesis\frontend\src\components\OrderDrawer.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import useOrderDrawer from '../hooks/useOrderDrawer.js';
import { api } from '../api.js';
import LineItemWithOptions from './pos/LineItemWithOptions.jsx';
import EditOptionsDialog from './pos/EditOptionsDialog.jsx';
import PaymentSection from './PaymentSection.jsx';

// Helper để nhóm bàn theo khu vực
function groupTablesByArea(tables) {
  const groups = {};
  tables.forEach(table => {
    const areaName = table.khu_vuc || table.khu_vuc_ten || 'Khác';
    if (!groups[areaName]) {
      groups[areaName] = [];
    }
    groups[areaName].push(table);
  });
  return groups;
}

export default function OrderDrawer({ 
  open, 
  onClose, 
  order, 
  onPaid, 
  refreshTick = 0, 
  width = 680, 
  docked = true, 
  shift,
  reloadTables,
  onShowToast,
  triggerCancelDialog,
  onTriggerCancelDialog,
  onTableChanged
}) {
  const orderId = order?.id;
  const [localOrder, setLocalOrder] = useState(order);
  
  console.log('OrderDrawer render:', { open, orderId, order });
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, line: null });
  const [showMoveTable, setShowMoveTable] = useState(false);
  
  useEffect(() => setLocalOrder(order), [order]);
  
  // Tự động đóng "Đổi bàn" và "Khuyến mãi" khi drawer đóng hoặc đổi order
  useEffect(() => {
    if (!open) {
      setShowMoveTable(false);
      setShowPromoSection(false);
    }
  }, [open]);
  
  // Reset các section khi đổi order (chọn bàn khác)
  useEffect(() => {
    setShowMoveTable(false);
    setShowPromoSection(false);
    
    // Fetch lại danh sách bàn trống khi đổi order
    if (orderId && order?.order_type !== 'TAKEAWAY') {
      fetchAvailableTables();
    }
  }, [orderId]);
  
  const isPaid = localOrder?.trang_thai === 'PAID' || localOrder?.status === 'PAID' || localOrder?.da_thanh_toan === true;
  
  console.log('OrderDrawer isPaid check:', {
    localOrder,
    trang_thai: localOrder?.trang_thai,
    status: localOrder?.status,
    da_thanh_toan: localOrder?.da_thanh_toan,
    isPaid
  });
  const {
    items,
    summary,
    loading,
    moveTableId,
    setMoveTableId,
    checkingOut,
    fetchData,
    moveTable,
    checkout
  } = useOrderDrawer(orderId);

  // States cho khuyến mãi & giảm giá
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [moneySummary, setMoneySummary] = useState(null);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [manualDiscountAmount, setManualDiscountAmount] = useState('');
  const [manualDiscountNote, setManualDiscountNote] = useState('');
  const [showPromoSection, setShowPromoSection] = useState(false);
  
  // Available promotions dialog
  const [showPromotionsDialog, setShowPromotionsDialog] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);


  useEffect(() => { 
    if (open && orderId) {
      fetchData();
      // Fetch thông tin order để cập nhật trạng thái thanh toán
      fetchOrderInfo();
      // Fetch money summary (KM, giảm giá, tổng tiền)
      fetchMoneySummary();
      // Fetch danh sách bàn trống (chỉ cho đơn DINE_IN) - Refresh khi đổi order
      if (order?.order_type !== 'TAKEAWAY') {
        fetchAvailableTables();
      }
    }
  }, [open, orderId]);
  
  useEffect(() => { 
    if (open) {
      fetchData();
      fetchOrderInfo();
      fetchMoneySummary();
    }
  }, [refreshTick]);

  const fetchMoneySummary = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await api.getOrderMoneySummary(orderId);
      const data = res?.data || res;
      setMoneySummary(data.summary || null);
      setPromotions(data.promotions || []);
    } catch (error) {
      console.error('Error fetching money summary:', error);
      setMoneySummary(null);
      setPromotions([]);
    }
  }, [orderId]);

  const fetchOrderInfo = async () => {
    if (!orderId) return;
    try {
      const res = await api.getOrderSummary(orderId);
      const orderData = res?.data || res;
      console.log('Fetched order summary:', orderData);
      setLocalOrder(prev => ({
        ...prev,
        ...orderData,
        trang_thai: orderData.trang_thai || orderData.status,
        status: orderData.status || orderData.trang_thai,
        da_thanh_toan: orderData.da_thanh_toan
      }));
    } catch (error) {
      console.error('Error fetching order info:', error);
    }
  };

  const fetchAvailableTables = async () => {
    setLoadingTables(true);
    try {
      const res = await api.getPosTables();
      const allTables = res?.data || res || [];
      // Ưu tiên localOrder.ban_id vì nó được cập nhật ngay sau khi đổi bàn
      const currentTableId = localOrder?.ban_id || order?.ban_id;
      
      console.log('=== fetchAvailableTables Debug ===');
      console.log('All tables:', allTables);
      console.log('Current table ID:', currentTableId);
      console.log('localOrder.ban_id:', localOrder?.ban_id);
      console.log('order.ban_id:', order?.ban_id);
      console.log('Tables by status:', allTables.map(t => ({ id: t.id, ten: t.ten_ban, status: t.trang_thai })));
      
      // Lọc chỉ lấy bàn TRỐNG và không phải bàn hiện tại
      const emptyTables = allTables.filter(t => {
        const isTrong = t.trang_thai === 'TRONG';
        const isNotCurrent = t.id !== currentTableId;
        console.log(`Table ${t.id} (${t.ten_ban}): status=${t.trang_thai}, isTrong=${isTrong}, isNotCurrent=${isNotCurrent}`);
        return isTrong && isNotCurrent;
      });
      
      console.log('Empty tables after filter:', emptyTables);
      console.log('=== End Debug ===');
      
      setAvailableTables(emptyTables);
    } catch (error) {
      console.error('Error fetching available tables:', error);
      setAvailableTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  // Trigger dialog hủy đơn từ bên ngoài (nút Danh sách bàn)
  useEffect(() => {
    if (triggerCancelDialog && order?.order_type === 'TAKEAWAY' && !isPaid) {
      setShowCancelDialog(true);
      onTriggerCancelDialog?.();
    }
  }, [triggerCancelDialog, order?.order_type, isPaid, onTriggerCancelDialog]);

  const handleMoveTable = async () => {
    const targetTableId = Number(moveTableId);
    const targetTable = availableTables.find(t => t.id === targetTableId);
    const targetTableName = targetTable?.ten_ban || `Bàn ${targetTableId}`;
    const oldTableId = order?.ban_id;
    
    const success = await moveTable();
    if (success) {
      // Hiển thị toast thành công
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đổi bàn thành công!',
        message: `Đơn #${order?.id} đã được chuyển sang ${targetTableName}.`
      });
      
      // Đóng drawer hiện tại
      onClose?.();
      
      // Refresh table list để cập nhật trạng thái bàn cũ và bàn mới
      await reloadTables?.();
      
      // Trigger mở lại drawer với bàn mới (giống như click vào bàn mới)
      if (onTableChanged) {
        // Đợi một chút để tables reload xong
        await new Promise(resolve => setTimeout(resolve, 300));
        onTableChanged(targetTableId, order?.id);
      }
    }
  };

  const handleCheckout = async () => {
    try {
      const res = await api.checkoutOrder(orderId);
      const updated = res?.data || res || {};
      
      // Cập nhật lạc quan để UI đổi ngay
      setLocalOrder((prev) => ({
        ...prev,
        ...updated,
        status: updated.status || prev?.status || 'PAID',
        trang_thai: updated.trang_thai || prev?.trang_thai || 'PAID',
        da_thanh_toan: typeof updated.da_thanh_toan === 'boolean' ? updated.da_thanh_toan : true,
      }));
      
      // Ưu tiên báo cho cha biết order đã PAID (kèm table_id) để update lạc quan
      if (onPaid) {
        await onPaid({
          order_id: orderId,
          table_id: updated.ban_id || localOrder?.ban_id,
          status: updated.status || updated.trang_thai || 'PAID'
        });
      }
      // Fallback: nếu chưa có SSE thì reload danh sách bàn
      if (reloadTables) await reloadTables();
      // Đóng sau cùng để UI không "mất dấu" trong lúc update
      onClose?.();
    } catch (e) {
      console.error('Error during checkout:', e);
      alert('Lỗi khi thanh toán: ' + e.message);
    }
  };

  const handleCancelOrder = async () => {
    try {
      await api.cancelOrder(order.id, cancelReason || null);
      setShowCancelDialog(false);
      setCancelReason('');
      onClose();
      reloadTables?.();
      
      // Hiển thị toast thành công
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Hủy đơn thành công!',
        message: `Đơn hàng #${order.id} đã được hủy thành công.`
      });
    } catch (error) {
      console.error('Error canceling order:', error);
      
      // Hiển thị toast lỗi
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi hủy đơn',
        message: error.message || 'Có lỗi xảy ra khi hủy đơn hàng.'
      });
    }
  };

  const handleClose = () => {
    // Nếu là đơn mang đi và chưa thanh toán, hiển thị dialog hủy đơn
    if (order?.order_type === 'TAKEAWAY' && !isPaid) {
      setShowCancelDialog(true);
    } else {
      onClose();
    }
  };

  // Handlers cho LineItemWithOptions
  const handleEditLine = async (line) => {
    console.log('Opening edit dialog for line:', line);
    setEditDialog({ open: true, line });
  };

  const handleConfirmEdit = async ({ options, note }) => {
    const { line } = editDialog;
    try {
      // Cập nhật options
      await api.upsertOrderItemOptions(orderId, line.line_id, options);
      
      // Cập nhật ghi chú nếu thay đổi
      if (note !== line.ghi_chu) {
        await api.updateOrderItem(orderId, line.line_id, { ghi_chu: note });
      }
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã cập nhật',
        message: `${line.ten_mon} đã được cập nhật.`
      });
      
      setEditDialog({ open: false, line: null });
      fetchData();
    } catch (error) {
      console.error('Error updating line:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi cập nhật',
        message: error.message || 'Không thể cập nhật món này.'
      });
    }
  };

  const handleDeleteLine = async (line) => {
    console.log('Deleting line:', { 
      orderId, 
      lineId_used: line.line_id,
      lineId_field: line.line_id,
      id_field: line.id,
      full_line: line 
    });
    
    if (!confirm(`Xóa ${line.ten_mon}?`)) return;
    
    try {
      const actualLineId = line.line_id || line.id;
      console.log('Calling API with lineId:', actualLineId);
      await api.removeOrderItem(orderId, actualLineId);
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã xóa món',
        message: `${line.ten_mon} đã được xóa khỏi đơn.`
      });
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error deleting line:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi xóa món',
        message: error.message || 'Không thể xóa món này.'
      });
    }
  };

  const handleChangeLineStatus = async (line, newStatus) => {
    try {
      await api.updateOrderItemStatus(orderId, line.line_id, newStatus);
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Cập nhật trạng thái',
        message: `${line.ten_mon} → ${newStatus}`
      });
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error updating line status:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi cập nhật',
        message: error.message || 'Không thể cập nhật trạng thái.'
      });
    }
  };

  // Memoize groupTablesByArea để tránh re-render
  const tablesByArea = useMemo(() => {
    if (!availableTables || availableTables.length === 0) return {};
    return groupTablesByArea(availableTables);
  }, [availableTables]);

  // Handlers cho khuyến mãi
  const handleApplyPromo = useCallback(async () => {
    if (!promoCode.trim() || applyingPromo) return;
    
    setApplyingPromo(true);
    try {
      await api.applyPromoCode(orderId, promoCode.trim());
      setPromoCode('');
      await fetchMoneySummary();
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Áp mã thành công',
        message: `Mã ${promoCode.trim()} đã được áp dụng.`
      });
    } catch (error) {
      console.error('Error applying promo:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi áp mã',
        message: error.message || 'Không thể áp dụng mã này.'
      });
    } finally {
      setApplyingPromo(false);
    }
  }, [orderId, promoCode, onShowToast, fetchMoneySummary]);

  const handleRemovePromo = useCallback(async (promoId) => {
    try {
      await api.removePromotion(orderId, promoId);
      await fetchMoneySummary();
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã xóa khuyến mãi',
        message: 'Mã khuyến mãi đã được gỡ bỏ.'
      });
    } catch (error) {
      console.error('Error removing promo:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi xóa mã',
        message: error.message || 'Không thể xóa mã này.'
      });
    }
  }, [orderId, onShowToast, fetchMoneySummary]);

  const handleApplyManualDiscount = useCallback(async () => {
    const amount = parseInt(manualDiscountAmount, 10);
    if (isNaN(amount) || amount < 0) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Số tiền không hợp lệ',
        message: 'Vui lòng nhập số tiền giảm giá hợp lệ.'
      });
      return;
    }

    try {
      await api.setManualDiscount(orderId, amount, manualDiscountNote || null);
      await fetchMoneySummary();
      setShowDiscountDialog(false);
      setManualDiscountAmount('');
      setManualDiscountNote('');
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã giảm giá',
        message: `Giảm ${amount.toLocaleString()}đ cho đơn này.`
      });
    } catch (error) {
      console.error('Error applying manual discount:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi giảm giá',
        message: error.message || 'Không thể giảm giá.'
      });
    }
  }, [orderId, manualDiscountAmount, manualDiscountNote, onShowToast, fetchMoneySummary]);

  // Fetch available promotions
  const handleShowPromotions = useCallback(async () => {
    setShowPromotionsDialog(true);
    setLoadingPromotions(true);
    
    try {
      const res = await api.getActivePromotions();
      const promos = res?.data || res || [];
      setAvailablePromotions(promos);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi tải khuyến mãi',
        message: error.message || 'Không thể tải danh sách khuyến mãi.'
      });
    } finally {
      setLoadingPromotions(false);
    }
  }, [onShowToast]);

  // Apply promo from suggestions
  const handleApplyPromoFromList = useCallback(async (code) => {
    try {
      await api.applyPromoCode(orderId, code);
      await fetchMoneySummary();
      setShowPromotionsDialog(false);
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Áp mã thành công',
        message: `Mã ${code} đã được áp dụng.`
      });
    } catch (error) {
      console.error('Error applying promo:', error);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi áp mã',
        message: error.message || 'Không thể áp dụng mã này.'
      });
    }
  }, [orderId, onShowToast, fetchMoneySummary]);

  if (!open) return null;

  const panel = (
    <div className="h-full bg-white shadow-2xl p-4 flex flex-col" style={{ width }}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {localOrder?.order_type === 'TAKEAWAY' ? 'Mang đi' : `Bàn ${localOrder?.ban_id}`} – Đơn #{orderId}
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isPaid 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isPaid ? 'PAID' : (localOrder?.status || localOrder?.trang_thai || 'OPEN')}
            </span>
          </div>
          {shift && (
            <div className="mt-1 text-xs text-gray-500">
              Thu ngân: <b>{shift.nhan_vien?.full_name}</b> • {new Date(shift.started_at).toLocaleTimeString()}
            </div>
          )}
        </div>
        <button 
          onClick={handleClose} 
          className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors text-amber-700 hover:text-amber-800 ml-2 outline-none focus:outline-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isPaid && (
        <div className="mx-0 mb-2 rounded-xl bg-green-50 text-green-700 px-3 py-2 text-sm">
          Đơn đã thanh toán. Không thể thêm/sửa món.
        </div>
      )}

      <div className="mt-4 flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-2 text-gray-500 text-sm">Đang tải...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2 p-2">
            {items.map((line) => (
              <LineItemWithOptions
                key={line.line_id}
                line={line}
                orderStatus={localOrder?.trang_thai || localOrder?.status}
                onEdit={handleEditLine}
                onDelete={handleDeleteLine}
                onChangeStatus={handleChangeLineStatus}
                userRole="cashier"
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm">Chưa có món nào</p>
            <p className="text-xs text-gray-400 mt-1">Thêm món từ menu bên trái</p>
          </div>
        )}
      </div>

      <div className="mt-3 border-t pt-2.5 shrink-0 overflow-y-auto" style={{ maxHeight: '40vh' }}>
        {/* Trạng thái tổng quan */}
        {items.length > 0 && (
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="text-gray-500">{items.length} ly:</span>
            {items.filter(i => i.trang_thai_che_bien === 'QUEUED').length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {items.filter(i => i.trang_thai_che_bien === 'QUEUED').length} chờ
              </span>
            )}
            {items.filter(i => i.trang_thai_che_bien === 'MAKING').length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {items.filter(i => i.trang_thai_che_bien === 'MAKING').length} làm
              </span>
            )}
            {items.filter(i => i.trang_thai_che_bien === 'DONE').length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                {items.filter(i => i.trang_thai_che_bien === 'DONE').length} xong
              </span>
            )}
          </div>
        )}

        {/* Khuyến mãi - riêng */}
        {!isPaid ? (
          <div className="mb-2">
            <button
              onClick={() => setShowPromoSection(!showPromoSection)}
              className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors text-sm font-medium text-amber-700 outline-none focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Khuyến mãi & Giảm giá
                {(promotions.length > 0 || (moneySummary?.manual_discount > 0)) ? (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-600 text-white rounded-full">
                    {promotions.length + (moneySummary?.manual_discount > 0 ? 1 : 0)}
                  </span>
                ) : null}
              </div>
              <svg className={`w-4 h-4 transition-transform ${showPromoSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className={`mt-2 p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-2 ${showPromoSection ? '' : 'hidden'}`}>
              {/* Nút gợi ý khuyến mãi */}
              <button
                onClick={handleShowPromotions}
                className="w-full px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-2 border-purple-200 rounded-lg text-sm font-semibold text-purple-700 transition-all outline-none focus:outline-none flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                💡 Gợi ý mã khuyến mãi
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleApplyPromo()}
                  placeholder="Mã KM..."
                  disabled={applyingPromo}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim() || applyingPromo}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors outline-none focus:outline-none"
                >
                  {applyingPromo ? '...' : 'Áp'}
                </button>
              </div>

              <div className="space-y-1">
                {promotions.map((promo) => (
                  <div key={promo.promo_id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-green-700">{promo.ma}</span>
                      <span className="text-xs text-green-600">-{promo.so_tien_giam?.toLocaleString()}đ</span>
                    </div>
                    <button
                      onClick={() => handleRemovePromo(promo.promo_id)}
                      className="text-red-600 hover:text-red-700 outline-none focus:outline-none"
                      title="Xóa"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowDiscountDialog(true)}
                className="w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs font-medium text-blue-700 transition-colors outline-none focus:outline-none"
              >
                💰 Giảm thủ công
              </button>
            </div>
          </div>
        ) : null}

        {/* Đổi bàn - riêng (chỉ DINE_IN) */}
        {!isPaid && order?.order_type !== 'TAKEAWAY' ? (
          <div className="mb-3">
            <button
              onClick={() => setShowMoveTable(!showMoveTable)}
              className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-sm font-medium text-blue-700 outline-none focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Đổi bàn
              </div>
              <svg className={`w-4 h-4 transition-transform ${showMoveTable ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`mt-2 p-3 bg-blue-50/50 rounded-lg border border-blue-200 ${showMoveTable ? '' : 'hidden'}`}>
              {loadingTables ? (
                <div className="flex items-center justify-center py-3 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Đang tải...
                </div>
              ) : availableTables.length === 0 ? (
                <div className="py-3 text-center text-xs text-gray-500">
                  Không có bàn trống
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={moveTableId}
                    onChange={(e) => setMoveTableId(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-blue-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn bàn --</option>
                    {Object.entries(tablesByArea).map(([areaName, tables]) => (
                      <optgroup key={areaName} label={areaName}>
                        {(tables || []).map(table => (
                          <option key={table.id} value={table.id}>
                            {table.ten_ban} ({table.suc_chua} chỗ)
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={handleMoveTable}
                    disabled={!moveTableId}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 text-xs font-medium transition-colors outline-none focus:outline-none"
                  >
                    Đổi
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
        
        {/* Tổng tiền chi tiết */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 border-2 border-amber-200 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Tạm tính:</span>
            <span className="font-semibold text-gray-900">
              {(moneySummary?.subtotal_after_lines || summary?.subtotal || 0).toLocaleString()}đ
            </span>
          </div>
          
          {moneySummary?.promo_total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700">Giảm KM:</span>
              <span className="font-semibold text-green-600">
                -{moneySummary.promo_total.toLocaleString()}đ
              </span>
            </div>
          )}
          
          {moneySummary?.manual_discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">Giảm thủ công:</span>
              <span className="font-semibold text-blue-600">
                -{moneySummary.manual_discount.toLocaleString()}đ
              </span>
            </div>
          )}
          
          {moneySummary?.service_fee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Phí dịch vụ:</span>
              <span className="font-semibold text-gray-900">
                +{moneySummary.service_fee.toLocaleString()}đ
              </span>
            </div>
          )}
          
          {moneySummary?.vat_amount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">VAT ({moneySummary.vat_rate}%):</span>
              <span className="font-semibold text-gray-900">
                +{moneySummary.vat_amount.toLocaleString()}đ
              </span>
            </div>
          )}
          
          <div className="pt-2 border-t-2 border-amber-300 flex items-center justify-between">
            <span className="font-bold text-amber-900">Tổng cộng:</span>
            <span className="font-bold text-amber-600 text-2xl">
              {(moneySummary?.grand_total || summary?.subtotal || 0).toLocaleString()}đ
            </span>
          </div>
        </div>

        {/* Payment Section - Multi-tender payments */}
        {!isPaid && items.length > 0 && (
          <div className="mt-4">
            <PaymentSection
              orderId={orderId}
              onPaymentComplete={async () => {
                await fetchOrderInfo();
                await reloadTables?.();
                onShowToast?.({
                  show: true,
                  type: 'success',
                  title: 'Thanh toán hoàn tất!',
                  message: 'Đơn hàng đã được thanh toán đủ.'
                });
              }}
              onShowToast={onShowToast}
            />
          </div>
        )}

        {/* Action button - Chỉ nút Hủy đơn */}
        {!isPaid && (
          <div className="mt-3">
            <button
              onClick={() => setShowCancelDialog(true)}
              className="w-full bg-gradient-to-r from-red-50 to-red-100 text-red-700 py-3 px-3 rounded-xl border border-red-200 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-sm hover:from-red-100 hover:to-red-200 hover:border-red-300 hover:shadow-md outline-none focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Hủy đơn
            </button>
          </div>
        )}

        {/* Paid status */}
        {isPaid && (
          <div className="mt-3 bg-green-100 border-2 border-green-300 rounded-xl p-4 flex items-center justify-center gap-2">
            <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-lg font-bold text-green-700">Đã thanh toán</span>
          </div>
        )}
      </div>
    </div>
  );

  const cancelDialog = showCancelDialog && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowCancelDialog(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Hủy đơn hàng
              </h3>
              <p className="text-gray-600 text-center text-sm leading-relaxed">
                Bạn có chắc chắn muốn hủy đơn hàng này?<br/>
                <span className="text-red-600 font-medium">Hành động này không thể hoàn tác.</span>
              </p>
            </div>
            
            {/* Order Info Card */}
            <div className="mx-6 mb-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Đơn hàng:</span>
                    <span className="font-bold text-gray-900">#{order?.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Bàn:</span>
                    <span className="font-bold text-gray-900">
                      {order?.ban_id ? `Bàn ${order.ban_id}` : 'Mang đi'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Tạm tính:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {summary?.subtotal?.toLocaleString()}₫
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reason Input */}
            <div className="px-6 mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Lý do hủy đơn <span className="text-gray-400 font-normal">(tùy chọn)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn..."
                className="w-full px-4 py-3 border-2 border-red-200 bg-red-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-colors"
                rows={3}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="px-6 pb-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 hover:shadow-md outline-none focus:outline-none"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] outline-none focus:outline-none"
                >
                  Xác nhận hủy
                </button>
              </div>
            </div>
          </div>
        </div>
  );

  // Dialog danh sách khuyến mãi
  const promotionsDialog = showPromotionsDialog && (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPromotionsDialog(false)} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">🏷️ Khuyến mãi có thể áp dụng</h3>
              <p className="text-gray-600 text-sm">Chọn mã phù hợp để giảm giá cho đơn hàng</p>
            </div>
            <button
              onClick={() => setShowPromotionsDialog(false)}
              className="p-2 hover:bg-purple-100 rounded-full transition-colors outline-none focus:outline-none"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingPromotions ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải khuyến mãi...</p>
              </div>
            </div>
          ) : availablePromotions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-gray-500 font-medium">Không có khuyến mãi nào đang hoạt động</p>
              <p className="text-gray-400 text-sm mt-1">Vui lòng quay lại sau</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availablePromotions.map((promo) => {
                const currentTotal = moneySummary?.subtotal_after_lines || summary?.subtotal || 0;
                const minAmount = promo.don_hang_toi_thieu || 0;
                const canApply = currentTotal >= minAmount;
                const alreadyApplied = promotions.some(p => p.ma === promo.ma);
                
                return (
                  <div 
                    key={promo.id}
                    className={`border-2 rounded-2xl p-4 transition-all ${
                      alreadyApplied 
                        ? 'bg-green-50 border-green-300' 
                        : canApply 
                          ? 'bg-white border-purple-200 hover:border-purple-400 hover:shadow-lg' 
                          : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Mã và giảm giá */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1.5 rounded-lg font-bold text-base ${
                            alreadyApplied 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          }`}>
                            {promo.ma}
                          </span>
                          <span className="text-2xl font-bold text-orange-600">
                            -{promo.giam_gia?.toLocaleString()}đ
                          </span>
                        </div>
                        
                        {/* Mô tả */}
                        <p className="text-gray-700 font-medium mb-2">
                          {promo.mo_ta || 'Giảm giá đặc biệt'}
                        </p>
                        
                        {/* Điều kiện */}
                        <div className="space-y-1 text-sm">
                          {minAmount > 0 && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              Đơn tối thiểu: <span className="font-semibold">{minAmount.toLocaleString()}đ</span>
                            </div>
                          )}
                          
                          {promo.so_lan_da_dung !== undefined && promo.so_lan_toi_da && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Đã dùng: {promo.so_lan_da_dung}/{promo.so_lan_toi_da}
                            </div>
                          )}
                          
                          {promo.valid_from && promo.valid_to && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(promo.valid_from).toLocaleDateString('vi-VN')} - {new Date(promo.valid_to).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                        
                        {/* Trạng thái */}
                        {!canApply && minAmount > 0 && (
                          <div className="mt-2 text-xs text-red-600 font-medium">
                            ⚠️ Cần thêm {(minAmount - currentTotal).toLocaleString()}đ để đạt điều kiện
                          </div>
                        )}
                        
                        {alreadyApplied && (
                          <div className="mt-2 text-xs text-green-700 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Đã áp dụng cho đơn này
                          </div>
                        )}
                      </div>
                      
                      {/* Nút áp dụng */}
                      <button
                        onClick={() => handleApplyPromoFromList(promo.ma)}
                        disabled={!canApply || alreadyApplied}
                        className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all outline-none focus:outline-none whitespace-nowrap ${
                          alreadyApplied
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : canApply
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {alreadyApplied ? 'Đã áp' : 'Áp dụng'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => setShowPromotionsDialog(false)}
            className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors outline-none focus:outline-none"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  // Dialog giảm giá thủ công
  const discountDialog = showDiscountDialog && (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDiscountDialog(false)} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Giảm giá thủ công</h3>
          <p className="text-gray-600 text-sm">Áp dụng giảm giá trực tiếp cho đơn hàng này</p>
        </div>
        
        <div className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số tiền giảm (đ)
            </label>
            <input
              type="number"
              value={manualDiscountAmount}
              onChange={(e) => setManualDiscountAmount(e.target.value)}
              placeholder="Nhập số tiền..."
              className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lý do <span className="text-gray-400 font-normal">(tùy chọn)</span>
            </label>
            <textarea
              value={manualDiscountNote}
              onChange={(e) => setManualDiscountNote(e.target.value)}
              placeholder="VD: Voucher giấy, khách quen..."
              className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDiscountDialog(false);
                setManualDiscountAmount('');
                setManualDiscountNote('');
              }}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors outline-none focus:outline-none"
            >
              Hủy
            </button>
            <button
              onClick={handleApplyManualDiscount}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all hover:shadow-lg outline-none focus:outline-none"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (docked) {
    return (
      <>
        <div className="fixed inset-y-0 right-0 z-40 pointer-events-none">
          <div className="h-full pointer-events-auto">
            {panel}
          </div>
        </div>
        {cancelDialog}
        {promotionsDialog}
        {discountDialog}
        
        <EditOptionsDialog
          open={editDialog.open}
          line={editDialog.line}
          onClose={() => setEditDialog({ open: false, line: null })}
          onConfirm={handleConfirmEdit}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-black/30" onClick={handleClose} />
        {panel}
      </div>
      {cancelDialog}
      {promotionsDialog}
      {discountDialog}
      
      <EditOptionsDialog
        open={editDialog.open}
        line={editDialog.line}
        onClose={() => setEditDialog({ open: false, line: null })}
        onConfirm={handleConfirmEdit}
      />
    </>
  );
}