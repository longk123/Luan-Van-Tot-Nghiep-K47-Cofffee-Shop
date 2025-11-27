// Kiểm tra: Delivery fee có được tính vào doanh thu không?
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function check() {
  const shiftId = 55;
  
  try {
    console.log('🔍 Kiểm tra đơn DELIVERY và delivery fee...\n');
    console.log('='.repeat(60));
    
    // 1. Lấy tất cả đơn DELIVERY trong ca
    const deliveryOrders = await pool.query(`
      SELECT 
        dh.id,
        dh.order_type,
        settlement.grand_total,
        di.delivery_fee,
        (SELECT COALESCE(SUM(op.amount), 0) 
         FROM order_payment op 
         WHERE op.order_id = dh.id 
           AND op.method_code = 'CASH' 
           AND op.status = 'CAPTURED') AS cash_paid
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.order_type = 'DELIVERY'
        AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `, [shiftId]);
    
    console.log(`📦 Đơn DELIVERY trong ca: ${deliveryOrders.rows.length} đơn\n`);
    
    let totalGrandTotal = 0;
    let totalDeliveryFee = 0;
    let totalCashPaid = 0;
    
    deliveryOrders.rows.forEach(order => {
      const grandTotal = parseInt(order.grand_total || 0);
      const deliveryFee = parseInt(order.delivery_fee || 0);
      const cashPaid = parseInt(order.cash_paid || 0);
      
      totalGrandTotal += grandTotal;
      totalDeliveryFee += deliveryFee;
      totalCashPaid += cashPaid;
      
      console.log(`   Đơn #${order.id}:`);
      console.log(`     - Grand Total: ${grandTotal.toLocaleString('vi-VN')}đ`);
      console.log(`     - Delivery Fee: ${deliveryFee.toLocaleString('vi-VN')}đ`);
      console.log(`     - Cash Paid: ${cashPaid.toLocaleString('vi-VN')}đ`);
      console.log(`     - Chênh lệch: ${(grandTotal - deliveryFee).toLocaleString('vi-VN')}đ (giá trị đơn không tính phí ship)\n`);
    });
    
    // 2. Tính COD từ wallet
    const codResult = await pool.query(`
      SELECT COALESCE(SUM(wt.amount), 0)::INT AS total_cod
      FROM wallet_transactions wt
      WHERE wt.shift_id = $1
        AND wt.type = 'SETTLE'
    `, [shiftId]);
    const totalCod = parseInt(codResult.rows[0]?.total_cod || 0);
    
    console.log('='.repeat(60));
    console.log('📊 TỔNG KẾT:');
    console.log(`   Tổng Grand Total (đơn DELIVERY): ${totalGrandTotal.toLocaleString('vi-VN')}đ`);
    console.log(`   Tổng Delivery Fee: ${totalDeliveryFee.toLocaleString('vi-VN')}đ`);
    console.log(`   Tổng Cash Paid: ${totalCashPaid.toLocaleString('vi-VN')}đ`);
    console.log(`   COD (shipper nộp): ${totalCod.toLocaleString('vi-VN')}đ\n`);
    
    // 3. Phân tích
    console.log('🔍 PHÂN TÍCH:');
    console.log(`   - Nếu delivery_fee đã tính vào grand_total:`);
    console.log(`     → Doanh thu từ đơn DELIVERY = ${totalGrandTotal.toLocaleString('vi-VN')}đ`);
    console.log(`   - Nếu delivery_fee CHƯA tính vào grand_total:`);
    console.log(`     → Doanh thu từ đơn DELIVERY = ${(totalGrandTotal + totalDeliveryFee).toLocaleString('vi-VN')}đ`);
    console.log(`   - COD (tiền shipper thu hộ): ${totalCod.toLocaleString('vi-VN')}đ`);
    console.log(`   - So sánh: Cash Paid (${totalCashPaid.toLocaleString('vi-VN')}đ) vs COD (${totalCod.toLocaleString('vi-VN')}đ)\n`);
    
    if (totalCashPaid === totalCod) {
      console.log('✅ COD = Cash Paid → COD là tiền khách trả (đã bao gồm trong grand_total)');
      console.log('   → Doanh thu đã đúng (không cần cộng thêm COD)\n');
    } else {
      console.log('⚠️ COD ≠ Cash Paid → Cần kiểm tra lại logic\n');
    }
    
    // 4. Kiểm tra view v_order_settlement có tính delivery_fee không
    const settlementCheck = await pool.query(`
      SELECT 
        dh.id,
        settlement.grand_total,
        settlement.subtotal_after_lines,
        di.delivery_fee,
        (SELECT COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0)
         FROM don_hang_chi_tiet ct
         WHERE ct.don_hang_id = dh.id) AS items_total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.order_type = 'DELIVERY'
        AND dh.trang_thai = 'PAID'
      LIMIT 3
    `, [shiftId]);
    
    console.log('🔍 KIỂM TRA v_order_settlement:');
    settlementCheck.rows.forEach(row => {
      const grandTotal = parseInt(row.grand_total || 0);
      const itemsTotal = parseInt(row.items_total || 0);
      const deliveryFee = parseInt(row.delivery_fee || 0);
      const expected = itemsTotal + deliveryFee;
      
      console.log(`   Đơn #${row.id}:`);
      console.log(`     - Items Total: ${itemsTotal.toLocaleString('vi-VN')}đ`);
      console.log(`     - Delivery Fee: ${deliveryFee.toLocaleString('vi-VN')}đ`);
      console.log(`     - Expected Grand Total: ${expected.toLocaleString('vi-VN')}đ`);
      console.log(`     - Actual Grand Total: ${grandTotal.toLocaleString('vi-VN')}đ`);
      console.log(`     - ${grandTotal === expected ? '✅' : '❌'} Khớp: ${grandTotal === expected}\n`);
    });
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

check();

