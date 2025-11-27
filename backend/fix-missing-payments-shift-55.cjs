// Fix script: Tạo payment transaction cho các đơn PAID thiếu payment trong ca #55
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function fix() {
  const shiftId = 55;
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing missing payment transactions for Shift #55...\n');
    console.log('='.repeat(60));
    
    await client.query('BEGIN');
    
    // 1. Lấy danh sách đơn PAID trong ca nhưng không có payment transaction
    const ordersResult = await client.query(`
      SELECT 
        dh.id,
        dh.order_type,
        dh.closed_at,
        settlement.grand_total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1
        AND dh.trang_thai = 'PAID'
        AND NOT EXISTS (
          SELECT 1 FROM payment_transaction pt WHERE pt.order_id = dh.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM order_payment op WHERE op.order_id = dh.id
        )
      ORDER BY dh.id
    `, [shiftId]);
    
    console.log(`📦 Tìm thấy ${ordersResult.rows.length} đơn thiếu payment transaction:\n`);
    
    if (ordersResult.rows.length === 0) {
      console.log('✅ Không có đơn nào cần fix!');
      await client.query('COMMIT');
      return;
    }
    
    let fixedCount = 0;
    let totalAmount = 0;
    
    for (const order of ordersResult.rows) {
      const grandTotal = parseInt(order.grand_total || 0);
      totalAmount += grandTotal;
      
      // Tạo payment_transaction
      const refCode = `ORD${order.id}-FIX-${Date.now()}`;
      await client.query(`
        INSERT INTO payment_transaction (
          order_id, 
          payment_method_code, 
          ref_code, 
          amount, 
          status, 
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'PAID', COALESCE($5, NOW()), COALESCE($5, NOW()))
      `, [
        order.id,
        'CASH', // Mặc định là CASH vì trong ca chỉ có tiền mặt
        refCode,
        grandTotal,
        order.closed_at || new Date()
      ]);
      
      // Tạo order_payment (để tương thích với hệ thống mới)
      await client.query(`
        INSERT INTO order_payment (
          order_id,
          method_code,
          amount,
          status,
          created_at
        )
        VALUES ($1, $2, $3, 'CAPTURED', COALESCE($4, NOW()))
      `, [
        order.id,
        'CASH',
        grandTotal,
        order.closed_at || new Date()
      ]);
      
      console.log(`   ✅ Đơn #${order.id} (${order.order_type}): ${grandTotal.toLocaleString('vi-VN')}đ`);
      fixedCount++;
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Đã fix ${fixedCount} đơn`);
    console.log(`💰 Tổng tiền: ${totalAmount.toLocaleString('vi-VN')}đ`);
    console.log('\n🎉 Hoàn tất! Vui lòng refresh và kiểm tra lại "Đóng ca".\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fix();

