// backend/src/routes/promotions.js
import { Router } from 'express';
import promotionController from '../controllers/promotionController.js';
import { authRequired } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// All routes require authentication and manager/admin role
router.use(authRequired);
router.use(authorize(['manager', 'admin']));

// Get summary (must be before /:id to avoid conflict)
router.get('/summary', promotionController.getSummary);

// CRUD operations
router.get('/', promotionController.listPromotions);
router.get('/:id', promotionController.getPromotion);
router.post('/', promotionController.createPromotion);
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

// Toggle active
router.patch('/:id/toggle-active', promotionController.toggleActive);

// Statistics
router.get('/:id/stats', promotionController.getStats);
router.get('/:id/usage', promotionController.getUsageHistory);

export default router;
