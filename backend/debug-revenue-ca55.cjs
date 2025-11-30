const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456'
});

async function debug() {
  try {
    console.log('🔍 Phân tích chênh lệch doanh thu ca #55\n');
    
    // 1. Kiểm tra fn_aggregate_shift tính gì
    const agg = await pool.query(`SELECT fn_aggregate_shift(55) as stats`);
    const stats = agg.rows[0].stats;
    console.log('📊 fn_aggregate_shift tính:');
    console.log(`  - net_amount: ${stats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - gross_amount: ${stats.gross_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - discount_amount: ${stats.discount_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - total_orders: ${stats.total_orders}`);
    
    // 2. Kiểm tra COD
    const cod = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::INT as total_cod
      FROM wallet_transactions
      WHERE shift_id = 55
        AND type = 'SETTLE'
    `);
    console.log(`\n💰 COD (wallet_transactions): ${cod.rows[0].total_cod?.toLocaleString('vi-VN')}đ`);
    
    // 3. Tính doanh thu từ đơn hàng (không bao gồm COD)
    const revenue = await pool.query(`
      SELECT 
        COUNT(DISTINCT dh.id) as total_orders,
        COALESCE(SUM(
          (SELECT SUM((don_gia - COALESCE(giam_gia, 0)) * so_luong)
           FROM don_hang_chi_tiet ct
           WHERE ct.don_hang_id = dh.id)
        ), 0) as total_revenue
      FROM don_hang dh
      WHERE dh.ca_lam_id = 55
        AND dh.trang_thai = 'PAID'
    `);
    console.log(`\n📦 Doanh thu từ đơn (từ chi tiết): ${parseInt(revenue.rows[0].total_revenue).toLocaleString('vi-VN')}đ`);
    console.log(`   Số đơn: ${revenue.rows[0].total_orders}`);
    
    // 4. Phân tích các đơn DELIVERY để tìm COD
    const delivery = await pool.query(`
      SELECT 
        dh.id,
        dh.order_type,
        di.delivery_fee,
        di.cod_amount,
        (SELECT SUM((don_gia - COALESCE(giam_gia, 0)) * so_luong)
         FROM don_hang_chi_tiet ct
         WHERE ct.don_hang_id = dh.id) as order_total
      FROM don_hang dh
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.ca_lam_id = 55
        AND dh.trang_thai = 'PAID'
        AND dh.order_type = 'DELIVERY'
      ORDER BY dh.id
    `);
    
    console.log(`\n🚚 Đơn giao hàng (${delivery.rows.length} đơn):`);
    let totalCod = 0;
    delivery.rows.forEach(d => {
      console.log(`  - Đơn #${d.id}: order=${parseInt(d.order_total || 0).toLocaleString('vi-VN')}đ, COD=${parseInt(d.cod_amount || 0).toLocaleString('vi-VN')}đ, fee=${parseInt(d.delivery_fee || 0).toLocaleString('vi-VN')}đ`);
      totalCod += parseInt(d.cod_amount || 0);
    });
    console.log(`  → Tổng COD: ${totalCod.toLocaleString('vi-VN')}đ`);
    
    // 5. Tính chênh lệch
    const revenueFromOrders = parseInt(revenue.rows[0].total_revenue);
    const codAmount = parseInt(cod.rows[0].total_cod);
    const fnAggResult = stats.net_amount;
    
    console.log('\n📈 Phân tích:');
    console.log(`  1. Doanh thu từ đơn: ${revenueFromOrders.toLocaleString('vi-VN')}đ`);
    console.log(`  2. COD settle: ${codAmount.toLocaleString('vi-VN')}đ`);
    console.log(`  3. Tổng (1+2): ${(revenueFromOrders + codAmount).toLocaleString('vi-VN')}đ`);
    console.log(`  4. fn_aggregate_shift: ${fnAggResult.toLocaleString('vi-VN')}đ`);
    console.log(`  5. Chênh lệch (4 - [1+2]): ${(fnAggResult - revenueFromOrders - codAmount).toLocaleString('vi-VN')}đ`);
    
    if (fnAggResult === revenueFromOrders + codAmount) {
      console.log('\n✅ Doanh thu ĐÚNG: fn_aggregate_shift = Doanh thu đơn + COD');
    } else {
      console.log('\n❌ Doanh thu SAI: fn_aggregate_shift ≠ Doanh thu đơn + COD');
      console.log('\n🔍 Vấn đề có thể là:');
      if (fnAggResult > revenueFromOrders) {
        console.log('  - fn_aggregate_shift đang cộng COD vào net_amount');
        console.log('  - Nên: net_amount = doanh thu từ đơn (KHÔNG bao gồm COD)');
      }
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

debug();
