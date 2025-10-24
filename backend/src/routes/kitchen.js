// src/routes/kitchen.js
import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import * as kitchenController from '../controllers/kitchenController.js';

const router = Router();

// GET /api/v1/kitchen/queue - Hàng đợi bếp (QUEUED/MAKING)
router.get('/queue', authRequired, kitchenController.getQueue);

// PATCH /api/v1/kitchen/lines/:id - Cập nhật trạng thái món
router.patch('/lines/:id', authRequired, kitchenController.updateLineStatus);

// GET /api/v1/kitchen/completed - Danh sách món đã hoàn thành
router.get('/completed', authRequired, kitchenController.getCompleted);

export default router;

