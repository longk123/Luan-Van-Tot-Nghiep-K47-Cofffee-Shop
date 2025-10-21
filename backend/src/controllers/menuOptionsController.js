// src/controllers/menuOptionsController.js
import { pool } from "../db.js";
import { BadRequest } from "../utils/httpErrors.js";

/** 
 * GET /api/v1/menu/options
 * Lấy danh sách tất cả nhóm tùy chọn (SUGAR, ICE, TOPPING_FLAN, ...) 
 */
export async function listOptionGroups(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, ma, ten, don_vi, loai, gia_mac_dinh FROM tuy_chon_mon ORDER BY ma`
    );
    res.json({ ok: true, data: rows });
  } catch (err) { 
    next(err); 
  }
}

/** 
 * GET /api/v1/menu/options/:optId/levels
 * Lấy các mức của 1 nhóm tùy chọn (0%, 30%, 50%, 70%, 100%)
 * Chỉ áp dụng cho loại PERCENT
 */
export async function listOptionLevels(req, res, next) {
  const optId = parseInt(req.params.optId, 10);
  if (isNaN(optId)) {
    return next(new BadRequest("optId không hợp lệ"));
  }
  
  try {
    const { rows } = await pool.query(
      `SELECT id, ten, gia_tri, thu_tu FROM tuy_chon_muc
       WHERE tuy_chon_id=$1 ORDER BY thu_tu, id`, 
      [optId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) { 
    next(err); 
  }
}

/** 
 * GET /api/v1/menu/items/:monId/options
 * Lấy các nhóm tùy chọn áp dụng cho món cụ thể
 * (Dựa vào bảng mon_tuy_chon_ap_dung)
 */
export async function listOptionGroupsForMon(req, res, next) {
  const monId = parseInt(req.params.monId, 10);
  if (isNaN(monId)) {
    return next(new BadRequest("monId không hợp lệ"));
  }
  
  try {
    const { rows } = await pool.query(
      `SELECT tc.id, tc.ma, tc.ten, tc.don_vi, tc.loai, tc.gia_mac_dinh
       FROM mon_tuy_chon_ap_dung m
       JOIN tuy_chon_mon tc ON tc.id = m.tuy_chon_id
       WHERE m.mon_id=$1
       ORDER BY tc.ma`,
       [monId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) { 
    next(err); 
  }
}

/**
 * GET /api/v1/menu/items/:monId/toppings?bien_the_id=X
 * Lấy danh sách topping (AMOUNT) kèm giá cho món/biến thể
 * Giá ưu tiên: biến thể > món > mặc định
 */
export async function listToppingsForMonOrVariant(req, res, next) {
  const monId = parseInt(req.params.monId, 10);
  if (isNaN(monId)) {
    return next(new BadRequest("monId không hợp lệ"));
  }

  const bienTheId = req.query.bien_the_id ? parseInt(req.query.bien_the_id, 10) : null;

  try {
    const sql = `
      SELECT
        tc.id AS tuy_chon_id,
        tc.ma,
        tc.ten,
        tc.don_vi,
        tc.gia_mac_dinh,
        COALESCE(
          (SELECT gia FROM tuy_chon_gia g 
           WHERE g.tuy_chon_id=tc.id AND g.mon_bien_the_id=$2 LIMIT 1),
          (SELECT gia FROM tuy_chon_gia g 
           WHERE g.tuy_chon_id=tc.id AND g.mon_id=$1 AND g.mon_bien_the_id IS NULL LIMIT 1),
          tc.gia_mac_dinh
        ) AS gia_moi_don_vi
      FROM mon_tuy_chon_ap_dung m
      JOIN tuy_chon_mon tc ON tc.id=m.tuy_chon_id
      WHERE m.mon_id=$1 AND tc.loai='AMOUNT'
      ORDER BY tc.ma
    `;
    const { rows } = await pool.query(sql, [monId, bienTheId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
}

