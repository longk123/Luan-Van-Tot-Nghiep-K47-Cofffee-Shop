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
    doc.moveDown(1);
    
    // Info box
    doc.fontSize(10)
      .text(`Số phiếu: PN-${String(data.id).padStart(6, '0')}`, 50, doc.y)
      .text(`Ngày nhập: ${new Date(data.ngay_nhap).toLocaleString('vi-VN')}`)
      .text(`Người nhập: ${data.nguoi_nhap_ten || 'N/A'}`)
      .text(`Nhà cung cấp: ${data.nha_cung_cap || 'Không rõ'}`);
    
    doc.moveDown(1);
    
    // Separator
    doc.moveTo(50, doc.y)
       .lineTo(370, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Table header
    doc.font('Roboto').fontSize(9);
    const startY = doc.y;
    doc.text('Mã NL', 50, startY, { width: 50 });
    doc.text('Tên nguyên liệu', 105, startY, { width: 100 });
    doc.text('SL', 210, startY, { width: 50, align: 'right' });
    doc.text('Đơn giá', 265, startY, { width: 50, align: 'right' });
    doc.text('Thành tiền', 320, startY, { width: 50, align: 'right' });
    
    doc.moveDown(0.8);
    
    // Line separator
    doc.moveTo(50, doc.y)
       .lineTo(370, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Data row
    doc.font('Roboto').fontSize(9);
    const rowY = doc.y;
    doc.text(data.nguyen_lieu_ma, 50, rowY, { width: 50 });
    doc.text(data.nguyen_lieu_ten, 105, rowY, { width: 100 });
    doc.text(`${parseFloat(data.so_luong).toLocaleString()} ${data.don_vi}`, 210, rowY, { width: 50, align: 'right' });
    doc.text(money(data.don_gia), 265, rowY, { width: 50, align: 'right' });
    doc.text(money(data.thanh_tien), 320, rowY, { width: 50, align: 'right' });
    
    doc.moveDown(1.5);
    
    // Bottom separator
   doc.moveTo(50, doc.y)
     .lineTo(370, doc.y)
     .stroke();

   doc.moveDown(0.5);

   // Total (căn phải, cùng hàng)
  doc.font('Roboto').fontSize(11);
  const totalY = doc.y;
  doc.text('TỔNG CỘNG:', 170, totalY, { width: 100, align: 'right' });
  // Tách số và ký tự đ
  const tongSo = (data.thanh_tien ?? 0).toLocaleString('vi-VN');
  doc.font('Roboto').fontSize(12);
  doc.text(tongSo, 280, totalY, { width: 60, align: 'right' });
  doc.font('Roboto').fontSize(11);
  doc.text('đ', 345, totalY, { width: 20, align: 'left' });
  doc.moveDown(1);
    
    // Note
    if (data.ghi_chu) {
      doc.font('Roboto').fontSize(10);
      doc.text('Ghi chú:', 50, doc.y);
      doc.text(data.ghi_chu, 50, doc.y, { width: 320 });
      doc.moveDown(1);
    }
    
    // Signature section
    doc.moveDown(2);
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
