const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkOctober2025() {
  try {
    // Kiểm tra tất cả đơn hàng tháng 10/2025
    const allOrders = await pool.query(`
      SELECT 
        id,
        opened_at,
        closed_at,
        trang_thai,
        order_type
      FROM don_hang
      WHERE opened_at >= '2025-10-01'
        AND opened_at < '2025-11-01'
      ORDER BY opened_at DESC
    `);
    
    console.log('\n📅 Tất cả đơn hàng tháng 10/2025:', allOrders.rows.length, 'đơn');
    allOrders.rows.forEach(order => {
      console.log(`- Đơn #${order.id}: ${order.opened_at} | ${order.trang_thai} | ${order.order_type}`);
    });
    
    // Kiểm tra đơn hàng đã thanh toán (có closed_at)
    const paidOrders = await pool.query(`
      SELECT 
        id,
        closed_at::date as ngay,
        COUNT(*) as so_don
      FROM don_hang
      WHERE closed_at >= '2025-10-01'
        AND closed_at < '2025-11-01'
        AND trang_thai = 'PAID'
      GROUP BY closed_at::date, id
      ORDER BY closed_at::date DESC
    `);
    
    console.log('\n💰 Đơn đã thanh toán (PAID) có closed_at trong tháng 10/2025:');
    paidOrders.rows.forEach(row => {
      console.log(`- ${row.ngay}: Đơn #${row.id}`);
    });
    
    // Kiểm tra khoảng 20-26/10/2025
    const weekOrders = await pool.query(`
      SELECT 
        id,
        closed_at,
        trang_thai
      FROM don_hang
      WHERE closed_at::date >= '2025-10-20'
        AND closed_at::date <= '2025-10-26'
      ORDER BY closed_at DESC
    `);
    
    console.log('\n📊 Đơn hàng 20-26/10/2025 (7 ngày gần đây):', weekOrders.rows.length, 'đơn');
    weekOrders.rows.forEach(order => {
      console.log(`- Đơn #${order.id}: ${order.closed_at} | ${order.trang_thai}`);
    });
    
    // Test query giống API
    const profitData = await pool.query(`
      SELECT 
        order_id,
        closed_at,
        doanh_thu,
        gia_von_mon,
        gia_von_topping,
        tong_gia_von,
        loi_nhuan
      FROM v_profit_with_topping_cost
      WHERE closed_at::date >= '2025-10-20'::date
        AND closed_at::date <= '2025-10-26'::date
      ORDER BY closed_at DESC
    `);
    
    console.log('\n📈 Kết quả từ view v_profit_with_topping_cost (20-26/10):', profitData.rows.length, 'đơn');
    profitData.rows.forEach(row => {
      console.log(`- Đơn #${row.order_id}: DT=${row.doanh_thu}đ, GV Món=${row.gia_von_mon}đ, GV Topping=${row.gia_von_topping}đ, Lợi nhuận=${row.loi_nhuan}đ`);
    });
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

checkOctober2025();
