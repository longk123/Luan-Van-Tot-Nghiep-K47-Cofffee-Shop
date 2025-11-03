// src/controllers/exportController.js
import { asyncHandler } from '../middleware/error.js';
import { BadRequest } from '../utils/httpErrors.js';
import exportService from '../services/exportService.js';
import analyticsService from '../services/analyticsService.js';
import { pool } from '../db.js';

class ExportController {
  // POST /api/v1/reports/export
  exportReport = asyncHandler(async (req, res) => {
    const { reportType, format, startDate, endDate, ...filters } = req.body;

    // Validate
    if (!reportType || !format) {
      throw new BadRequest('Missing reportType or format');
    }

    if (!['excel', 'pdf', 'csv'].includes(format)) {
      throw new BadRequest('Invalid format. Must be excel, pdf, or csv');
    }

    // Validate dates
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequest('Invalid date format. Use YYYY-MM-DD');
      }
      if (start > end) {
        throw new BadRequest('startDate must be before or equal to endDate');
      }
    }

    // Fetch data based on report type
    let data = {};
    const dateFilters = { startDate, endDate };

    switch (reportType) {
      case 'revenue':
        data = await this.getRevenueData(dateFilters);
        break;
      case 'profit':
        data = await this.getProfitData(dateFilters);
        break;
      case 'products':
        data = await this.getProductsData(dateFilters);
        break;
      case 'promotions':
        data = await this.getPromotionsData(dateFilters);
        break;
      case 'customers':
        data = await this.getCustomersData(dateFilters);
        break;
      default:
        throw new BadRequest('Invalid report type');
    }

    // Generate file based on format
    if (format === 'excel') {
      const workbook = await this.generateExcel(reportType, data, dateFilters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${Date.now()}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = await exportService.createPDFReport(reportType, data, dateFilters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${Date.now()}.pdf"`);
      doc.pipe(res);
      doc.end();
    } else if (format === 'csv') {
      const csv = this.generateCSV(reportType, data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${Date.now()}.csv"`);
      res.send(csv);
    }
  });

  // Helper methods to get data
  async getRevenueData(filters) {
    const { startDate, endDate } = filters;
    
    // Get revenue chart data
    const chartData = await analyticsService.getRevenueChart({ startDate, endDate });
    
    // Validate chart data structure
    if (!chartData || !chartData.datasets || chartData.datasets.length < 3) {
      throw new Error('Invalid chart data format from analytics service');
    }
    
    // Calculate totals
    const totalRevenue = chartData.datasets[0].data.reduce((sum, val) => sum + val, 0);
    const dineInRevenue = chartData.datasets[1].data.reduce((sum, val) => sum + val, 0);
    const takeawayRevenue = chartData.datasets[2].data.reduce((sum, val) => sum + val, 0);
    
    // Get order count
    const orderQuery = `
      SELECT COUNT(*) as total_orders
      FROM don_hang
      WHERE trang_thai = 'PAID'
        AND closed_at >= $1::date
        AND closed_at < ($2::date + interval '1 day')
    `;
    const orderResult = await pool.query(orderQuery, [startDate, endDate]);
    const totalOrders = parseInt(orderResult.rows[0].total_orders) || 0;
    
    // Build details array
    const details = chartData.labels.map((label, index) => ({
      date: label,
      revenue: chartData.datasets[0].data[index],
      dineIn: chartData.datasets[1].data[index],
      takeaway: chartData.datasets[2].data[index],
      orders: Math.floor(chartData.datasets[0].data[index] / (totalRevenue / totalOrders || 1)),
      average: Math.floor(chartData.datasets[0].data[index] / (totalOrders / chartData.labels.length || 1))
    }));
    
    return {
      totalRevenue,
      dineInRevenue,
      takeawayRevenue,
      totalOrders,
      averageOrder: totalOrders > 0 ? Math.floor(totalRevenue / totalOrders) : 0,
      details
    };
  }

  async getProfitData(filters) {
    const { startDate, endDate } = filters;
    
    // Query profit data
    const query = `
      WITH order_items AS (
        SELECT 
          dh.id as order_id,
          dh.closed_at,
          dhct.id as item_id,
          dhct.ten_mon,
          dhct.so_luong,
          dhct.don_gia,
          COALESCE(dhct.giam_gia, 0) as giam_gia,
          (dhct.so_luong * dhct.don_gia - COALESCE(dhct.giam_gia, 0)) as revenue,
          COALESCE(
            (SELECT SUM(tc.so_luong * nl.gia_nhap)
             FROM don_hang_chi_tiet_tuy_chon tc
             JOIN nguyen_lieu nl ON tc.nguyen_lieu_id = nl.id
             WHERE tc.don_hang_chi_tiet_id = dhct.id),
            0
          ) as cost
        FROM don_hang dh
        JOIN don_hang_chi_tiet dhct ON dh.id = dhct.don_hang_id
        WHERE dh.trang_thai = 'PAID'
          AND dh.closed_at >= $1::date
          AND dh.closed_at < ($2::date + interval '1 day')
      )
      SELECT 
        ten_mon as product,
        SUM(so_luong) as quantity,
        SUM(revenue) as revenue,
        SUM(cost) as cost,
        SUM(revenue - cost) as profit
      FROM order_items
      GROUP BY ten_mon
      ORDER BY profit DESC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.revenue || 0), 0);
    const totalCost = result.rows.reduce((sum, row) => sum + parseFloat(row.cost || 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0;
    
    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      details: result.rows.map(row => ({
        product: row.product,
        quantity: parseInt(row.quantity),
        revenue: parseFloat(row.revenue),
        cost: parseFloat(row.cost),
        profit: parseFloat(row.profit)
      }))
    };
  }

  async getProductsData(filters) {
    const { startDate, endDate } = filters;
    
    const query = `
      SELECT 
        dhct.ten_mon as name,
        m.danh_muc as category,
        SUM(dhct.so_luong) as quantity,
        SUM(dhct.so_luong * dhct.don_gia - COALESCE(dhct.giam_gia, 0)) as revenue,
        AVG(dhct.don_gia) as avgPrice
      FROM don_hang dh
      JOIN don_hang_chi_tiet dhct ON dh.id = dhct.don_hang_id
      LEFT JOIN mon m ON dhct.ten_mon = m.ten
      WHERE dh.trang_thai = 'PAID'
        AND dh.closed_at >= $1::date
        AND dh.closed_at < ($2::date + interval '1 day')
      GROUP BY dhct.ten_mon, m.danh_muc
      ORDER BY quantity DESC
      LIMIT 100
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    
    return {
      products: result.rows.map(row => ({
        name: row.name,
        category: row.category || 'Chưa phân loại',
        quantity: parseInt(row.quantity),
        revenue: parseFloat(row.revenue),
        avgPrice: parseFloat(row.avgprice)
      }))
    };
  }

  async getPromotionsData(filters) {
    const { startDate, endDate } = filters;
    
    const query = `
      SELECT 
        km.ten as name,
        km.loai as type,
        COUNT(dhkm.id) as usageCount,
        SUM(dhkm.so_tien_giam) as totalDiscount
      FROM don_hang_khuyen_mai dhkm
      JOIN khuyen_mai km ON dhkm.khuyen_mai_id = km.id
      JOIN don_hang dh ON dhkm.don_hang_id = dh.id
      WHERE dh.trang_thai = 'PAID'
        AND dh.closed_at >= $1::date
        AND dh.closed_at < ($2::date + interval '1 day')
      GROUP BY km.ten, km.loai
      ORDER BY totalDiscount DESC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    
    return {
      promotions: result.rows.map(row => ({
        name: row.name,
        type: row.type === 'PERCENT' ? 'Phần trăm' : 'Tiền mặt',
        usageCount: parseInt(row.usagecount),
        totalDiscount: parseFloat(row.totaldiscount)
      }))
    };
  }

  async getCustomersData(filters) {
    const { startDate, endDate } = filters;
    
    const query = `
      SELECT 
        COALESCE(b.ten, 'Khách lẻ') as name,
        COUNT(DISTINCT dh.id) as orderCount,
        SUM(
          (SELECT SUM(dhct.so_luong * dhct.don_gia - COALESCE(dhct.giam_gia, 0))
           FROM don_hang_chi_tiet dhct
           WHERE dhct.don_hang_id = dh.id)
        ) as totalSpent
      FROM don_hang dh
      LEFT JOIN ban b ON dh.ban_id = b.id
      WHERE dh.trang_thai = 'PAID'
        AND dh.closed_at >= $1::date
        AND dh.closed_at < ($2::date + interval '1 day')
      GROUP BY b.ten
      ORDER BY totalSpent DESC
      LIMIT 100
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    
    return {
      customers: result.rows.map(row => ({
        name: row.name,
        orderCount: parseInt(row.ordercount),
        totalSpent: parseFloat(row.totalspent),
        avgOrder: parseFloat(row.totalspent) / parseInt(row.ordercount)
      }))
    };
  }

  // Generate functions
  async generateExcel(reportType, data, filters) {
    switch (reportType) {
      case 'revenue':
        return await exportService.exportRevenueToExcel(data, filters);
      case 'profit':
        return await exportService.exportProfitToExcel(data, filters);
      case 'products':
        return await exportService.exportProductsToExcel(data, filters);
      case 'promotions':
        return await exportService.exportPromotionsToExcel(data, filters);
      case 'customers':
        return await exportService.exportCustomersToExcel(data, filters);
      default:
        throw new BadRequest('Invalid report type');
    }
  }

  generateCSV(reportType, data) {
    const columns = this.getCSVColumns(reportType);
    const rows = this.getCSVData(reportType, data);
    return exportService.exportToCSV(rows, columns);
  }

  getCSVColumns(reportType) {
    const columnsMap = {
      revenue: [
        { header: 'Ngày', key: 'date' },
        { header: 'Doanh Thu', key: 'revenue' },
        { header: 'Số Đơn', key: 'orders' }
      ],
      profit: [
        { header: 'Sản Phẩm', key: 'product' },
        { header: 'Doanh Thu', key: 'revenue' },
        { header: 'Chi Phí', key: 'cost' },
        { header: 'Lợi Nhuận', key: 'profit' }
      ],
      products: [
        { header: 'Sản Phẩm', key: 'name' },
        { header: 'Số Lượng', key: 'quantity' },
        { header: 'Doanh Thu', key: 'revenue' }
      ],
      promotions: [
        { header: 'Khuyến Mãi', key: 'name' },
        { header: 'Số Lần Dùng', key: 'usageCount' },
        { header: 'Tổng Giảm', key: 'totalDiscount' }
      ],
      customers: [
        { header: 'Khách Hàng', key: 'name' },
        { header: 'Số Đơn', key: 'orderCount' },
        { header: 'Tổng Chi', key: 'totalSpent' }
      ]
    };
    return columnsMap[reportType] || [];
  }

  getCSVData(reportType, data) {
    switch (reportType) {
      case 'revenue':
        return data.details || [];
      case 'profit':
        return data.details || [];
      case 'products':
        return data.products || [];
      case 'promotions':
        return data.promotions || [];
      case 'customers':
        return data.customers || [];
      default:
        return [];
    }
  }
}

export default new ExportController();
