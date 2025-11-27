// src/controllers/posPromotionsController.js
import { pool } from "../db.js";
import { BadRequest } from "../utils/httpErrors.js";

/**
 * Helper: kiểm tra đơn chưa PAID
 */
async function assertOrderOpen(client, orderId) {
  const { rows } = await client.query(
    `SELECT trang_thai FROM don_hang WHERE id=$1`, [orderId]
  );
  if (!rows.length) throw new BadRequest("Đơn hàng không tồn tại");
  if (rows[0].trang_thai === "PAID") {
    throw new BadRequest("Đơn đã thanh toán — không thể chỉnh sửa.");
  }
}

/**
 * GET /api/v1/promotions?active=1
 * Lấy danh sách các chương trình khuyến mãi
 */
export async function listActivePromotions(req, res, next) {
  try {
    const onlyActive = String(req.query.active ?? "1") === "1";
    const sql = `
      SELECT 
        id, ma, ten, mo_ta, loai, gia_tri, max_giam, dieu_kien, bat_dau, ket_thuc, stackable,
        CASE 
          WHEN dieu_kien IS NOT NULL AND dieu_kien::jsonb ? 'min_order_value' 
          THEN (dieu_kien::jsonb->>'min_order_value')::int
          ELSE NULL
        END AS don_hang_toi_thieu
      FROM khuyen_mai
      ${onlyActive ? "WHERE active = TRUE AND (bat_dau IS NULL OR now() >= bat_dau) AND (ket_thuc IS NULL OR now() <= (DATE(ket_thuc) + INTERVAL '1 day' - INTERVAL '1 second'))" : ""}
      ORDER BY id DESC
    `;
    const { rows } = await pool.query(sql);
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/v1/pos/orders/:orderId/promotions
 * Lấy danh sách KM đang áp dụng cho đơn hàng
 */
export async function listOrderPromotions(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM v_order_promotions WHERE order_id=$1 ORDER BY promo_id`,
      [orderId]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/v1/pos/orders/:orderId/apply-promo
 * Body: { code: "GIAM10", applied_by?: userId }
 * Áp dụng mã khuyến mãi cho đơn
 */
export async function applyPromotionByCode(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const { code, applied_by } = req.body || {};
  
  if (!code) return next(new BadRequest("Thiếu mã khuyến mãi 'code'"));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertOrderOpen(client, orderId);

    // Tìm CTKM theo code, còn hiệu lực
    const { rows: promos } = await client.query(
      `SELECT * FROM khuyen_mai
       WHERE lower(ma)=lower($1) AND active=TRUE
         AND (bat_dau IS NULL OR now() >= bat_dau)
         AND (ket_thuc IS NULL OR now() <= (DATE(ket_thuc) + INTERVAL '1 day' - INTERVAL '1 second'))
       LIMIT 1`,
      [code]
    );
    if (!promos.length) {
      throw new BadRequest("Mã khuyến mãi không hợp lệ hoặc đã hết hạn");
    }
    const promo = promos[0];

    // Kiểm tra điều kiện đơn hàng tối thiểu
    let minOrderValue = null;
    if (promo.dieu_kien) {
      try {
        const dieuKien = typeof promo.dieu_kien === 'string' 
          ? JSON.parse(promo.dieu_kien) 
          : promo.dieu_kien;
        minOrderValue = dieuKien?.min_order_value || null;
      } catch (e) {
        console.error('Error parsing dieu_kien:', e);
      }
    }
    
    // Nếu có điều kiện đơn hàng tối thiểu, kiểm tra subtotal
    if (minOrderValue && minOrderValue > 0) {
      const { rows: summaryRows } = await client.query(
        `SELECT subtotal_after_lines, subtotal FROM v_order_money_totals WHERE order_id=$1`,
        [orderId]
      );
      
      if (!summaryRows.length) {
        throw new BadRequest("Không thể lấy thông tin đơn hàng");
      }
      
      const summary = summaryRows[0];
      const currentSubtotal = summary.subtotal_after_lines !== null && summary.subtotal_after_lines !== undefined
        ? summary.subtotal_after_lines
        : (summary.subtotal || 0);
      
      if (currentSubtotal < minOrderValue) {
        const needed = minOrderValue - currentSubtotal;
        throw new BadRequest(
          `Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(minOrderValue)}₫ để sử dụng mã này. ` +
          `Cần thêm ${new Intl.NumberFormat('vi-VN').format(needed)}₫`
        );
      }
    }

    // Nếu promo không stackable, chặn khi đã có KM không stackable khác
    if (promo.stackable === false) {
      const { rows: existing } = await client.query(
        `SELECT km.id, km.ma, km.stackable
         FROM don_hang_khuyen_mai dhkm
         JOIN khuyen_mai km ON km.id = dhkm.khuyen_mai_id
         WHERE dhkm.don_hang_id=$1`,
        [orderId]
      );
      const hasNonStackable = existing.some(p => p.stackable === false);
      if (hasNonStackable) {
        throw new BadRequest("Đơn đã có khuyến mãi không cộng dồn; không thể áp thêm.");
      }
    }

    // Tính số tiền giảm theo fn_calc_promo_amount
    const { rows: calc } = await client.query(
      `SELECT fn_calc_promo_amount($1, $2) AS amount`,
      [orderId, promo.id]
    );
    const amount = calc[0]?.amount ?? 0;
    if (amount <= 0) {
      throw new BadRequest("Điều kiện không đạt — khuyến mãi không áp dụng được.");
    }

    // Kiểm tra tổng giảm không vượt quá giá trị đơn hàng
    // Lấy subtotal và tổng giảm hiện tại
    const { rows: currentSummary } = await client.query(
      `SELECT subtotal_after_lines, promo_total, manual_discount 
       FROM v_order_money_totals WHERE order_id=$1`,
      [orderId]
    );
    
    if (currentSummary.length > 0) {
      const subtotal = currentSummary[0].subtotal_after_lines || 0;
      const existingPromoTotal = currentSummary[0].promo_total || 0;
      const manualDiscount = currentSummary[0].manual_discount || 0;
      
      // Tổng giảm mới = (KM hiện tại + KM mới + Giảm thủ công)
      const newTotalDiscount = existingPromoTotal + amount + manualDiscount;
      
      if (newTotalDiscount > subtotal) {
        const maxAllowed = Math.max(0, subtotal - existingPromoTotal - manualDiscount);
        throw new BadRequest(
          `Không thể áp dụng khuyến mãi. Tổng giảm (${new Intl.NumberFormat('vi-VN').format(newTotalDiscount)}₫) ` +
          `vượt quá giá trị đơn hàng (${new Intl.NumberFormat('vi-VN').format(subtotal)}₫). ` +
          `Có thể giảm tối đa thêm ${new Intl.NumberFormat('vi-VN').format(maxAllowed)}₫.`
        );
      }
    }

    // Ghi vào don_hang_khuyen_mai (upsert)
    await client.query(
      `INSERT INTO don_hang_khuyen_mai(don_hang_id, khuyen_mai_id, so_tien_giam, chi_tiet, applied_by)
       VALUES ($1,$2,$3, jsonb_build_object('code',$4::text,'at',now()), $5)
       ON CONFLICT (don_hang_id, khuyen_mai_id)
       DO UPDATE SET so_tien_giam=EXCLUDED.so_tien_giam, chi_tiet=EXCLUDED.chi_tiet, applied_by=EXCLUDED.applied_by`,
      [orderId, promo.id, amount, promo.ma, applied_by ?? null]
    );

    // Tăng used_count
    await client.query(
      `UPDATE khuyen_mai SET used_count = COALESCE(used_count,0)+1 WHERE id=$1`,
      [promo.id]
    );

    // Trả lại tổng tiền mới
    const summary = await client.query(
      `SELECT * FROM v_order_money_totals WHERE order_id=$1`,
      [orderId]
    );
    const applied = await client.query(
      `SELECT * FROM v_order_promotions WHERE order_id=$1`,
      [orderId]
    );

    await client.query("COMMIT");
    res.status(201).json({
      ok: true,
      data: {
        applied: applied.rows,
        summary: summary.rows[0]
      }
    });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/v1/pos/orders/:orderId/promotions/:promoId
 * Xóa khuyến mãi khỏi đơn
 */
export async function removePromotion(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const promoId = parseInt(req.params.promoId, 10);
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertOrderOpen(client, orderId);

    const del = await client.query(
      `DELETE FROM don_hang_khuyen_mai WHERE don_hang_id=$1 AND khuyen_mai_id=$2 RETURNING khuyen_mai_id`,
      [orderId, promoId]
    );
    if (!del.rowCount) {
      throw new BadRequest("Khuyến mãi không tồn tại trên đơn này.");
    }

    const summary = await client.query(
      `SELECT * FROM v_order_money_totals WHERE order_id=$1`,
      [orderId]
    );
    const applied = await client.query(
      `SELECT * FROM v_order_promotions WHERE order_id=$1`,
      [orderId]
    );

    await client.query("COMMIT");
    res.json({
      ok: true,
      data: {
        removed: promoId,
        applied: applied.rows,
        summary: summary.rows[0]
      }
    });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/v1/pos/orders/:orderId/discount
 * Body: { amount, note, by }
 * Giảm giá thủ công cấp đơn
 */
export async function setManualDiscount(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const { amount, note, by } = req.body || {};
  
  if (amount == null || amount < 0) {
    return next(new BadRequest("amount phải >= 0"));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertOrderOpen(client, orderId);

    await client.query(
      `UPDATE don_hang
       SET giam_gia_thu_cong=$1, giam_gia_note=$2, giam_gia_by=$3, giam_gia_at=now()
       WHERE id=$4`,
      [Math.floor(amount), note ?? null, by ?? null, orderId]
    );

    const summary = await client.query(
      `SELECT * FROM v_order_money_totals WHERE order_id=$1`,
      [orderId]
    );
    
    await client.query("COMMIT");
    res.json({ ok: true, data: { summary: summary.rows[0] } });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
}

/**
 * GET /api/v1/pos/orders/:orderId/money-summary
 * Lấy tổng tiền chi tiết (subtotal, KM, giảm, phí, VAT, grand total)
 */
export async function getOrderMoneySummary(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  try {
    const [summary, promos] = await Promise.all([
      pool.query(`SELECT * FROM v_order_money_totals WHERE order_id=$1`, [orderId]),
      pool.query(`SELECT * FROM v_order_promotions WHERE order_id=$1`, [orderId]),
    ]);
    res.json({
      ok: true,
      data: {
        summary: summary.rows[0],
        promotions: promos.rows
      }
    });
  } catch (e) {
    next(e);
  }
}

