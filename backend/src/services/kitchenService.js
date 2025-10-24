// src/services/kitchenService.js
import * as repo from '../repositories/kitchenRepository.js';
import { emitChange } from '../utils/eventBus.js';

/**
 * Get kitchen queue
 */
export async function getQueue({ areaId, tableId }) {
  return repo.fetchQueue({ areaId, tableId });
}

/**
 * Update line status (start/done/cancel)
 */
export async function updateLineStatus({ lineId, action, userId }) {
  const updated = await repo.updateLineTx({ lineId, action, userId });

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

