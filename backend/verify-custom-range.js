// Script để verify doanh thu từ 22/10 đến 25/10
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function verifyRevenue() {
  try {
    console.log('🔍 Kiểm tra doanh thu từ 22/10/2025 đến 25/10/2025\n');
    
    // Query 1: Tổng doanh thu theo ngày
    const dailyQuery = `
      SELECT 
        (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS date,
        COUNT(*) AS total_orders,
        COALESCE(SUM(
          (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
           FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
        ), 0) AS total_revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID' 
        AND o.closed_at IS NOT NULL
        AND (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= '2025-10-22'
        AND (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= '2025-10-25'
      GROUP BY (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      ORDER BY date
    `;
    
    const dailyResult = await pool.query(dailyQuery);
    
    console.log('📊 Doanh thu theo từng ngày:');
    console.log('─'.repeat(60));
    let totalRevenue = 0;
    let totalOrders = 0;
    
    dailyResult.rows.forEach(row => {
      const revenue = parseFloat(row.total_revenue);
      totalRevenue += revenue;
      totalOrders += parseInt(row.total_orders);
      console.log(`${row.date} | ${row.total_orders} đơn | ${revenue.toLocaleString('vi-VN')} đ`);
    });
    
    console.log('─'.repeat(60));
    console.log(`TỔNG CỘNG: ${totalOrders} đơn | ${totalRevenue.toLocaleString('vi-VN')} đ`);
    console.log('');
    
    // Query 2: Kiểm tra với API query MỚI (giống backend sau khi sửa)
    console.log('🔍 Kiểm tra với query MỚI giống API backend:\n');

    const apiQuery = `
      WITH date_range AS (
        SELECT
          ($1 || ' 00:00:00')::timestamp AS start_ts,
          ($2 || ' 23:59:59')::timestamp AS end_ts
      ),
      date_series AS (
        SELECT generate_series(
          (SELECT start_ts FROM date_range)::date,
          (SELECT end_ts FROM date_range)::date,
          '1 day'::interval
        )::date AS date
      ),
      daily_revenue AS (
        SELECT
          (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS date,
          COUNT(*) AS total_orders,
          COALESCE(SUM(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
          ), 0) AS total_revenue
        FROM don_hang o, date_range dr
        WHERE o.trang_thai = 'PAID'
          AND o.closed_at IS NOT NULL
          AND o.closed_at >= timezone('Asia/Ho_Chi_Minh', dr.start_ts)
          AND o.closed_at <= timezone('Asia/Ho_Chi_Minh', dr.end_ts)
        GROUP BY (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      )
      SELECT
        ds.date,
        COALESCE(dr.total_orders, 0) AS total_orders,
        COALESCE(dr.total_revenue, 0) AS total_revenue
      FROM date_series ds
      LEFT JOIN daily_revenue dr ON ds.date = dr.date
      ORDER BY ds.date
    `;
    
    const apiResult = await pool.query(apiQuery, ['2025-10-22', '2025-10-25']);
    
    console.log('📊 Kết quả từ API query:');
    console.log('─'.repeat(60));
    let apiTotalRevenue = 0;
    let apiTotalOrders = 0;
    
    apiResult.rows.forEach(row => {
      const revenue = parseFloat(row.total_revenue);
      apiTotalRevenue += revenue;
      apiTotalOrders += parseInt(row.total_orders);
      console.log(`${row.date.toISOString().split('T')[0]} | ${row.total_orders} đơn | ${revenue.toLocaleString('vi-VN')} đ`);
    });
    
    console.log('─'.repeat(60));
    console.log(`TỔNG CỘNG: ${apiTotalOrders} đơn | ${apiTotalRevenue.toLocaleString('vi-VN')} đ`);
    console.log('');
    
    // So sánh
    console.log('📌 So sánh với UI:');
    console.log(`UI hiển thị: 3.340.000 đ`);
    console.log(`Database:    ${apiTotalRevenue.toLocaleString('vi-VN')} đ`);
    console.log(`Chênh lệch:  ${(apiTotalRevenue - 3340000).toLocaleString('vi-VN')} đ`);
    
    if (apiTotalRevenue === 3340000) {
      console.log('✅ ĐÚNG!');
    } else {
      console.log('❌ SAI! Cần kiểm tra lại.');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.end();
  }
}

verifyRevenue();

