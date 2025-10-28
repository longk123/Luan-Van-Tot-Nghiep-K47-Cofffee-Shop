/**
 * Routes: Inventory Management
 */

import express from 'express';
import * as inventoryCtrl from '../controllers/inventoryController.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// Tất cả routes yêu cầu authentication
router.use(authRequired);

/**
 * GET /api/v1/inventory/check
 * Check đủ nguyên liệu để làm món
 * Query: ?mon_id=1&bien_the_id=2&so_luong=5&tuy_chon_ids[]=1&tuy_chon_ids[]=2
 */
router.get('/check', inventoryCtrl.checkIngredients);

/**
 * GET /api/v1/inventory/calculate-cost
 * Tính giá vốn động theo size và % đường/đá
 * Query: ?mon_id=1&bien_the_id=2&tuy_chon_ids=2,5
 */
router.get('/calculate-cost', inventoryCtrl.calculateCost);

/**
 * GET /api/v1/inventory/warnings
 * Lấy cảnh báo tồn kho (hết hàng, sắp hết)
 */
router.get('/warnings', inventoryCtrl.getWarnings);

/**
 * GET /api/v1/inventory/export-history
 * Lịch sử xuất kho
 * Query: ?don_hang_id=100&from_date=2025-10-01&to_date=2025-10-31&limit=50
 */
router.get('/export-history', inventoryCtrl.getExportHistory);

/**
 * GET /api/v1/inventory/import-history
 * Lịch sử nhập kho
 * Query: ?from_date=2025-10-01&to_date=2025-10-31&limit=50
 */
router.get('/import-history', inventoryCtrl.getImportHistory);

/**
 * GET /api/v1/inventory/report
 * Báo cáo xuất nhập tồn
 * Query: ?from_date=2025-10-01&to_date=2025-10-31
 */
router.get('/report', inventoryCtrl.getInventoryReport);

/**
 * GET /api/v1/inventory/ingredients
 * Danh sách tất cả nguyên liệu
 */
router.get('/ingredients', inventoryCtrl.getIngredients);

/**
 * GET /api/v1/inventory/ingredients/:id
 * Chi tiết nguyên liệu
 */
router.get('/ingredients/:id', inventoryCtrl.getIngredientById);

/**
 * POST /api/v1/inventory/import
 * Nhập kho mới
 * Body: { nguyen_lieu_id, so_luong, don_gia, nha_cung_cap, ghi_chu }
 */
router.post('/import', inventoryCtrl.importInventory);

export default router;
