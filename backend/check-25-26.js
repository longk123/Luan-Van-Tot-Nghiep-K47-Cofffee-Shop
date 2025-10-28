import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkRevenue() {
  try {
    console.log('🔍 Kiểm tra doanh thu từ 25/10 đến 26/10\n');
    
    // Query chi tiết từng đơn
    const detailQuery = `
      SELECT 
        o.id,
        o.opened_at,
        o.closed_at,
        (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS closed_at_vn,
        to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_str,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID' 
        AND o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') >= '2025-10-25'
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') <= '2025-10-26'
      ORDER BY (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
    `;
    
    const detailResult = await pool.query(detailQuery);
    
    console.log('📊 Chi tiết từng đơn hàng:');
    console.log('─'.repeat(80));
    
    let total = 0;
    let count25 = 0, revenue25 = 0;
    let count26 = 0, revenue26 = 0;
    
    detailResult.rows.forEach(row => {
      const revenue = parseFloat(row.revenue);
      total += revenue;
      
      const date = row.closed_at_str.split(' ')[0];
      console.log(`ID ${row.id} | ${row.closed_at_str} | ${revenue.toLocaleString('vi-VN')} đ`);
      
      if (date === '2025-10-25') {
        count25++;
        revenue25 += revenue;
      } else if (date === '2025-10-26') {
        count26++;
        revenue26 += revenue;
      }
    });
    
    console.log('─'.repeat(80));
    console.log(`\n📌 Tổng kết:`);
    console.log(`25/10: ${count25} đơn | ${revenue25.toLocaleString('vi-VN')} đ`);
    console.log(`26/10: ${count26} đơn | ${revenue26.toLocaleString('vi-VN')} đ`);
    console.log(`TỔNG: ${detailResult.rows.length} đơn | ${total.toLocaleString('vi-VN')} đ`);
    console.log('');
    
    // Test với API query
    console.log('🔍 Test với API query:\n');
    
    const apiQuery = `
      WITH date_series AS (
        SELECT d::date AS date
        FROM generate_series(
          $1::text::date,
          $2::text::date,
          '1 day'::interval
        ) AS d
      ),
      daily_revenue AS (
        SELECT
          to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS date_str,
          COUNT(*) AS total_orders,
          COALESCE(SUM(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
          ), 0) AS total_revenue
        FROM don_hang o
        WHERE o.trang_thai = 'PAID'
          AND o.closed_at IS NOT NULL
          AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') >= $1
          AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') <= $2
        GROUP BY to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD')
      )
      SELECT
        to_char(ds.date, 'YYYY-MM-DD') AS date_str,
        COALESCE(dr.total_orders, 0) AS total_orders,
        COALESCE(dr.total_revenue, 0) AS total_revenue
      FROM date_series ds
      LEFT JOIN daily_revenue dr ON to_char(ds.date, 'YYYY-MM-DD') = dr.date_str
      ORDER BY ds.date
    `;
    
    const apiResult = await pool.query(apiQuery, ['2025-10-25', '2025-10-26']);
    
    console.log('📊 Kết quả API:');
    console.log('─'.repeat(60));
    let apiTotal = 0;
    apiResult.rows.forEach(row => {
      const revenue = parseFloat(row.total_revenue);
      apiTotal += revenue;
      console.log(`${row.date_str} | ${row.total_orders} đơn | ${revenue.toLocaleString('vi-VN')} đ`);
    });
    console.log('─'.repeat(60));
    console.log(`TỔNG: ${apiTotal.toLocaleString('vi-VN')} đ`);
    console.log('');
    
    console.log('📌 So sánh:');
    console.log(`UI hiển thị: 158.000 đ`);
    console.log(`Database:    ${apiTotal.toLocaleString('vi-VN')} đ`);
    console.log(`Bạn nói:     162.000 đ`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkRevenue();

