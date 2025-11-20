import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export default {
  // Danh sách bàn + tóm tắt order OPEN (nếu có)
  async getTablesWithSummary({ areaId = null }) {
    // Tự động hủy đơn mang đi quá 30 phút
    await pool.query(`
      UPDATE don_hang
      SET trang_thai = 'CANCELLED'
      WHERE order_type = 'TAKEAWAY'
        AND trang_thai = 'OPEN'
        AND opened_at < NOW() - INTERVAL '30 minutes';
    `);

    const params = [];
    let where = '1=1';
    if (areaId) {
      params.push(Number(areaId));
      where += ` AND b.khu_vuc_id = $${params.length}`;
    }
    const sql = `
      WITH open_order AS (
        SELECT ban_id, id AS order_id
        FROM don_hang
        WHERE trang_thai = 'OPEN' AND order_type = 'DINE_IN'
      ),
      last_paid AS (
        SELECT DISTINCT ON (ban_id)
               ban_id, id AS last_paid_order_id
        FROM don_hang
        WHERE ban_id IS NOT NULL AND trang_thai = 'PAID'
        ORDER BY ban_id, closed_at DESC
      ),
      latest_order_for_using_table AS (
        SELECT DISTINCT ON (dh.ban_id)
               dh.ban_id, dh.id AS latest_order_id
        FROM don_hang dh
        INNER JOIN ban b ON b.id = dh.ban_id
        WHERE dh.ban_id IS NOT NULL 
          AND dh.trang_thai IN ('OPEN', 'PAID')
          AND b.trang_thai = 'DANG_DUNG'
        ORDER BY dh.ban_id, dh.opened_at DESC
      ),
      summary AS (
        SELECT lo.ban_id,
               COUNT(items.line_id) AS item_count,
               COALESCE(SUM(items.line_total_with_addons), 0) AS subtotal,
               COUNT(*) FILTER (WHERE items.trang_thai_che_bien='PENDING') AS pending_count,
               COUNT(*) FILTER (WHERE items.trang_thai_che_bien='QUEUED') AS q_count,
               COUNT(*) FILTER (WHERE items.trang_thai_che_bien='MAKING') AS m_count,
               COUNT(*) FILTER (WHERE items.trang_thai_che_bien='DONE') AS done_count
        FROM latest_order_for_using_table lo
        INNER JOIN don_hang ON don_hang.id = lo.latest_order_id
        LEFT JOIN v_all_order_items_with_addons items ON don_hang.id = items.order_id
        GROUP BY lo.ban_id
      )
      SELECT
        b.id,
        b.ten_ban,
        b.khu_vuc_id,
        kv.ten AS khu_vuc_ten,
        kv.ten AS khu_vuc,
        b.suc_chua,
        b.trang_thai,
        b.ghi_chu,
        b.trang_thai_dat_ban,
        b.reservation_id,
        b.reservation_guest,
        b.reservation_phone,
        b.reservation_time,
        o.id AS order_id,
        o.id AS current_order_id,
        o.opened_at,
        o.trang_thai AS order_status,
        COALESCE(s.item_count,0)::int AS item_count,
        COALESCE(s.subtotal,0)::int AS subtotal,
        COALESCE(settlement.grand_total, s.subtotal, 0)::int AS grand_total,
        COALESCE(s.pending_count,0)::int AS pending_count,
        COALESCE(s.q_count,0)::int AS q_count,
        COALESCE(s.m_count,0)::int AS m_count,
        COALESCE(s.done_count,0)::int AS done_count,
        -- Kiểm tra tất cả món đã hoàn thành (DONE hoặc CANCELLED)
        CASE 
          WHEN s.item_count = 0 THEN true
          WHEN s.item_count > 0 AND s.done_count = s.item_count THEN true
          ELSE false
        END AS all_items_done,
        CASE
          WHEN oo.order_id IS NOT NULL THEN 'CHUA_TT'
          WHEN lp.ban_id IS NOT NULL THEN 'DA_TT'
          ELSE 'NONE'
        END AS payment_status
      FROM ban b
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN (
        SELECT 
          dh.ban_id,
          dh.id,
          dh.opened_at,
          dh.trang_thai,
          ROW_NUMBER() OVER (PARTITION BY dh.ban_id ORDER BY dh.opened_at DESC) as rn
        FROM don_hang dh
        INNER JOIN ban b2 ON b2.id = dh.ban_id
        WHERE dh.ban_id IS NOT NULL 
          AND dh.trang_thai IN ('OPEN', 'PAID')
          AND b2.trang_thai = 'DANG_DUNG'
      ) o ON o.ban_id = b.id AND o.rn = 1
      LEFT JOIN summary s ON s.ban_id = b.id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = o.id
      LEFT JOIN open_order oo ON oo.ban_id = b.id
      LEFT JOIN last_paid lp ON lp.ban_id = b.id
      WHERE ${where}
        AND (kv.active = true OR kv.active IS NULL)
      ORDER BY kv.thu_tu, b.ten_ban
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
  },

  // Lấy order OPEN của 1 bàn (nếu có)
  async getOpenOrderByTable(banId) {
    const sql = `
      SELECT o.*, 
        COALESCE(oi.item_count,0)::int AS item_count,
        COALESCE(oi.subtotal,0)::int AS subtotal
      FROM don_hang o
      LEFT JOIN (
        SELECT 
          don_hang_id,
          COUNT(*) as item_count,
          SUM(so_luong * don_gia - COALESCE(giam_gia,0)) as subtotal
        FROM don_hang_chi_tiet 
        GROUP BY don_hang_id
      ) oi ON oi.don_hang_id = o.id
      WHERE o.ban_id = $1 AND o.trang_thai = 'OPEN'
      ORDER BY o.opened_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [banId]);
    return rows[0] || null;
  },

  // Lấy chi tiết order (items)
  async getOrderItems(orderId) {
    const sql = `
      SELECT 
        d.id,
        d.mon_id,
        COALESCE(d.ten_mon_snapshot, m.ten) AS ten_mon,
        d.bien_the_id,
        mbt.ten_bien_the,
        d.so_luong,
        d.don_gia,
        COALESCE(d.giam_gia,0) AS giam_gia,
        (d.so_luong * d.don_gia - COALESCE(d.giam_gia,0)) AS line_total
      FROM don_hang_chi_tiet d
      LEFT JOIN mon m ON m.id = d.mon_id
      LEFT JOIN mon_bien_the mbt ON mbt.id = d.bien_the_id
      WHERE d.don_hang_id = $1
      ORDER BY d.id
    `;
    const { rows } = await pool.query(sql, [orderId]);
    return rows;
  },

  // Lấy tổng kết order + trạng thái thanh toán
  async getOrderSummary(orderId) {
    const sql = `
      SELECT 
        o.id,
        o.ban_id,
        o.trang_thai,
        o.trang_thai AS status,
        o.order_type,
        o.opened_at,
        o.closed_at,
        CASE WHEN o.trang_thai = 'PAID' THEN true ELSE false END AS da_thanh_toan,
        COUNT(d.id) FILTER (WHERE d.trang_thai_che_bien != 'CANCELLED') AS total_lines,
        COALESCE(SUM(d.so_luong) FILTER (WHERE d.trang_thai_che_bien != 'CANCELLED'), 0) AS total_quantity,
        COALESCE(SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia,0)) FILTER (WHERE d.trang_thai_che_bien != 'CANCELLED'), 0) AS subtotal
      FROM don_hang o
      LEFT JOIN don_hang_chi_tiet d ON d.don_hang_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, o.ban_id, o.trang_thai, o.order_type, o.opened_at, o.closed_at
    `;
    const { rows } = await pool.query(sql, [orderId]);
    return rows[0] || { total_lines: 0, total_quantity: 0, subtotal: 0, trang_thai: 'OPEN', da_thanh_toan: false };
  },

  // Lấy thông tin đơn hàng theo ID
  async getOrderById(orderId) {
    const sql = `SELECT * FROM don_hang WHERE id = $1`;
    const { rows } = await pool.query(sql, [orderId]);
    return rows[0] || null;
  },

  // Cập nhật trạng thái đơn hàng
  async setOrderStatus(orderId, status, reason = null) {
    const sql = `
      UPDATE don_hang
      SET 
        trang_thai = $2, 
        ly_do_huy = $3,
        closed_at = CASE 
          WHEN $2 IN ('PAID', 'CANCELLED') AND closed_at IS NULL 
          THEN NOW() 
          ELSE closed_at 
        END
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(sql, [orderId, status, reason]);
    return rows[0] || null;
  },

  // Thêm item vào order
  async addItemToOrder({ orderId, monId, bienTheId, soLuong, donGia, giamGia = 0, ghiChu = null }) {
    // Lấy thông tin món để snapshot
    const { rows: monRows } = await pool.query(
      `SELECT ten, gia_mac_dinh FROM mon WHERE id = $1`,
      [monId]
    );
    const mon = monRows[0];
    
    const sql = `
      INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, ghi_chu, ten_mon_snapshot, gia_niem_yet_snapshot, trang_thai_che_bien, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'QUEUED', NOW())
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [orderId, monId, bienTheId, soLuong, donGia, giamGia, ghiChu, mon?.ten, mon?.gia_mac_dinh]);
    return rows[0];
  },

  // Cập nhật số lượng item
  async updateItemQuantity({ itemId, soLuong }) {
    const sql = `
      UPDATE don_hang_chi_tiet 
      SET so_luong = $2
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [itemId, soLuong]);
    return rows[0];
  },

  // Xóa item khỏi order
  async removeItemFromOrder(itemId) {
    const sql = `DELETE FROM don_hang_chi_tiet WHERE id = $1`;
    await pool.query(sql, [itemId]);
  },

  // Lấy danh sách món theo loại (có kèm variants)
  async getMenuByCategory(categoryId = null) {
    let sql = `
      SELECT 
        m.id,
        m.ten,
        m.ma,
        m.loai_id,
        lm.ten AS loai_ten,
        m.don_vi,
        m.gia_mac_dinh,
        m.active,
        m.thu_tu,
        m.mo_ta,
        m.hinh_anh,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mbt.id,
              'ten_bien_the', mbt.ten_bien_the,
              'gia', mbt.gia,
              'thu_tu', mbt.thu_tu,
              'active', mbt.active
            ) ORDER BY mbt.thu_tu
          ) FILTER (WHERE mbt.id IS NOT NULL), 
          '[]'::json
        ) AS variants
      FROM mon m
      LEFT JOIN loai_mon lm ON lm.id = m.loai_id
      LEFT JOIN mon_bien_the mbt ON mbt.mon_id = m.id AND mbt.active = true
      WHERE m.active = true
    `;
    const params = [];
    if (categoryId) {
      sql += ` AND m.loai_id = $1`;
      params.push(categoryId);
    }
    sql += ` GROUP BY m.id, m.ten, m.ma, m.loai_id, lm.ten, m.don_vi, m.gia_mac_dinh, m.active, m.thu_tu, m.mo_ta, m.hinh_anh, lm.thu_tu
             ORDER BY lm.thu_tu, m.thu_tu, m.ten`;
    
    const { rows } = await pool.query(sql, params);
    return rows;
  },

  // Lấy biến thể của món
  async getMenuItemVariants(monId) {
    const sql = `
      SELECT id, ten_bien_the, gia, thu_tu, active
      FROM mon_bien_the
      WHERE mon_id = $1 AND active = true
      ORDER BY thu_tu
    `;
    const { rows } = await pool.query(sql, [monId]);
    return rows;
  },

  // Lấy loại món
  async getMenuCategories() {
    const sql = `
      SELECT id, ten, mo_ta, thu_tu, active
      FROM loai_mon
      WHERE active = true
      ORDER BY thu_tu
    `;
    const { rows } = await pool.query(sql);
    return rows;
  },

  // Tạo order mới cho bàn
  async createOrderWithTable({ banId, userId }) {
    const sql = `
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, opened_at, order_type)
      VALUES ($1, $2,
        (SELECT id FROM ca_lam WHERE status='OPEN' AND nhan_vien_id=$2 ORDER BY started_at DESC LIMIT 1),
        'OPEN', NOW(), 'DINE_IN')
      RETURNING id, ban_id, trang_thai, order_type, opened_at
    `;
    const { rows } = await pool.query(sql, [banId, userId]);
    return rows[0];
  },

  // Tạo order mang đi (không bàn)
  async createOrderNoTable({ order_type, userId }) {
    const sql = `
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, opened_at, order_type)
      VALUES (NULL, $1,
        (SELECT id FROM ca_lam WHERE status='OPEN' AND nhan_vien_id=$1 ORDER BY started_at DESC LIMIT 1),
        'OPEN', NOW(), $2)
      RETURNING id, ban_id, trang_thai, order_type, opened_at
    `;
    const { rows } = await pool.query(sql, [userId, order_type]);
    return rows[0];
  },

  // Di chuyển order sang bàn khác
  // Đổi bàn - hỗ trợ cả OPEN và PAID
  async moveOrderToTable({ orderId, toTableId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1) Lấy thông tin đơn hàng
      const { rows: ordRows } = await client.query(
        `SELECT id, ban_id, trang_thai, order_type FROM don_hang WHERE id=$1 FOR UPDATE`,
        [orderId]
      );
      if (!ordRows[0]) {
        const err = new Error('Không tìm thấy đơn hàng.');
        err.status = 404;
        throw err;
      }
      const order = ordRows[0];

      // 2) Chỉ cho phép đổi đơn OPEN hoặc PAID
      if (!['OPEN', 'PAID'].includes(order.trang_thai)) {
        const err = new Error('Chỉ có thể đổi bàn với đơn OPEN hoặc PAID.');
        err.status = 400;
        throw err;
      }

      if (order.order_type !== 'DINE_IN') {
        const err = new Error('Chỉ có thể đổi bàn với đơn tại chỗ (DINE_IN).');
        err.status = 400;
        throw err;
      }

      // 3) Kiểm tra bàn đích
      const { rows: toRows } = await client.query(
        `SELECT id, trang_thai FROM ban WHERE id=$1 FOR UPDATE`, 
        [toTableId]
      );
      if (!toRows[0]) {
        const err = new Error('Không tìm thấy bàn đích.');
        err.status = 404;
        throw err;
      }
      const targetTable = toRows[0];

      // Bàn đích phải TRONG (không cho KHOA và DANG_DUNG)
      if (targetTable.trang_thai !== 'TRONG') {
        const err = new Error('Bàn đích phải ở trạng thái TRỐNG. Vui lòng chọn bàn khác.');
        err.status = 400;
        throw err;
      }

      const oldTableId = order.ban_id;

      // 4) Cập nhật đơn hàng → chuyển sang bàn mới
      await client.query(
        `UPDATE don_hang SET ban_id=$1 WHERE id=$2`, 
        [toTableId, orderId]
      );

      // 5) Cập nhật trạng thái bàn đích → DANG_DUNG
      await client.query(
        `UPDATE ban SET trang_thai='DANG_DUNG', updated_at=NOW() WHERE id=$1`, 
        [toTableId]
      );

      // 6) Cập nhật bàn cũ: nếu không còn đơn OPEN nào → cho về TRONG
      if (oldTableId) {
        const { rows: stillOpenRows } = await client.query(
          `SELECT COUNT(*)::int AS c 
           FROM don_hang 
           WHERE ban_id=$1 AND trang_thai='OPEN' AND order_type='DINE_IN'`,
          [oldTableId]
        );
        const stillOpen = stillOpenRows[0]?.c || 0;
        
        if (stillOpen === 0) {
          await client.query(
            `UPDATE ban SET trang_thai='TRONG', updated_at=NOW() WHERE id=$1`, 
            [oldTableId]
          );
        }
      }

      await client.query('COMMIT');
      
      return { 
        order_id: orderId, 
        old_table_id: oldTableId,
        new_table_id: toTableId,
        order_status: order.trang_thai
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // Thanh toán order
  async checkoutOrder({ orderId, payment_method, keepSeated, note, userId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: ordRows } = await client.query(
        `SELECT id, ban_id, trang_thai, order_type FROM don_hang WHERE id=$1 FOR UPDATE`,
        [orderId]
      );
      if (!ordRows[0]) throw new Error('Order not found');
      const order = ordRows[0];
      if (order.trang_thai !== 'OPEN') throw new Error('Order already closed');

      const { rows: totalRows } = await client.query(
        `SELECT COALESCE(SUM(so_luong * don_gia - COALESCE(giam_gia,0)),0) AS total
         FROM don_hang_chi_tiet WHERE don_hang_id=$1`,
        [orderId]
      );
      const total = Number(totalRows[0].total) || 0;

      // Đơn bàn: Set PAID + closed_at
      // Đơn mang đi: Chỉ set PAID (chờ giao hàng mới closed)
      if (order.order_type === 'DINE_IN') {
        await client.query(
          `UPDATE don_hang
             SET trang_thai='PAID', closed_at=NOW()
           WHERE id=$1`,
          [orderId]
        );
      } else {
        await client.query(
          `UPDATE don_hang
             SET trang_thai='PAID'
           WHERE id=$1`,
          [orderId]
        );
      }

      // Create payment transaction record
      const refCode = `ORD${orderId}-${Date.now()}`;
      await client.query(
        `INSERT INTO payment_transaction (order_id, payment_method_code, ref_code, amount, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'PAID', NOW(), NOW())`,
        [orderId, payment_method || 'CASH', refCode, total]
      );

      await client.query('COMMIT');
      return { order_id: orderId, ban_id: order.ban_id, total, status: 'PAID', keepSeated: !!keepSeated };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // Lấy order gần nhất (dù là PAID)
  async getLatestOrderByTable(banId) {
    const sql = `
      SELECT * FROM don_hang
      WHERE ban_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const { rows } = await query(sql, [banId]);
    return rows[0] || null;
  },

  // Tạo đơn hàng với bàn
  async createOrderWithTable({ banId, nhanVienId }) {
    const sql = `
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, order_type)
      VALUES ($1, $2, 
        (SELECT id FROM ca_lam WHERE status='OPEN' AND nhan_vien_id=$2 ORDER BY started_at DESC LIMIT 1),
        'OPEN', 'DINE_IN')
      RETURNING *;
    `;
    const { rows } = await pool.query(sql, [banId, nhanVienId]);
    return rows[0];
  },

  // Tạo đơn hàng mang đi hoặc giao hàng (không có bàn)
  async createOrderNoTable({ nhanVienId, caLamId, orderType = 'TAKEAWAY' }) {
    const sql = `
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, order_type)
      VALUES (NULL, $1, $2, 'OPEN', $3)
      RETURNING *;
    `;
    const { rows } = await pool.query(sql, [nhanVienId, caLamId, orderType]);
    return rows[0];
  },

  // Lấy đơn gần nhất của bàn
  async getLatestOrderByTable(banId) {
    const sql = `
      SELECT * FROM don_hang
      WHERE ban_id = $1
      ORDER BY opened_at DESC
      LIMIT 1;
    `;
    const { rows } = await pool.query(sql, [banId]);
    return rows[0] || null;
  },

  // Đổi trạng thái bàn (TRỐNG <-> KHÓA)
  async setTableStatus(banId, status, ghi_chu = null) {
    const sql = `
      UPDATE ban
      SET trang_thai = $2, ghi_chu = $3
      WHERE id = $1
      RETURNING id, ten_ban, trang_thai, ghi_chu;
    `;
    const { rows } = await pool.query(sql, [banId, status, ghi_chu]);
    return rows[0] || null;
  },

  // Lấy đơn hàng của ca hiện tại (cho cashier)
  async getCurrentShiftOrders(shiftId) {
    const sql = `
      SELECT 
        dh.id,
        dh.ban_id,
        dh.order_type,
        dh.trang_thai,
        dh.opened_at,
        dh.closed_at,
        dh.ly_do_huy,
        b.ten_ban,
        kv.ten AS khu_vuc_ten,
        u.full_name AS nhan_vien_ten,
        -- Tổng tiền đơn hàng: dùng grand_total từ v_order_settlement để bao gồm topping và discount
        -- Đơn đã hủy (CANCELLED) sẽ hiển thị 0 ₫
        CASE 
          WHEN dh.trang_thai = 'CANCELLED' THEN 0
          ELSE COALESCE(settlement.grand_total, 0)
        END AS tong_tien,
        -- Số lượng món
        (SELECT COUNT(*) FROM don_hang_chi_tiet WHERE don_hang_id = dh.id) AS so_mon,
        -- Thông tin thanh toán
        CASE 
          WHEN dh.trang_thai = 'PAID' THEN 'Đã thanh toán'
          WHEN dh.trang_thai = 'CANCELLED' THEN 'Đã hủy'
          ELSE 'Chưa thanh toán'
        END AS trang_thai_thanh_toan,
        -- Thời gian xử lý
        CASE 
          WHEN dh.closed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (dh.closed_at - dh.opened_at))::INT
          ELSE NULL
        END AS thoi_gian_xu_ly_giay
      FROM don_hang dh
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN users u ON u.user_id = dh.nhan_vien_id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE 
        -- Filter theo ca_lam_id để đồng bộ với tab "Tổng quan"
        dh.ca_lam_id = $1
        -- Vẫn hiển thị đơn đã hủy (nhưng tong_tien = 0)
      ORDER BY 
        CASE 
          WHEN dh.trang_thai = 'PAID' THEN dh.closed_at
          WHEN dh.trang_thai = 'CANCELLED' THEN dh.closed_at
          ELSE dh.opened_at
        END DESC
    `;
    const { rows } = await pool.query(sql, [shiftId]);
    return rows;
  }
};