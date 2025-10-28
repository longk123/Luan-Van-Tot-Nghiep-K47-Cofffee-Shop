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
    console.log('🔍 Kiểm tra doanh thu ngày 26/10/2025\n');
    
    // Query giống như backend API getRevenueChart
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
          ), 0) AS total_revenue,
          COALESCE(SUM(
            CASE WHEN o.order_type = 'DINE_IN' THEN
              (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
               FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
            ELSE 0 END
          ), 0) AS dine_in_revenue,
          COALESCE(SUM(
            CASE WHEN o.order_type = 'TAKEAWAY' THEN
              (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
               FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
            ELSE 0 END
          ), 0) AS takeaway_revenue
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
        COALESCE(dr.total_revenue, 0) AS total_revenue,
        COALESCE(dr.dine_in_revenue, 0) AS dine_in_revenue,
        COALESCE(dr.takeaway_revenue, 0) AS takeaway_revenue
      FROM date_series ds
      LEFT JOIN daily_revenue dr ON to_char(ds.date, 'YYYY-MM-DD') = dr.date_str
      ORDER BY ds.date
    `;
    
    const apiResult = await pool.query(apiQuery, ['2025-10-26', '2025-10-26']);
    
    console.log('📊 Kết quả API getRevenueChart:');
    console.log('─'.repeat(80));
    apiResult.rows.forEach(row => {
      console.log(`Ngày: ${row.date_str}`);
      console.log(`Tổng đơn: ${row.total_orders}`);
      console.log(`Tổng doanh thu: ${parseFloat(row.total_revenue).toLocaleString('vi-VN')} đ`);
      console.log(`Dine-in: ${parseFloat(row.dine_in_revenue).toLocaleString('vi-VN')} đ`);
      console.log(`Takeaway: ${parseFloat(row.takeaway_revenue).toLocaleString('vi-VN')} đ`);
    });
    console.log('─'.repeat(80));
    console.log('');
    
    // Query chi tiết từng đơn
    const detailQuery = `
      SELECT 
        o.id,
        o.order_type,
        to_char((o.opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS opened_at_str,
        to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_str,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID' 
        AND o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = '2025-10-26'
      ORDER BY o.closed_at
    `;
    
    const detailResult = await pool.query(detailQuery);
    
    console.log('📋 Chi tiết từng đơn hàng:');
    console.log('─'.repeat(80));
    console.log('ID | Loại | Mở lúc | Thanh toán lúc | Doanh thu');
    console.log('─'.repeat(80));
    
    let totalCheck = 0;
    detailResult.rows.forEach(row => {
      const revenue = parseFloat(row.revenue || 0);
      totalCheck += revenue;
      console.log(
        `${row.id.toString().padEnd(4)} | ${row.order_type.padEnd(8)} | ${row.opened_at_str} | ${row.closed_at_str} | ${revenue.toLocaleString('vi-VN').padStart(10)} đ`
      );
    });
    
    console.log('─'.repeat(80));
    console.log(`TỔNG KIỂM TRA: ${totalCheck.toLocaleString('vi-VN')} đ`);
    console.log('');
    
    // Query KPI API
    const kpiQuery = `
      SELECT
        -- Revenue
        COALESCE(SUM(
          (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
           FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
        ), 0) AS revenue_today,
        -- Orders
        COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS paid_orders,
        COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN') AS open_orders,
        COUNT(*) FILTER (WHERE o.trang_thai = 'CANCELLED') AS cancelled_orders,
        -- Order types
        COUNT(*) FILTER (WHERE o.order_type = 'DINE_IN' AND o.trang_thai = 'PAID') AS dine_in_orders,
        COUNT(*) FILTER (WHERE o.order_type = 'TAKEAWAY' AND o.trang_thai = 'PAID') AS takeaway_orders
      FROM don_hang o
      WHERE o.trang_thai = 'PAID'
        AND o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = '2025-10-26'
    `;
    
    const kpiResult = await pool.query(kpiQuery);
    
    console.log('📊 Kết quả API getOverviewKPIs:');
    console.log('─'.repeat(80));
    console.log(`Doanh thu: ${parseFloat(kpiResult.rows[0].revenue_today).toLocaleString('vi-VN')} đ`);
    console.log(`Đơn đã thanh toán: ${kpiResult.rows[0].paid_orders}`);
    console.log(`Đơn chờ: ${kpiResult.rows[0].open_orders}`);
    console.log(`Đơn hủy: ${kpiResult.rows[0].cancelled_orders}`);
    console.log(`Dine-in: ${kpiResult.rows[0].dine_in_orders} đơn`);
    console.log(`Takeaway: ${kpiResult.rows[0].takeaway_orders} đơn`);
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verifyRevenue();

