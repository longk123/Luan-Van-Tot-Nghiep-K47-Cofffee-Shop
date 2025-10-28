// src/routes/shifts.js
import { Router } from 'express';
import Joi from 'joi';
import { authRequired as authMiddleware } from '../middleware/auth.js';
import { myOpen, open, close, getCurrentShiftService } from '../services/shiftsService.js';
import * as shiftsController from '../controllers/shiftsController.js';

const router = Router();

// GET /api/v1/shifts/my-open?nhan_vien_id=2
router.get('/my-open', async (req, res, next) => {
  try {
    const nhanVienId = Number(req.query.nhan_vien_id);
    if (!nhanVienId) return res.status(400).json({ error: 'nhan_vien_id is required' });
    const data = await myOpen(nhanVienId);
    res.json({ data });
  } catch (e) { next(e); }
});

// GET /api/v1/shifts/current - với auth middleware
router.get('/current', authMiddleware, async (req, res, next) => {
  try {
    const data = await getCurrentShiftService(req.user.user_id);
    return res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// GET /api/v1/shifts/open-cashier - Lấy ca CASHIER đang mở
router.get('/open-cashier', authMiddleware, shiftsController.getOpenCashierShift);

// POST /api/v1/shifts/open - Sử dụng controller mới với auth
router.post('/open', authMiddleware, shiftsController.openShift);

// POST /api/v1/shifts/:id/close
// { closing_cash?, note? }
router.post('/:id/close', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = Joi.object({
      closing_cash: Joi.number().integer().min(0).allow(null),
      note: Joi.string().allow('', null),
    });
    const { closing_cash, note } = await schema.validateAsync(req.body);
    const closed = await close(id, { closingCash: closing_cash, note });
    res.json({ shift: closed });
  } catch (e) { next(e); }
});

// ============================================
// NEW ENHANCED SHIFT ENDPOINTS
// ============================================

// GET /api/v1/shifts/:id/summary - Tóm tắt ca (live preview)
router.get('/:id/summary', authMiddleware, shiftsController.getShiftSummary);

// POST /api/v1/shifts/:id/close-enhanced - Đóng ca với thống kê đầy đủ
router.post('/:id/close-enhanced', authMiddleware, shiftsController.closeShift);

// GET /api/v1/shifts/:id/report - Báo cáo chi tiết
router.get('/:id/report', authMiddleware, shiftsController.getShiftReport);

// GET /api/v1/shifts/:id/report.pdf - Xuất PDF (TODO)
router.get('/:id/report.pdf', authMiddleware, shiftsController.exportShiftReportPDF);

// POST /api/v1/shifts/:id/force-close - Force đóng ca (chuyển đơn OPEN sang ca sau)
router.post('/:id/force-close', authMiddleware, shiftsController.forceCloseShift);

// GET /api/v1/shifts/:id/transferred-orders - Lấy danh sách đơn từ ca trước
router.get('/:id/transferred-orders', authMiddleware, shiftsController.getTransferredOrders);

export default router;
