// src/controllers/shiftsController.js
import * as shiftsService from '../services/shiftsService.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * GET /api/v1/shifts/current
 * Lấy ca hiện tại của user đang đăng nhập
 */
export const getCurrentShift = asyncHandler(async (req, res) => {
  const data = await shiftsService.getCurrentShiftService(req.user.user_id);
  return res.json({ success: true, data });
});

/**
 * GET /api/v1/shifts/:id/summary
 * Lấy tổng quan/tóm tắt ca (live) - preview trước khi đóng
 */
export const getShiftSummary = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await shiftsService.getShiftSummary(id);
  return res.json({ success: true, data });
});

/**
 * POST /api/v1/shifts/open
 * Mở ca mới
 */
export const openShift = asyncHandler(async (req, res) => {
  const { opening_cash = 0 } = req.body || {};
  const data = await shiftsService.open({
    nhanVienId: req.user.user_id,
    openingCash: parseInt(opening_cash) || 0,
    openedBy: req.user.user_id
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

