const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456'
});

async function checkToday() {
  try {
    const today = '2025-10-26';
    const todayTimestamp = `${today} 00:00:00`;
    
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS paid_orders,
        COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN') AS open_orders,
        COUNT(*) AS total_orders,
        COALESCE(SUM(
          CASE WHEN o.trang_thai = 'PAID' THEN 
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
          ELSE 0 END
        ), 0) AS today_revenue
      FROM don_hang o
      WHERE o.opened_at >= timezone('Asia/Ho_Chi_Minh', $1::timestamp)
        AND o.opened_at < timezone('Asia/Ho_Chi_Minh', $1::timestamp + INTERVAL '1 day')
    `;
    
    const result = await pool.query(query, [todayTimestamp]);
    
    console.log(`\n📊 Data for ${today}:`);
    console.table(result.rows);
    
    if (result.rows[0].total_orders === '0') {
      console.log('\n❌ No orders found for today (2025-10-26)');
      console.log('💡 Try selecting date 2025-10-24 which has 34 orders');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkToday();
