// src/controllers/posItemsController.js
import { pool } from "../db.js";
import { BadRequest } from "../utils/httpErrors.js";
import { emitChange } from "../utils/eventBus.js";

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
 * POST /api/v1/pos/orders/:orderId/items
 * Body (2 cách):
 *  A) { mon_id, bien_the_id, so_luong }    // server auto tách thành N line (mặc định options rỗng)
 *  B) { mon_id, bien_the_id, cups: [{tuy_chon:{SUGAR:0.7, ICE:0.5}, ghi_chu:"..."}, ...] }
 */
export async function addOrderItems(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const { mon_id, bien_the_id, so_luong, cups, don_gia, giam_gia } = req.body;

  if (!orderId || !mon_id) return next(new BadRequest("Thiếu orderId/mon_id"));
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertOrderOpen(client, orderId);

    // Lấy đơn giá nếu không truyền (ví dụ từ mon_bien_the.gia)
    let price = don_gia;
    if (price == null) {
      if (bien_the_id) {
        const q = await client.query(
          `SELECT gia FROM mon_bien_the WHERE id = $1`,
          [bien_the_id]
        );
        price = q.rows[0]?.gia ?? 0;
      } else {
        const q = await client.query(
          `SELECT gia_mac_dinh FROM mon WHERE id = $1`,
          [mon_id]
        );
        price = q.rows[0]?.gia_mac_dinh ?? 0;
      }
    }

    const createdLines = [];

    if (Array.isArray(cups) && cups.length > 0) {
      // Mỗi cup = 1 line (so_luong=1)
      for (const cup of cups) {
        const ghi_chu = cup?.ghi_chu ?? null;
        const insLine = await client.query(
          `INSERT INTO don_hang_chi_tiet(don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, ghi_chu, trang_thai_che_bien)
           VALUES ($1,$2,$3,1,$4,$5,$6,'QUEUED')
           RETURNING id`,
          [orderId, mon_id, bien_the_id, price, giam_gia ?? 0, ghi_chu]
        );
        const lineId = insLine.rows[0].id;
        createdLines.push(lineId);

        // Ghi options nếu có (hỗ trợ cả PERCENT và AMOUNT)
        const opts = cup?.tuy_chon || {};
        const entries = Object.entries(opts);
        if (entries.length) {
          // Lấy metadata (id, ma, loai) của các options
          const { rows: optRows } = await client.query(
            `SELECT id, ma, loai FROM tuy_chon_mon WHERE ma = ANY($1::text[])`,
            [entries.map(([k]) => k)]
          );
          const mapMa = new Map(optRows.map(r => [r.ma, { id: r.id, loai: r.loai }]));
          
          for (const [ma, val] of entries) {
            const meta = mapMa.get(ma);
            if (!meta) continue;

            const isPercent = meta.loai === "PERCENT";
            const isAmount = meta.loai === "AMOUNT";

            // Chuẩn hóa input
            const he_so = typeof val === "number" ? val : (val?.he_so ?? null);
            const so_luong = typeof val === "object" ? (val?.so_luong ?? null) : null;

            if (isPercent && he_so != null) {
              // PERCENT: lưu he_so
              const { rows: lv } = await client.query(
                `SELECT id FROM tuy_chon_muc WHERE tuy_chon_id=$1 AND gia_tri=$2 LIMIT 1`,
                [meta.id, he_so]
              );
              const mucId = lv[0]?.id ?? null;

              await client.query(
                `INSERT INTO don_hang_chi_tiet_tuy_chon(line_id, tuy_chon_id, muc_id, he_so, so_luong)
                 VALUES ($1,$2,$3,$4,1)
                 ON CONFLICT (line_id, tuy_chon_id)
                 DO UPDATE SET muc_id=EXCLUDED.muc_id, he_so=EXCLUDED.he_so`,
                [lineId, meta.id, mucId, he_so]
              );
            }

            if (isAmount && so_luong != null && so_luong > 0) {
              // AMOUNT: lưu so_luong
              await client.query(
                `INSERT INTO don_hang_chi_tiet_tuy_chon(line_id, tuy_chon_id, so_luong, he_so, muc_id)
                 VALUES ($1,$2,$3,1,NULL)
                 ON CONFLICT (line_id, tuy_chon_id)
                 DO UPDATE SET so_luong=EXCLUDED.so_luong`,
                [lineId, meta.id, so_luong]
              );
            }
          }
        }
      }
    } else {
      // so_luong N -> tự tách N line, mỗi line qty=1 (để sau còn chỉnh từng ly)
      const qty = parseInt(so_luong ?? 1, 10);
      if (qty <= 0) return next(new BadRequest("so_luong phải > 0"));
      for (let i = 0; i < qty; i++) {
        const insLine = await client.query(
          `INSERT INTO don_hang_chi_tiet(don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, trang_thai_che_bien)
           VALUES ($1,$2,$3,1,$4,$5,'QUEUED')
           RETURNING id`,
          [orderId, mon_id, bien_the_id, price, giam_gia ?? 0]
        );
        createdLines.push(insLine.rows[0].id);
      }
    }

    await client.query("COMMIT");
    
    // Emit event for realtime update
    emitChange('order.items.added', { orderId, lineIds: createdLines });
    
    res.status(201).json({ ok: true, data: { orderId, created_line_ids: createdLines } });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /api/v1/pos/orders/:orderId/items-ext
 * Trả dữ liệu từ VIEW v_open_order_items_detail_ext (line + options)
 */
export async function getOrderItemsExtended(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM v_open_order_items_detail_ext WHERE order_id=$1 ORDER BY line_id`,
      [orderId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) { 
    next(err); 
  }
}

/**
 * GET /api/v1/pos/orders/:orderId/items-with-addons
 * Trả dữ liệu từ VIEW v_all_order_items_with_addons 
 * (bao gồm tính toán topping_total và line_total_with_addons cho cả OPEN và PAID)
 */
export async function getOrderItemsWithAddons(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM v_all_order_items_with_addons WHERE order_id=$1 ORDER BY line_id`,
      [orderId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) { 
    next(err); 
  }
}

/**
 * PATCH /api/v1/pos/orders/:orderId/items/:lineId
 * Cho phép sửa: bien_the_id?, so_luong?(=1 khuyến nghị), don_gia?, giam_gia?, ghi_chu?
 * DB trigger sẽ CHẶN nếu line != QUEUED hoặc order = PAID
 */
export async function updateOrderItem(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const { bien_the_id, so_luong, don_gia, giam_gia, ghi_chu } = req.body;

  if (!lineId) return next(new BadRequest("Thiếu lineId"));

  const fields = [];
  const vals = [];
  let idx = 1;

  if (bien_the_id != null) { fields.push(`bien_the_id=$${idx++}`); vals.push(bien_the_id); }
  if (so_luong != null)    { fields.push(`so_luong=$${idx++}`);    vals.push(so_luong);    }
  if (don_gia != null)     { fields.push(`don_gia=$${idx++}`);     vals.push(don_gia);     }
  if (giam_gia != null)    { fields.push(`giam_gia=$${idx++}`);    vals.push(giam_gia);    }
  if (ghi_chu !== undefined){fields.push(`ghi_chu=$${idx++}`);     vals.push(ghi_chu);     }

  if (!fields.length) return next(new BadRequest("Không có trường nào để cập nhật"));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertOrderOpen(client, orderId);

    const q = await client.query(
      `UPDATE don_hang_chi_tiet SET ${fields.join(", ")}
       WHERE id=$${idx} AND don_hang_id=$${idx+1}
       RETURNING id`,
      [...vals, lineId, orderId]
    );
    if (!q.rowCount) throw new BadRequest("Không cập nhật được dòng (sai orderId/lineId?)");

    await client.query("COMMIT");
    
    // Emit event
    emitChange('order.item.updated', { orderId, lineId });
    
    res.json({ ok: true, data: { updated: q.rows[0].id } });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

/**
 * PUT /api/v1/pos/orders/:orderId/items/:lineId/options
 * Body có thể là:
 *  - PERCENT: { "SUGAR": 0.7, "ICE": 0.5 } hoặc { "SUGAR": { "he_so": 0.7 } }
 *  - AMOUNT:  { "TOPPING_FLAN": { "so_luong": 2 } }
 * Lưu/ghi đè các option cho line. Trigger sẽ CHẶN khi không hợp lệ.
 */
export async function upsertOrderItemOptions(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const opts = req.body || {};
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertOrderOpen(client, orderId);

    // Kiểm tra line thuộc order
    const chk = await client.query(
      `SELECT id FROM don_hang_chi_tiet WHERE id=$1 AND don_hang_id=$2`,
      [lineId, orderId]
    );
    if (!chk.rowCount) throw new BadRequest("Line không thuộc order này");

    const entries = Object.entries(opts);
    if (!entries.length) {
      await client.query("COMMIT");
      return res.json({ ok: true, data: { updated: 0 } });
    }

    // Lấy metadata của các nhóm options (PERCENT/AMOUNT)
    const { rows: optRows } = await client.query(
      `SELECT id, ma, loai FROM tuy_chon_mon WHERE ma = ANY($1::text[])`,
      [entries.map(([ma]) => ma)]
    );
    const mapMa = new Map(optRows.map(r => [r.ma, { id: r.id, loai: r.loai }]));

    let updated = 0;
    
    for (const [ma, val] of entries) {
      const meta = mapMa.get(ma);
      if (!meta) continue;

      const isPercent = meta.loai === "PERCENT";
      const isAmount = meta.loai === "AMOUNT";

      // Chuẩn hóa input
      const he_so = typeof val === "number" ? val : (val?.he_so ?? null);
      const so_luong = typeof val === "object" ? (val?.so_luong ?? null) : null;

      if (isPercent) {
        // PERCENT → lưu he_so (0..1)
        // Tìm muc_id nếu có preset level chính xác
        let mucId = null;
        if (he_so != null) {
          const { rows: lv } = await client.query(
            `SELECT id FROM tuy_chon_muc WHERE tuy_chon_id=$1 AND gia_tri=$2 LIMIT 1`,
            [meta.id, he_so]
          );
          mucId = lv[0]?.id ?? null;
        }

        const q = await client.query(
          `INSERT INTO don_hang_chi_tiet_tuy_chon(line_id, tuy_chon_id, muc_id, he_so, so_luong)
           VALUES ($1,$2,$3,$4,1)
           ON CONFLICT (line_id, tuy_chon_id)
           DO UPDATE SET muc_id=EXCLUDED.muc_id, he_so=EXCLUDED.he_so
           RETURNING id`,
          [lineId, meta.id, mucId, he_so]
        );
        updated += q.rowCount;
      }

      if (isAmount) {
        // AMOUNT → lưu so_luong. Nếu so_luong=0 thì xóa topping
        if (so_luong === 0 || so_luong === null) {
          const del = await client.query(
            `DELETE FROM don_hang_chi_tiet_tuy_chon WHERE line_id=$1 AND tuy_chon_id=$2`,
            [lineId, meta.id]
          );
          updated += del.rowCount;
        } else {
          const q = await client.query(
            `INSERT INTO don_hang_chi_tiet_tuy_chon(line_id, tuy_chon_id, so_luong, he_so, muc_id)
             VALUES ($1,$2,$3,1,NULL)
             ON CONFLICT (line_id, tuy_chon_id)
             DO UPDATE SET so_luong=EXCLUDED.so_luong
             RETURNING id`,
            [lineId, meta.id, so_luong ?? 1]
          );
          updated += q.rowCount;
        }
      }
    }

    await client.query("COMMIT");
    
    // Emit event
    emitChange('order.item.options.updated', { orderId, lineId });
    
    res.json({ ok: true, data: { updated } });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/v1/pos/orders/:orderId/items/:lineId/status
 * Body: { trang_thai_che_bien: 'MAKING'|'DONE'|'CANCELLED', maker_id? }
 * Set timestamps maker_id tương ứng.
 */
export async function updateOrderItemStatus(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const { trang_thai_che_bien, maker_id } = req.body || {};
  const allowed = new Set(["QUEUED","MAKING","DONE","CANCELLED"]);
  if (!allowed.has(trang_thai_che_bien)) return next(new BadRequest("Trạng thái không hợp lệ"));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Đơn PAID thì không cho đổi trạng thái
    await assertOrderOpen(client, orderId);

    // Lấy trạng thái cũ để set timestamp phù hợp
    const { rows } = await client.query(
      `SELECT trang_thai_che_bien FROM don_hang_chi_tiet
       WHERE id=$1 AND don_hang_id=$2`,
      [lineId, orderId]
    );
    if (!rows.length) throw new BadRequest("Không tìm thấy line");

    const old = rows[0].trang_thai_che_bien;

    let setCols = [`trang_thai_che_bien=$1`];
    const params = [trang_thai_che_bien];
    let i = 2;

    if (trang_thai_che_bien === "MAKING" && old === "QUEUED") {
      setCols.push(`started_at=COALESCE(started_at, now())`);
      if (maker_id) { setCols.push(`maker_id=$${i++}`); params.push(maker_id); }
    }
    if (trang_thai_che_bien === "DONE" && (old === "MAKING" || old === "QUEUED")) {
      setCols.push(`finished_at=COALESCE(finished_at, now())`);
      if (maker_id) { setCols.push(`maker_id=$${i++}`); params.push(maker_id); }
    }
    if (trang_thai_che_bien === "CANCELLED") {
      // huỷ ly trước khi làm hoặc đang làm -> finished_at null
      if (maker_id) { setCols.push(`maker_id=$${i++}`); params.push(maker_id); }
    }

    params.push(lineId, orderId);

    const q = await client.query(
      `UPDATE don_hang_chi_tiet SET ${setCols.join(", ")}
       WHERE id=$${i++} AND don_hang_id=$${i}
       RETURNING id, trang_thai_che_bien, started_at, finished_at, maker_id`,
      params
    );
    if (!q.rowCount) throw new BadRequest("Không cập nhật được trạng thái dòng");

    await client.query("COMMIT");
    
    // Emit event
    emitChange('order.item.status.updated', { orderId, lineId, trang_thai_che_bien });
    
    res.json({ ok: true, data: q.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/v1/pos/orders/:orderId/items/:lineId
 * DB trigger sẽ chặn nếu line != QUEUED hoặc order=PAID
 */
export async function deleteOrderItem(req, res, next) {
  const orderId = parseInt(req.params.orderId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  
  console.log(`🗑️ DELETE request: orderId=${orderId}, lineId=${lineId}`);
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertOrderOpen(client, orderId);

    const del = await client.query(
      `DELETE FROM don_hang_chi_tiet WHERE id=$1 AND don_hang_id=$2 RETURNING id`,
      [lineId, orderId]
    );
    if (!del.rowCount) throw new BadRequest("Không thể xóa dòng (có thể đã làm hoặc sai line/order)");

    await client.query("COMMIT");
    
    // Emit event
    emitChange('order.item.deleted', { orderId, lineId });
    
    res.json({ ok: true, data: { deleted: del.rows[0].id } });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

