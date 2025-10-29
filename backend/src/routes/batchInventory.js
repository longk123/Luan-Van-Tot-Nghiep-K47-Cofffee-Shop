/**
 * =====================================================================
 * BATCH INVENTORY ROUTES
 * =====================================================================
 * 
 * Routes cho quản lý lô hàng
 * 
 */

import { Router } from 'express';
import batchInventoryController from '../controllers/batchInventoryController.js';
import { authRequired as auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Tất cả routes yêu cầu authentication và role manager/admin
const managerAuth = [auth, authorize(['manager', 'admin'])];

/**
 * GET /api/v1/batch-inventory/summary
 * Lấy tổng quan batch inventory
 */
router.get('/summary', managerAuth, batchInventoryController.getBatchSummary);

/**
 * GET /api/v1/batch-inventory/expiring
 * Lấy danh sách batch sắp hết hạn
 * Query params: ?days=30
 */
router.get('/expiring', managerAuth, batchInventoryController.getExpiringBatches);

/**
 * GET /api/v1/batch-inventory/report
 * Tạo báo cáo chi tiết batch inventory
 * Query params: ?ingredient_id=1&status=ACTIVE&days_threshold=30
 */
router.get('/report', managerAuth, batchInventoryController.getBatchInventoryReport);

/**
 * GET /api/v1/batch-inventory/ingredient/:ingredientId
 * Lấy danh sách batch của một nguyên liệu
 * Query params: ?include_empty=true
 */
router.get('/ingredient/:ingredientId', managerAuth, batchInventoryController.getBatchesByIngredient);

/**
 * GET /api/v1/batch-inventory/fefo/:ingredientId
 * Xem thứ tự xuất kho theo FEFO
 * Query params: ?quantity=100
 */
router.get('/fefo/:ingredientId', managerAuth, batchInventoryController.getFEFOOrder);

/**
 * GET /api/v1/batch-inventory/:batchId
 * Lấy chi tiết một batch
 */
router.get('/:batchId', managerAuth, batchInventoryController.getBatchById);

/**
 * PUT /api/v1/batch-inventory/:batchId/status
 * Cập nhật trạng thái batch (BLOCK/UNBLOCK)
 * Body: { status: 'BLOCKED', reason: 'Lý do' }
 */
router.put('/:batchId/status', managerAuth, batchInventoryController.updateBatchStatus);

export default router;

