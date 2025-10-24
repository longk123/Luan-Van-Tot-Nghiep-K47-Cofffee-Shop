// File path: D:\my-thesis\backend\src\routes\pos.js
// src/routes/pos.js
import { Router } from 'express';
import Joi from 'joi';
import * as service from '../services/posService.js';
import repo from '../repositories/posRepository.js';
import { authRequired as auth } from '../middleware/auth.js';
import { emitChange } from '../utils/eventBus.js';

// Import controllers mới cho per-cup items & options
import * as posItemsCtrl from '../controllers/posItemsController.js';
import * as menuOptionsCtrl from '../controllers/menuOptionsController.js';
import * as posPromotionsCtrl from '../controllers/posPromotionsController.js';

const router = Router();

// GET /api/v1/pos/tables?area_id=1
router.get('/tables', auth, async (req, res, next) => {
  try {
    const areaId = req.query.area_id ? Number(req.query.area_id) : null;
    const data = await service.default.getTables(areaId);
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/menu/categories
router.get('/menu/categories', auth, async (req, res, next) => {
  try {
    const data = await service.default.getMenuCategories();
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/menu/categories/:id/items
router.get('/menu/categories/:id/items', auth, async (req, res, next) => {
  try {
    const categoryId = req.params.id === '0' ? null : Number(req.params.id);
    const data = await service.default.getMenuByCategory(categoryId);
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/menu/items/:id/variants
router.get('/menu/items/:id/variants', auth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    const data = await service.default.getMenuItemVariants(id);
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/menu/search?keyword=...
router.get('/menu/search', auth, async (req, res, next) => {
  try {
    const keyword = req.query.keyword || '';
    const data = await service.default.getMenuByCategory(null).then(items => 
      items.filter(item => 
        item.ten.toLowerCase().includes(keyword.toLowerCase()) ||
        item.ma.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// POST /api/v1/pos/orders (tạo đơn mang đi)
// body: { order_type: 'TAKEAWAY', nhan_vien_id, ca_lam_id? }
router.post('/orders', auth, async (req, res, next) => {
  try {
    const schema = Joi.object({
      order_type: Joi.string().valid('TAKEAWAY').default('TAKEAWAY'),
      nhan_vien_id: Joi.number().integer(),
      ca_lam_id: Joi.number().integer().allow(null),
    });
    const { order_type, nhan_vien_id, ca_lam_id } = await schema.validateAsync(req.body || {});
    const order = await service.default.createOrderNoTable({
      nhanVienId: nhan_vien_id ?? req.user?.user_id, 
      caLamId: ca_lam_id ?? null
    });
    res.status(201).json({ ok: true, data: order });
  } catch (e) { next(e); }
});

// POST /api/v1/pos/orders/:banId
// body: { nhan_vien_id, ca_lam_id? }
router.post('/orders/:banId', auth, async (req, res, next) => {
  try {
    const banId = Number(req.params.banId);
    const schema = Joi.object({
      nhan_vien_id: Joi.number().integer(),
      ca_lam_id: Joi.number().integer().allow(null),
    });
    const { nhan_vien_id, ca_lam_id } = await schema.validateAsync(req.body || {});
    const order = await service.default.openOrGetOrder({
      banId, nhanVienId: nhan_vien_id ?? req.user?.user_id, caLamId: ca_lam_id ?? null
    });
    res.status(201).json({ ok: true, data: order });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/orders/:orderId/items
router.get('/orders/:orderId/items', async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const items = await service.default.getOrderItems(orderId);
    res.json({ ok: true, data: items });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/orders/:orderId/summary
router.get('/orders/:orderId/summary', async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const summary = await service.default.getOrderSummary(orderId);
    res.json({ ok: true, data: summary });
  } catch (e) { next(e); }
});

// POST /api/v1/pos/orders/:orderId/items
// Hỗ trợ 2 cách:
//   A) { mon_id, bien_the_id?, so_luong, don_gia?, giam_gia? } - tách thành N line
//   B) { mon_id, bien_the_id?, cups: [{tuy_chon:{SUGAR:0.7, ICE:0.5}, ghi_chu:"..."}, ...] }
router.post('/orders/:orderId/items', posItemsCtrl.addOrderItems);

// POST /api/v1/pos/orders/:orderId/confirm - Xác nhận đơn (PENDING → QUEUED)
router.post('/orders/:orderId/confirm', auth, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const result = await service.default.confirmOrder(orderId);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/takeaway-orders - Danh sách đơn mang đi chưa hoàn tất
router.get('/takeaway-orders', auth, async (req, res, next) => {
  try {
    const data = await service.default.getTakeawayOrders();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// POST /api/v1/pos/orders/:orderId/deliver - Giao hàng (đánh dấu hoàn tất)
router.post('/orders/:orderId/deliver', auth, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const result = await service.default.deliverOrder(orderId);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// PATCH /api/v1/pos/orders/:orderId/items/:lineId
// Cho phép sửa: bien_the_id?, so_luong?, don_gia?, giam_gia?, ghi_chu?
// DB trigger chặn nếu line != QUEUED hoặc order = PAID
router.patch('/orders/:orderId/items/:lineId', posItemsCtrl.updateOrderItem);

// DELETE /api/v1/pos/orders/:orderId/items/:lineId
// DB trigger chặn nếu line != QUEUED hoặc order = PAID
router.delete('/orders/:orderId/items/:lineId', posItemsCtrl.deleteOrderItem);

// ===== ENDPOINTS MỚI CHO PER-CUP OPTIONS & STATUS =====

// GET /api/v1/pos/orders/:orderId/items-ext
// Lấy chi tiết items kèm options (từ view v_open_order_items_detail_ext)
router.get('/orders/:orderId/items-ext', posItemsCtrl.getOrderItemsExtended);

// GET /api/v1/pos/orders/:orderId/items-with-addons
// Lấy chi tiết items kèm topping pricing (từ view v_open_order_items_with_addons)
router.get('/orders/:orderId/items-with-addons', posItemsCtrl.getOrderItemsWithAddons);

// PUT /api/v1/pos/orders/:orderId/items/:lineId/options
// Body: { "SUGAR": 0.7, "ICE": 0.5, "TOPPING_FLAN": {"so_luong": 2} }
// Lưu/ghi đè tùy chọn cho từng ly (hỗ trợ cả PERCENT và AMOUNT)
router.put('/orders/:orderId/items/:lineId/options', posItemsCtrl.upsertOrderItemOptions);

// PATCH /api/v1/pos/orders/:orderId/items/:lineId/status
// Body: { trang_thai_che_bien: 'MAKING'|'DONE'|'CANCELLED', maker_id? }
// Cập nhật trạng thái chế biến từng ly
router.patch('/orders/:orderId/items/:lineId/status', posItemsCtrl.updateOrderItemStatus);

// ===== ENDPOINTS CHO MENU OPTIONS & TOPPINGS =====

// GET /api/v1/pos/menu/options
// Lấy tất cả nhóm tùy chọn (SUGAR, ICE, TOPPING_FLAN, ...)
router.get('/menu/options', menuOptionsCtrl.listOptionGroups);

// GET /api/v1/pos/menu/options/:optId/levels
// Lấy các mức cho option PERCENT (0%, 30%, 50%, ...)
router.get('/menu/options/:optId/levels', menuOptionsCtrl.listOptionLevels);

// GET /api/v1/pos/menu/items/:monId/options
// Lấy các options áp dụng cho món cụ thể
router.get('/menu/items/:monId/options', menuOptionsCtrl.listOptionGroupsForMon);

// GET /api/v1/pos/menu/items/:monId/toppings?bien_the_id=X
// Lấy danh sách topping (AMOUNT) kèm giá cho món/biến thể
router.get('/menu/items/:monId/toppings', menuOptionsCtrl.listToppingsForMonOrVariant);

// ===== ENDPOINTS CHO KHUYẾN MÃI & GIẢM GIÁ =====

// GET /api/v1/pos/promotions?active=1
// Lấy danh sách chương trình khuyến mãi
router.get('/promotions', posPromotionsCtrl.listActivePromotions);

// GET /api/v1/pos/orders/:orderId/promotions
// Lấy các KM đang áp dụng cho đơn
router.get('/orders/:orderId/promotions', posPromotionsCtrl.listOrderPromotions);

// POST /api/v1/pos/orders/:orderId/apply-promo
// Áp mã khuyến mãi: { code: "GIAM10", applied_by?: userId }
router.post('/orders/:orderId/apply-promo', posPromotionsCtrl.applyPromotionByCode);

// DELETE /api/v1/pos/orders/:orderId/promotions/:promoId
// Xóa khuyến mãi khỏi đơn
router.delete('/orders/:orderId/promotions/:promoId', posPromotionsCtrl.removePromotion);

// PATCH /api/v1/pos/orders/:orderId/discount
// Giảm giá thủ công: { amount, note, by }
router.patch('/orders/:orderId/discount', posPromotionsCtrl.setManualDiscount);

// GET /api/v1/pos/orders/:orderId/money-summary
// Lấy tổng tiền chi tiết (subtotal, KM, phí, VAT, grand total)
router.get('/orders/:orderId/money-summary', posPromotionsCtrl.getOrderMoneySummary);

// POST /api/v1/pos/orders/:orderId/checkout (enhanced, keepSeated supported)
router.post('/orders/:orderId/checkout', auth, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { payment_method, keepSeated = false, note } = req.body || {};
    const data = await service.checkoutOrderService({
      orderId,
      payment_method,
      keepSeated,
      note,
      userId: req.user.user_id,
    });
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// GET /api/v1/pos/orders/:orderId/summary
router.get('/orders/:orderId/summary', async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const data = await service.default.orderSummary(orderId);
    res.json({ data });
  } catch (e) { next(e); }
});

export default router;

// === New POS routes (preserve old APIs) ===

// Create TAKEAWAY order (no table)
router.post('/orders', auth, async (req, res, next) => {
  try {
    const { order_type = 'TAKEAWAY' } = req.body || {};
    const userId = req.user.user_id;
    const order = await service.createOrderNoTableService({ order_type, userId });
    res.json({ ok: true, data: order });
  } catch (e) { next(e); }
});

// Move table for OPEN DINE_IN order
router.patch('/orders/:orderId/move-table', auth, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { to_table_id } = req.body || {};
    const data = await service.default.moveOrderTableService({
      orderId,
      toTableId: to_table_id,
      userId: req.user.user_id,
    });
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// PATCH /api/v1/pos/tables/:id/close
router.patch('/tables/:id/close', auth, async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.id, 10);
    const { to_status = 'TRONG' } = req.body || {};
    const data = await service.closeTableAfterPaidService({
      tableId,
      toStatus: to_status,
      userId: req.user.user_id,
    });
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/v1/pos/orders/:orderId/cancel
router.patch('/orders/:orderId/cancel', auth, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { reason = null } = req.body || {};
    const data = await service.cancelOrderService({
      orderId,
      userId: req.user.user_id,
      reason,
    });
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

// ===== QUẢN LÝ TRẠNG THÁI BÀN =====

// PATCH /api/v1/pos/tables/:id/status (TRỐNG <-> KHÓA)
router.patch('/tables/:id/status', auth, async (req, res, next) => {
  try {
    const tableId = Number(req.params.id);
    const { trang_thai, ghi_chu = null } = req.body;
    
    if (!['TRONG', 'KHOA'].includes(trang_thai)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Trạng thái bàn phải là TRONG hoặc KHOA' 
      });
    }
    
    // Nếu mở bàn, xóa ghi chú
    const note = trang_thai === 'KHOA' ? ghi_chu : null;
    const updated = await repo.setTableStatus(tableId, trang_thai, note);
    
    if (!updated) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Không tìm thấy bàn' 
      });
    }
    
    // Phát sự kiện realtime
    emitChange('table.updated', { banId: tableId, trang_thai });
    
    res.json({ ok: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/v1/pos/tables/:id/close (ĐANG_DÙNG -> TRỐNG/KHÓA)
router.patch('/tables/:id/close', auth, async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.id, 10);
    const { to_status = 'TRONG' } = req.body || {};
    
    if (!['TRONG', 'KHOA'].includes(to_status)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Trạng thái đích phải là TRONG hoặc KHOA' 
      });
    }
    
    const latest = await repo.getLatestOrderByTable(tableId);
    
    if (!latest || latest.trang_thai !== 'PAID') {
      return res.status(400).json({ 
        ok: false, 
        message: 'Bàn chưa thanh toán, không thể đổi trạng thái' 
      });
    }
    
    const updated = await repo.setTableStatus(tableId, to_status);
    
    if (!updated) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Không tìm thấy bàn' 
      });
    }
    
    // Phát sự kiện realtime
    emitChange('table.updated', { banId: tableId, trang_thai: to_status });
    
    res.json({ ok: true, data: updated });
  } catch (e) {
    next(e);
  }
});
