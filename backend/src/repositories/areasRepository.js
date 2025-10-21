// src/repositories/areasRepository.js
import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export async function listAreas({ includeCounts = false }) {
  if (!includeCounts) {
    const { rows } = await query(
      `SELECT id, ten, mo_ta, thu_tu, active FROM khu_vuc ORDER BY thu_tu, ten`
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT kv.id, kv.ten, kv.mo_ta, kv.thu_tu, kv.active,
            COUNT(b.id)::int AS total_tables,
            COUNT(NULLIF(b.trang_thai <> 'TRONG', false))::int AS occupied_or_locked,
            COUNT(NULLIF(b.trang_thai = 'TRONG', false))::int AS free_tables
     FROM khu_vuc kv
     LEFT JOIN ban b ON b.khu_vuc_id = kv.id
     GROUP BY kv.id
     ORDER BY kv.thu_tu, kv.ten;`
  );
  return rows;
}

export async function createArea({ ten, mo_ta = null, thu_tu = 0, active = true }) {
  const { rows } = await query(
    `INSERT INTO khu_vuc (ten, mo_ta, thu_tu, active)
     VALUES ($1, $2, $3::int, $4)
     RETURNING *;`,
    [ten, mo_ta, thu_tu, active]
  );
  return rows[0];
}

export async function updateArea(id, { ten, mo_ta, thu_tu, active }) {
  const { rows } = await query(
    `UPDATE khu_vuc
     SET ten = COALESCE($2, ten),
         mo_ta = COALESCE($3, mo_ta),
         thu_tu = COALESCE($4::int, thu_tu),
         active = COALESCE($5, active)
     WHERE id = $1
     RETURNING *;`,
    [id, ten, mo_ta, thu_tu, active]
  );
  return rows[0] || null;
}

export async function getAreaById(id) {
  const { rows } = await query(`SELECT * FROM khu_vuc WHERE id=$1`, [id]);
  return rows[0] || null;
}

export async function deleteAreaSoft(id) {
  const { rows } = await query(
    `UPDATE khu_vuc SET active=false WHERE id=$1 RETURNING id`,
    [id]
  );
  return !!rows[0];
}

export async function listTablesByArea(areaId) {
  const { rows } = await query(
    `SELECT b.id, b.ten_ban, b.trang_thai, b.suc_chua, b.khu_vuc_id,
            v.order_id, v.item_count::int, v.subtotal::int, v.opened_at
     FROM ban b
     LEFT JOIN v_open_order_per_table v ON v.ban_id = b.id
     WHERE b.khu_vuc_id = $1
     ORDER BY b.ten_ban;`,
    [areaId]
  );
  return rows;
}
