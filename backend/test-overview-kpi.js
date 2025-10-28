// Test script để verify API getOverviewKPIs trả về đúng dữ liệu
import { pool } from './src/db.js';

async function testOverviewKPIs() {
  try {
    const targetDate = '2025-10-26';
    
    console.log('🔍 Testing getOverviewKPIs for date:', targetDate);
    console.log('='.repeat(80));
    
    const sql = `
      WITH today_revenue AS (
        -- Doanh thu hôm nay: chỉ tính đơn PAID, dùng closed_at
        SELECT
          COUNT(*) AS paid_orders,
          COALESCE(SUM(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
          ), 0) AS today_revenue
        FROM don_hang o
        WHERE o.trang_thai = 'PAID'
          AND o.closed_at IS NOT NULL
          AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = $1
      ),
      today_orders AS (
        -- Số đơn open/cancelled: tính từ opened_at
        SELECT
          COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN') AS open_orders,
          COUNT(*) FILTER (WHERE o.trang_thai = 'CANCELLED') AS cancelled_orders,
          COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN' AND o.order_type = 'DINE_IN') AS dine_in_orders,
          COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN' AND o.order_type = 'TAKEAWAY') AS takeaway_orders
        FROM don_hang o
        WHERE o.opened_at >= timezone('Asia/Ho_Chi_Minh', ($1 || ' 00:00:00')::timestamp)
          AND o.opened_at < timezone('Asia/Ho_Chi_Minh', ($1 || ' 00:00:00')::timestamp + INTERVAL '1 day')
      ),
      active_tables_now AS (
        -- Bàn đang dùng: tính theo thời gian thực
        SELECT COUNT(DISTINCT o.ban_id) AS active_tables
        FROM don_hang o
        WHERE o.trang_thai IN ('OPEN', 'PAID')
          AND o.ban_id IS NOT NULL
      ),
      yesterday_stats AS (
        SELECT
          COALESCE(SUM(
            CASE WHEN o.trang_thai = 'PAID' THEN
              (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
               FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
            ELSE 0 END
          ), 0) AS yesterday_revenue,
          COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS yesterday_orders
        FROM don_hang o
        WHERE o.trang_thai = 'PAID'
          AND o.closed_at IS NOT NULL
          AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = to_char((($1::date - INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD')
      ),
      kitchen_queue AS (
        SELECT COUNT(*) AS queue_count
        FROM don_hang_chi_tiet d
        INNER JOIN don_hang o ON o.id = d.don_hang_id
        WHERE d.trang_thai_che_bien IN ('QUEUED', 'MAKING')
          AND o.trang_thai = 'OPEN'
      ),
      total_tables AS (
        SELECT COUNT(*) AS total_tables
        FROM ban
        WHERE trang_thai != 'KHOA'
      )
      SELECT
        tr.paid_orders,
        tod.open_orders,
        tod.cancelled_orders,
        tr.today_revenue,
        atn.active_tables,
        tod.dine_in_orders,
        tod.takeaway_orders,
        ys.yesterday_revenue,
        ys.yesterday_orders,
        kq.queue_count,
        tt.total_tables,
        CASE
          WHEN ys.yesterday_revenue > 0 THEN
            ROUND(((tr.today_revenue - ys.yesterday_revenue) / ys.yesterday_revenue * 100)::numeric, 1)
          ELSE 0
        END AS revenue_change_percent,
        CASE
          WHEN ys.yesterday_orders > 0 THEN
            ROUND(((tr.paid_orders - ys.yesterday_orders) / ys.yesterday_orders * 100)::numeric, 1)
          ELSE 0
        END AS orders_change_percent
      FROM today_revenue tr
      CROSS JOIN today_orders tod
      CROSS JOIN active_tables_now atn
      CROSS JOIN yesterday_stats ys
      CROSS JOIN kitchen_queue kq
      CROSS JOIN total_tables tt
    `;
    
    const { rows } = await pool.query(sql, [targetDate]);
    const result = rows[0];
    
    console.log('📊 KPI Results:');
    console.log('─'.repeat(80));
    console.log('💰 Doanh thu hôm nay:', result.today_revenue?.toLocaleString(), 'đ');
    console.log('📦 Đơn đã thanh toán:', result.paid_orders);
    console.log('📂 Đơn đang mở:', result.open_orders);
    console.log('❌ Đơn đã hủy:', result.cancelled_orders);
    console.log('🍽️  Bàn đang dùng:', result.active_tables, '/', result.total_tables);
    console.log('🏪 Đơn tại chỗ:', result.dine_in_orders);
    console.log('🥡 Đơn mang đi:', result.takeaway_orders);
    console.log('👨‍🍳 Món đang chờ/làm:', result.queue_count);
    console.log('─'.repeat(80));
    console.log('📈 So với hôm qua:');
    console.log('   Doanh thu hôm qua:', result.yesterday_revenue?.toLocaleString(), 'đ');
    console.log('   Đơn hôm qua:', result.yesterday_orders);
    console.log('   Thay đổi doanh thu:', result.revenue_change_percent, '%');
    console.log('   Thay đổi đơn hàng:', result.orders_change_percent, '%');
    console.log('='.repeat(80));
    
    // Verify chi tiết các đơn PAID ngày 26/10
    const detailQuery = `
      SELECT 
        o.id,
        o.order_type,
        to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_str,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID' 
        AND o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = $1
      ORDER BY o.closed_at
    `;
    
    const { rows: details } = await pool.query(detailQuery, [targetDate]);
    
    console.log('\n📋 Chi tiết các đơn PAID ngày', targetDate);
    console.log('─'.repeat(80));
    details.forEach((order, idx) => {
      console.log(`${idx + 1}. Đơn #${order.id} - ${order.order_type} - ${order.closed_at_str} - ${order.revenue?.toLocaleString()} đ`);
    });
    console.log('─'.repeat(80));
    console.log('Tổng:', details.reduce((sum, o) => sum + parseFloat(o.revenue || 0), 0).toLocaleString(), 'đ');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testOverviewKPIs();

