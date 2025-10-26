/**
 * Test script: Kiểm tra tính toán doanh thu
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coffee_shop',
});

async function testRevenue() {
  try {
    console.log('🔍 Kiểm tra tính toán doanh thu...\n');
    
    // 1. Lấy ca hiện tại
    const shiftResult = await pool.query(`
      SELECT id, started_at, ended_at, status
      FROM ca_lam
      ORDER BY started_at DESC
      LIMIT 1
    `);
    
    const shift = shiftResult.rows[0];
    console.log('📅 Ca hiện tại:', shift.id, '\n');
    
    // 2. Lấy các đơn PAID trong ca
    const ordersResult = await pool.query(`
      SELECT 
        dh.id,
        dh.trang_thai,
        COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien_chi_tiet,
        COUNT(ct.id) AS so_chi_tiet
      FROM don_hang dh
      LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      WHERE 
        dh.trang_thai = 'PAID'
        AND dh.closed_at >= $1
        AND dh.closed_at <= COALESCE($2, NOW())
      GROUP BY dh.id, dh.trang_thai
      ORDER BY dh.id
    `, [shift.started_at, shift.ended_at]);
    
    console.log('📊 Đơn PAID trong ca:\n');
    
    let totalRevenue = 0;
    ordersResult.rows.forEach((order) => {
      console.log(`Đơn #${order.id}:`);
      console.log(`  Số chi tiết: ${order.so_chi_tiet}`);
      console.log(`  Tổng tiền: ${parseFloat(order.tong_tien_chi_tiet).toLocaleString('vi-VN')} đ\n`);
      totalRevenue += parseFloat(order.tong_tien_chi_tiet);
    });
    
    console.log('💰 TỔNG DOANH THU:', totalRevenue.toLocaleString('vi-VN'), 'đ\n');
    
    // 3. Kiểm tra chi tiết một đơn cụ thể
    if (ordersResult.rows.length > 0) {
      const firstOrder = ordersResult.rows[0];
      console.log(`🔍 Chi tiết đơn #${firstOrder.id}:\n`);
      
      const detailResult = await pool.query(`
        SELECT 
          ct.id,
          ct.ten_mon_snapshot,
          ct.so_luong,
          ct.don_gia,
          ct.giam_gia,
          (ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)) AS line_total,
          ct.trang_thai_che_bien
        FROM don_hang_chi_tiet ct
        WHERE ct.don_hang_id = $1
        ORDER BY ct.id
      `, [firstOrder.id]);
      
      detailResult.rows.forEach((item) => {
        console.log(`  ${item.ten_mon_snapshot}`);
        console.log(`    SL: ${item.so_luong}, Đơn giá: ${item.don_gia}, Giảm giá: ${item.giam_gia || 0}`);
        console.log(`    Thành tiền: ${parseFloat(item.line_total).toLocaleString('vi-VN')} đ`);
        console.log(`    Trạng thái: ${item.trang_thai_che_bien}\n`);
      });
      
      // Kiểm tra toppings
      const toppingsResult = await pool.query(`
        SELECT 
          to_opt.id,
          to_opt.option_name,
          to_opt.option_value,
          to_opt.price
        FROM topping_options to_opt
        WHERE to_opt.line_item_id IN (
          SELECT id FROM don_hang_chi_tiet WHERE don_hang_id = $1
        )
      `, [firstOrder.id]);
      
      if (toppingsResult.rows.length > 0) {
        console.log(`  🍨 Toppings/Options:`);
        toppingsResult.rows.forEach((topping) => {
          console.log(`    - ${topping.option_name}: ${topping.option_value} (+${topping.price}đ)`);
        });
        console.log('');
      }
    }
    
    console.log('✅ Test hoàn tất!');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testRevenue();
