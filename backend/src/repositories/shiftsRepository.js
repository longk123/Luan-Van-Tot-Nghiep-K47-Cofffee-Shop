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
