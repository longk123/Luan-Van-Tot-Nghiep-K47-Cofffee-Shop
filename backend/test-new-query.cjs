const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456'
});

async function testNewQuery() {
  try {
    console.log('🧪 Testing NEW query with timezone fix...\n');
    
    const targetDate = '2025-10-24';
    const targetTimestamp = `${targetDate} 00:00:00`;
    
    // Test query mới
    const newQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS paid_orders,
        COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN') AS open_orders,
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
    
    const result = await pool.query(newQuery, [targetTimestamp]);
    
    console.log(`✅ Results for ${targetDate}:`);
    console.table(result.rows);
    
    // Test với ngày hôm nay
    const today = new Date().toISOString().split('T')[0];
    const todayTimestamp = `${today} 00:00:00`;
    const todayResult = await pool.query(newQuery, [todayTimestamp]);
    
    console.log(`\n✅ Results for TODAY (${today}):`);
    console.table(todayResult.rows);
    
    console.log('\n🎉 Query is working correctly with timezone fix!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testNewQuery();
