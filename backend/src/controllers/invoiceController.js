// src/controllers/invoiceController.js
import { pool } from '../db.js';
import PDFDocument from 'pdfkit';
import { asyncHandler } from '../middleware/error.js';
import { NotFound } from '../utils/httpErrors.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function money(v) {
  return (v ?? 0).toLocaleString('vi-VN');
}

async function fetchInvoiceBundle(orderId) {
  const [header, lines, promos, pays, totals] = await Promise.all([
    pool.query(`SELECT * FROM v_invoice_header WHERE order_id=$1`, [orderId]),
    pool.query(`SELECT * FROM v_invoice_lines WHERE order_id=$1 ORDER BY line_id`, [orderId]),
    pool.query(`SELECT * FROM v_invoice_promotions WHERE order_id=$1`, [orderId]),
    pool.query(`SELECT * FROM v_invoice_payments WHERE order_id=$1 ORDER BY payment_id`, [orderId]),
    pool.query(`SELECT * FROM v_order_settlement WHERE order_id=$1`, [orderId]),
  ]);
  
  if (!header.rowCount) {
    throw new NotFound(`Không tìm thấy đơn hàng #${orderId}`);
  }
  
  return {
    header: header.rows[0],
    lines: lines.rows,
    promotions: promos.rows,
    payments: pays.rows,
    totals: totals.rows[0] || {},
  };
}

class InvoiceController {
  // GET /api/v1/hoa-don/:orderId
  getInvoiceData = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    
    // Nếu query ?format=pdf thì chuyển sang PDF
    if (req.query.format === 'pdf') {
      return this.getInvoicePdf(req, res);
    }
    
    const data = await fetchInvoiceBundle(orderId);
    res.json({ success: true, data });
  });

  // GET /api/v1/hoa-don/:orderId/pdf
  getInvoicePdf = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { header, lines, promotions, payments, totals } = await fetchInvoiceBundle(orderId);

    // Tạo PDF stream với font hỗ trợ tiếng Việt
    const doc = new PDFDocument({ 
      size: 'A5', 
      margin: 24
    });
    
    // Đăng ký và sử dụng font Roboto (hỗ trợ tiếng Việt đầy đủ)
    const fontPath = join(__dirname, '../fonts/Roboto-Regular.ttf');
    doc.registerFont('Roboto', fontPath);
    doc.font('Roboto');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="hoa_don_${orderId}.pdf"`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(16).text('HÓA ĐƠN BÁN HÀNG', { align: 'center' });
    doc.fontSize(11).text('COFFEE SHOP', { align: 'center' });
    doc.moveDown(0.5);
    
    doc.fontSize(10)
      .text('Mã đơn: #' + header.order_id)
      .text(header.ban_label + (header.khu_vuc ? ' (' + header.khu_vuc + ')' : ''))
      .text('Thu ngân: ' + (header.thu_ngan ?? '-'))
      .text('Mở: ' + new Date(header.opened_at).toLocaleString('vi-VN'));
    
    if (header.closed_at) {
      doc.text('Đóng: ' + new Date(header.closed_at).toLocaleString('vi-VN'));
    }
    
    doc.moveDown(0.5);
    doc.text('------------------------------------------------');
    doc.moveDown(0.3);

    // Lines
    lines.forEach(l => {
      doc.fontSize(10).text(l.ten_mon + (l.ten_bien_the ? ' (' + l.ten_bien_the + ')' : '') + '  x' + l.so_luong);
      
      // Options
      if (l.options?.length) {
        const chips = l.options.map(o => {
          if (o.loai === 'AMOUNT') {
            const qty = o.so_luong ?? 1;
            return o.ten + ' x' + qty + (o.don_vi ? ' ' + o.don_vi : '');
          } else {
            const pct = Math.round((o.he_so ?? 0) * 100);
            return o.ten + ' ' + pct + '%';
          }
        }).join(' • ');
        doc.fontSize(9).text('   ' + chips);
      }
      
      // Note
      if (l.ghi_chu) {
        doc.fontSize(9).text('   Ghi chú: ' + l.ghi_chu);
      }
      
      // Price breakdown
      const unit = l.don_gia - (l.giam_gia ?? 0);
      doc.fontSize(9).text('   ' + money(unit) + 'đ' + (l.topping_total > 0 ? ' + ' + money(l.topping_total) + 'đ topping' : '') + ' = ' + money(l.line_total_with_addons) + 'đ');
      doc.moveDown(0.3);
    });

    doc.fontSize(10).text('------------------------------------------------');
    doc.moveDown(0.3);

    // Promotions
    if (promotions.length) {
      promotions.forEach(p => {
        doc.text('KM ' + p.ma + ' (' + p.ten + '): -' + money(p.so_tien_giam) + 'đ');
      });
      doc.moveDown(0.3);
    }

    // Totals
    doc.text('Tạm tính: ' + money(totals.subtotal_after_lines) + 'đ', { align: 'right' });
    
    if (totals.promo_total > 0) {
      doc.text('Khuyến mãi: -' + money(totals.promo_total) + 'đ', { align: 'right' });
    }
    
    if (totals.manual_discount > 0) {
      doc.text('Giảm thủ công: -' + money(totals.manual_discount) + 'đ', { align: 'right' });
    }
    
    if (totals.service_fee > 0) {
      doc.text('Phí dịch vụ: +' + money(totals.service_fee) + 'đ', { align: 'right' });
    }
    
    if (totals.vat_amount > 0) {
      doc.text('VAT (' + totals.vat_rate + '%): +' + money(totals.vat_amount) + 'đ', { align: 'right' });
    }
    
    doc.moveDown(0.3);
    doc.fontSize(12).text('TỔNG CỘNG: ' + money(totals.grand_total) + 'đ', { align: 'right' });

    // Payments
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    if (payments.length) {
      doc.text('Thanh toán đã nhận:');
      payments.forEach(p => {
        let line = '- ' + (p.method_name ?? p.method_code) + ': ' + money(p.amount) + 'đ';
        if (p.method_code === 'CASH' && p.change_given > 0) {
          line += ' (thừa ' + money(p.change_given) + 'đ)';
        }
        if (p.tx_ref) {
          line += ' • ' + p.tx_ref;
        }
        doc.text(line);
      });
      doc.moveDown(0.3);
    }
    
    if ((totals.amount_due ?? 0) > 0) {
      doc.text('Còn phải thu: ' + money(totals.amount_due) + 'đ', { align: 'right' });
    } else {
      doc.text('Đã thanh toán đủ', { align: 'right' });
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(9).text('Cảm ơn quý khách!', { align: 'center' });

    doc.end();
  });

  // POST /api/v1/hoa-don/:orderId/print-log
  logInvoicePrint = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { printed_by, note } = req.body || {};
    
    // Đếm số lần in trước đó để tính copy_no
    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM hoa_don_print_log WHERE order_id=$1`,
      [orderId]
    );
    const copy_no = parseInt(countResult.rows[0].count) + 1;
    
    const result = await pool.query(
      `INSERT INTO hoa_don_print_log(order_id, printed_by, note, copy_no)
       VALUES ($1,$2,$3,$4)
       RETURNING id, invoice_no, printed_at, copy_no`,
      [orderId, printed_by ?? null, note ?? null, copy_no]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  });
}

export default new InvoiceController();

