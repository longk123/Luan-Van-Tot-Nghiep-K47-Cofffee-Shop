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
  // Kiểm tra quyền xem hóa đơn cho waiter
  async checkWaiterAccess(orderId, userId, userRoles) {
    const isWaiter = userRoles.some(role => 
      role.toLowerCase() === 'waiter'
    ) && !userRoles.some(role => 
      ['cashier', 'manager', 'admin'].includes(role.toLowerCase())
    );
    
    if (!isWaiter) {
      return true; // Cashier/Manager/Admin có quyền xem tất cả
    }
    
    // Waiter chỉ xem được đơn do mình tạo hoặc đơn DELIVERY đã claim
    const { rows } = await pool.query(`
      SELECT 
        dh.nhan_vien_id,
        dh.order_type,
        di.shipper_id
      FROM don_hang dh
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.id = $1
    `, [orderId]);
    
    if (rows.length === 0) {
      return false;
    }
    
    const order = rows[0];
    
    // Waiter có thể xem nếu:
    // 1. Đơn do waiter tạo (DINE_IN hoặc TAKEAWAY)
    // 2. Đơn DELIVERY đã được phân công cho waiter (đã claim)
    const canAccess = 
      (order.nhan_vien_id === userId && ['DINE_IN', 'TAKEAWAY'].includes(order.order_type)) ||
      (order.order_type === 'DELIVERY' && order.shipper_id === userId);
    
    return canAccess;
  }

  // GET /api/v1/hoa-don/:orderId
  getInvoiceData = asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const userId = req.user.user_id;
    const userRoles = req.user.roles || [];
    
    // Kiểm tra quyền cho waiter
    const hasAccess = await this.checkWaiterAccess(orderId, userId, userRoles);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Bạn chỉ có thể xem đơn do mình tạo hoặc đơn giao hàng đã được phân công cho bạn'
      });
    }
    
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
    doc.fontSize(11).text('DEVCOFFEE', { align: 'center' });
    doc.moveDown(0.8);
    
    // Thông tin đơn hàng - 2 cột
    doc.fontSize(10);
    const infoY = doc.y;
    const infoLeft = 24;
    const infoRight = doc.page.width / 2 + 20;
    const lineHeight = 14;
    
    // Cột trái
    let currentY = infoY;
    doc.text('Mã đơn: #' + header.order_id, infoLeft, currentY);
    currentY += lineHeight;
    doc.text(header.ban_label + (header.khu_vuc ? ' (' + header.khu_vuc + ')' : ''), infoLeft, currentY);
    
    // Cột phải
    currentY = infoY;
    // Luôn hiển thị cả người tạo đơn và người thanh toán
    doc.text('Người tạo đơn: ' + (header.nguoi_tao_don ?? '-'), infoRight, currentY);
    currentY += lineHeight;
    doc.text('Thu ngân: ' + (header.thu_ngan ?? header.nguoi_tao_don ?? '-'), infoRight, currentY);
    currentY += lineHeight;
    doc.text('Mở: ' + new Date(header.opened_at).toLocaleString('vi-VN'), infoRight, currentY);
    
    if (header.closed_at) {
      currentY += lineHeight;
      doc.text('Đóng: ' + new Date(header.closed_at).toLocaleString('vi-VN'), infoRight, currentY);
    }
    
    // Cập nhật Y để tiếp tục (lấy Y cao nhất) - 4 dòng nếu có closed_at, 3 dòng nếu không
    const maxY = header.closed_at ? infoY + (lineHeight * 4) : infoY + (lineHeight * 3);
    doc.y = maxY + 5;
    
    doc.moveDown(0.5);
    
    // Đường phân cách trước bảng món
    doc.moveTo(24, doc.y)
       .lineTo(doc.page.width - 24, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Gộp các món giống nhau (cùng tên, size, topping, đường, đá)
    const groupedLines = [];
    const lineMap = new Map();
    
    lines.forEach(l => {
      // Parse options nếu là string (từ JSONB)
      let options = l.options;
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch (e) {
          options = [];
        }
      }
      if (!Array.isArray(options)) {
        options = [];
      }
      
      // Tạo key để so sánh: tên món + biến thể + options + ghi chú + giá
      const optionsKey = options.length 
        ? options.map(o => {
            if (o.loai === 'AMOUNT') {
              const qty = o.so_luong ?? 1;
              return `${o.ten}_${qty}_${o.don_vi || ''}`;
            } else {
              const pct = Math.round((o.he_so ?? 0) * 100);
              return `${o.ten}_${pct}`;
            }
          }).sort().join('|')
        : '';
      const key = `${l.ten_mon}_${l.ten_bien_the || ''}_${optionsKey}_${l.ghi_chu || ''}_${l.don_gia}_${l.giam_gia || 0}`;
      
      if (lineMap.has(key)) {
        const existing = lineMap.get(key);
        existing.so_luong += l.so_luong;
        existing.line_total_with_addons += l.line_total_with_addons;
      } else {
        const grouped = {
          ...l,
          options: options, // Lưu lại options đã parse
          so_luong: l.so_luong,
          line_total_with_addons: l.line_total_with_addons
        };
        lineMap.set(key, grouped);
        groupedLines.push(grouped);
      }
    });

    // Vẽ bảng
    const tableLeft = 24;
    const tableWidth = doc.page.width - 48;
    const colWidths = {
      item: tableWidth * 0.5,      // Tên món
      qty: tableWidth * 0.15,      // Số lượng
      price: tableWidth * 0.35     // Giá
    };
    
    // Vẽ đường viền bảng
    const tableTop = doc.y;
    
    // Header
    doc.fontSize(9).font('Roboto');
    const headerY = doc.y;
    
    // Vẽ đường kẻ trên header
    doc.moveTo(tableLeft, headerY - 5)
       .lineTo(tableLeft + tableWidth, headerY - 5)
       .stroke();
    
    // Header text (in đậm bằng cách vẽ nhiều lần)
    doc.text('Món', tableLeft + 2, headerY, { width: colWidths.item - 4 });
    doc.text('SL', tableLeft + colWidths.item + 2, headerY, { width: colWidths.qty - 4, align: 'center' });
    doc.text('Thành tiền', tableLeft + colWidths.item + colWidths.qty + 2, headerY, { width: colWidths.price - 4, align: 'right' });
    
    // Vẽ đường kẻ dưới header
    const headerBottom = headerY + 12;
    doc.moveTo(tableLeft, headerBottom)
       .lineTo(tableLeft + tableWidth, headerBottom)
       .stroke();
    
    doc.y = headerBottom + 5;
    doc.fontSize(9);
    
    // Lines
    groupedLines.forEach((l, idx) => {
      const rowStartY = doc.y;
      
      // Tên món
      let itemText = l.ten_mon;
      if (l.ten_bien_the) {
        itemText += ' (' + l.ten_bien_the + ')';
      }
      
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
        itemText += '\n   ' + chips;
      }
      
      // Note
      if (l.ghi_chu) {
        itemText += '\n   Ghi chú: ' + l.ghi_chu;
      }
      
      // Tính chiều cao hàng dựa trên số dòng text
      const lines = itemText.split('\n');
      const estimatedHeight = lines.length * 12 + 8;
      
      // Vẽ cột Món
      doc.text(itemText, tableLeft + 2, rowStartY, { 
        width: colWidths.item - 4,
        lineGap: 2
      });
      
      // Vẽ cột SL
      doc.text('x' + l.so_luong, tableLeft + colWidths.item + 2, rowStartY, { 
        width: colWidths.qty - 4, 
        align: 'center' 
      });
      
      // Vẽ cột Thành tiền
      doc.text(money(l.line_total_with_addons) + 'đ', tableLeft + colWidths.item + colWidths.qty + 2, rowStartY, { 
        width: colWidths.price - 4, 
        align: 'right' 
      });
      
      // Vẽ đường kẻ dưới hàng
      const rowBottom = Math.max(rowStartY + estimatedHeight, doc.y) + 3;
      doc.moveTo(tableLeft, rowBottom)
         .lineTo(tableLeft + tableWidth, rowBottom)
         .stroke();
      
      doc.y = rowBottom + 3;
    });
    
    // Vẽ đường viền bên trái và phải
    const finalTableBottom = doc.y;
    doc.moveTo(tableLeft, tableTop - 5)
       .lineTo(tableLeft, finalTableBottom)
       .stroke();
    doc.moveTo(tableLeft + tableWidth, tableTop - 5)
       .lineTo(tableLeft + tableWidth, finalTableBottom)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Đường phân cách trước phần tổng tiền
    doc.moveTo(24, doc.y)
       .lineTo(doc.page.width - 24, doc.y)
       .stroke();
    
    doc.moveDown(0.5);

    // Promotions
    if (promotions.length) {
      promotions.forEach(p => {
        doc.text('KM ' + p.ma + ' (' + p.ten + '): -' + money(p.so_tien_giam) + 'đ');
      });
      doc.moveDown(0.3);
    }

    // Totals
    doc.fontSize(10);
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
    
    doc.moveDown(0.4);
    
    // TỔNG CỘNG - làm nổi bật
    const totalY = doc.y;
    const totalLeft = 24;
    const totalRight = doc.page.width - 24;
    const totalWidth = totalRight - totalLeft;
    
    // Vẽ border cho TỔNG CỘNG
    doc.rect(totalLeft, totalY - 3, totalWidth, 20)
       .stroke();
    
    doc.fontSize(13).font('Roboto');
    doc.text('TỔNG CỘNG: ' + money(totals.grand_total) + 'đ', totalLeft + 5, totalY, { 
      width: totalWidth - 10,
      align: 'right'
    });
    
    doc.y = totalY + 20;

    // Payments
    doc.moveDown(0.6);
    
    // Đường phân cách trước phần thanh toán
    doc.moveTo(24, doc.y)
       .lineTo(doc.page.width - 24, doc.y)
       .stroke();
    
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
      doc.fontSize(10);
      doc.text('Đã thanh toán đủ', { align: 'right' });
    }

    // Footer
    doc.moveDown(1.2);
    
    // Đường phân cách trước footer
    doc.moveTo(24, doc.y)
       .lineTo(doc.page.width - 24, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    doc.fontSize(10).text('Cảm ơn quý khách!', { align: 'center' });

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

