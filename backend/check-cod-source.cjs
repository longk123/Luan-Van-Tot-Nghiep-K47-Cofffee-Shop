// Kiểm tra: COD đến từ đâu và có phải là doanh thu không?
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
    console.log('🔍 Kiểm tra nguồn gốc COD...\n');
    console.log('='.repeat(60));
    
    // 1. Lấy tất cả COD transactions
    const codTransactions = await pool.query(`
      SELECT 
        wt.id,
        wt.order_id,
        wt.amount,
        wt.type,
        wt.created_at,
        dh.order_type,
        dh.trang_thai,
        settlement.grand_total,
        (SELECT COALESCE(SUM(op.amount), 0)
         FROM order_payment op
         WHERE op.order_id = wt.order_id
           AND op.method_code = 'CASH'
           AND op.status = 'CAPTURED') AS cash_paid
      FROM wallet_transactions wt
      LEFT JOIN don_hang dh ON dh.id = wt.order_id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE wt.shift_id = $1
        AND wt.type = 'SETTLE'
      ORDER BY wt.order_id, wt.created_at
    `, [shiftId]);
    
    console.log(`📦 COD Transactions: ${codTransactions.rows.length} giao dịch\n`);
    
    let totalCod = 0;
    codTransactions.rows.forEach(tx => {
      const amount = parseInt(tx.amount || 0);
      totalCod += amount;
      
      console.log(`   Transaction #${tx.id}:`);
      console.log(`     - Order #${tx.order_id || 'N/A'}: ${amount.toLocaleString('vi-VN')}đ`);
      console.log(`     - Order Type: ${tx.order_type || 'N/A'}`);
      console.log(`     - Status: ${tx.trang_thai || 'N/A'}`);
      console.log(`     - Grand Total: ${parseInt(tx.grand_total || 0).toLocaleString('vi-VN')}đ`);
      console.log(`     - Cash Paid: ${parseInt(tx.cash_paid || 0).toLocaleString('vi-VN')}đ`);
      console.log(`     - Created: ${tx.created_at}\n`);
    });
    
    console.log(`   Tổng COD: ${totalCod.toLocaleString('vi-VN')}đ\n`);
    
    // 2. Phân tích: COD có phải là doanh thu không?
    console.log('='.repeat(60));
    console.log('🔍 PHÂN TÍCH:\n');
    
    const deliveryOrders = await pool.query(`
      SELECT 
        dh.id,
        settlement.grand_total,
        (SELECT COALESCE(SUM(op.amount), 0)
         FROM order_payment op
         WHERE op.order_id = dh.id
           AND op.method_code = 'CASH'
           AND op.status = 'CAPTURED') AS cash_paid,
        (SELECT COALESCE(SUM(wt.amount), 0)
         FROM wallet_transactions wt
         WHERE wt.order_id = dh.id
           AND wt.type = 'SETTLE') AS cod_amount
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.order_type = 'DELIVERY'
        AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `, [shiftId]);
    
    let totalGrandTotal = 0;
    let totalCashPaid = 0;
    let totalCodFromOrders = 0;
    
    deliveryOrders.rows.forEach(order => {
      const grandTotal = parseInt(order.grand_total || 0);
      const cashPaid = parseInt(order.cash_paid || 0);
      const codAmount = parseInt(order.cod_amount || 0);
      
      totalGrandTotal += grandTotal;
      totalCashPaid += cashPaid;
      totalCodFromOrders += codAmount;
    });
    
    console.log(`   Tổng Grand Total (đơn DELIVERY): ${totalGrandTotal.toLocaleString('vi-VN')}đ`);
    console.log(`   Tổng Cash Paid (tại quán): ${totalCashPaid.toLocaleString('vi-VN')}đ`);
    console.log(`   Tổng COD (từ đơn): ${totalCodFromOrders.toLocaleString('vi-VN')}đ`);
    console.log(`   Tổng COD (từ wallet): ${totalCod.toLocaleString('vi-VN')}đ\n`);
    
    // 3. Tính doanh thu đúng
    const allOrdersRevenue = await pool.query(`
      SELECT COALESCE(SUM(settlement.grand_total), 0)::INT AS total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.trang_thai = 'PAID'
    `, [shiftId]);
    const revenueFromOrders = parseInt(allOrdersRevenue.rows[0]?.total || 0);
    
    console.log('='.repeat(60));
    console.log('💰 TÍNH TOÁN DOANH THU:\n');
    console.log(`   Doanh thu từ đơn (grand_total): ${revenueFromOrders.toLocaleString('vi-VN')}đ`);
    console.log(`   COD (shipper thu hộ): ${totalCod.toLocaleString('vi-VN')}đ`);
    console.log(`   → Doanh thu nếu COD LÀ doanh thu: ${(revenueFromOrders + totalCod).toLocaleString('vi-VN')}đ`);
    console.log(`   → Doanh thu nếu COD KHÔNG phải doanh thu: ${revenueFromOrders.toLocaleString('vi-VN')}đ\n`);
    
    // 4. Kiểm tra logic: COD có được tính vào payment không?
    console.log('🔍 KIỂM TRA LOGIC:\n');
    console.log('   Nếu COD là tiền khách trả khi nhận hàng:');
    console.log(`     → COD phải được tính vào doanh thu`);
    console.log(`     → Doanh thu = ${(revenueFromOrders + totalCod).toLocaleString('vi-VN')}đ\n`);
    
    console.log('   Nếu COD là tiền shipper nộp lại (đã tính trong grand_total):');
    console.log(`     → COD KHÔNG phải doanh thu thêm`);
    console.log(`     → Doanh thu = ${revenueFromOrders.toLocaleString('vi-VN')}đ\n`);
    
    // 5. So sánh với tiền mặt
    const cashFromOrders = await pool.query(`
      SELECT COALESCE(SUM(op.amount), 0)::INT AS total
      FROM order_payment op
      JOIN don_hang dh ON dh.id = op.order_id
      WHERE dh.ca_lam_id = $1
        AND op.method_code = 'CASH'
        AND op.status = 'CAPTURED'
    `, [shiftId]);
    const cash = parseInt(cashFromOrders.rows[0]?.total || 0);
    
    console.log('='.repeat(60));
    console.log('💵 SO SÁNH VỚI TIỀN MẶT:\n');
    console.log(`   Tiền mặt từ đơn: ${cash.toLocaleString('vi-VN')}đ`);
    console.log(`   COD: ${totalCod.toLocaleString('vi-VN')}đ`);
    console.log(`   Tổng tiền mặt: ${(cash + totalCod).toLocaleString('vi-VN')}đ\n`);
    
    console.log(`   Nếu doanh thu = ${(revenueFromOrders + totalCod).toLocaleString('vi-VN')}đ:`);
    console.log(`     → Tiền mặt = ${(cash + totalCod).toLocaleString('vi-VN')}đ`);
    console.log(`     → Chênh lệch: ${((cash + totalCod) - (revenueFromOrders + totalCod)).toLocaleString('vi-VN')}đ\n`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

check();

