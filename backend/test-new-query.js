import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function testNewQuery() {
  try {
    console.log('🔍 Testing new query with string comparison\n');
    
    const query = `
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
        ds.date,
        to_char(ds.date, 'YYYY-MM-DD') AS date_str,
        COALESCE(dr.total_orders, 0) AS total_orders,
        COALESCE(dr.total_revenue, 0) AS total_revenue
      FROM date_series ds
      LEFT JOIN daily_revenue dr ON to_char(ds.date, 'YYYY-MM-DD') = dr.date_str
      ORDER BY ds.date
    `;
    
    const result = await pool.query(query, ['2025-10-22', '2025-10-25']);
    
    console.log('Results:');
    console.log('─'.repeat(60));
    let total = 0;
    result.rows.forEach(row => {
      const revenue = parseFloat(row.total_revenue);
      total += revenue;
      console.log(`${row.date_str} | ${row.total_orders} đơn | ${revenue.toLocaleString('vi-VN')} đ`);
    });
    console.log('─'.repeat(60));
    console.log(`TỔNG: ${total.toLocaleString('vi-VN')} đ`);
    console.log('');
    console.log(total === 3340000 ? '✅ ĐÚNG!' : '❌ SAI!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testNewQuery();

