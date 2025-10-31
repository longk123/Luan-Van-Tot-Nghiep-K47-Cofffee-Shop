import { pool } from "../db.js";

export async function createTable(data) {
  const { ten_ban, khu_vuc, suc_chua, ghi_chu } = data;
  const q = `
    INSERT INTO ban (ten_ban, khu_vuc, suc_chua, ghi_chu)
    VALUES ($1,$2,$3,$4)
    RETURNING *`;
  const { rows } = await pool.query(q, [ten_ban, khu_vuc, suc_chua, ghi_chu]);
  return rows[0];
}

export async function listTables({ khu_vuc, trang_thai, q }) {
  const where = [];
  const params = [];
  // Support both khu_vuc (TEXT - old) and khu_vuc_id (INT - new)
  if (khu_vuc) {
    params.push(khu_vuc);
    // Try khu_vuc_id first (if it's a number), fallback to khu_vuc (TEXT)
    if (!isNaN(khu_vuc)) {
      where.push(`khu_vuc_id = $${params.length}`);
    } else {
      where.push(`khu_vuc = $${params.length}`);
    }
  }
  if (trang_thai) { params.push(trang_thai); where.push(`trang_thai = $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`ten_ban ILIKE $${params.length}`); }
  const sql = `SELECT * FROM ban ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id ASC`;
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getTable(id) {
  const { rows } = await pool.query("SELECT * FROM ban WHERE id=$1", [id]);
  return rows[0] || null;
}

export async function updateTable(id, data) {
  const fields = [];
  const params = [];
  Object.entries(data).forEach(([k, v]) => {
    params.push(v);
    fields.push(`${k} = $${params.length}`);
  });
  if (!fields.length) return getTable(id);
  params.push(id);
  const q = `
    UPDATE ban SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${params.length}
    RETURNING *`;
  const { rows } = await pool.query(q, params);
  return rows[0] || null;
}

export async function updateStatus(id, trang_thai) {
  const { rows } = await pool.query(
    "UPDATE ban SET trang_thai=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [trang_thai, id]
  );
  return rows[0] || null;
}

export async function removeTable(id) {
  const { rows } = await pool.query("DELETE FROM ban WHERE id=$1 RETURNING id", [id]);
  return rows[0]?.id || null;
}
