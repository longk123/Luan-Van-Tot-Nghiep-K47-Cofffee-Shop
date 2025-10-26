import analyticsService from '../services/analyticsService.js';
import { asyncHandler } from '../middleware/error.js';

class AnalyticsController {
  /**
   * GET /api/v1/analytics/overview
   * Lấy KPI tổng quan cho Manager Dashboard
   */
  getOverviewKPIs = asyncHandler(async (req, res) => {
    const { date } = req.query;
    
    const kpis = await analyticsService.getOverviewKPIs(date);
    
    res.json({
      success: true,
      data: kpis
    });
  });

  /**
   * GET /api/v1/analytics/revenue-chart
   * Lấy dữ liệu biểu đồ doanh thu
   */
  getRevenueChart = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    
    const chartData = await analyticsService.getRevenueChart(parseInt(days));
    
    res.json({
      success: true,
      data: chartData
    });
  });

  /**
   * GET /api/v1/analytics/invoices
   * Lấy danh sách hóa đơn toàn thời gian
   */
  getAllInvoices = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      order_type,
      from_date,
      to_date,
      search
    } = req.query;
    
    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      orderType: order_type,
      fromDate: from_date,
      toDate: to_date,
      search
    };
    
    const result = await analyticsService.getAllInvoices(filters);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * GET /api/v1/analytics/top-menu-items
   * Lấy top món bán chạy
   */
  getTopMenuItems = asyncHandler(async (req, res) => {
    const { days = 7, limit = 10 } = req.query;
    
    const items = await analyticsService.getTopMenuItems(
      parseInt(days), 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: items
    });
  });

  /**
   * GET /api/v1/analytics/shift-stats
   * Lấy thống kê ca làm việc
   */
  getShiftStats = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    
    const shifts = await analyticsService.getShiftStats(parseInt(days));
    
    res.json({
      success: true,
      data: shifts
    });
  });
}

export default new AnalyticsController();
