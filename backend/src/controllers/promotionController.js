// backend/src/controllers/promotionController.js
import promotionService from '../services/promotionService.js';
import { asyncHandler } from '../middleware/error.js';

class PromotionController {
  // GET /api/v1/promotions
  listPromotions = asyncHandler(async (req, res) => {
    const { status, type, search, timeRange, startDate, endDate } = req.query;
    console.log('🔍 Promotion filter params:', { status, type, search, timeRange, startDate, endDate });
    const promotions = await promotionService.getAllPromotions({ 
      status, 
      type, 
      search, 
      timeRange, 
      startDate, 
      endDate 
    });
    console.log('✅ Found promotions:', promotions.length);
    res.json({ success: true, data: promotions });
  });

  // GET /api/v1/promotions/:id
  getPromotion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const promotion = await promotionService.getPromotionById(parseInt(id));
    res.json({ success: true, data: promotion });
  });

  // POST /api/v1/promotions
  createPromotion = asyncHandler(async (req, res) => {
    const promotion = await promotionService.createPromotion(req.body);
    res.status(201).json({ success: true, data: promotion });
  });

  // PUT /api/v1/promotions/:id
  updatePromotion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const promotion = await promotionService.updatePromotion(parseInt(id), req.body);
    res.json({ success: true, data: promotion });
  });

  // DELETE /api/v1/promotions/:id
  deletePromotion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await promotionService.deletePromotion(parseInt(id));
    res.json({ success: true, message: 'Promotion deleted successfully' });
  });

  // PATCH /api/v1/promotions/:id/toggle-active
  toggleActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;
    const promotion = await promotionService.toggleActive(parseInt(id), active);
    res.json({ success: true, data: promotion });
  });

  // GET /api/v1/promotions/:id/stats
  getStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const stats = await promotionService.getPromotionStats(parseInt(id), startDate, endDate);
    res.json({ success: true, data: stats });
  });

  // GET /api/v1/promotions/:id/usage
  getUsageHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    console.log('🔍 Controller getUsageHistory called with:', { id, page, limit });
    const history = await promotionService.getUsageHistory(parseInt(id), parseInt(page), parseInt(limit));
    console.log('📦 Controller history result:', history);
    console.log('📦 History data count:', history.data?.length || 0);
    // Return history.data directly to match frontend expectation
    res.json({ success: true, data: history.data || [] });
  });

  // GET /api/v1/promotions/summary
  getSummary = asyncHandler(async (req, res) => {
    const { date } = req.query;
    const summary = await promotionService.getSummary(date);
    res.json({ success: true, data: summary });
  });
}

export default new PromotionController();
