// src/repositories/shiftsRepository.js
import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export async function getMyOpenShift(nhanVienId) {
  const { rows } = await query(
    `SELECT * FROM ca_lam
     WHERE nhan_vien_id = $1 AND status = 'OPEN'
     ORDER BY id DESC LIMIT 1`,
    [nhanVienId]
  );
  return rows[0] || null;
}

export async function getMyOpenShiftWithUser(userId) {
  const sql = `
    SELECT c.*,
           u.user_id AS nv_id,
           u.full_name AS nv_full_name,
           u.username AS nv_username,
           u.email AS nv_email
    FROM ca_lam c
    JOIN users u ON u.user_id = c.nhan_vien_id
    WHERE c.status = 'OPEN' AND c.nhan_vien_id = $1
    ORDER BY c.started_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0] || null;
}

export async function openShift({ nhanVienId, openingCash = null, openedBy = null }) {
  const sql = `
    INSERT INTO ca_lam (
      nhan_vien_id, started_at, status, opening_cash, opened_by
    )
    VALUES (
      $1::int,
      NOW(),
      'OPEN',
      $2::int,
      COALESCE($3::int, $1::int)
    )
    RETURNING *;
  `;
  const { rows } = await query(sql, [nhanVienId, openingCash, openedBy]);
  return rows[0];
}

export async function closeShift(id, { closingCash = null, note = null, closedBy = null }) {
  const sql = `
    UPDATE ca_lam
    SET status='CLOSED',
        ended_at = NOW(),
        closing_cash = COALESCE($2, closing_cash),
        closed_by = COALESCE($3, closed_by),
        note = COALESCE($4, note),
        updated_at = NOW()
    WHERE id = $1 AND status = 'OPEN'
    RETURNING *;
  `;
  const { rows } = await query(sql, [id, closingCash, closedBy, note]);
  return rows[0] || null;
}

export async function getById(id) {
  const { rows } = await query(`SELECT * FROM ca_lam WHERE id=$1`, [id]);
  return rows[0] || null;
}

// ============================================
// CLOSE SHIFT ENHANCEMENT
// ============================================

/**
 * Aggregate shift statistics (live data before closing)
 * Tổng hợp số liệu ca làm từ đơn hàng đã thanh toán
 */
export async function aggregateShift(shiftId) {
  const client = await pool.connect();
  try {
    // Sử dụng function đã tạo trong migration
    const { rows: [data] } = await client.query(
      `SELECT fn_aggregate_shift($1) AS stats`,
      [shiftId]
    );
    
    const stats = data?.stats || {};
    
    // Đếm refunds nếu có bảng refunds (hiện tại chưa có)
    const total_refunds = 0;
    
    return {
      totals: {
        gross: Number(stats.gross_amount || 0),
        discount: Number(stats.discount_amount || 0),
        tax: Number(stats.tax_amount || 0),
        net: Number(stats.net_amount || 0),
        total_orders: Number(stats.total_orders || 0),
        total_refunds,
      },
      payments: {
        cash: Number(stats.cash_amount || 0),
        card: Number(stats.card_amount || 0),
        transfer: Number(stats.transfer_amount || 0),
        online: Number(stats.online_amount || 0),
      }
    };
  } finally {
    client.release();
  }
}

/**
 * Close shift with transaction lock
 * Đóng ca với khóa transaction
 */
export async function closeShiftTx({ 
  shiftId, 
  closedBy, 
  expectedCash, 
  actualCash, 
  cashDiff, 
  summary, 
  note 
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Khóa dòng ca để tránh đóng trùng
    const { rows: [shift] } = await client.query(
      `SELECT id, status FROM ca_lam WHERE id=$1 FOR UPDATE`,
      [shiftId]
    );
    
    if (!shift) {
      throw new Error('SHIFT_NOT_FOUND');
    }
    
    if (shift.status !== 'OPEN') {
      throw new Error('SHIFT_ALREADY_CLOSED');
    }

    // Cập nhật các chỉ số tổng hợp xuống ca_lam
    const { totals, payments } = summary;
    await client.query(
      `UPDATE ca_lam
       SET status='CLOSED',
           ended_at = NOW(),
           closed_at = NOW(),
           closed_by = $2,
           expected_cash   = $3,
           actual_cash     = $4,
           cash_diff       = $5,
           total_orders    = $6,
           total_refunds   = $7,
           gross_amount    = $8,
           discount_amount = $9,
           tax_amount      = $10,
           net_amount      = $11,
           cash_amount     = $12,
           card_amount     = $13,
           transfer_amount = $14,
           online_amount   = $15,
           note            = COALESCE($16, note),
           updated_at      = NOW()
       WHERE id = $1`,
      [
        shiftId, closedBy, expectedCash, actualCash, cashDiff,
        totals.total_orders, totals.total_refunds,
        totals.gross, totals.discount, totals.tax, totals.net,
        payments.cash, payments.card, payments.transfer, payments.online,
        note || null
      ]
    );

    await client.query('COMMIT');

    // Trả về biên bản chốt
    const { rows: [closed] } = await pool.query(
      `SELECT * FROM ca_lam WHERE id=$1`, 
      [shiftId]
    );
    return closed;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get shift summary with user info (for reports)
 */
export async function getShiftWithSummary(shiftId) {
  const { rows } = await query(
    `SELECT * FROM v_shift_summary WHERE shift_id=$1`,
    [shiftId]
  );
  return rows[0] || null;
}