import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export default {
  /**
   * Lấy KPI tổng quan cho Manager Dashboard
   * @param {string} date - Ngày cần lấy KPI (YYYY-MM-DD)
   */
  async getOverviewKPIs(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    // Tạo timestamp string với format: YYYY-MM-DD 00:00:00
    const targetTimestamp = `${targetDate} 00:00:00`;
    
    const sql = `
      WITH today_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE o.trang_thai = 'PAID') AS paid_orders,
          COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN') AS open_orders,
          COUNT(*) FILTER (WHERE o.trang_thai = 'CANCELLED') AS cancelled_orders,
          COALESCE(SUM(
            CASE WHEN o.trang_thai = 'PAID' THEN 
              (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
               FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
            ELSE 0 END
          ), 0) AS today_revenue,
          COUNT(DISTINCT o.ban_id) FILTER (WHERE o.trang_thai IN ('OPEN', 'PAID') AND o.ban_id IS NOT NULL) AS active_tables,
          COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN' AND o.order_type = 'DINE_IN') AS dine_in_orders,
          COUNT(*) FILTER (WHERE o.trang_thai = 'OPEN' AND o.order_type = 'TAKEAWAY') AS takeaway_orders
        FROM don_hang o
        WHERE o.opened_at >= timezone('Asia/Ho_Chi_Minh', $1::timestamp)
          AND o.opened_at < timezone('Asia/Ho_Chi_Minh', $1::timestamp + INTERVAL '1 day')
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
        WHERE o.opened_at >= timezone('Asia/Ho_Chi_Minh', $1::timestamp - INTERVAL '1 day')
          AND o.opened_at < timezone('Asia/Ho_Chi_Minh', $1::timestamp)
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
        ts.paid_orders,
        ts.open_orders,
        ts.cancelled_orders,
        ts.today_revenue,
        ts.active_tables,
        ts.dine_in_orders,
        ts.takeaway_orders,
        ys.yesterday_revenue,
        ys.yesterday_orders,
        kq.queue_count,
        tt.total_tables,
        CASE 
          WHEN ys.yesterday_revenue > 0 THEN 
            ROUND(((ts.today_revenue - ys.yesterday_revenue) / ys.yesterday_revenue * 100)::numeric, 1)
          ELSE 0 
        END AS revenue_change_percent,
        CASE 
          WHEN ys.yesterday_orders > 0 THEN 
            ROUND(((ts.paid_orders - ys.yesterday_orders) / ys.yesterday_orders * 100)::numeric, 1)
          ELSE 0 
        END AS orders_change_percent
      FROM today_stats ts
      CROSS JOIN yesterday_stats ys
      CROSS JOIN kitchen_queue kq
      CROSS JOIN total_tables tt
    `;
    
    const { rows } = await query(sql, [targetTimestamp]);
    return rows[0] || {};
  },

  /**
   * Lấy dữ liệu doanh thu theo ngày (7 ngày gần nhất)
   */
  async getRevenueChart(days = 7) {
    // Tính ngày bắt đầu
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const startDateStr = startDate.toISOString().split('T')[0];
    const startTimestamp = `${startDateStr} 00:00:00`;
    
    const sql = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days - 1} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date
      ),
      daily_revenue AS (
        SELECT 
          (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS date,
          COUNT(*) AS total_orders,
          SUM(
            CASE WHEN o.order_type = 'DINE_IN' THEN 1 ELSE 0 END
          ) AS dine_in_orders,
          SUM(
            CASE WHEN o.order_type = 'TAKEAWAY' THEN 1 ELSE 0 END
          ) AS takeaway_orders,
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
          AND o.closed_at >= timezone('Asia/Ho_Chi_Minh', $1::timestamp)
        GROUP BY (o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      )
      SELECT 
        ds.date,
        COALESCE(dr.total_orders, 0) AS total_orders,
        COALESCE(dr.dine_in_orders, 0) AS dine_in_orders,
        COALESCE(dr.takeaway_orders, 0) AS takeaway_orders,
        COALESCE(dr.total_revenue, 0) AS total_revenue,
        COALESCE(dr.dine_in_revenue, 0) AS dine_in_revenue,
        COALESCE(dr.takeaway_revenue, 0) AS takeaway_revenue
      FROM date_series ds
      LEFT JOIN daily_revenue dr ON ds.date = dr.date
      ORDER BY ds.date
    `;
    
    const { rows } = await query(sql, [startTimestamp]);
    return rows;
  },

  /**
   * Lấy danh sách hóa đơn toàn thời gian cho Manager
   */
  async getAllInvoices({ 
    page = 1, 
    limit = 20, 
    status = null, 
    orderType = null, 
    fromDate = null, 
    toDate = null,
    search = null 
  }) {
    const offset = (page - 1) * limit;
    const params = [];
    let paramCount = 0;
    
    let whereConditions = ['1=1'];
    
    if (status) {
      paramCount++;
      params.push(status);
      whereConditions.push(`o.trang_thai = $${paramCount}`);
    }
    
    if (orderType) {
      paramCount++;
      params.push(orderType);
      whereConditions.push(`o.order_type = $${paramCount}`);
    }
    
    if (fromDate) {
      paramCount++;
      params.push(fromDate);
      whereConditions.push(`DATE(o.opened_at) >= $${paramCount}`);
    }
    
    if (toDate) {
      paramCount++;
      params.push(toDate);
      whereConditions.push(`DATE(o.opened_at) <= $${paramCount}`);
    }
    
    if (search) {
      paramCount++;
      params.push(`%${search}%`);
      whereConditions.push(`(o.id::text LIKE $${paramCount} OR b.ten_ban LIKE $${paramCount} OR u.full_name LIKE $${paramCount})`);
    }
    
    // Count total
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);
    
    const countSql = `
      SELECT COUNT(*) as total
      FROM don_hang o
      LEFT JOIN ban b ON b.id = o.ban_id
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const sql = `
      SELECT 
        o.id,
        o.order_type,
        o.trang_thai,
        o.opened_at,
        o.closed_at,
        o.ly_do_huy,
        b.ten_ban,
        b.khu_vuc_id,
        kv.ten AS khu_vuc_ten,
        u.full_name AS nhan_vien,
        u.username,
        ca.id AS ca_lam_id,
        ca.started_at AS ca_bat_dau,
        -- Calculate total from order details
        COALESCE((
          SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
          FROM don_hang_chi_tiet d 
          WHERE d.don_hang_id = o.id
        ), 0) AS tong_tien,
        -- Payment summary
        COALESCE(settlement.grand_total, 0) AS grand_total,
        COALESCE(settlement.payments_captured, 0) AS payments_captured,
        COALESCE(settlement.payments_refunded, 0) AS payments_refunded,
        COALESCE(settlement.payments_net, 0) AS payments_net,
        COALESCE(settlement.amount_due, 0) AS amount_due,
        -- Discount information
        COALESCE(money.line_discounts_total, 0) AS line_discounts_total,
        COALESCE(money.promo_total, 0) AS promo_total,
        COALESCE(money.manual_discount, 0) AS manual_discount,
        (COALESCE(money.line_discounts_total, 0) + COALESCE(money.promo_total, 0) + COALESCE(money.manual_discount, 0)) AS total_discount,
        -- Item count
        (SELECT COUNT(*) FROM don_hang_chi_tiet WHERE don_hang_id = o.id) AS item_count
      FROM don_hang o
      LEFT JOIN ban b ON b.id = o.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = o.id
      LEFT JOIN v_order_money_totals money ON money.order_id = o.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY o.opened_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
    
    const [countResult, dataResult] = await Promise.all([
      query(countSql, params.slice(0, -2)),
      query(sql, params)
    ]);
    
    return {
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  },

  /**
   * Lấy top món bán chạy
   */
  async getTopMenuItems(days = 7, limit = 10) {
    const sql = `
      SELECT 
        m.id,
        m.ten_mon,
        m.gia,
        mb.ten_bien_the,
        COUNT(*) AS so_luong_ban,
        SUM(d.so_luong) AS tong_so_luong,
        SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0)) AS tong_doanh_thu,
        ROUND(AVG(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0)), 0) AS gia_trung_binh
      FROM don_hang_chi_tiet d
      INNER JOIN don_hang o ON o.id = d.don_hang_id
      INNER JOIN mon m ON m.id = d.mon_id
      LEFT JOIN mon_bien_the mb ON mb.id = d.bien_the_id
      WHERE o.trang_thai = 'PAID'
        AND o.closed_at IS NOT NULL
        AND DATE(o.closed_at) >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY m.id, m.ten_mon, m.gia, mb.ten_bien_the
      ORDER BY tong_doanh_thu DESC
      LIMIT ${limit}
    `;
    
    const { rows } = await query(sql);
    return rows;
  },

  /**
   * Lấy thống kê theo ca làm việc
   */
  async getShiftStats(days = 7) {
    const sql = `
      SELECT 
        ca.id,
        ca.ten_ca_lam,
        ca.shift_type,
        ca.started_at,
        ca.closed_at,
        ca.status,
        u.full_name AS nhan_vien,
        COALESCE(ca.total_orders, 0) AS total_orders,
        COALESCE(ca.gross_amount, 0) AS gross_amount,
        COALESCE(ca.net_amount, 0) AS net_amount,
        COALESCE(ca.cash_amount, 0) AS cash_amount,
        COALESCE(ca.card_amount, 0) AS card_amount,
        COALESCE(ca.online_amount, 0) AS online_amount,
        COALESCE(ca.cash_diff, 0) AS cash_diff
      FROM ca_lam ca
      LEFT JOIN users u ON u.user_id = ca.opened_by
      WHERE ca.started_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY ca.started_at DESC
    `;
    
    const { rows } = await query(sql);
    return rows;
  },

  /**
   * Lấy báo cáo lợi nhuận từ view v_profit_with_topping_cost
   */
  async getProfitReport({ startDate, endDate }) {
    const sql = `
      SELECT 
        order_id,
        closed_at,
        doanh_thu_goc,
        giam_gia_line,
        giam_gia_khuyen_mai,
        giam_gia_thu_cong,
        tong_giam_gia,
        doanh_thu,
        gia_von_mon,
        gia_von_topping,
        tong_gia_von,
        loi_nhuan
      FROM v_profit_with_topping_cost
      WHERE closed_at::date >= $1::date
        AND closed_at::date <= $2::date
      ORDER BY closed_at DESC
    `;
    
    const { rows } = await query(sql, [startDate, endDate]);
    return rows;
  }
};
