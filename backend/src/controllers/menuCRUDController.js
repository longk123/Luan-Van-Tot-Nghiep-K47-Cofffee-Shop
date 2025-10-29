// src/controllers/menuCRUDController.js
import { pool } from '../db.js';
import { BadRequest, NotFound } from '../utils/httpErrors.js';

// ========== CATEGORIES ==========

/**
 * POST /api/v1/menu/categories
 * Tạo danh mục mới
 */
export async function createCategory(req, res, next) {
  try {
    const { ten, mo_ta, thu_tu } = req.body;
    
    if (!ten) {
      throw new BadRequest('Tên danh mục là bắt buộc');
    }

    // Kiểm tra tên trùng
    const { rows: existingName } = await pool.query(
      'SELECT id FROM loai_mon WHERE ten = $1 AND active = true',
      [ten]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên danh mục "${ten}" đã tồn tại. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra thứ tự trùng
    if (thu_tu !== undefined && thu_tu !== null) {
      const { rows: existingOrder } = await pool.query(
        'SELECT id FROM loai_mon WHERE thu_tu = $1 AND active = true',
        [thu_tu]
      );
      if (existingOrder.length > 0) {
        throw new BadRequest(`Thứ tự ${thu_tu} đã tồn tại. Vui lòng chọn thứ tự khác.`);
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO loai_mon (ten, mo_ta, thu_tu, active)
       VALUES ($1, $2, $3, true)
       RETURNING id, ten, mo_ta, thu_tu`,
      [ten, mo_ta || null, thu_tu || 0]
    );

    res.status(201).json({
      ok: true,
      message: 'Tạo danh mục thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/menu/categories/:id
 * Cập nhật danh mục
 */
export async function updateCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { ten, mo_ta, thu_tu } = req.body;

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    if (!ten) {
      throw new BadRequest('Tên danh mục là bắt buộc');
    }

    // Kiểm tra tên trùng (trừ chính nó)
    const { rows: existingName } = await pool.query(
      'SELECT id FROM loai_mon WHERE ten = $1 AND id != $2 AND active = true',
      [ten, id]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên danh mục "${ten}" đã tồn tại. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra thứ tự trùng (trừ chính nó)
    if (thu_tu !== undefined && thu_tu !== null) {
      const { rows: existingOrder } = await pool.query(
        'SELECT id FROM loai_mon WHERE thu_tu = $1 AND id != $2 AND active = true',
        [thu_tu, id]
      );
      if (existingOrder.length > 0) {
        throw new BadRequest(`Thứ tự ${thu_tu} đã tồn tại. Vui lòng chọn thứ tự khác.`);
      }
    }

    const { rows } = await pool.query(
      `UPDATE loai_mon
       SET ten = $1, mo_ta = $2, thu_tu = $3
       WHERE id = $4
       RETURNING id, ten, mo_ta, thu_tu`,
      [ten, mo_ta || null, thu_tu || 0, id]
    );

    if (rows.length === 0) {
      throw new NotFound('Không tìm thấy danh mục');
    }

    res.json({
      ok: true,
      message: 'Cập nhật danh mục thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/menu/categories/:id
 * Xóa danh mục (soft delete)
 */
export async function deleteCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    // Check if category has items
    const { rows: items } = await pool.query(
      'SELECT COUNT(*) as count FROM mon WHERE loai_id = $1 AND active = true',
      [id]
    );

    if (parseInt(items[0].count) > 0) {
      throw new BadRequest('Không thể xóa danh mục đang có món');
    }

    const { rows } = await pool.query(
      `UPDATE loai_mon
       SET active = false
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFound('Không tìm thấy danh mục');
    }

    res.json({
      ok: true,
      message: 'Xóa danh mục thành công'
    });
  } catch (err) {
    next(err);
  }
}

// ========== ITEMS (Menu Items) ==========

/**
 * POST /api/v1/menu/items
 * Tạo món mới
 */
export async function createItem(req, res, next) {
  try {
    const { ten, ma, loai_id, gia_mac_dinh, mo_ta, hinh_anh } = req.body;

    if (!ten || !loai_id || gia_mac_dinh === undefined) {
      throw new BadRequest('Thiếu thông tin bắt buộc: tên, loại_id, giá_mặc_định');
    }

    // Kiểm tra tên trùng
    const { rows: existingName } = await pool.query(
      'SELECT id FROM mon WHERE ten = $1 AND active = true',
      [ten]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên đồ uống "${ten}" đã tồn tại. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra mã trùng (nếu có mã)
    if (ma) {
      const { rows: existingCode } = await pool.query(
        'SELECT id FROM mon WHERE ma = $1 AND active = true',
        [ma]
      );
      if (existingCode.length > 0) {
        throw new BadRequest(`Mã đồ uống "${ma}" đã tồn tại. Vui lòng chọn mã khác.`);
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO mon (ten, ma, loai_id, don_vi, gia_mac_dinh, mo_ta, hinh_anh, active)
       VALUES ($1, $2, $3, 'ly', $4, $5, $6, true)
       RETURNING id, ten, ma, loai_id, don_vi, gia_mac_dinh, mo_ta, hinh_anh`,
      [ten, ma || null, loai_id, gia_mac_dinh, mo_ta || null, hinh_anh || null]
    );

    res.status(201).json({
      ok: true,
      message: 'Tạo món thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/menu/items/:id
 * Cập nhật món
 */
export async function updateItem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { ten, ma, loai_id, gia_mac_dinh, mo_ta, hinh_anh } = req.body;

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    if (!ten || !loai_id || gia_mac_dinh === undefined) {
      throw new BadRequest('Thiếu thông tin bắt buộc');
    }

    // Kiểm tra tên trùng (trừ chính nó)
    const { rows: existingName } = await pool.query(
      'SELECT id FROM mon WHERE ten = $1 AND id != $2 AND active = true',
      [ten, id]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên đồ uống "${ten}" đã tồn tại. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra mã trùng (nếu có mã, trừ chính nó)
    if (ma) {
      const { rows: existingCode } = await pool.query(
        'SELECT id FROM mon WHERE ma = $1 AND id != $2 AND active = true',
        [ma, id]
      );
      if (existingCode.length > 0) {
        throw new BadRequest(`Mã đồ uống "${ma}" đã tồn tại. Vui lòng chọn mã khác.`);
      }
    }

    const { rows } = await pool.query(
      `UPDATE mon
       SET ten = $1, ma = $2, loai_id = $3, gia_mac_dinh = $4, mo_ta = $5, hinh_anh = $6
       WHERE id = $7
       RETURNING id, ten, ma, loai_id, don_vi, gia_mac_dinh, mo_ta, hinh_anh`,
      [ten, ma || null, loai_id, gia_mac_dinh, mo_ta || null, hinh_anh || null, id]
    );

    if (rows.length === 0) {
      throw new NotFound('Không tìm thấy món');
    }

    res.json({
      ok: true,
      message: 'Cập nhật món thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/menu/items/:id
 * Xóa món (soft delete)
 */
export async function deleteItem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    const { rows } = await pool.query(
      `UPDATE mon
       SET active = false
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFound('Không tìm thấy món');
    }

    res.json({
      ok: true,
      message: 'Xóa món thành công'
    });
  } catch (err) {
    next(err);
  }
}

// ========== VARIANTS (Size) ==========

/**
 * POST /api/v1/menu/variants
 * Tạo biến thể mới
 */
export async function createVariant(req, res, next) {
  try {
    const { mon_id, ten_bien_the, gia, thu_tu } = req.body;

    if (!mon_id || !ten_bien_the || gia === undefined) {
      throw new BadRequest('Thiếu thông tin bắt buộc: mon_id, ten_bien_the, gia');
    }

    // Kiểm tra tên size trùng trong cùng món
    const { rows: existingName } = await pool.query(
      'SELECT id FROM mon_bien_the WHERE mon_id = $1 AND ten_bien_the = $2 AND active = true',
      [mon_id, ten_bien_the]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên size "${ten_bien_the}" đã tồn tại cho món này. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra giá trùng trong cùng món
    const { rows: existingPrice } = await pool.query(
      'SELECT id FROM mon_bien_the WHERE mon_id = $1 AND gia = $2 AND active = true',
      [mon_id, gia]
    );
    if (existingPrice.length > 0) {
      throw new BadRequest(`Giá ${gia} đã tồn tại cho món này. Vui lòng chọn giá khác.`);
    }

    // Kiểm tra thứ tự trùng trong cùng món
    if (thu_tu !== undefined && thu_tu !== null) {
      const { rows: existingOrder } = await pool.query(
        'SELECT id FROM mon_bien_the WHERE mon_id = $1 AND thu_tu = $2 AND active = true',
        [mon_id, thu_tu]
      );
      if (existingOrder.length > 0) {
        throw new BadRequest(`Thứ tự ${thu_tu} đã tồn tại cho món này. Vui lòng chọn thứ tự khác.`);
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO mon_bien_the (mon_id, ten_bien_the, gia, thu_tu, active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, mon_id, ten_bien_the, gia, thu_tu`,
      [mon_id, ten_bien_the, gia, thu_tu || 0]
    );

    res.status(201).json({
      ok: true,
      message: 'Tạo biến thể thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/menu/variants/:id
 * Cập nhật biến thể
 */
export async function updateVariant(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { ten_bien_the, gia, thu_tu } = req.body;

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    if (!ten_bien_the || gia === undefined) {
      throw new BadRequest('Thiếu thông tin bắt buộc');
    }

    // Lấy mon_id của variant hiện tại
    const { rows: current } = await pool.query(
      'SELECT mon_id FROM mon_bien_the WHERE id = $1',
      [id]
    );

    if (current.length === 0) {
      throw new NotFound('Không tìm thấy biến thể');
    }

    const mon_id = current[0].mon_id;

    // Kiểm tra tên size trùng trong cùng món (trừ chính nó)
    const { rows: existingName } = await pool.query(
      'SELECT id FROM mon_bien_the WHERE mon_id = $1 AND ten_bien_the = $2 AND id != $3 AND active = true',
      [mon_id, ten_bien_the, id]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên size "${ten_bien_the}" đã tồn tại cho món này. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra giá trùng trong cùng món (trừ chính nó)
    const { rows: existingPrice } = await pool.query(
      'SELECT id FROM mon_bien_the WHERE mon_id = $1 AND gia = $2 AND id != $3 AND active = true',
      [mon_id, gia, id]
    );
    if (existingPrice.length > 0) {
      throw new BadRequest(`Giá ${gia} đã tồn tại cho món này. Vui lòng chọn giá khác.`);
    }

    // Kiểm tra thứ tự trùng trong cùng món (trừ chính nó)
    if (thu_tu !== undefined && thu_tu !== null) {
      const { rows: existingOrder } = await pool.query(
        'SELECT id FROM mon_bien_the WHERE mon_id = $1 AND thu_tu = $2 AND id != $3 AND active = true',
        [mon_id, thu_tu, id]
      );
      if (existingOrder.length > 0) {
        throw new BadRequest(`Thứ tự ${thu_tu} đã tồn tại cho món này. Vui lòng chọn thứ tự khác.`);
      }
    }

    const { rows } = await pool.query(
      `UPDATE mon_bien_the
       SET ten_bien_the = $1, gia = $2, thu_tu = $3
       WHERE id = $4
       RETURNING id, mon_id, ten_bien_the, gia, thu_tu`,
      [ten_bien_the, gia, thu_tu || 0, id]
    );

    res.json({
      ok: true,
      message: 'Cập nhật biến thể thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/menu/variants/:id
 * Xóa biến thể (soft delete)
 */
export async function deleteVariant(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    const { rows } = await pool.query(
      `UPDATE mon_bien_the
       SET active = false
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFound('Không tìm thấy biến thể');
    }

    res.json({
      ok: true,
      message: 'Xóa biến thể thành công'
    });
  } catch (err) {
    next(err);
  }
}

// ========== OPTIONS (Tùy chọn) ==========

/**
 * POST /api/v1/menu/options
 * Tạo nhóm tùy chọn mới (SUGAR, ICE, TOPPING...)
 */
export async function createOption(req, res, next) {
  try {
    const { ma, ten, loai, don_vi, gia_mac_dinh } = req.body;

    if (!ten || !loai) {
      throw new BadRequest('Thiếu thông tin bắt buộc: ten, loai');
    }

    if (!['PERCENT', 'AMOUNT'].includes(loai)) {
      throw new BadRequest('Loại phải là PERCENT hoặc AMOUNT');
    }

    // Kiểm tra tên trùng
    const { rows: existingName } = await pool.query(
      'SELECT id FROM tuy_chon_mon WHERE ten = $1',
      [ten]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên tùy chọn "${ten}" đã tồn tại. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra mã trùng (nếu có mã)
    if (ma) {
      const { rows: existingCode } = await pool.query(
        'SELECT id FROM tuy_chon_mon WHERE ma = $1',
        [ma]
      );
      if (existingCode.length > 0) {
        throw new BadRequest(`Mã tùy chọn "${ma}" đã tồn tại. Vui lòng chọn mã khác.`);
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO tuy_chon_mon (ma, ten, don_vi, loai, gia_mac_dinh)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, ma, ten, don_vi, loai, gia_mac_dinh`,
      [ma || null, ten, don_vi || null, loai, gia_mac_dinh || 0]
    );

    res.status(201).json({
      ok: true,
      message: 'Tạo tùy chọn thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/menu/options/:id
 * Cập nhật nhóm tùy chọn
 */
export async function updateOption(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { ma, ten, don_vi, gia_mac_dinh } = req.body;

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    if (!ten) {
      throw new BadRequest('Tên tùy chọn là bắt buộc');
    }

    // Kiểm tra tên trùng (trừ chính nó)
    const { rows: existingName } = await pool.query(
      'SELECT id FROM tuy_chon_mon WHERE ten = $1 AND id != $2',
      [ten, id]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên tùy chọn "${ten}" đã tồn tại. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra mã trùng (nếu có mã, trừ chính nó)
    if (ma) {
      const { rows: existingCode } = await pool.query(
        'SELECT id FROM tuy_chon_mon WHERE ma = $1 AND id != $2',
        [ma, id]
      );
      if (existingCode.length > 0) {
        throw new BadRequest(`Mã tùy chọn "${ma}" đã tồn tại. Vui lòng chọn mã khác.`);
      }
    }

    const { rows } = await pool.query(
      `UPDATE tuy_chon_mon
       SET ma = $1, ten = $2, don_vi = $3, gia_mac_dinh = $4
       WHERE id = $5
       RETURNING id, ma, ten, don_vi, loai, gia_mac_dinh`,
      [ma || null, ten, don_vi || null, gia_mac_dinh || 0, id]
    );

    if (rows.length === 0) {
      throw new NotFound('Không tìm thấy tùy chọn');
    }

    res.json({
      ok: true,
      message: 'Cập nhật tùy chọn thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// ========== OPTION LEVELS (Mức tùy chọn) ==========

/**
 * POST /api/v1/menu/option-levels
 * Tạo mức tùy chọn mới (0%, 50%, 100%)
 */
export async function createOptionLevel(req, res, next) {
  try {
    const { tuy_chon_id, ten, gia_tri, thu_tu } = req.body;

    if (!tuy_chon_id || !ten || gia_tri === undefined) {
      throw new BadRequest('Thiếu thông tin bắt buộc: tuy_chon_id, ten, gia_tri');
    }

    // Kiểm tra tên mức trùng trong cùng option
    const { rows: existingName } = await pool.query(
      'SELECT id FROM tuy_chon_muc WHERE tuy_chon_id = $1 AND ten = $2',
      [tuy_chon_id, ten]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên mức "${ten}" đã tồn tại cho tùy chọn này. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra hệ số trùng trong cùng option
    const { rows: existingValue } = await pool.query(
      'SELECT id FROM tuy_chon_muc WHERE tuy_chon_id = $1 AND gia_tri = $2',
      [tuy_chon_id, gia_tri]
    );
    if (existingValue.length > 0) {
      throw new BadRequest(`Hệ số ${gia_tri} đã tồn tại cho tùy chọn này. Vui lòng chọn hệ số khác.`);
    }

    // Kiểm tra thứ tự trùng trong cùng option
    if (thu_tu !== undefined && thu_tu !== null) {
      const { rows: existingOrder } = await pool.query(
        'SELECT id FROM tuy_chon_muc WHERE tuy_chon_id = $1 AND thu_tu = $2',
        [tuy_chon_id, thu_tu]
      );
      if (existingOrder.length > 0) {
        throw new BadRequest(`Thứ tự ${thu_tu} đã tồn tại cho tùy chọn này. Vui lòng chọn thứ tự khác.`);
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO tuy_chon_muc (tuy_chon_id, ten, gia_tri, thu_tu)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tuy_chon_id, ten, gia_tri, thu_tu`,
      [tuy_chon_id, ten, gia_tri, thu_tu || 0]
    );

    res.status(201).json({
      ok: true,
      message: 'Tạo mức tùy chọn thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/menu/option-levels/:id
 * Cập nhật mức tùy chọn
 */
export async function updateOptionLevel(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { ten, gia_tri, thu_tu } = req.body;

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    if (!ten || gia_tri === undefined) {
      throw new BadRequest('Thiếu thông tin bắt buộc');
    }

    // Lấy tuy_chon_id của level hiện tại
    const { rows: current } = await pool.query(
      'SELECT tuy_chon_id FROM tuy_chon_muc WHERE id = $1',
      [id]
    );

    if (current.length === 0) {
      throw new NotFound('Không tìm thấy mức tùy chọn');
    }

    const tuy_chon_id = current[0].tuy_chon_id;

    // Kiểm tra tên mức trùng trong cùng option (trừ chính nó)
    const { rows: existingName } = await pool.query(
      'SELECT id FROM tuy_chon_muc WHERE tuy_chon_id = $1 AND ten = $2 AND id != $3',
      [tuy_chon_id, ten, id]
    );
    if (existingName.length > 0) {
      throw new BadRequest(`Tên mức "${ten}" đã tồn tại cho tùy chọn này. Vui lòng chọn tên khác.`);
    }

    // Kiểm tra hệ số trùng trong cùng option (trừ chính nó)
    const { rows: existingValue } = await pool.query(
      'SELECT id FROM tuy_chon_muc WHERE tuy_chon_id = $1 AND gia_tri = $2 AND id != $3',
      [tuy_chon_id, gia_tri, id]
    );
    if (existingValue.length > 0) {
      throw new BadRequest(`Hệ số ${gia_tri} đã tồn tại cho tùy chọn này. Vui lòng chọn hệ số khác.`);
    }

    // Kiểm tra thứ tự trùng trong cùng option (trừ chính nó)
    if (thu_tu !== undefined && thu_tu !== null) {
      const { rows: existingOrder } = await pool.query(
        'SELECT id FROM tuy_chon_muc WHERE tuy_chon_id = $1 AND thu_tu = $2 AND id != $3',
        [tuy_chon_id, thu_tu, id]
      );
      if (existingOrder.length > 0) {
        throw new BadRequest(`Thứ tự ${thu_tu} đã tồn tại cho tùy chọn này. Vui lòng chọn thứ tự khác.`);
      }
    }

    const { rows } = await pool.query(
      `UPDATE tuy_chon_muc
       SET ten = $1, gia_tri = $2, thu_tu = $3
       WHERE id = $4
       RETURNING id, tuy_chon_id, ten, gia_tri, thu_tu`,
      [ten, gia_tri, thu_tu || 0, id]
    );

    res.json({
      ok: true,
      message: 'Cập nhật mức tùy chọn thành công',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/menu/option-levels/:id
 * Xóa mức tùy chọn
 */
export async function deleteOptionLevel(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new BadRequest('ID không hợp lệ');
    }

    const { rows } = await pool.query(
      `DELETE FROM tuy_chon_muc
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFound('Không tìm thấy mức tùy chọn');
    }

    res.json({
      ok: true,
      message: 'Xóa mức tùy chọn thành công'
    });
  } catch (err) {
    next(err);
  }
}

