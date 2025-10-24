// === src/api.js ===
// File path: D:\my-thesis\frontend\src\api.js
import { getToken, clearToken } from './auth.js';

const API_BASE = '/api/v1';

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const url = `${API_BASE}${path}`;
  console.log(`🌐 API Request: ${method} ${url}`);
  if (body) console.log('📦 Request body:', body);
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  console.log(`📡 Response status: ${res.status} ${res.statusText}`);
  
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    return;
  }
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    console.error('❌ API Error response:', data);
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  
  console.log('✅ API Success response:', data);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
  // Menu
  getCategories: () => request('GET', '/pos/menu/categories'),
  getAllItems: () => request('GET', '/pos/menu/categories/0/items'),
  getItemsByCategory: (id) => request('GET', `/pos/menu/categories/${id === null ? 0 : id}/items`),
  getVariantsByItem: (id) => request('GET', `/pos/menu/items/${id}/variants`), // fallback-friendly
  searchMenuItems: (keyword) => request('GET', `/pos/menu/search?keyword=${encodeURIComponent(keyword)}`),
  // POS
  createOrderForTable: (tableId) => request('POST', `/pos/orders/${tableId}`, {
    nhan_vien_id: 1, // TODO: Get from auth context
    ca_lam_id: null
  }),
  createTakeawayOrder: () => request('POST', '/pos/orders', { order_type: 'TAKEAWAY' }),
  getOrderItems: (orderId) => request('GET', `/pos/orders/${orderId}/items`),
  getOrderSummary: (orderId) => request('GET', `/pos/orders/${orderId}/summary`),
  addItemToOrder: (orderId, payload) => request('POST', `/pos/orders/${orderId}/items`, payload),
  updateOrderItemQty: (orderId, itemId, qty) => request('PATCH', `/pos/orders/${orderId}/items/${itemId}`, { so_luong: qty }),
  updateOrderItem: (orderId, itemId, payload) => request('PATCH', `/pos/orders/${orderId}/items/${itemId}`, payload),
  removeOrderItem: (orderId, itemId) => request('DELETE', `/pos/orders/${orderId}/items/${itemId}`),
  // Per-cup options & status
  getOrderItemsExtended: (orderId) => request('GET', `/pos/orders/${orderId}/items-ext`),
  upsertOrderItemOptions: (orderId, lineId, options) => request('PUT', `/pos/orders/${orderId}/items/${lineId}/options`, options),
  updateOrderItemStatus: (orderId, lineId, status, makerId = null) => request('PATCH', `/pos/orders/${orderId}/items/${lineId}/status`, { trang_thai_che_bien: status, maker_id: makerId }),
  moveOrderTable: (orderId, toTableId) => request('PATCH', `/pos/orders/${orderId}/move-table`, { to_table_id: toTableId }),
  checkoutOrder: (orderId, paymentMethod = 'CASH', keepSeated = false) => request('POST', `/pos/orders/${orderId}/checkout`, { payment_method: paymentMethod, keepSeated }),
  // Close table after paid
  closeTableAfterPaid: (tableId, toStatus = 'TRONG') => request('PATCH', `/pos/tables/${tableId}/close`, { to_status: toStatus }),
  // Cancel order
  cancelOrder: (orderId, reason = null) => request('PATCH', `/pos/orders/${orderId}/cancel`, { reason }),
  // Menu
  getMenuCategories: () => request('GET', '/pos/menu/categories'),
  getMenuItems: (categoryId) => request('GET', `/pos/menu/categories/${categoryId}/items`),
  getMenuItemVariants: (itemId) => request('GET', `/pos/menu/items/${itemId}/variants`),
  // Menu options (Sugar, Ice, ...)
  getMenuOptions: () => request('GET', '/pos/menu/options'),
  getOptionLevels: (optionId) => request('GET', `/pos/menu/options/${optionId}/levels`),
  getOptionGroupsForMon: (monId) => request('GET', `/pos/menu/items/${monId}/options`),
  // Topping với giá
  getToppingsForItem: (monId, bienTheId = null) => 
    request('GET', `/pos/menu/items/${monId}/toppings${bienTheId ? `?bien_the_id=${bienTheId}` : ''}`),
  // Items với addons (topping pricing)
  getOrderItemsWithAddons: (orderId) => request('GET', `/pos/orders/${orderId}/items-with-addons`),
  // Promotions & Discounts
  getActivePromotions: () => request('GET', '/pos/promotions?active=1'),
  getOrderPromotions: (orderId) => request('GET', `/pos/orders/${orderId}/promotions`),
  applyPromoCode: (orderId, code, appliedBy = null) => 
    request('POST', `/pos/orders/${orderId}/apply-promo`, { code, applied_by: appliedBy }),
  removePromotion: (orderId, promoId) => request('DELETE', `/pos/orders/${orderId}/promotions/${promoId}`),
  setManualDiscount: (orderId, amount, note, by = null) =>
    request('PATCH', `/pos/orders/${orderId}/discount`, { amount, note, by }),
  getOrderMoneySummary: (orderId) => request('GET', `/pos/orders/${orderId}/money-summary`),
  // Tables status management
  getPosTables: (areaId = null) => request('GET', `/pos/tables${areaId ? `?area_id=${areaId}` : ''}`),
  lockTable: (tableId, ghi_chu = null) => request('PATCH', `/pos/tables/${tableId}/status`, { trang_thai: 'KHOA', ghi_chu }),
  unlockTable: (tableId) => request('PATCH', `/pos/tables/${tableId}/status`, { trang_thai: 'TRONG', ghi_chu: null }),
  closeTableAfterPaid: (tableId, toStatus = 'TRONG') => request('PATCH', `/pos/tables/${tableId}/close`, { to_status: toStatus }),
  // Shifts
  // ===== SHIFTS / CA LÀM =====
  getMyOpenShift: () => request('GET', '/shifts/current'),
  getCurrentShift: () => request('GET', '/shifts/current'),
  getShiftSummary: (shiftId) => request('GET', `/shifts/${shiftId}/summary`),
  closeShiftEnhanced: (shiftId, data) => request('POST', `/shifts/${shiftId}/close-enhanced`, data),
  forceCloseShift: (shiftId, data) => request('POST', `/shifts/${shiftId}/force-close`, data),
  getShiftReport: (shiftId) => request('GET', `/shifts/${shiftId}/report`),
  
  // Aliases for compatibility
  getMenuCategoryItems: (categoryId) => request('GET', `/pos/menu/categories/${categoryId}/items`),
  getMenuOptionLevels: (optionId) => request('GET', `/pos/menu/options/${optionId}/levels`),
  getMenuItemToppings: (itemId) => request('GET', `/pos/menu/items/${itemId}/toppings`),
  createOrder: (payload) => {
    if (payload.ban_id) {
      return request('POST', `/pos/orders/${payload.ban_id}`, payload);
    } else {
      return request('POST', '/pos/orders', payload);
    }
  },
  addOrderItem: (orderId, payload) => request('POST', `/pos/orders/${orderId}/items`, payload),
  
  // === RESERVATIONS (ĐẶT BÀN) ===
  // Tạo đặt bàn mới
  createReservation: (data) => request('POST', '/reservations', data),
  // Lấy danh sách theo ngày
  getReservationsByDate: (date, status = null) => 
    request('GET', `/reservations?date=${date}${status ? `&status=${status}` : ''}`),
  // Chi tiết 1 đặt bàn
  getReservationDetail: (id) => request('GET', `/reservations/${id}`),
  // Cập nhật thông tin
  updateReservation: (id, data) => request('PATCH', `/reservations/${id}`, data),
  // Gán bàn
  assignTablesToReservation: (id, table_ids) => request('POST', `/reservations/${id}/tables`, { table_ids }),
  // Bỏ gán bàn
  unassignTableFromReservation: (id, tableId) => request('DELETE', `/reservations/${id}/tables/${tableId}`),
  // Xác nhận đặt bàn
  confirmReservation: (id) => request('POST', `/reservations/${id}/confirm`),
  // Check-in (tạo order)
  checkInReservation: (id, primary_table_id) => request('POST', `/reservations/${id}/check-in`, { primary_table_id }),
  // Hủy đặt bàn
  cancelReservation: (id, reason = null) => request('POST', `/reservations/${id}/cancel`, { reason }),
  // No-show
  markReservationNoShow: (id) => request('POST', `/reservations/${id}/no-show`),
  // Hoàn thành
  completeReservation: (id) => request('POST', `/reservations/${id}/complete`),
  // Tìm bàn trống
  searchAvailableTables: (start, end, areaId = null) => {
    // Clean areaId - không gửi NaN
    const cleanAreaId = (areaId && !isNaN(areaId)) ? areaId : null;
    const areaParam = cleanAreaId ? `&area=${cleanAreaId}` : '';
    return request('GET', `/reservations/available-tables?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}${areaParam}`);
  },
  // Đặt bàn sắp tới của 1 bàn
  getUpcomingReservation: (tableId, within = 60) => 
    request('GET', `/reservations/tables/${tableId}/upcoming?within=${within}`),
  
  // === PAYMENTS (THANH TOÁN ĐA PHƯƠNG THỨC) ===
  // Danh sách phương thức thanh toán
  getPaymentMethods: () => request('GET', '/payments/methods'),
  // Danh sách thanh toán của đơn
  getOrderPayments: (orderId) => request('GET', `/pos/orders/${orderId}/payments`),
  // Thu tiền (multi-tender)
  createPayment: (orderId, data) => request('POST', `/pos/orders/${orderId}/payments`, data),
  // Void payment
  voidPayment: (orderId, paymentId) => request('POST', `/pos/orders/${orderId}/payments/${paymentId}/void`),
  // Refund payment
  refundPayment: (orderId, paymentId, data) => request('POST', `/pos/orders/${orderId}/payments/${paymentId}/refund`, data),
  // Settlement (tổng tiền + còn phải trả)
  getOrderSettlement: (orderId) => request('GET', `/pos/orders/${orderId}/settlement`),
  
  // ===== INVOICE / IN HÓA ĐƠN =====
  // Lấy dữ liệu hóa đơn (JSON)
  getInvoiceData: (orderId) => request('GET', `/hoa-don/${orderId}`),
  // URL để xuất PDF (sử dụng trực tiếp trong window.open hoặc iframe)
  getInvoicePdfUrl: (orderId) => `/api/v1/hoa-don/${orderId}/pdf`,
  // Ghi log in hóa đơn
  logInvoicePrint: (orderId, data) => request('POST', `/hoa-don/${orderId}/print-log`, data),
  
  // ===== PAYOS PAYMENT GATEWAY =====
  // Tạo payment request với PayOS
  createPayOSPayment: (orderId, amount) => request('POST', '/payments/payos/create', { orderId, amount }),
  // Kiểm tra trạng thái payment
  checkPayOSStatus: (refCode) => request('GET', `/payments/payos/status/${refCode}`),
  
  // Xác nhận đơn (PENDING → QUEUED)
  confirmOrder: (orderId) => request('POST', `/pos/orders/${orderId}/confirm`),
  
  // ===== KITCHEN DISPLAY SYSTEM (KDS) =====
  // Lấy hàng đợi bếp/pha chế
  getKitchenQueue: ({ areaId, tableId } = {}) => {
    const params = new URLSearchParams();
    if (areaId) params.set('area_id', areaId);
    if (tableId) params.set('ban_id', tableId);
    return request('GET', `/kitchen/queue?${params.toString()}`);
  },
  // Cập nhật trạng thái món
  updateKitchenLine: (lineId, action) => request('PATCH', `/kitchen/lines/${lineId}`, { action }),
  // Lấy danh sách món đã hoàn thành
  getKitchenCompleted: (limit = 20) => request('GET', `/kitchen/completed?limit=${limit}`),
};
