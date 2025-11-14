// backend/src/repositories/promotionRepository.js
import { pool } from '../db.js';

class PromotionRepository {
  // Get all promotions with filters
  async getAll(filters = {}) {
    const { status, type, search, timeRange, startDate, endDate } = filters;
    console.log('📊 Repository filters:', { status, type, search, timeRange, startDate, endDate });
    let query = 'SELECT * FROM khuyen_mai WHERE 1=1 AND (deleted_at IS NULL)'; // ✅ Filter deleted promotions
    const params = [];
    let paramIndex = 1;

    if (status === 'active') {
      query += ' AND active = TRUE AND (bat_dau IS NULL OR now() >= bat_dau) AND (ket_thuc IS NULL OR now() <= ket_thuc)';
    } else if (status === 'inactive') {
      query += ' AND (active = FALSE OR (ket_thuc IS NOT NULL AND now() > ket_thuc))';
    }

    if (type) {
      query += ` AND loai = $${paramIndex}`;
      params.push(type);
      paramIndex++;
      console.log(`🔍 Adding type filter: loai = '${type}'`);
    }

    if (search) {
      query += ` AND (LOWER(ma) LIKE $${paramIndex} OR LOWER(ten) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    // Time range filter (thời gian hiệu lực)
    // Nếu có timeRange, filter theo trạng thái thời gian
    if (timeRange) {
      const now = new Date();
      if (timeRange === 'ACTIVE') {
        // Đang hiệu lực: đã bắt đầu và chưa kết thúc
        query += ` AND (bat_dau IS NULL OR DATE(bat_dau) <= $${paramIndex}::date) AND (ket_thuc IS NULL OR DATE(ket_thuc) >= $${paramIndex}::date)`;
        params.push(now, now);
        paramIndex += 2;
        console.log(`🔍 Adding time range filter: ACTIVE (đang hiệu lực)`);
      } else if (timeRange === 'UPCOMING') {
        // Sắp bắt đầu: chưa đến ngày bắt đầu
        query += ` AND bat_dau IS NOT NULL AND DATE(bat_dau) > $${paramIndex}::date`;
        params.push(now);
        paramIndex++;
        console.log(`🔍 Adding time range filter: UPCOMING (sắp bắt đầu)`);
      } else if (timeRange === 'EXPIRED') {
        // Đã hết hạn: đã qua ngày kết thúc
        query += ` AND ket_thuc IS NOT NULL AND DATE(ket_thuc) < $${paramIndex}::date`;
        params.push(now);
        paramIndex++;
        console.log(`🔍 Adding time range filter: EXPIRED (đã hết hạn)`);
      } else if (timeRange === 'CUSTOM' && startDate && endDate) {
        // Tùy chỉnh: tìm các promotion có thời gian hiệu lực giao với khoảng [startDate, endDate]
        // Promotion giao với khoảng nếu: bat_dau <= endDate AND (ket_thuc IS NULL OR ket_thuc >= startDate)
        query += ` AND (
          (bat_dau IS NULL OR DATE(bat_dau) <= $${paramIndex + 1}::date) AND 
          (ket_thuc IS NULL OR DATE(ket_thuc) >= $${paramIndex}::date)
        )`;
        params.push(startDate, endDate);  // Push startDate first, then endDate
        paramIndex += 2;
        console.log(`🔍 Adding time range filter: CUSTOM (${startDate} - ${endDate})`);
      }
    } else if (startDate && endDate) {
      // Nếu không có timeRange nhưng có startDate và endDate, filter theo khoảng thời gian
      // Tìm các promotion có thời gian hiệu lực giao với khoảng [startDate, endDate]
      // Promotion giao với khoảng nếu:
      // - bat_dau <= endDate (đã bắt đầu trước hoặc trong khoảng)
      // - (ket_thuc IS NULL OR ket_thuc >= startDate) (chưa kết thúc hoặc kết thúc sau khoảng bắt đầu)
      query += ` AND (
        (bat_dau IS NULL OR DATE(bat_dau) <= $${paramIndex + 1}::date) AND 
        (ket_thuc IS NULL OR DATE(ket_thuc) >= $${paramIndex}::date)
      )`;
      params.push(startDate, endDate);  // Push startDate first, then endDate
      paramIndex += 2;
      console.log(`🔍 Adding custom date range filter: ${startDate} - ${endDate}`);
      console.log(`🔍 Date filter params: startDate=$${paramIndex - 2}, endDate=$${paramIndex - 1}`);
    } else {
      console.log(`🔍 No date filter applied. startDate=${startDate}, endDate=${endDate}`);
    }

    query += ' ORDER BY id DESC';

    console.log('📝 Final query:', query);
    console.log('📝 Query params:', params);

    const { rows } = await pool.query(query, params);
    console.log('✅ Query result count:', rows.length);
    if (rows.length > 0) {
      console.log('📋 Sample result:', { ma: rows[0].ma, loai: rows[0].loai });
    }
    return rows;
  }

  // Get promotion by ID
  async getById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM khuyen_mai WHERE id = $1 AND (deleted_at IS NULL)',
      [id]
    );
    return rows[0] || null;
  }

  // Get promotion by code
  async getByCode(code) {
    const { rows } = await pool.query(
      'SELECT * FROM khuyen_mai WHERE ma = $1 AND (deleted_at IS NULL)',
      [code]
    );
    return rows[0] || null;
  }

  // Create promotion
  async create(data) {
    const {
      ma, ten, mo_ta, loai, gia_tri, max_giam,
      dieu_kien, bat_dau, ket_thuc, active, stackable, usage_limit
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO khuyen_mai 
       (ma, ten, mo_ta, loai, gia_tri, max_giam, dieu_kien, bat_dau, ket_thuc, active, stackable, usage_limit, used_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
       RETURNING *`,
      [ma, ten, mo_ta, loai, gia_tri, max_giam, 
       dieu_kien ? JSON.stringify(dieu_kien) : null,
       bat_dau, ket_thuc, active ?? true, stackable ?? true, usage_limit]
    );
    return rows[0];
  }

  // Update promotion
  async update(id, data) {
    const {
      ma, ten, mo_ta, loai, gia_tri, max_giam,
      dieu_kien, bat_dau, ket_thuc, active, stackable, usage_limit
    } = data;

    const { rows } = await pool.query(
      `UPDATE khuyen_mai SET
       ma = $1, ten = $2, mo_ta = $3, loai = $4, gia_tri = $5, max_giam = $6,
       dieu_kien = $7, bat_dau = $8, ket_thuc = $9, active = $10, stackable = $11, usage_limit = $12
       WHERE id = $13
       RETURNING *`,
      [ma, ten, mo_ta, loai, gia_tri, max_giam,
       dieu_kien ? JSON.stringify(dieu_kien) : null,
       bat_dau, ket_thuc, active, stackable, usage_limit, id]
    );
    return rows[0];
  }

  // Delete promotion (soft delete)
  async delete(id) {
    // Soft delete: SET active = false and deleted_at = NOW()
    const { rows } = await pool.query(
      'UPDATE khuyen_mai SET active = false, deleted_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0];
  }

  // Toggle active status
  async toggleActive(id, active) {
    const { rows } = await pool.query(
      'UPDATE khuyen_mai SET active = $1 WHERE id = $2 RETURNING *',
      [active, id]
    );
    return rows[0];
  }

  // Get promotion statistics
  async getStats(id, startDate, endDate) {
    // Build WHERE clause with date filters
    let whereClause = 'dhkm.khuyen_mai_id = $1';
    const params = [id];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND dh.opened_at >= $${paramIndex}::date`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND dh.opened_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      params.push(endDate);
      paramIndex++;
    }

    // Get basic stats
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_usage,
        COALESCE(SUM(dhkm.so_tien_giam), 0) AS total_discount,
        CASE 
          WHEN COUNT(*) > 0 THEN COALESCE(AVG(dhkm.so_tien_giam), 0)
          ELSE 0
        END AS avg_discount
      FROM don_hang_khuyen_mai dhkm
      JOIN don_hang dh ON dh.id = dhkm.don_hang_id
      WHERE ${whereClause}
    `;

    const { rows: statsRows } = await pool.query(statsQuery, params);
    const stats = statsRows[0] || {
      total_usage: 0,
      total_discount: 0,
      avg_discount: 0
    };

    // Convert to numbers
    stats.total_usage = parseInt(stats.total_usage) || 0;
    stats.total_discount = parseFloat(stats.total_discount) || 0;
    stats.avg_discount = parseFloat(stats.avg_discount) || 0;

    console.log('📊 getStats result:', {
      id,
      total_usage: stats.total_usage,
      total_discount: stats.total_discount,
      avg_discount: stats.avg_discount,
      usage_by_period_count: stats.usage_by_period?.length || 0,
      top_users_count: stats.top_users?.length || 0
    });

    // Get usage by period (last 7 days, last 30 days, all time)
    const periodQuery = `
      WITH periods AS (
        SELECT 
          CASE 
            WHEN dh.opened_at >= CURRENT_DATE - INTERVAL '7 days' THEN '7 ngày qua'
            WHEN dh.opened_at >= CURRENT_DATE - INTERVAL '30 days' THEN '30 ngày qua'
            ELSE 'Trước đó'
          END AS period,
          dhkm.so_tien_giam
        FROM don_hang_khuyen_mai dhkm
        JOIN don_hang dh ON dh.id = dhkm.don_hang_id
        WHERE dhkm.khuyen_mai_id = $1
      )
      SELECT 
        period,
        COUNT(*) AS count,
        COALESCE(SUM(so_tien_giam), 0) AS total_discount
      FROM periods
      GROUP BY period
      ORDER BY 
        CASE period
          WHEN '7 ngày qua' THEN 1
          WHEN '30 ngày qua' THEN 2
          ELSE 3
        END
    `;

    const { rows: periodRows } = await pool.query(periodQuery, [id]);
    stats.usage_by_period = periodRows.map(row => ({
      period: row.period,
      count: parseInt(row.count) || 0,
      total_discount: parseFloat(row.total_discount) || 0
    }));

    // Get top users (if there are any)
    // Use subquery to handle COALESCE in GROUP BY
    const topUsersQuery = `
      SELECT 
        username,
        COUNT(*) AS count,
        COALESCE(SUM(so_tien_giam), 0) AS total_discount
      FROM (
        SELECT 
          COALESCE(u_applied.full_name, u_order.full_name, 'Khách') AS username,
          dhkm.so_tien_giam
        FROM don_hang_khuyen_mai dhkm
        JOIN don_hang dh ON dh.id = dhkm.don_hang_id
        LEFT JOIN users u_applied ON u_applied.user_id = dhkm.applied_by
        LEFT JOIN users u_order ON u_order.user_id = dh.nhan_vien_id
        WHERE dhkm.khuyen_mai_id = $1
      ) AS user_promos
      GROUP BY username
      ORDER BY count DESC
      LIMIT 5
    `;

    const { rows: topUsersRows } = await pool.query(topUsersQuery, [id]);
    stats.top_users = topUsersRows.map(row => ({
      username: row.username || 'Khách',
      count: parseInt(row.count) || 0,
      total_discount: parseFloat(row.total_discount) || 0
    }));

    return stats;
  }

  // Get usage history
  async getUsageHistory(id, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    console.log('🔍 Repository getUsageHistory called with:', { id, page, limit, offset });

    const { rows } = await pool.query(
      `SELECT 
        dh.id AS don_hang_id,
        dh.opened_at AS ngay_tao,
        dhkm.so_tien_giam AS giam_gia,
        COALESCE(u_applied.full_name, u_order.full_name) AS username,
        COALESCE((
          SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
          FROM don_hang_chi_tiet d
          WHERE d.don_hang_id = dh.id
        ), 0) AS tong_tien,
        COALESCE((
          SELECT grand_total
          FROM v_order_money_totals
          WHERE order_id = dh.id
        ), 0) AS thanh_toan
       FROM don_hang_khuyen_mai dhkm
       JOIN don_hang dh ON dh.id = dhkm.don_hang_id
       LEFT JOIN users u_applied ON u_applied.user_id = dhkm.applied_by
       LEFT JOIN users u_order ON u_order.user_id = dh.nhan_vien_id
       WHERE dhkm.khuyen_mai_id = $1
       ORDER BY dh.opened_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    console.log('📦 Repository query result:', rows.length, 'rows');
    if (rows.length > 0) {
      console.log('📋 Sample row BEFORE processing:', JSON.stringify(rows[0]));
    }

    // Convert numeric fields to numbers (PostgreSQL returns strings)
    const processedRows = rows.map(row => {
      const processed = {
        ...row,
        tong_tien: parseFloat(row.tong_tien) || 0,
        giam_gia: parseFloat(row.giam_gia) || 0,
        thanh_toan: parseFloat(row.thanh_toan) || 0,
        don_hang_id: parseInt(row.don_hang_id) || 0
      };
      console.log('🔄 Row processing:', {
        original: { tong_tien: row.tong_tien, giam_gia: row.giam_gia, thanh_toan: row.thanh_toan },
        processed: { tong_tien: processed.tong_tien, giam_gia: processed.giam_gia, thanh_toan: processed.thanh_toan }
      });
      return processed;
    });
    
    console.log('📋 Sample row AFTER processing:', JSON.stringify(processedRows[0]));

    // Get total count
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM don_hang_khuyen_mai WHERE khuyen_mai_id = $1',
      [id]
    );

    console.log('📊 Total count:', countRows[0].count);

    return {
      data: processedRows,
      total: parseInt(countRows[0].count),
      page,
      limit
    };
  }

  // Get summary
  async getSummary(date = null) {
    const dateFilter = date || new Date().toISOString().split('T')[0];

    // Total active promotions
    const { rows: activeRows } = await pool.query(
      `SELECT COUNT(*) FROM khuyen_mai 
       WHERE active = TRUE 
       AND (bat_dau IS NULL OR now() >= bat_dau) 
       AND (ket_thuc IS NULL OR now() <= ket_thuc)`
    );

    // Used today
    const { rows: usedRows } = await pool.query(
      `SELECT COUNT(DISTINCT dhkm.khuyen_mai_id) 
       FROM don_hang_khuyen_mai dhkm
       JOIN don_hang dh ON dh.id = dhkm.don_hang_id
       WHERE DATE(dh.opened_at) = $1`,
      [dateFilter]
    );

    // Total discount today
    const { rows: discountRows } = await pool.query(
      `SELECT COALESCE(SUM(dhkm.so_tien_giam), 0) AS total
       FROM don_hang_khuyen_mai dhkm
       JOIN don_hang dh ON dh.id = dhkm.don_hang_id
       WHERE DATE(dh.opened_at) = $1`,
      [dateFilter]
    );

    // Expiring soon (within 7 days)
    const { rows: expiringRows } = await pool.query(
      `SELECT COUNT(*) FROM khuyen_mai 
       WHERE active = TRUE 
       AND ket_thuc IS NOT NULL 
       AND ket_thuc <= now() + INTERVAL '7 days' 
       AND ket_thuc >= now()`
    );

    return {
      total_active: parseInt(activeRows[0].count),
      total_used_today: parseInt(usedRows[0].count),
      total_discount_today: parseFloat(discountRows[0].total),
      expiring_soon: parseInt(expiringRows[0].count)
    };
  }

  // Check if code exists
  async codeExists(code, excludeId = null) {
    let query = 'SELECT 1 FROM khuyen_mai WHERE ma = $1';
    const params = [code];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const { rows } = await pool.query(query, params);
    return rows.length > 0;
  }
}

export default new PromotionRepository();
