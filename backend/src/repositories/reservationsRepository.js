// src/repositories/reservationsRepository.js
import { pool } from '../db.js';

class ReservationsRepository {
  // Tạo đặt bàn mới
  async create(data) {
    const {
      khach_hang_id,
      ten_khach,
      so_dien_thoai,
      so_nguoi,
      khu_vuc_id,
      start_at,
      end_at,
      ghi_chu,
      dat_coc = 0,
      dat_coc_trang_thai = 'NONE',
      nguon = 'PHONE',
      created_by
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO dat_ban(
        khach_hang_id, ten_khach, so_dien_thoai, so_nguoi, khu_vuc_id,
        start_at, end_at, ghi_chu, dat_coc, dat_coc_trang_thai, nguon, created_by, trang_thai
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING')
      RETURNING *`,
      [khach_hang_id, ten_khach, so_dien_thoai, so_nguoi, khu_vuc_id,
       start_at, end_at, ghi_chu, dat_coc, dat_coc_trang_thai, nguon, created_by]
    );

    return rows[0];
  }

  // Gán bàn cho đặt chỗ
  async assignTables(dat_ban_id, table_ids) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const ban_id of table_ids) {
        await client.query(
          `INSERT INTO dat_ban_ban(dat_ban_id, ban_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [dat_ban_id, ban_id]
        );
      }
      
      await client.query('COMMIT');
      return { assigned: table_ids.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Bỏ gán bàn
  async unassignTable(dat_ban_id, ban_id) {
    const { rowCount } = await pool.query(
      `DELETE FROM dat_ban_ban WHERE dat_ban_id = $1 AND ban_id = $2`,
      [dat_ban_id, ban_id]
    );
    return { removed: rowCount };
  }

  // Lấy danh sách theo ngày
  async getByDate(date, trang_thai = null) {
    let query = `
      SELECT * FROM v_reservation_calendar
      WHERE start_at::date = $1::date
    `;
    const params = [date];

    if (trang_thai) {
      query += ` AND trang_thai = $2`;
      params.push(trang_thai);
    }

    query += ` ORDER BY start_at`;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  // Lấy chi tiết 1 đặt bàn
  async getById(id) {
    const header = await pool.query(
      `SELECT r.*, 
              k.ten AS khach_hang_ten,
              k.email AS khach_hang_email,
              a.ten AS khu_vuc_ten
       FROM dat_ban r
       LEFT JOIN khach_hang k ON k.id = r.khach_hang_id
       LEFT JOIN khu_vuc a ON a.id = r.khu_vuc_id
       WHERE r.id = $1`,
      [id]
    );

    if (!header.rows[0]) return null;

    const tables = await pool.query(
      `SELECT l.ban_id, b.ten_ban, b.suc_chua, a.ten AS khu_vuc_ten
       FROM dat_ban_ban l
       JOIN ban b ON b.id = l.ban_id
       LEFT JOIN khu_vuc a ON a.id = b.khu_vuc_id
       WHERE l.dat_ban_id = $1
       ORDER BY l.ban_id`,
      [id]
    );

    return {
      ...header.rows[0],
      tables: tables.rows
    };
  }

  // Cập nhật thông tin đặt bàn
  async update(id, data) {
    const sets = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'ten_khach', 'so_dien_thoai', 'so_nguoi', 'khu_vuc_id',
      'start_at', 'end_at', 'ghi_chu', 'trang_thai', 'dat_coc', 'dat_coc_trang_thai'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = $${paramCount}`);
        values.push(data[field]);
        paramCount++;
      }
    }

    if (sets.length === 0) {
      throw new Error('Không có trường nào để cập nhật');
    }

    sets.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE dat_ban
       SET ${sets.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return rows[0];
  }

  // Hủy đặt bàn
  async cancel(id, reason = null) {
    const ghi_chu_update = reason
      ? `COALESCE(ghi_chu, '') || E'\\n[Cancel] ' || $2`
      : 'ghi_chu';

    const params = reason ? [id, reason] : [id];

    const { rows } = await pool.query(
      `UPDATE dat_ban
       SET trang_thai = 'CANCELLED',
           ghi_chu = ${ghi_chu_update},
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      params
    );

    return rows[0];
  }

  // Đánh dấu no-show
  async markNoShow(id) {
    const { rows } = await pool.query(
      `UPDATE dat_ban
       SET trang_thai = 'NO_SHOW', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return rows[0];
  }

  // Check-in: tạo order và set SEATED
  async checkIn(id, primary_table_id, created_by) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Tạo order DINE_IN
      const orderResult = await client.query(
        `INSERT INTO don_hang (ban_id, order_type, trang_thai, opened_at, nhan_vien_id)
         VALUES ($1, 'DINE_IN', 'OPEN', now(), $2)
         RETURNING id`,
        [primary_table_id, created_by]
      );

      const don_hang_id = orderResult.rows[0].id;

      // Update đặt bàn
      const reservationResult = await client.query(
        `UPDATE dat_ban
         SET trang_thai = 'SEATED',
             don_hang_id = $2,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, don_hang_id]
      );

      // Update trạng thái bàn
      await client.query(
        `UPDATE ban SET trang_thai = 'DANG_PHUC_VU' WHERE id = $1`,
        [primary_table_id]
      );

      await client.query('COMMIT');

      return {
        reservation: reservationResult.rows[0],
        don_hang_id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Hoàn thành đặt bàn
  async complete(id) {
    const { rows } = await pool.query(
      `UPDATE dat_ban
       SET trang_thai = 'COMPLETED', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return rows[0];
  }

  // Tìm bàn trống
  async findAvailableTables(start_at, end_at, khu_vuc_id = null) {
    const { rows } = await pool.query(
      `SELECT * FROM fn_tables_available($1::timestamptz, $2::timestamptz, $3)`,
      [start_at, end_at, khu_vuc_id]
    );

    return rows;
  }

  // Tìm khách hàng theo SĐT
  async findCustomerByPhone(so_dien_thoai) {
    const { rows } = await pool.query(
      `SELECT * FROM khach_hang WHERE so_dien_thoai = $1`,
      [so_dien_thoai]
    );
    return rows[0];
  }

  // Tạo/cập nhật khách hàng
  async upsertCustomer(data) {
    const { ten, so_dien_thoai, email, ghi_chu } = data;

    const { rows } = await pool.query(
      `INSERT INTO khach_hang (ten, so_dien_thoai, email, ghi_chu)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (so_dien_thoai)
       DO UPDATE SET
         ten = EXCLUDED.ten,
         email = EXCLUDED.email,
         ghi_chu = EXCLUDED.ghi_chu,
         updated_at = now()
       RETURNING *`,
      [ten, so_dien_thoai, email, ghi_chu]
    );

    return rows[0];
  }

  // Lấy đặt bàn sắp tới của 1 bàn
  async getUpcomingForTable(ban_id, within_minutes = 60) {
    const { rows } = await pool.query(
      `SELECT r.*
       FROM dat_ban r
       JOIN dat_ban_ban l ON l.dat_ban_id = r.id
       WHERE l.ban_id = $1
         AND r.trang_thai IN ('PENDING', 'CONFIRMED')
         AND r.start_at BETWEEN now() AND now() + interval '${within_minutes} minutes'
       ORDER BY r.start_at
       LIMIT 1`,
      [ban_id]
    );

    return rows[0];
  }
}

export default new ReservationsRepository();

