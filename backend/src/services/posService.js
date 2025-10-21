// src/services/posService.js
import * as repo from '../repositories/posRepository.js';
import { getMyOpenShift } from '../repositories/shiftsRepository.js';
import { emitChange } from '../utils/eventBus.js';

export default {
  async getTables(areaId) {
    return repo.default.getTablesWithSummary({ areaId });
  },

  // Mở (hoặc lấy) order OPEN cho 1 bàn
  async openOrGetOrder({ banId, nhanVienId, caLamId = null }) {
    // Nếu đã có order OPEN thì trả về luôn
    const exist = await repo.default.getOpenOrderByTable(banId);
    if (exist) return exist;

    // Nếu không truyền ca_lam_id thì tìm ca OPEN của nhân viên
    let caId = caLamId;
    if (!caId) {
      const ca = await getMyOpenShift(nhanVienId);
      if (!ca) {
        const err = new Error('Nhân viên chưa có ca OPEN.');
        err.status = 400; err.code = 'SHIFT_REQUIRED';
        throw err;
      }
      caId = ca.id;
    }

    // Đổi trạng thái bàn sang DANG_DUNG nếu đang TRONG
    await repo.default.setTableStatus(banId, 'DANG_DUNG');
    emitChange('table.updated', { banId, trang_thai: 'DANG_DUNG' });

    // Tạo order mới
    const order = await repo.default.createOrderWithTable({ banId, nhanVienId });
    emitChange('order.updated', { orderId: order.id, banId });
    return order;
  },

  async createOrderNoTable({ nhanVienId, caLamId }) {
    const order = await repo.default.createOrderNoTable({ nhanVienId, caLamId });
    emitChange('order.updated', { orderId: order.id });
    return order;
  },

  async getOrderItems(orderId) {
    return repo.default.getOrderItems(orderId);
  },

  async getOrderSummary(orderId) {
    return repo.default.getOrderSummary(orderId);
  },

  async addItem(orderId, payload) {
    const line = await repo.default.addItemToOrder({ orderId, ...payload });
    emitChange('order.items.changed', { orderId });
    return line;
  },

  async updateItem(lineId, payload) {
    const updated = await repo.default.updateItemQuantity({ itemId: lineId, soLuong: payload.so_luong });
    if (!updated) {
      const err = new Error('Không tìm thấy line món.');
      err.status = 404;
      throw err;
    }
    emitChange('order.items.changed', { orderId: updated.don_hang_id });
    return updated;
  },

  async removeItem(lineId) {
    const deleted = await repo.default.removeItemFromOrder(lineId);
    emitChange('order.items.changed', { orderId: deleted.don_hang_id });
    return deleted;
  },

  // Lấy menu theo category
  async getMenuByCategory(categoryId) {
    return repo.default.getMenuByCategory(categoryId);
  },

  // Lấy categories
  async getMenuCategories() {
    return repo.default.getMenuCategories();
  },

  // Lấy variants của món
  async getMenuItemVariants(monId) {
    return repo.default.getMenuItemVariants(monId);
  },

  // Di chuyển order sang bàn khác (hỗ trợ cả OPEN và PAID)
  async moveOrderTableService({ orderId, toTableId, userId }) {
    if (!Number.isInteger(orderId) || !Number.isInteger(toTableId)) {
      const err = new Error('orderId hoặc to_table_id không hợp lệ.');
      err.status = 400;
      throw err;
    }

    // Thực hiện đổi bàn
    const result = await repo.default.moveOrderToTable({ orderId, toTableId });

    // Phát SSE để frontend cập nhật realtime
    emitChange('order.updated', { 
      orderId: result.order_id, 
      banId: result.new_table_id,
      movedFrom: result.old_table_id 
    });
    
    // Cập nhật bàn cũ
    if (result.old_table_id) {
      emitChange('table.updated', { banId: result.old_table_id });
    }
    
    // Cập nhật bàn mới
    emitChange('table.updated', { banId: result.new_table_id });

    console.log(`[POS] Nhân viên ${userId} đổi đơn #${orderId} từ bàn ${result.old_table_id} → ${result.new_table_id}`);

    return result;
  }
};

export async function checkoutOrderService({ orderId, payment_method, keepSeated, note, userId }) {
  const data = await repo.default.checkoutOrder({ orderId, payment_method, keepSeated, note, userId });
  
  // Phát SSE để frontend cập nhật realtime
  emitChange('order.updated', { orderId, banId: data.ban_id, status: 'PAID' });

  // ✅ BỎ auto-set TRỐNG: sau thanh toán bàn vẫn "ĐANG_DÙNG"
  // Nhân viên sẽ thủ công bấm "Cho trống" hoặc "Khóa" khi khách rời bàn

  return data;
}

// === Close table after paid ===
export async function closeTableAfterPaidService({ tableId, toStatus = 'TRONG', userId }) {
  if (!Number.isInteger(tableId)) {
    const err = new Error('Thiếu tableId hợp lệ.');
    err.status = 400;
    throw err;
  }

  // Lấy order gần nhất của bàn
  const latest = await repo.default.getLatestOrderByTable(tableId);
  if (!latest) {
    const err = new Error('Không tìm thấy đơn hàng nào cho bàn này.');
    err.status = 404;
    throw err;
  }

  // Kiểm tra trạng thái
  const status = latest.status || latest.trang_thai;
  if (status !== 'PAID') {
    const err = new Error('Đơn hàng của bàn chưa được thanh toán.');
    err.status = 400;
    throw err;
  }

  // Đổi trạng thái bàn
  const updated = await repo.default.setTableStatus(tableId, toStatus);

  // Ghi log hoặc audit nếu cần
  console.log(`[POS] Nhân viên ${userId} đổi bàn #${tableId} → ${toStatus}`);

  // Phát SSE để frontend cập nhật realtime
  emitChange('table.updated', { banId: tableId, trang_thai: toStatus });

  return updated;
}

// === Cancel order (both TAKEAWAY & DINE_IN) ===
export async function cancelOrderService({ orderId, userId, reason = null }) {
  // 1️⃣ Lấy đơn hàng
  const order = await repo.default.getOrderById(orderId);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng.');
    err.status = 404;
    throw err;
  }

  // 2️⃣ Chỉ cho phép hủy nếu chưa thanh toán
  if (['PAID', 'CANCELLED'].includes(order.trang_thai)) {
    const err = new Error('Không thể hủy đơn đã thanh toán hoặc đã hủy.');
    err.status = 400;
    throw err;
  }

  // 3️⃣ Cập nhật trạng thái
  const updated = await repo.default.setOrderStatus(orderId, 'CANCELLED', reason);

  // 4️⃣ Nếu là đơn tại bàn → đổi trạng thái bàn
  if (order.ban_id) {
    await repo.default.setTableStatus(order.ban_id, 'TRONG');
    emitChange('table.updated', { banId: order.ban_id, trang_thai: 'TRONG' });
  }

  // 5️⃣ Phát sự kiện realtime
  emitChange('order.updated', { orderId, status: 'CANCELLED' });

  console.log(`[POS] Nhân viên ${userId} đã hủy đơn #${orderId}`);
  return updated;
}