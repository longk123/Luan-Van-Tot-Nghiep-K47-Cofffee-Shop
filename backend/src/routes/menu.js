// src/routes/menu.js
import express from 'express';
import Joi from 'joi';
import service from '../services/menuService.js';
import * as menuOptionsCtrl from '../controllers/menuOptionsController.js';

const router = express.Router();

// GET /api/v1/menu/categories
router.get('/categories', async (req, res, next) => {
  try {
    const data = await service.categories();
    res.json({ data });
  } catch (e) { next(e); }
});

// GET /api/v1/menu/categories/:id/items
router.get('/categories/:id/items', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const categoryId = id === 0 ? null : id; // 0 means "all categories"
    const data = await service.itemsByCategory(categoryId);
    res.json({ data });
  } catch (e) { next(e); }
});

// GET /api/v1/menu/items/:id (kèm variants)
router.get('/items/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await service.item(id);
    res.json({ data });
  } catch (e) { next(e); }
});

// GET /api/v1/menu/search?keyword=... (updated to use keyword)
router.get('/search', async (req, res, next) => {
  try {
    const keyword = req.query.keyword || '';
    const data = await service.searchItems(keyword);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

// ✅ NEW: GET /api/v1/menu/items/:id/variants
router.get('/items/:id/variants', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    const data = await service.variants(id);
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// ===== ENDPOINTS MỚI CHO OPTIONS (SUGAR, ICE, ...) =====

// GET /api/v1/menu/options
// Lấy danh sách tất cả nhóm tùy chọn (SUGAR, ICE, ...)
router.get('/options', menuOptionsCtrl.listOptionGroups);

// GET /api/v1/menu/options/:optId/levels
// Lấy các mức của 1 nhóm tùy chọn (0%, 30%, 50%, 70%, 100%)
router.get('/options/:optId/levels', menuOptionsCtrl.listOptionLevels);

// GET /api/v1/menu/items/:monId/options
// Lấy các nhóm tùy chọn áp dụng cho món cụ thể
router.get('/items/:monId/options', menuOptionsCtrl.listOptionGroupsForMon);

export default router;