// src/services/exportService.js
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ExportService {
  // ========== EXCEL EXPORT ==========
  
  async exportRevenueToExcel(data, filters) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Coffee Shop POS';
    workbook.created = new Date();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Tổng Quan');
    summarySheet.columns = [
      { header: 'Chỉ Tiêu', key: 'metric', width: 30 },
      { header: 'Giá Trị', key: 'value', width: 20 }
    ];

    summarySheet.addRows([
      { metric: 'Khoảng Thời Gian', value: `${filters.startDate} - ${filters.endDate}` },
      { metric: 'Tổng Doanh Thu', value: data.totalRevenue || 0 },
      { metric: 'Doanh Thu Tại Bàn', value: data.dineInRevenue || 0 },
      { metric: 'Doanh Thu Mang Đi', value: data.takeawayRevenue || 0 },
      { metric: 'Tổng Đơn Hàng', value: data.totalOrders || 0 },
      { metric: 'Đơn Trung Bình', value: data.averageOrder || 0 }
    ]);

    // Format currency for rows 2-6
    for (let i = 2; i <= 6; i++) {
      summarySheet.getCell(`B${i}`).numFmt = '#,##0 ₫';
    }
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sheet 2: Details
    if (data.details && data.details.length > 0) {
      const detailSheet = workbook.addWorksheet('Chi Tiết Theo Ngày');
      detailSheet.columns = [
        { header: 'Ngày', key: 'date', width: 15 },
        { header: 'Doanh Thu', key: 'revenue', width: 18 },
        { header: 'Tại Bàn', key: 'dineIn', width: 18 },
        { header: 'Mang Đi', key: 'takeaway', width: 18 },
        { header: 'Số Đơn', key: 'orders', width: 12 },
        { header: 'Trung Bình/Đơn', key: 'average', width: 18 }
      ];

      detailSheet.addRows(data.details);
      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Format currency columns
      detailSheet.getColumn('revenue').numFmt = '#,##0 ₫';
      detailSheet.getColumn('dineIn').numFmt = '#,##0 ₫';
      detailSheet.getColumn('takeaway').numFmt = '#,##0 ₫';
      detailSheet.getColumn('average').numFmt = '#,##0 ₫';
    }

    return workbook;
  }

  async exportProfitToExcel(data, filters) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Coffee Shop POS';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Tổng Quan Lợi Nhuận');
    summarySheet.columns = [
      { header: 'Chỉ Tiêu', key: 'metric', width: 30 },
      { header: 'Giá Trị', key: 'value', width: 20 }
    ];

    summarySheet.addRows([
      { metric: 'Khoảng Thời Gian', value: `${filters.startDate} - ${filters.endDate}` },
      { metric: 'Tổng Doanh Thu', value: data.totalRevenue || 0 },
      { metric: 'Tổng Chi Phí', value: data.totalCost || 0 },
      { metric: 'Lợi Nhuận Gộp', value: data.grossProfit || 0 },
      { metric: 'Tỷ Lệ Lợi Nhuận (%)', value: data.profitMargin || 0 }
    ]);

    // Format currency
    for (let i = 2; i <= 4; i++) {
      summarySheet.getCell(`B${i}`).numFmt = '#,##0 ₫';
    }
    summarySheet.getCell('B5').numFmt = '0.00"%"';
    
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    if (data.details && data.details.length > 0) {
      const detailSheet = workbook.addWorksheet('Chi Tiết Theo Sản Phẩm');
      detailSheet.columns = [
        { header: 'Sản Phẩm', key: 'product', width: 35 },
        { header: 'Số Lượng', key: 'quantity', width: 12 },
        { header: 'Doanh Thu', key: 'revenue', width: 18 },
        { header: 'Chi Phí', key: 'cost', width: 18 },
        { header: 'Lợi Nhuận', key: 'profit', width: 18 },
        { header: 'Tỷ Suất LN (%)', key: 'margin', width: 15 }
      ];

      const rows = data.details.map(item => ({
        ...item,
        margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(2) : 0
      }));

      detailSheet.addRows(rows);
      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      detailSheet.getColumn('revenue').numFmt = '#,##0 ₫';
      detailSheet.getColumn('cost').numFmt = '#,##0 ₫';
      detailSheet.getColumn('profit').numFmt = '#,##0 ₫';
      detailSheet.getColumn('margin').numFmt = '0.00"%"';
      
      // Color coding for profit
      detailSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const profitCell = row.getCell(5);
          if (profitCell.value < 0) {
            profitCell.font = { color: { argb: 'FFFF0000' } };
          } else {
            profitCell.font = { color: { argb: 'FF00AA00' } };
          }
        }
      });
    }

    return workbook;
  }

  async exportProductsToExcel(data, filters) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Coffee Shop POS';
    
    const sheet = workbook.addWorksheet('Báo Cáo Sản Phẩm');
    
    // Add title
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = `Báo Cáo Sản Phẩm (${filters.startDate} - ${filters.endDate})`;
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // Headers
    sheet.getRow(2).values = ['Sản Phẩm', 'Danh Mục', 'Số Lượng Bán', 'Doanh Thu', 'Giá Trung Bình'];
    sheet.getRow(2).font = { bold: true };
    sheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    sheet.columns = [
      { key: 'name', width: 35 },
      { key: 'category', width: 20 },
      { key: 'quantity', width: 15 },
      { key: 'revenue', width: 18 },
      { key: 'avgPrice', width: 18 }
    ];

    if (data.products && data.products.length > 0) {
      data.products.forEach(product => {
        sheet.addRow(product);
      });
      
      // Format currency
      for (let i = 3; i <= data.products.length + 2; i++) {
        sheet.getCell(`D${i}`).numFmt = '#,##0 ₫';
        sheet.getCell(`E${i}`).numFmt = '#,##0 ₫';
      }
    }

    return workbook;
  }

  async exportPromotionsToExcel(data, filters) {
    const workbook = new ExcelJS.Workbook();
    
    const sheet = workbook.addWorksheet('Báo Cáo Khuyến Mãi');
    
    // Add title
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = `Báo Cáo Khuyến Mãi (${filters.startDate} - ${filters.endDate})`;
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    sheet.getRow(2).values = ['Tên Khuyến Mãi', 'Loại', 'Số Lần Dùng', 'Tổng Giảm Giá'];
    sheet.getRow(2).font = { bold: true };
    sheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    sheet.columns = [
      { key: 'name', width: 35 },
      { key: 'type', width: 20 },
      { key: 'usageCount', width: 15 },
      { key: 'totalDiscount', width: 20 }
    ];

    if (data.promotions && data.promotions.length > 0) {
      data.promotions.forEach(promo => {
        sheet.addRow(promo);
      });
      
      for (let i = 3; i <= data.promotions.length + 2; i++) {
        sheet.getCell(`D${i}`).numFmt = '#,##0 ₫';
      }
    }

    return workbook;
  }

  async exportCustomersToExcel(data, filters) {
    const workbook = new ExcelJS.Workbook();
    
    const sheet = workbook.addWorksheet('Báo Cáo Khách Hàng');
    
    // Add title
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = `Báo Cáo Khách Hàng (${filters.startDate} - ${filters.endDate})`;
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    sheet.getRow(2).values = ['Khách Hàng/Bàn', 'Số Đơn', 'Tổng Chi Tiêu', 'Trung Bình/Đơn'];
    sheet.getRow(2).font = { bold: true };
    sheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    sheet.columns = [
      { key: 'name', width: 30 },
      { key: 'orderCount', width: 15 },
      { key: 'totalSpent', width: 20 },
      { key: 'avgOrder', width: 20 }
    ];

    if (data.customers && data.customers.length > 0) {
      data.customers.forEach(customer => {
        sheet.addRow(customer);
      });
      
      for (let i = 3; i <= data.customers.length + 2; i++) {
        sheet.getCell(`C${i}`).numFmt = '#,##0 ₫';
        sheet.getCell(`D${i}`).numFmt = '#,##0 ₫';
      }
    }

    return workbook;
  }

  // ========== PDF EXPORT ==========
  
  async createPDFReport(reportType, data, filters) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Register font for Vietnamese
    const fontPath = join(__dirname, '../fonts/Roboto-Regular.ttf');
    try {
      doc.registerFont('Roboto', fontPath);
      doc.font('Roboto');
    } catch (err) {
      console.warn('⚠️ Font file not found, using default font:', err.message);
      // PDFKit will use default font if registration fails
    }

    // Header
    doc.fontSize(20).text('BÁO CÁO COFFEE SHOP', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(this.getReportTitle(reportType), { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Từ ${filters.startDate} đến ${filters.endDate}`, { align: 'center' });
    doc.moveDown(1);

    // Content based on report type
    switch (reportType) {
      case 'revenue':
        this.addRevenuePDFContent(doc, data);
        break;
      case 'profit':
        this.addProfitPDFContent(doc, data);
        break;
      case 'products':
        this.addProductsPDFContent(doc, data);
        break;
      case 'promotions':
        this.addPromotionsPDFContent(doc, data);
        break;
      case 'customers':
        this.addCustomersPDFContent(doc, data);
        break;
    }

    // Footer
    doc.fontSize(8).text(
      `Tạo lúc: ${new Date().toLocaleString('vi-VN')}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    return doc;
  }

  addRevenuePDFContent(doc, data) {
    doc.fontSize(12).text('TỔNG QUAN:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Tổng Doanh Thu: ${this.formatCurrency(data.totalRevenue || 0)}`)
      .text(`  - Tại bàn: ${this.formatCurrency(data.dineInRevenue || 0)}`)
      .text(`  - Mang đi: ${this.formatCurrency(data.takeawayRevenue || 0)}`)
      .text(`Tổng Đơn Hàng: ${data.totalOrders || 0}`)
      .text(`Đơn Trung Bình: ${this.formatCurrency(data.averageOrder || 0)}`);
    
    if (data.details && data.details.length > 0) {
      doc.moveDown(1);
      doc.fontSize(12).text('CHI TIẾT THEO NGÀY:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);
      
      data.details.slice(0, 15).forEach((item, index) => {
        doc.text(`${item.date}: ${this.formatCurrency(item.revenue)} (${item.orders} đơn)`);
      });
    }
  }

  addProfitPDFContent(doc, data) {
    doc.fontSize(12).text('TỔNG QUAN:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Tổng Doanh Thu: ${this.formatCurrency(data.totalRevenue || 0)}`)
      .text(`Tổng Chi Phí: ${this.formatCurrency(data.totalCost || 0)}`)
      .text(`Lợi Nhuận Gộp: ${this.formatCurrency(data.grossProfit || 0)}`)
      .text(`Tỷ Lệ Lợi Nhuận: ${data.profitMargin || 0}%`);
    
    if (data.details && data.details.length > 0) {
      doc.moveDown(1);
      doc.fontSize(12).text('TOP SẢN PHẨM CÓ LỢI NHUẬN CAO:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);
      
      data.details.slice(0, 15).forEach((item, index) => {
        const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : 0;
        doc.text(`${index + 1}. ${item.product}: ${this.formatCurrency(item.profit)} (${margin}%)`);
      });
    }
  }

  addProductsPDFContent(doc, data) {
    doc.fontSize(12).text('TOP SẢN PHẨM BÁN CHẠY:', { underline: true });
    doc.moveDown(0.5);
    
    if (data.products && data.products.length > 0) {
      doc.fontSize(9);
      data.products.slice(0, 20).forEach((product, index) => {
        doc.text(
          `${index + 1}. ${product.name} (${product.category}): ${product.quantity} bán - ${this.formatCurrency(product.revenue)}`
        );
      });
      
      const totalRevenue = data.products.reduce((sum, p) => sum + p.revenue, 0);
      const totalQuantity = data.products.reduce((sum, p) => sum + p.quantity, 0);
      
      doc.moveDown(1);
      doc.fontSize(10);
      doc.text(`Tổng cộng: ${totalQuantity} sản phẩm - ${this.formatCurrency(totalRevenue)}`);
    }
  }

  addPromotionsPDFContent(doc, data) {
    doc.fontSize(12).text('HIỆU QUẢ KHUYẾN MÃI:', { underline: true });
    doc.moveDown(0.5);
    
    if (data.promotions && data.promotions.length > 0) {
      doc.fontSize(9);
      data.promotions.forEach((promo, index) => {
        doc.text(
          `${index + 1}. ${promo.name} (${promo.type}): ${promo.usageCount} lần - ${this.formatCurrency(promo.totalDiscount)}`
        );
      });
      
      const totalDiscount = data.promotions.reduce((sum, p) => sum + p.totalDiscount, 0);
      const totalUsage = data.promotions.reduce((sum, p) => sum + p.usageCount, 0);
      
      doc.moveDown(1);
      doc.fontSize(10);
      doc.text(`Tổng: ${totalUsage} lần sử dụng - Giảm ${this.formatCurrency(totalDiscount)}`);
    } else {
      doc.fontSize(10).text('Không có khuyến mãi được sử dụng trong kỳ này.');
    }
  }

  addCustomersPDFContent(doc, data) {
    doc.fontSize(12).text('TOP KHÁCH HÀNG/BÀN:', { underline: true });
    doc.moveDown(0.5);
    
    if (data.customers && data.customers.length > 0) {
      doc.fontSize(9);
      data.customers.slice(0, 20).forEach((customer, index) => {
        doc.text(
          `${index + 1}. ${customer.name}: ${customer.orderCount} đơn - ${this.formatCurrency(customer.totalSpent)} (TB: ${this.formatCurrency(customer.avgOrder)}/đơn)`
        );
      });
      
      const totalOrders = data.customers.reduce((sum, c) => sum + c.orderCount, 0);
      const totalSpent = data.customers.reduce((sum, c) => sum + c.totalSpent, 0);
      
      doc.moveDown(1);
      doc.fontSize(10);
      doc.text(`Tổng: ${totalOrders} đơn - ${this.formatCurrency(totalSpent)}`);
    }
  }

  // ========== CSV EXPORT ==========
  
  exportToCSV(data, columns) {
    const BOM = '\uFEFF';
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key] || '';
        return `"${value}"`;
      }).join(',')
    ).join('\n');
    
    return BOM + headers + '\n' + rows;
  }

  // ========== HELPERS ==========
  
  getReportTitle(reportType) {
    const titles = {
      revenue: 'BÁO CÁO DOANH THU',
      profit: 'BÁO CÁO LỢI NHUẬN',
      products: 'BÁO CÁO SẢN PHẨM',
      promotions: 'BÁO CÁO KHUYẾN MÃI',
      customers: 'BÁO CÁO KHÁCH HÀNG'
    };
    return titles[reportType] || 'BÁO CÁO';
  }

  formatCurrency(value) {
    return (value || 0).toLocaleString('vi-VN') + ' đ';
  }
}

export default new ExportService();
