// src/services/kitchenService.js
import * as repo from '../repositories/kitchenRepository.js';
import { emitChange } from '../utils/eventBus.js';
import { getMyOpenShift } from '../repositories/shiftsRepository.js';

/**
 * Get kitchen queue
 */
export async function getQueue({ areaId, tableId }) {
  return repo.fetchQueue({ areaId, tableId });
}

/**
 * Update line status (start/done/cancel)
 * Yêu cầu: User phải có ca KITCHEN đang mở
 */
export async function updateLineStatus({ lineId, action, userId, reason = null }) {
  // Kiểm tra user có ca KITCHEN đang mở không
  const openShift = await getMyOpenShift(userId);
  
  if (!openShift) {
    throw new Error('Bạn chưa mở ca. Vui lòng mở ca trước khi làm món.');
  }
  
  if (openShift.shift_type !== 'KITCHEN') {
    throw new Error('Bạn phải mở ca KITCHEN để làm món. Ca hiện tại của bạn là: ' + openShift.shift_type);
  }
  
  const updated = await repo.updateLineTx({ lineId, action, userId, reason });

  // Emit realtime events
  emitChange('order.items.changed', { orderId: updated.don_hang_id });
  emitChange('kitchen.line.updated', { lineId, status: updated.trang_thai_che_bien });

  return updated;
}

/**
 * Get completed items (for monitoring)
 */
export async function getCompleted({ limit = 20 }) {
  return repo.fetchCompleted({ limit });
}

