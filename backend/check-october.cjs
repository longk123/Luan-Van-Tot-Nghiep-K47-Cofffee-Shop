const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456'
});

async function checkMonth() {
  try {
    // Tháng 10/2025: từ 2025-10-01 đến 2025-10-31
    const startTimestamp = '2025-10-01 00:00:00';
    const endTimestamp = '2025-11-01 00:00:00';
    
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
        ), 0) AS total_revenue,
        MIN(o.opened_at) as first_order,
        MAX(o.opened_at) as last_order
      FROM don_hang o
      WHERE o.opened_at >= timezone('Asia/Ho_Chi_Minh', $1::timestamp)
        AND o.opened_at < timezone('Asia/Ho_Chi_Minh', $2::timestamp)
    `;
    
    const result = await pool.query(query, [startTimestamp, endTimestamp]);
    
    console.log('\n📊 Data for October 2025 (2025-10-01 to 2025-10-31):');
    console.table(result.rows);
    
    // Kiểm tra từng tuần
    const weekQuery = `
      SELECT 
        DATE_TRUNC('week', o.opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date as week_start,
        COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS paid_orders,
        COUNT(*) AS total_orders
      FROM don_hang o
      WHERE o.opened_at >= timezone('Asia/Ho_Chi_Minh', $1::timestamp)
        AND o.opened_at < timezone('Asia/Ho_Chi_Minh', $2::timestamp)
      GROUP BY week_start
      ORDER BY week_start
    `;
    
    const weekResult = await pool.query(weekQuery, [startTimestamp, endTimestamp]);
    console.log('\n📅 Orders by week in October 2025:');
    console.table(weekResult.rows);
    
    // Kiểm tra từng ngày có đơn
    const dailyQuery = `
      SELECT 
        (o.opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date as date,
        COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS paid_orders,
        COUNT(*) AS total_orders,
        COALESCE(SUM(
          CASE WHEN o.trang_thai = 'PAID' THEN 
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
          ELSE 0 END
        ), 0) AS revenue
      FROM don_hang o
      WHERE o.opened_at >= timezone('Asia/Ho_Chi_Minh', $1::timestamp)
        AND o.opened_at < timezone('Asia/Ho_Chi_Minh', $2::timestamp)
      GROUP BY date
      ORDER BY date DESC
      LIMIT 10
    `;
    
    const dailyResult = await pool.query(dailyQuery, [startTimestamp, endTimestamp]);
    console.log('\n📆 Orders by day (last 10 days with data):');
    console.table(dailyResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkMonth();
