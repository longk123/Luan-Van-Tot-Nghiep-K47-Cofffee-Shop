/**
 * Test script: Kiểm tra type của tong_tien
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

async function testTypes() {
  try {
    console.log('🔍 Kiểm tra type của tong_tien...\n');
    
    // 1. Lấy ca hiện tại
    const shiftResult = await pool.query(`
      SELECT id, started_at, ended_at
      FROM ca_lam
      ORDER BY started_at DESC
      LIMIT 1
    `);
    
    const shift = shiftResult.rows[0];
    
    // 2. Query giống với getCurrentShiftOrders
    const ordersResult = await pool.query(`
      SELECT 
        dh.id,
        dh.trang_thai,
        COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien,
        COUNT(ct.id) AS so_mon
      FROM don_hang dh
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN users u ON u.user_id = dh.nhan_vien_id
      LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      WHERE 
        (dh.trang_thai = 'PAID' 
         AND dh.closed_at >= $1
         AND dh.closed_at <= COALESCE($2, NOW()))
        OR
        (dh.trang_thai = 'OPEN'
         AND dh.opened_at <= COALESCE($2, NOW()))
        OR
        (dh.trang_thai = 'CANCELLED'
         AND dh.closed_at >= $1
         AND dh.closed_at <= COALESCE($2, NOW()))
      GROUP BY dh.id, dh.trang_thai
      ORDER BY dh.id
    `, [shift.started_at, shift.ended_at]);
    
    console.log('📊 Các đơn trong ca:\n');
    
    ordersResult.rows.forEach((order) => {
      const tongTien = order.tong_tien;
      console.log(`Đơn #${order.id} (${order.trang_thai}):`);
      console.log(`  tong_tien RAW:`, tongTien);
      console.log(`  typeof:`, typeof tongTien);
      console.log(`  constructor:`, tongTien.constructor.name);
      
      // Thử convert
      const asNumber = Number(tongTien);
      const asParseFloat = parseFloat(tongTien);
      const asString = String(tongTien);
      
      console.log(`  Number():`, asNumber);
      console.log(`  parseFloat():`, asParseFloat);
      console.log(`  String():`, asString);
      console.log('');
    });
    
    // Test tính tổng
    console.log('💰 Test tính tổng doanh thu:\n');
    
    const paidOrders = ordersResult.rows.filter(o => o.trang_thai === 'PAID');
    
    console.log('Các đơn PAID:');
    paidOrders.forEach(o => {
      console.log(`  Đơn #${o.id}: ${o.tong_tien} (${typeof o.tong_tien})`);
    });
    
    const totalWithReduce = paidOrders.reduce((sum, o) => sum + (o.tong_tien || 0), 0);
    console.log('\nTổng với reduce:', totalWithReduce);
    console.log('typeof:', typeof totalWithReduce);
    
    const totalWithNumber = paidOrders.reduce((sum, o) => sum + Number(o.tong_tien || 0), 0);
    console.log('\nTổng với Number():', totalWithNumber);
    
    const totalWithParseFloat = paidOrders.reduce((sum, o) => sum + parseFloat(o.tong_tien || 0), 0);
    console.log('Tổng với parseFloat():', totalWithParseFloat);
    
    console.log('\n✅ Test hoàn tất!');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testTypes();
