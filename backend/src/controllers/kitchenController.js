// src/controllers/kitchenController.js
import * as kitchenService from '../services/kitchenService.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * GET /api/v1/kitchen/queue
 * Lấy hàng đợi bếp/pha chế
 */
export const getQueue = asyncHandler(async (req, res) => {
  const { area_id, ban_id } = req.query;
  
  const data = await kitchenService.getQueue({ 
    areaId: area_id ? parseInt(area_id) : null, 
    tableId: ban_id ? parseInt(ban_id) : null 
  });
  
  return res.json({ success: true, data });
});

/**
 * PATCH /api/v1/kitchen/lines/:id
 * Cập nhật trạng thái món (start/done/cancel)
 */
export const updateLineStatus = asyncHandler(async (req, res) => {
  const lineId = parseInt(req.params.id);
  const { action, reason = null } = req.body || {}; // 'start' | 'done' | 'cancel'
  
  if (!action || !['start', 'done', 'cancel'].includes(action)) {
    return res.status(400).json({ 
      success: false, 
      message: 'action must be: start, done, or cancel' 
    });
  }
  
  // Require reason when canceling
  if (action === 'cancel' && !reason) {
    return res.status(400).json({ 
      success: false, 
      message: 'Lý do hủy là bắt buộc' 
    });
  }
  
  const data = await kitchenService.updateLineStatus({ 
    lineId, 
    action, 
    userId: req.user.user_id,
    reason 
  });
  
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/kitchen/completed
 * Lấy danh sách món đã hoàn thành (2 giờ gần nhất)
 */
export const getCompleted = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  
  const data = await kitchenService.getCompleted({ limit });
  
  return res.json({ success: true, data });
});

