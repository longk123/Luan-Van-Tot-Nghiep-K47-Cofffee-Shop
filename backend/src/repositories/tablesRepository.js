import { pool } from "../db.js";

export async function createTable(data) {
  const { ten_ban, khu_vuc, suc_chua, ghi_chu } = data;

  // khu_vuc có thể là INT (area ID) hoặc STRING (tên khu vực cũ)
  // Nếu là INT -> lưu vào khu_vuc_id, nếu là STRING -> lưu vào khu_vuc
  const isAreaId = typeof khu_vuc === 'number' || !isNaN(khu_vuc);

  const q = isAreaId
    ? `INSERT INTO ban (ten_ban, khu_vuc_id, suc_chua, ghi_chu)
       VALUES ($1,$2,$3,$4)
       RETURNING *`
    : `INSERT INTO ban (ten_ban, khu_vuc, suc_chua, ghi_chu)
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
      where.push(`b.khu_vuc_id = $${params.length}`);
    } else {
      where.push(`b.khu_vuc = $${params.length}`);
    }
  }
  if (trang_thai) { params.push(trang_thai); where.push(`b.trang_thai = $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`b.ten_ban ILIKE $${params.length}`); }

  // JOIN với khu_vuc để lấy tên khu vực
  const sql = `
    SELECT
      b.*,
      kv.ten AS khu_vuc_ten,
      kv.id AS khu_vuc_id
    FROM ban b
    LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY b.id ASC
  `;

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

  // Xử lý khu_vuc: nếu là INT -> dùng khu_vuc_id, nếu là STRING -> dùng khu_vuc
  const processedData = { ...data };
  if ('khu_vuc' in processedData) {
    const isAreaId = typeof processedData.khu_vuc === 'number' || !isNaN(processedData.khu_vuc);
    if (isAreaId) {
      processedData.khu_vuc_id = processedData.khu_vuc;
      delete processedData.khu_vuc;
    }
  }

  Object.entries(processedData).forEach(([k, v]) => {
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
