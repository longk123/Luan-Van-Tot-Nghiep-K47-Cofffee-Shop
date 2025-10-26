const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456'
});

async function checkOrders() {
  try {
    console.log('🔍 Checking orders for 2025-10-24...\n');
    
    // Kiểm tra đơn hàng mở ngày 24/10
    const openedQuery = `
      SELECT 
        id, 
        opened_at,
        closed_at,
        trang_thai,
        order_type,
        DATE(opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as open_date,
        DATE(closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as close_date
      FROM don_hang 
      WHERE DATE(opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = '2025-10-24'
      ORDER BY id DESC
      LIMIT 10
    `;
    
    const openedResult = await pool.query(openedQuery);
    console.log(`📋 Orders OPENED on 2025-10-24: ${openedResult.rows.length} orders`);
    console.table(openedResult.rows);
    
    // Kiểm tra đơn hàng thanh toán ngày 24/10
    const paidQuery = `
      SELECT 
        id, 
        opened_at,
        closed_at,
        trang_thai,
        order_type,
        DATE(opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as open_date,
        DATE(closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as close_date
      FROM don_hang 
      WHERE DATE(closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = '2025-10-24'
        AND trang_thai = 'PAID'
      ORDER BY id DESC
      LIMIT 10
    `;
    
    const paidResult = await pool.query(paidQuery);
    console.log(`\n💰 Orders PAID on 2025-10-24: ${paidResult.rows.length} orders`);
    console.table(paidResult.rows);
    
    // Kiểm tra KPI query
    const kpiQuery = `
      WITH today_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS paid_orders,
          COALESCE(SUM(
            CASE WHEN o.trang_thai = 'PAID' THEN 
              (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
               FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
            ELSE 0 END
          ), 0) AS today_revenue
        FROM don_hang o
        WHERE DATE(o.opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = '2025-10-24'
      )
      SELECT * FROM today_stats
    `;
    
    const kpiResult = await pool.query(kpiQuery);
    console.log('\n📊 KPI Stats for 2025-10-24:');
    console.table(kpiResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkOrders();
