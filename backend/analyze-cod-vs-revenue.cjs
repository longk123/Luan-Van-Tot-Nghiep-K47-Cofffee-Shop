// Phân tích: COD có phải là doanh thu không?
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function analyze() {
  const shiftId = 55;
  
  try {
    console.log('🔍 Phân tích: COD có phải là doanh thu không?\n');
    console.log('='.repeat(60));
    
    // 1. Lấy doanh thu từ fn_aggregate_shift
    const aggResult = await pool.query(`SELECT fn_aggregate_shift($1) AS stats`, [shiftId]);
    const stats = aggResult.rows[0].stats;
    const revenue = parseInt(stats.net_amount || 0);
    
    // 2. Lấy COD từ wallet_transactions
    const codResult = await pool.query(`
      SELECT COALESCE(SUM(wt.amount), 0)::INT AS total_cod
      FROM wallet_transactions wt
      WHERE wt.shift_id = $1
        AND wt.type = 'SETTLE'
    `, [shiftId]);
    const cod = parseInt(codResult.rows[0]?.total_cod || 0);
    
    // 3. Phân tích đơn DELIVERY
    const deliveryAnalysis = await pool.query(`
      SELECT 
        dh.id,
        dh.order_type,
        settlement.grand_total,
        di.delivery_fee,
        (SELECT COALESCE(SUM(op.amount), 0)
         FROM order_payment op
         WHERE op.order_id = dh.id
           AND op.method_code = 'CASH'
           AND op.status = 'CAPTURED') AS cash_paid_at_store,
        (SELECT COALESCE(SUM(wt.amount), 0)
         FROM wallet_transactions wt
         WHERE wt.order_id = dh.id
           AND wt.type = 'SETTLE') AS cod_amount
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.order_type = 'DELIVERY'
        AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `, [shiftId]);
    
    console.log('📦 PHÂN TÍCH ĐƠN DELIVERY:\n');
    let totalGrandTotal = 0;
    let totalCashAtStore = 0;
    let totalCod = 0;
    
    deliveryAnalysis.rows.forEach(order => {
      const grandTotal = parseInt(order.grand_total || 0);
      const cashAtStore = parseInt(order.cash_paid_at_store || 0);
      const codAmount = parseInt(order.cod_amount || 0);
      
      totalGrandTotal += grandTotal;
      totalCashAtStore += cashAtStore;
      totalCod += codAmount;
      
      console.log(`   Đơn #${order.id}:`);
      console.log(`     - Grand Total: ${grandTotal.toLocaleString('vi-VN')}đ`);
      console.log(`     - Cash paid tại quán: ${cashAtStore.toLocaleString('vi-VN')}đ`);
      console.log(`     - COD (shipper thu): ${codAmount.toLocaleString('vi-VN')}đ`);
      console.log(`     - Tổng khách trả: ${(cashAtStore + codAmount).toLocaleString('vi-VN')}đ`);
      console.log(`     - ${(cashAtStore + codAmount) === grandTotal ? '✅' : '❌'} Khớp với Grand Total\n`);
    });
    
    console.log('='.repeat(60));
    console.log('📊 TỔNG KẾT:\n');
    console.log(`   Doanh thu (từ fn_aggregate_shift): ${revenue.toLocaleString('vi-VN')}đ`);
    console.log(`   Tổng Grand Total (đơn DELIVERY): ${totalGrandTotal.toLocaleString('vi-VN')}đ`);
    console.log(`   COD (shipper nộp): ${cod.toLocaleString('vi-VN')}đ\n`);
    
    // 4. Phân tích logic
    console.log('🔍 PHÂN TÍCH LOGIC:\n');
    console.log('   Scenario 1: COD KHÔNG phải doanh thu (hiện tại)');
    console.log(`     → Doanh thu = ${revenue.toLocaleString('vi-VN')}đ`);
    console.log(`     → Tiền mặt = ${(revenue - cod).toLocaleString('vi-VN')}đ (từ đơn) + ${cod.toLocaleString('vi-VN')}đ (COD) = ${(revenue - cod + cod).toLocaleString('vi-VN')}đ\n`);
    
    console.log('   Scenario 2: COD LÀ doanh thu');
    console.log(`     → Doanh thu = ${revenue.toLocaleString('vi-VN')}đ + ${cod.toLocaleString('vi-VN')}đ = ${(revenue + cod).toLocaleString('vi-VN')}đ`);
    console.log(`     → Tiền mặt = ${(revenue - cod).toLocaleString('vi-VN')}đ (từ đơn) + ${cod.toLocaleString('vi-VN')}đ (COD) = ${(revenue - cod + cod).toLocaleString('vi-VN')}đ\n`);
    
    // 5. Kiểm tra xem COD có được tính vào grand_total không
    console.log('🔍 KIỂM TRA: COD có được tính vào grand_total không?\n');
    const codVsGrandTotal = deliveryAnalysis.rows.filter(o => {
      const grandTotal = parseInt(o.grand_total || 0);
      const cashAtStore = parseInt(o.cash_paid_at_store || 0);
      const codAmount = parseInt(o.cod_amount || 0);
      return (cashAtStore + codAmount) === grandTotal;
    });
    
    console.log(`   Số đơn COD khớp với grand_total: ${codVsGrandTotal.length}/${deliveryAnalysis.rows.length}`);
    
    if (codVsGrandTotal.length === deliveryAnalysis.rows.length) {
      console.log('   ✅ COD đã được tính vào grand_total (trong payment)');
      console.log('   → Doanh thu = grand_total = đã bao gồm COD\n');
    } else {
      console.log('   ⚠️ COD KHÔNG khớp với grand_total');
      console.log('   → Cần kiểm tra lại logic\n');
    }
    
    // 6. Tính toán doanh thu đúng
    const allOrdersRevenue = await pool.query(`
      SELECT COALESCE(SUM(settlement.grand_total), 0)::INT AS total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.trang_thai = 'PAID'
    `, [shiftId]);
    const actualRevenue = parseInt(allOrdersRevenue.rows[0]?.total || 0);
    
    console.log('='.repeat(60));
    console.log('💰 DOANH THU THỰC TẾ:\n');
    console.log(`   Tổng grand_total của tất cả đơn PAID: ${actualRevenue.toLocaleString('vi-VN')}đ`);
    console.log(`   fn_aggregate_shift tính: ${revenue.toLocaleString('vi-VN')}đ`);
    console.log(`   ${actualRevenue === revenue ? '✅' : '❌'} Khớp: ${actualRevenue === revenue}\n`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

analyze();

