// src/repositories/menuRepository.js
import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export async function getCategories() {
  const { rows } = await query(
    `SELECT id, ten, mo_ta, thu_tu
     FROM loai_mon
     WHERE active = true
     ORDER BY thu_tu, ten;`
  );
  return rows;
}

export async function getItemsByCategory(categoryId) {
  const { rows } = await query(
    `SELECT m.id, m.ten, m.ma, m.loai_id, m.don_vi, 
            m.gia_mac_dinh, m.thu_tu, m.active, m.hinh_anh,
            lm.ten AS loai_ten
     FROM mon m
     LEFT JOIN loai_mon lm ON lm.id = m.loai_id
     WHERE ($1::int IS NULL OR m.loai_id = $1) AND m.active = true
     ORDER BY m.thu_tu, m.id`,
    [categoryId ?? null]
  );
  return rows;
}

export async function getItemWithVariants(itemId) {
  const { rows: itemRows } = await query(
    `SELECT m.id, m.ten, m.ma, m.loai_id, m.don_vi,
            m.gia_mac_dinh::int AS gia_mac_dinh,
            m.mo_ta, m.hinh_anh
     FROM mon m WHERE m.id=$1 AND m.active=true`,
    [itemId]
  );
  if (!itemRows[0]) return null;

  const { rows: varRows } = await query(
    `SELECT id, ten_bien_the, gia::int AS gia, thu_tu, active
     FROM mon_bien_the WHERE mon_id=$1 AND active=true
     ORDER BY thu_tu, ten_bien_the;`,
    [itemId]
  );

  return { ...itemRows[0], variants: varRows };
}

export async function searchMenu(q) {
  const kw = `%${q.trim()}%`;
  const { rows } = await query(
    `SELECT m.id, m.ten, m.ma, m.loai_id, m.don_vi,
            m.gia_mac_dinh::int AS gia_mac_dinh
     FROM mon m
     WHERE m.active=true AND (m.ten ILIKE $1 OR m.ma ILIKE $1)
     ORDER BY m.ten
     LIMIT 50;`,
    [kw]
  );
  return rows;
}

// ✅ NEW: Lấy biến thể (size) theo mon_id
export async function getItemVariants(itemId) {
  const { rows } = await query(
    `SELECT id, mon_id, ten_bien_the, gia, thu_tu, active
     FROM mon_bien_the
     WHERE mon_id = $1 AND (active IS TRUE OR active IS NULL)
     ORDER BY thu_tu, id`,
    [itemId]
  );
  return rows;
}

// === ✅ TÌM KIẾM MÓN THEO TÊN (case-insensitive, có thể giới hạn số lượng) ===
export async function searchItems(keyword) {
  const kw = keyword?.trim();
  if (!kw) return []; // không có từ khoá thì trả rỗng
  const { rows } = await query(
    `SELECT id, ten, ma, don_vi, gia_mac_dinh, hinh_anh, active
     FROM mon
     WHERE LOWER(ten) LIKE LOWER('%' || $1 || '%')
     AND active = true
     ORDER BY thu_tu, id
     LIMIT 30`,
    [kw]
  );
  return rows;
}