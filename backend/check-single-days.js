import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkSingleDays() {
  try {
    console.log('🔍 Kiểm tra doanh thu TỪNG NGÀY riêng lẻ\n');
    
    // Kiểm tra ngày 25/10
    console.log('📅 NGÀY 25/10/2025:');
    console.log('─'.repeat(80));
    
    const day25Query = `
      SELECT 
        o.id,
        o.trang_thai,
        to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_str,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID'
        AND o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = '2025-10-25'
      ORDER BY (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
    `;
    
    const day25Result = await pool.query(day25Query);
    
    let total25 = 0;
    if (day25Result.rows.length === 0) {
      console.log('Không có đơn hàng nào');
    } else {
      day25Result.rows.forEach(row => {
        const revenue = parseFloat(row.revenue || 0);
        total25 += revenue;
        console.log(`ID ${row.id} | ${row.closed_at_str} | ${revenue.toLocaleString('vi-VN')} đ`);
      });
    }
    console.log('─'.repeat(80));
    console.log(`TỔNG 25/10: ${day25Result.rows.length} đơn | ${total25.toLocaleString('vi-VN')} đ`);
    console.log('');
    
    // Kiểm tra ngày 26/10
    console.log('📅 NGÀY 26/10/2025:');
    console.log('─'.repeat(80));
    
    const day26Query = `
      SELECT 
        o.id,
        o.trang_thai,
        to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_str,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID'
        AND o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = '2025-10-26'
      ORDER BY (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
    `;
    
    const day26Result = await pool.query(day26Query);
    
    let total26 = 0;
    day26Result.rows.forEach(row => {
      const revenue = parseFloat(row.revenue || 0);
      total26 += revenue;
      console.log(`ID ${row.id} | ${row.closed_at_str} | ${revenue.toLocaleString('vi-VN')} đ`);
    });
    console.log('─'.repeat(80));
    console.log(`TỔNG 26/10: ${day26Result.rows.length} đơn | ${total26.toLocaleString('vi-VN')} đ`);
    console.log('');
    
    // Test với API query cho từng ngày
    console.log('🔍 Test với API query (Ngày):');
    console.log('─'.repeat(80));
    
    const apiQueryDay = `
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
    
    // Test ngày 25
    const api25 = await pool.query(apiQueryDay, ['2025-10-25', '2025-10-25']);
    console.log(`API 25/10: ${api25.rows[0].total_orders} đơn | ${parseFloat(api25.rows[0].total_revenue).toLocaleString('vi-VN')} đ`);
    
    // Test ngày 26
    const api26 = await pool.query(apiQueryDay, ['2025-10-26', '2025-10-26']);
    console.log(`API 26/10: ${api26.rows[0].total_orders} đơn | ${parseFloat(api26.rows[0].total_revenue).toLocaleString('vi-VN')} đ`);
    console.log('');
    
    console.log('📌 So sánh với UI:');
    console.log(`UI hiển thị 25/10: 32.000 đ`);
    console.log(`Database 25/10:    ${total25.toLocaleString('vi-VN')} đ`);
    console.log(`UI hiển thị 26/10: 130.000 đ`);
    console.log(`Database 26/10:    ${total26.toLocaleString('vi-VN')} đ`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkSingleDays();

