// Debug: Tìm nguyên nhân chênh lệch 30.000đ
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function debug() {
  const shiftId = 55;
  
  try {
    console.log('🔍 Debug chênh lệch tiền mặt...\n');
    
    // 1. Tính từ order_payment (CASH, CAPTURED)
    const opResult = await pool.query(`
      SELECT 
        op.order_id,
        op.amount,
        op.status,
        dh.trang_thai
      FROM order_payment op
      JOIN don_hang dh ON dh.id = op.order_id
      WHERE dh.ca_lam_id = $1
        AND op.method_code = 'CASH'
        AND op.status = 'CAPTURED'
      ORDER BY op.order_id
    `, [shiftId]);
    
    let totalOP = 0;
    console.log('📋 Order Payments (CASH, CAPTURED):');
    opResult.rows.forEach(row => {
      console.log(`   Đơn #${row.order_id}: ${parseInt(row.amount).toLocaleString('vi-VN')}đ`);
      totalOP += parseInt(row.amount);
    });
    console.log(`   Tổng: ${totalOP.toLocaleString('vi-VN')}đ\n`);
    
    // 2. Tính refunds cho các payment này
    const refundResult = await pool.query(`
      SELECT 
        r.payment_id,
        r.amount,
        op.order_id
      FROM order_payment_refund r
      JOIN order_payment op ON op.id = r.payment_id
      JOIN don_hang dh ON dh.id = op.order_id
      WHERE dh.ca_lam_id = $1
        AND op.method_code = 'CASH'
      ORDER BY op.order_id
    `, [shiftId]);
    
    let totalRefunds = 0;
    if (refundResult.rows.length > 0) {
      console.log('📋 Refunds từ CASH payments:');
      refundResult.rows.forEach(row => {
        console.log(`   Payment #${row.payment_id} (Đơn #${row.order_id}): -${parseInt(row.amount).toLocaleString('vi-VN')}đ`);
        totalRefunds += parseInt(row.amount);
      });
      console.log(`   Tổng refunds: ${totalRefunds.toLocaleString('vi-VN')}đ\n`);
    }
    
    // 3. Tính từ fn_aggregate_shift
    const aggResult = await pool.query(`SELECT fn_aggregate_shift($1) AS stats`, [shiftId]);
    const stats = aggResult.rows[0].stats;
    
    console.log('📊 Từ fn_aggregate_shift:');
    console.log(`   - cash_amount: ${parseInt(stats.cash_amount || 0).toLocaleString('vi-VN')}đ\n`);
    
    // 4. So sánh
    const expected = totalOP - totalRefunds;
    const actual = parseInt(stats.cash_amount || 0);
    const diff = actual - expected;
    
    console.log('='.repeat(60));
    console.log('📊 SO SÁNH:');
    console.log(`   order_payment (CASH): ${totalOP.toLocaleString('vi-VN')}đ`);
    console.log(`   - Refunds: ${totalRefunds.toLocaleString('vi-VN')}đ`);
    console.log(`   = Kỳ vọng: ${expected.toLocaleString('vi-VN')}đ`);
    console.log(`   fn_aggregate_shift: ${actual.toLocaleString('vi-VN')}đ`);
    console.log(`   Chênh lệch: ${diff.toLocaleString('vi-VN')}đ\n`);
    
    if (diff !== 0) {
      console.log('⚠️ Có chênh lệch! Có thể do:');
      console.log('   1. Function đang tính từ payment_transaction thay vì order_payment');
      console.log('   2. Có đơn có nhiều payment CASH');
      console.log('   3. Có refunds chưa được trừ\n');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

debug();

