// src/controllers/shiftsController.js
import * as shiftsService from '../services/shiftsService.js';
import { asyncHandler } from '../middleware/error.js';
import { emitEvent } from '../utils/sse.js';

/**
 * GET /api/v1/shifts/current
 * Lấy ca hiện tại của user đang đăng nhập
 */
export const getCurrentShift = asyncHandler(async (req, res) => {
  const data = await shiftsService.getCurrentShiftService(req.user.user_id);
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/shifts/open-cashier
 * Lấy ca CASHIER đang mở (bất kể user nào)
 */
export const getOpenCashierShift = asyncHandler(async (req, res) => {
  const data = await shiftsService.getOpenCashierShiftService();
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/shifts/:id/summary
 * Lấy tổng quan/tóm tắt ca (live) - preview trước khi đóng
 */
export const getShiftSummary = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.user_id; // Lấy userId từ authenticated user
  const data = await shiftsService.getShiftSummary(id, userId);
  return res.json({ success: true, data });
});

/**
 * POST /api/v1/shifts/open
 * Mở ca mới (tự động detect shift_type từ user role)
 */
export const openShift = asyncHandler(async (req, res) => {
  const { opening_cash = 0, shift_type } = req.body || {};
  
  // Tự động detect shift_type dựa vào role của user
  let detectedShiftType = shift_type || 'CASHIER';
  
  // Nếu user có role kitchen/barista → shift_type = KITCHEN
  if (req.user.roles && req.user.roles.some(role => 
    ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
  )) {
    detectedShiftType = 'KITCHEN';
  }
  
  // Nếu user chỉ có role waiter (không có cashier/manager/admin) → shift_type = WAITER
  const isWaiter = req.user.roles && req.user.roles.some(role => 
    role.toLowerCase() === 'waiter'
  ) && !req.user.roles.some(role => 
    ['cashier', 'manager', 'admin'].includes(role.toLowerCase())
  );
  
  if (isWaiter) {
    detectedShiftType = 'WAITER';
  }
  
  const data = await shiftsService.open({
    nhanVienId: req.user.user_id,
    openingCash: (detectedShiftType === 'CASHIER') ? (parseInt(opening_cash) || 0) : 0,
    openedBy: req.user.user_id,
    shiftType: detectedShiftType
  });
  
  // Emit SSE event
  emitEvent('shift.opened', {
    shiftId: data.id,
    shiftType: data.shift_type,
    userId: req.user.user_id
  });
  
  return res.status(201).json({ success: true, data });
});

/**
 * POST /api/v1/shifts/:id/close
 * Đóng ca với thống kê đầy đủ
 */
export const closeShift = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { actual_cash, note } = req.body || {};
  
  const data = await shiftsService.closeShiftEnhanced({
    shiftId: id,
    userId: req.user.user_id,
    actualCash: parseInt(actual_cash) ?? 0,
    note: note || null,
  });
  
  // Emit SSE event
  emitEvent('shift.closed', {
    shiftId: id,
    userId: req.user.user_id
  });
  
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/shifts/:id/report
 * Lấy báo cáo chi tiết ca (cho xuất PDF hoặc hiển thị)
 */
export const getShiftReport = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await shiftsService.getShiftReport(id);
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/shifts/:id/report.pdf
 * Xuất báo cáo ca dạng PDF (TODO: implement PDF generation)
 */
export const exportShiftReportPDF = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  // TODO: Implement PDF generation similar to invoice
  // For now, return JSON
  const data = await shiftsService.getShiftReport(id);
  
  res.setHeader('Content-Type', 'application/json');
  return res.json({ 
    success: true, 
    data,
    message: 'PDF generation coming soon. Use /report endpoint for JSON data.'
  });
});

/**
 * POST /api/v1/shifts/:id/force-close
 * Force đóng ca khi còn đơn OPEN - chuyển đơn sang ca tiếp theo
 */
export const forceCloseShift = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { actual_cash, note, transfer_orders = true } = req.body || {};
  
  const data = await shiftsService.forceCloseShift({
    shiftId: id,
    userId: req.user.user_id,
    actualCash: parseInt(actual_cash) ?? 0,
    note: note || null,
    transferOrders: transfer_orders !== false,
  });
  
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/shifts/:id/transferred-orders
 * Lấy danh sách đơn được chuyển từ ca trước
 */
export const getTransferredOrders = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await shiftsService.getTransferredOrders(id);
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/shifts/:id/orders
 * Lấy danh sách đơn hàng của ca
 */
export const getShiftOrders = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await shiftsService.getShiftOrders(id);
  return res.json({ success: true, data });
});

