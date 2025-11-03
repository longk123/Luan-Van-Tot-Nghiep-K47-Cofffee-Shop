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
  // Kiểm tra thứ tự trùng
  const { rows: existing } = await query(
    `SELECT id, ten FROM khu_vuc WHERE thu_tu = $1`,
    [thu_tu]
  );
  if (existing.length > 0) {
    throw new Error(`Thứ tự ${thu_tu} đã được sử dụng bởi khu vực "${existing[0].ten}"`);
  }

  const { rows } = await query(
    `INSERT INTO khu_vuc (ten, mo_ta, thu_tu, active)
     VALUES ($1, $2, $3::int, $4)
     RETURNING *;`,
    [ten, mo_ta, thu_tu, active]
  );
  return rows[0];
}

export async function updateArea(id, { ten, mo_ta, thu_tu, active }) {
  // Kiểm tra thứ tự trùng (nếu có thay đổi thu_tu)
  if (thu_tu !== undefined && thu_tu !== null) {
    const { rows: existing } = await query(
      `SELECT id, ten FROM khu_vuc WHERE thu_tu = $1 AND id != $2`,
      [thu_tu, id]
    );
    if (existing.length > 0) {
      throw new Error(`Thứ tự ${thu_tu} đã được sử dụng bởi khu vực "${existing[0].ten}"`);
    }
  }

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



export async function deleteAreaHard(id) {
  // Kiểm tra khu vực có tồn tại không
  const area = await getAreaById(id);
  if (!area) {
    throw new Error('Không tìm thấy khu vực');
  }

  // Kiểm tra có bàn đang dùng không
  const { rows: tablesInUse } = await query(
    `SELECT id, ten_ban FROM ban WHERE khu_vuc_id = $1 AND trang_thai = 'DANG_DUNG'`,
    [id]
  );
  if (tablesInUse.length > 0) {
    const tableNames = tablesInUse.map(t => t.ten_ban).join(', ');
    throw new Error(`Không thể xóa khu vực có bàn đang dùng: ${tableNames}`);
  }

  // Kiểm tra có bàn nào thuộc khu vực này không
  const { rows: tables } = await query(
    `SELECT COUNT(*) as count FROM ban WHERE khu_vuc_id = $1`,
    [id]
  );
  if (tables[0].count > 0) {
    throw new Error(`Không thể xóa khu vực có ${tables[0].count} bàn. Vui lòng xóa hoặc chuyển bàn sang khu vực khác trước.`);
  }

  const { rows } = await query(
    `DELETE FROM khu_vuc WHERE id=$1 RETURNING id`,
    [id]
  );
  return !!rows[0];
}

export async function toggleAreaActive(id) {
  // Kiểm tra khu vực có tồn tại không
  const area = await getAreaById(id);
  if (!area) {
    throw new Error('Không tìm thấy khu vực');
  }

  const { rows } = await query(
    `UPDATE khu_vuc SET active = NOT active WHERE id=$1 RETURNING *`,
    [id]
  );
  return rows[0];
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

