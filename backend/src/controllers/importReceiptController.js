// src/controllers/importReceiptController.js
import { pool } from '../db.js';
import PDFDocument from 'pdfkit';
import { asyncHandler } from '../middleware/error.js';
import { NotFound } from '../utils/httpErrors.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function money(v) {
  return (v ?? 0).toLocaleString('vi-VN') + ' đ';
}

async function fetchImportReceiptData(importId) {
  const sql = `
    SELECT 
      nk.id,
      nk.nguyen_lieu_id,
      nl.ma as nguyen_lieu_ma,
      nl.ten as nguyen_lieu_ten,
      nl.don_vi,
      nk.so_luong,
      nk.don_gia,
      nk.thanh_tien,
      nk.nha_cung_cap,
      nk.ghi_chu,
      nk.ngay_nhap,
      nk.nguoi_nhap_id,
      u.full_name as nguoi_nhap_ten
    FROM nhap_kho nk
    JOIN nguyen_lieu nl ON nl.id = nk.nguyen_lieu_id
    LEFT JOIN users u ON u.user_id = nk.nguoi_nhap_id
    WHERE nk.id = $1
  `;
  
  const { rows } = await pool.query(sql, [importId]);
  
  if (rows.length === 0) {
    throw new NotFound(`Không tìm thấy phiếu nhập #${importId}`);
  }
  
  return rows[0];
}

class ImportReceiptController {
  // GET /api/v1/phieu-nhap/:importId
  getImportReceiptData = asyncHandler(async (req, res) => {
    const importId = parseInt(req.params.importId);
    const data = await fetchImportReceiptData(importId);
    res.json({ success: true, data });
  });

  // GET /api/v1/phieu-nhap/:importId/pdf
  getImportReceiptPdf = asyncHandler(async (req, res) => {
    const importId = parseInt(req.params.importId);
    const data = await fetchImportReceiptData(importId);

    // Tạo PDF stream với font hỗ trợ tiếng Việt
    const doc = new PDFDocument({ 
      size: 'A5', 
      margin: 30
    });
    
    // Đăng ký và sử dụng font Roboto (hỗ trợ tiếng Việt đầy đủ)
    const fontPath = join(__dirname, '../fonts/Roboto-Regular.ttf');
    
    try {
      doc.registerFont('Roboto', fontPath);
    } catch (err) {
      console.warn('Font files not found, using default font');
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="phieu_nhap_${importId}.pdf"`);
    
    doc.pipe(res);

    // Header
    doc.font('Roboto').fontSize(18).text('PHIẾU NHẬP KHO', { align: 'center' });
    doc.fontSize(12).text('COFFEE SHOP MANAGEMENT', { align: 'center' });
    doc.moveDown(0.8);
    
    // Thông tin phiếu nhập - 2 cột
    doc.fontSize(10);
    const infoY = doc.y;
    const infoLeft = 30;
    const infoRight = doc.page.width / 2 + 20;
    const lineHeight = 14;
    
    // Cột trái
    let currentY = infoY;
    doc.text(`Số phiếu: PN-${String(data.id).padStart(6, '0')}`, infoLeft, currentY);
    currentY += lineHeight;
    doc.text(`Ngày nhập: ${new Date(data.ngay_nhap).toLocaleString('vi-VN')}`, infoLeft, currentY);
    
    // Cột phải
    currentY = infoY;
    doc.text(`Người nhập: ${data.nguoi_nhap_ten || 'N/A'}`, infoRight, currentY);
    currentY += lineHeight;
    doc.text(`Nhà cung cấp: ${data.nha_cung_cap || 'Không rõ'}`, infoRight, currentY);
    
    // Cập nhật Y để tiếp tục
    doc.y = infoY + (lineHeight * 2) + 5;
    
    doc.moveDown(0.5);
    
    // Đường phân cách trước bảng
    doc.moveTo(30, doc.y)
       .lineTo(doc.page.width - 30, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Tính toán bảng
    const pageWidth = doc.page.width;
    const margin = 30;
    const tableWidth = pageWidth - (margin * 2);
    const tableLeft = margin;
    const tableRight = pageWidth - margin;
    const tableTop = doc.y;
    
    // Table header
    doc.font('Roboto').fontSize(9);
    const startY = doc.y;
    const colWidths = {
      ma: tableWidth * 0.15,
      ten: tableWidth * 0.35,
      sl: tableWidth * 0.15,
      donGia: tableWidth * 0.15,
      thanhTien: tableWidth * 0.2
    };
    
    // Vẽ đường kẻ trên header
    doc.moveTo(tableLeft, startY - 5)
       .lineTo(tableRight, startY - 5)
       .stroke();
    
    let currentX = tableLeft;
    doc.text('Mã NL', currentX + 2, startY, { width: colWidths.ma - 4 });
    currentX += colWidths.ma;
    doc.text('Tên nguyên liệu', currentX + 2, startY, { width: colWidths.ten - 4 });
    currentX += colWidths.ten;
    doc.text('SL', currentX + 2, startY, { width: colWidths.sl - 4, align: 'right' });
    currentX += colWidths.sl;
    doc.text('Đơn giá', currentX + 2, startY, { width: colWidths.donGia - 4, align: 'right' });
    currentX += colWidths.donGia;
    doc.text('Thành tiền', currentX + 2, startY, { width: colWidths.thanhTien - 4, align: 'right' });
    
    // Vẽ đường kẻ dưới header
    const headerBottom = startY + 12;
    doc.moveTo(tableLeft, headerBottom)
       .lineTo(tableRight, headerBottom)
       .stroke();
    
    doc.y = headerBottom + 5;
    
    // Data row
    doc.font('Roboto').fontSize(9);
    const rowY = doc.y;
    currentX = tableLeft;
    doc.text(data.nguyen_lieu_ma, currentX + 2, rowY, { width: colWidths.ma - 4 });
    currentX += colWidths.ma;
    doc.text(data.nguyen_lieu_ten, currentX + 2, rowY, { width: colWidths.ten - 4 });
    currentX += colWidths.ten;
    doc.text(`${parseFloat(data.so_luong).toLocaleString()} ${data.don_vi}`, currentX + 2, rowY, { width: colWidths.sl - 4, align: 'right' });
    currentX += colWidths.sl;
    doc.text(money(data.don_gia), currentX + 2, rowY, { width: colWidths.donGia - 4, align: 'right' });
    currentX += colWidths.donGia;
    doc.text(money(data.thanh_tien), currentX + 2, rowY, { width: colWidths.thanhTien - 4, align: 'right' });
    
    // Tính chiều cao hàng và cập nhật Y
    const rowHeight = 18;
    const rowBottom = rowY + rowHeight;
    doc.y = rowBottom + 3;
    
    // Vẽ đường kẻ dưới hàng
    doc.moveTo(tableLeft, doc.y)
       .lineTo(tableRight, doc.y)
       .stroke();
    
    // Vẽ đường viền trái và phải
    doc.moveTo(tableLeft, tableTop - 5)
       .lineTo(tableLeft, doc.y)
       .stroke();
    doc.moveTo(tableRight, tableTop - 5)
       .lineTo(tableRight, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Đường phân cách trước phần tổng tiền
    doc.moveTo(30, doc.y)
       .lineTo(doc.page.width - 30, doc.y)
       .stroke();
    
    doc.moveDown(0.5);

    // Total - làm nổi bật
    const totalY = doc.y;
    const totalLeft = 30;
    const totalRight = doc.page.width - 30;
    const totalWidth = totalRight - totalLeft;
    const tongSo = (data.thanh_tien ?? 0).toLocaleString('vi-VN');
    
    // Vẽ border cho TỔNG CỘNG
    doc.rect(totalLeft, totalY - 3, totalWidth, 22)
       .stroke();
    
    doc.font('Roboto').fontSize(13);
    doc.text('TỔNG CỘNG: ' + tongSo + ' đ', totalLeft + 5, totalY, { 
      width: totalWidth - 10,
      align: 'right'
    });
    
    doc.y = totalY + 22;
    doc.moveDown(0.5);
    
    // Note
    if (data.ghi_chu) {
      doc.font('Roboto').fontSize(10);
      doc.text('Ghi chú: ' + data.ghi_chu);
      doc.moveDown(1);
    }
    
    // Signature section
    doc.moveDown(1.5);
    
    // Đường phân cách trước phần chữ ký
    doc.moveTo(30, doc.y)
       .lineTo(doc.page.width - 30, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    doc.fontSize(9);
    
    const signY = doc.y;
    doc.text('Người lập phiếu', 70, signY, { width: 100, align: 'center' });
    doc.text('Người nhận hàng', 250, signY, { width: 100, align: 'center' });
    
    doc.moveDown(3);
    
    const nameY = doc.y;
    doc.text(data.nguoi_nhap_ten || '______________', 70, nameY, { width: 100, align: 'center' });
    doc.text('______________', 250, nameY, { width: 100, align: 'center' });
    
    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text(
      `In lúc: ${new Date().toLocaleString('vi-VN')}`,
      { align: 'center' }
    );

    doc.end();
  });

  // POST /api/v1/phieu-nhap/:importId/print-log
  logImportReceiptPrint = asyncHandler(async (req, res) => {
    const importId = parseInt(req.params.importId);
    const userId = req.user?.id;
    const { printer, copies = 1, reason } = req.body;

    const sql = `
      INSERT INTO import_receipt_print_log (
        import_id,
        user_id,
        printer,
        copies,
        reason,
        printed_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      importId,
      userId,
      printer,
      copies,
      reason
    ]);

    res.json({ 
      success: true, 
      message: 'Đã ghi log in phiếu nhập',
      data: rows[0]
    });
  });
}

export default new ImportReceiptController();
