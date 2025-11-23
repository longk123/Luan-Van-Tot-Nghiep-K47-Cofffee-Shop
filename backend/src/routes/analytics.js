import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { managerOnly } from '../middleware/authorize.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication và quyền manager trở lên
router.use(authRequired);
router.use(managerOnly);

/**
 * @route GET /api/v1/analytics/overview
 * @desc Lấy KPI tổng quan cho Manager Dashboard
 * @access Manager, Admin
 */
router.get('/overview', analyticsController.getOverviewKPIs);

/**
 * @route GET /api/v1/analytics/revenue-chart
 * @desc Lấy dữ liệu biểu đồ doanh thu
 * @access Manager, Admin
 */
router.get('/revenue-chart', analyticsController.getRevenueChart);

/**
 * @route GET /api/v1/analytics/invoices
 * @desc Lấy danh sách hóa đơn toàn thời gian
 * @access Manager, Admin
 */
router.get('/invoices', analyticsController.getAllInvoices);

/**
 * @route GET /api/v1/analytics/top-menu-items
 * @desc Lấy top món bán chạy
 * @access Manager, Admin
 */
router.get('/top-menu-items', analyticsController.getTopMenuItems);

/**
 * @route GET /api/v1/analytics/shift-stats
 * @desc Lấy thống kê ca làm việc
 * @access Manager, Admin
 */
router.get('/shift-stats', analyticsController.getShiftStats);

/**
 * @route GET /api/v1/analytics/profit-report
 * @desc Lấy báo cáo lợi nhuận chi tiết (bao gồm giá vốn topping)
 * @access Manager, Admin
 */
router.get('/profit-report', analyticsController.getProfitReport);

/**
 * @route GET /api/v1/analytics/profit-chart
 * @desc Lấy biểu đồ lợi nhuận theo ngày
 * @access Manager, Admin
 */
router.get('/profit-chart', analyticsController.getProfitChart);

/**
 * @route GET /api/v1/analytics/profit-by-item
 * @desc Lấy phân tích lợi nhuận theo món
 * @access Manager, Admin
 */
router.get('/profit-by-item', analyticsController.getProfitByItem);

/**
 * @route GET /api/v1/analytics/profit-by-category
 * @desc Lấy phân tích lợi nhuận theo danh mục
 * @access Manager, Admin
 */
router.get('/profit-by-category', analyticsController.getProfitByCategory);

/**
 * @route GET /api/v1/analytics/profit-comparison
 * @desc So sánh lợi nhuận với kỳ trước
 * @access Manager, Admin
 */
router.get('/profit-comparison', analyticsController.getProfitComparison);

/**
 * @route GET /api/v1/analytics/orders-by-role
 * @desc Lấy thống kê đơn hàng theo role (waiter/shipper)
 * @access Manager, Admin
 */
router.get('/orders-by-role', analyticsController.getOrdersByRole);

export default router;
