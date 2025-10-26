const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function testQuery() {
  try {
    const startDate = '2025-10-26';
    const endDate = '2025-10-26';
    
    console.log('\n🔍 Testing query với params:', { startDate, endDate });
    
    // Query giống API
    const result = await pool.query(`
      SELECT 
        order_id,
        closed_at,
        doanh_thu,
        gia_von_mon,
        gia_von_topping,
        tong_gia_von,
        loi_nhuan
      FROM v_profit_with_topping_cost
      WHERE closed_at::date >= $1::date
        AND closed_at::date <= $2::date
      ORDER BY closed_at DESC
    `, [startDate, endDate]);
    
    console.log('\n📊 Kết quả:', result.rows.length, 'đơn');
    
    if (result.rows.length === 0) {
      console.log('\n❌ Không có dữ liệu! Kiểm tra view...');
      
      // Check view có data không
      const viewCheck = await pool.query(`
        SELECT COUNT(*) as total
        FROM v_profit_with_topping_cost
      `);
      console.log('Tổng số dòng trong view:', viewCheck.rows[0].total);
      
      // Check đơn hàng hôm nay
      const todayOrders = await pool.query(`
        SELECT id, closed_at, trang_thai
        FROM don_hang
        WHERE closed_at::date = $1::date
        ORDER BY closed_at DESC
      `, [startDate]);
      
      console.log('\nĐơn hàng có closed_at = 26/10/2025:', todayOrders.rows.length, 'đơn');
      todayOrders.rows.forEach(row => {
        console.log(`- Đơn #${row.id}: ${row.closed_at} | ${row.trang_thai}`);
      });
      
    } else {
      result.rows.forEach(row => {
        console.log(`- Đơn #${row.order_id}: DT=${row.doanh_thu}đ, Lợi nhuận=${row.loi_nhuan}đ`);
      });
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

testQuery();
