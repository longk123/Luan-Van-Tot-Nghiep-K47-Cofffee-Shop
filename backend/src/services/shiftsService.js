// src/services/shiftsService.js
import {
  getMyOpenShift,
  getMyOpenShiftWithUser,
  openShift,
  closeShift,
  getById,
  aggregateShift,
  closeShiftTx,
  getShiftWithSummary,
  getOpenCashierShift
} from '../repositories/shiftsRepository.js';

export async function myOpen(nhanVienId) {
  return getMyOpenShift(nhanVienId);
}

export async function getCurrentShiftService(userId) {
  const row = await getMyOpenShiftWithUser(userId);
  if (!row) return null;
  return {
    id: row.id,
    business_day: row.business_day,
    started_at: row.started_at,
    status: row.status,
    shift_type: row.shift_type,
    opening_cash: row.opening_cash,
    nhan_vien: {
      user_id: row.nv_id,
      full_name: row.nv_full_name,
      username: row.nv_username,
      email: row.nv_email
    }
  };
}

export async function getOpenCashierShiftService() {
  const row = await getOpenCashierShift();
  if (!row) return null;
  return {
    id: row.id,
    business_day: row.business_day,
    started_at: row.started_at,
    status: row.status,
    shift_type: row.shift_type,
    opening_cash: row.opening_cash,
    nhan_vien: {
      user_id: row.nv_id,
      full_name: row.nv_full_name,
      username: row.nv_username,
      email: row.nv_email
    }
  };
}

export async function open({ nhanVienId, openingCash, openedBy, shiftType = 'CASHIER' }) {
  // Không cho mở nếu đã có ca OPEN
  const exists = await getMyOpenShift(nhanVienId);
  if (exists) {
    const err = new Error('Nhân viên đang có ca OPEN.');
    err.status = 400;
    err.code = 'SHIFT_ALREADY_OPEN';
    throw err;
  }

  try {
    const shift = await openShift({ nhanVienId, openingCash, openedBy, shiftType });
    return shift;
  } catch (e) {
    // Nếu DB bắn lỗi do constraint no_overlap_per_user (chồng ca)
    if ((e.message || '').includes('no_overlap_per_user')) {
      const err = new Error('Khoảng thời gian ca làm bị chồng lấp.');
      err.status = 400;
      err.code = 'OVERLAP';
      throw err;
    }
    throw e;
  }
}

export async function close(id, { closingCash, note, closedBy }) {
  const current = await getById(id);
  if (!current) {
    const err = new Error('Không tìm thấy ca làm.');
    err.status = 404;
    throw err;
  }
  if (current.status !== 'OPEN') {
    const err = new Error('Ca làm đã đóng hoặc không ở trạng thái OPEN.');
    err.status = 400;
    throw err;
  }
  const updated = await closeShift(id, { closingCash, note, closedBy });
  return updated;
}

// ============================================
// CLOSE SHIFT ENHANCEMENT
// ============================================

/**
 * Get shift summary (live) - for preview before closing
 */
export async function getShiftSummary(shiftId) {
  const shift = await getById(shiftId);
  if (!shift) {
    const err = new Error('Không tìm thấy ca làm.');
    err.status = 404;
    throw err;
  }

  // Aggregate statistics
  const summary = await aggregateShift(shiftId);
  
  // Thêm kitchen stats nếu là ca KITCHEN
  let kitchenStats = null;
  if (shift.shift_type === 'KITCHEN') {
    const { pool } = await import('../db.js');
    // Tính số món đã làm: theo maker_id + thời gian (giống như getShiftOrders cho ca KITCHEN)
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_items,
         AVG(EXTRACT(EPOCH FROM (ct.finished_at - ct.started_at))) as avg_seconds
       FROM don_hang_chi_tiet ct
       WHERE ct.maker_id = $1
         AND ct.trang_thai_che_bien = 'DONE'
         AND ct.started_at >= $2
         AND (ct.started_at < $3 OR $3 IS NULL)
         AND ct.finished_at IS NOT NULL
         AND ct.started_at IS NOT NULL`,
      [shift.nhan_vien_id, shift.started_at, shift.closed_at]
    );
    
    // Đếm số món bị hủy trong ca: ưu tiên theo maker_id (người hủy), fallback theo ca_lam_id nếu maker_id NULL
    const cancelledResult = await pool.query(
      `SELECT COUNT(*) as total_cancelled
       FROM don_hang_chi_tiet ct
       WHERE ct.trang_thai_che_bien = 'CANCELLED'
         AND (
           -- Ưu tiên: Món hủy có maker_id = nhân viên của ca (người hủy)
           (ct.maker_id = $1
            AND ct.created_at >= $2
            AND (ct.created_at < $3 OR $3 IS NULL))
           -- Fallback: Món hủy thuộc đơn của ca này (nếu maker_id NULL)
           OR (
             ct.maker_id IS NULL
             AND EXISTS (
               SELECT 1 FROM don_hang dh
               WHERE dh.id = ct.don_hang_id
                 AND dh.ca_lam_id = $4
             )
           )
         )`,
      [shift.nhan_vien_id, shift.started_at, shift.closed_at, shiftId]
    );
    
    kitchenStats = {
      total_items_made: Number(statsResult.rows[0]?.total_items || 0),
      avg_prep_time_seconds: Math.round(Number(statsResult.rows[0]?.avg_seconds || 0)),
      total_items_cancelled: Number(cancelledResult.rows[0]?.total_cancelled || 0)
    };
  }
  
  return {
    shift,
    summary,
    kitchenStats
  };
}

/**
 * Close shift with full statistics
 * Đóng ca với đầy đủ thống kê
 */
export async function closeShiftEnhanced({ shiftId, userId, actualCash, note }) {
  // 1) Kiểm tra ca có tồn tại và OPEN
  const current = await getById(shiftId);
  if (!current) {
    const err = new Error('Không tìm thấy ca làm.');
    err.status = 404;
    throw err;
  }
  
  if (current.status !== 'OPEN') {
    const err = new Error('Ca làm đã đóng hoặc không ở trạng thái OPEN.');
    err.status = 400;
    throw err;
  }
  
  const isKitchenShift = current.shift_type === 'KITCHEN';

  // 2) Kiểm tra còn đơn OPEN không
  const { pool } = await import('../db.js');
  const openOrders = await pool.query(
    `SELECT 
       dh.id, 
       dh.ban_id, 
       dh.order_type,
       b.ten_ban,
       b.khu_vuc_id,
       kv.ten AS ten_khu_vuc,
       COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien
     FROM don_hang dh
     LEFT JOIN ban b ON b.id = dh.ban_id
     LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
     LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
     WHERE dh.ca_lam_id = $1 AND dh.trang_thai = 'OPEN'
     GROUP BY dh.id, dh.ban_id, dh.order_type, b.ten_ban, b.khu_vuc_id, kv.ten
     ORDER BY dh.id`,
    [shiftId]
  );
  
  if (openOrders.rows.length > 0) {
    const err = new Error(`Còn ${openOrders.rows.length} đơn hàng chưa thanh toán`);
    err.status = 400;
    err.code = 'OPEN_ORDERS_EXIST';
    err.openOrders = openOrders.rows; // Gửi danh sách đơn về client
    throw err;
  }

  // 3) Aggregate số liệu chốt ca
  const summary = await aggregateShift(shiftId);

  // 4) Tính toán dựa trên loại ca
  let kitchenStats = null;
  if (isKitchenShift) {
    // Tính số món đã làm: theo maker_id + thời gian (giống như getShiftOrders cho ca KITCHEN)
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_items,
         AVG(EXTRACT(EPOCH FROM (ct.finished_at - ct.started_at))) as avg_seconds
       FROM don_hang_chi_tiet ct
       WHERE ct.maker_id = $1
         AND ct.trang_thai_che_bien = 'DONE'
         AND ct.started_at >= $2
         AND (ct.started_at < $3 OR $3 IS NULL)
         AND ct.finished_at IS NOT NULL
         AND ct.started_at IS NOT NULL`,
      [userId, current.started_at, current.closed_at]
    );
    
    // Đếm số món bị hủy trong ca: ưu tiên theo maker_id (người hủy), fallback theo ca_lam_id nếu maker_id NULL
    const cancelledResult = await pool.query(
      `SELECT COUNT(*) as total_cancelled
       FROM don_hang_chi_tiet ct
       WHERE ct.trang_thai_che_bien = 'CANCELLED'
         AND (
           -- Ưu tiên: Món hủy có maker_id = nhân viên của ca (người hủy)
           (ct.maker_id = $1
            AND ct.created_at >= $2
            AND (ct.created_at < $3 OR $3 IS NULL))
           -- Fallback: Món hủy thuộc đơn của ca này (nếu maker_id NULL)
           OR (
             ct.maker_id IS NULL
             AND EXISTS (
               SELECT 1 FROM don_hang dh
               WHERE dh.id = ct.don_hang_id
                 AND dh.ca_lam_id = $4
             )
           )
         )`,
      [userId, current.started_at, current.closed_at, shiftId]
    );
    
    kitchenStats = {
      total_items_made: Number(statsResult.rows[0]?.total_items || 0),
      avg_prep_time_seconds: Math.round(Number(statsResult.rows[0]?.avg_seconds || 0)),
      total_items_cancelled: Number(cancelledResult.rows[0]?.total_cancelled || 0)
    };
  }

  // Tính tiền mặt (chỉ cho ca CASHIER):
  const openingCash = current.opening_cash || 0;
  const expectedCash = summary.payments.cash || 0;
  const totalExpected = openingCash + expectedCash;
  const cashDiff = isKitchenShift ? 0 : ((actualCash ?? 0) - totalExpected);

  // 5) Ghi nhận đóng ca trong transaction (có FOR UPDATE hàng ca)
  const closed = await closeShiftTx({
    shiftId,
    closedBy: userId,
    expectedCash: totalExpected,
    actualCash: isKitchenShift ? 0 : (actualCash ?? 0),
    cashDiff,
    summary,
    note,
    kitchenStats
  });

  return {
    shift: closed,
    summary: {
      ...summary,
      openingCash,
      expectedCash, // Tiền thu trong ca
      totalExpected, // Tổng phải có
      actualCash: actualCash ?? 0,
      cashDiff
    }
  };
}

/**
 * Get detailed shift report (for PDF or display)
 */
export async function getShiftReport(shiftId) {
  const shift = await getShiftWithSummary(shiftId);
  if (!shift) {
    const err = new Error('Không tìm thấy ca làm.');
    err.status = 404;
    throw err;
  }
  
  return shift;
}

/**
 * Get orders transferred from previous shift
 * Lấy danh sách đơn được chuyển từ ca trước
 */
export async function getTransferredOrders(shiftId) {
  const shift = await getById(shiftId);
  if (!shift) {
    const err = new Error('Không tìm thấy ca làm.');
    err.status = 404;
    throw err;
  }

  const { pool } = await import('../db.js');
  
  // Lấy các đơn OPEN của ca này mà được tạo TRƯỚC khi ca bắt đầu
  const result = await pool.query(
    `SELECT 
       dh.id, 
       dh.ban_id, 
       dh.order_type,
       dh.opened_at,
       b.ten_ban,
       b.khu_vuc_id,
       kv.ten AS ten_khu_vuc,
       COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien,
       (SELECT COUNT(*) FROM don_hang_chi_tiet WHERE don_hang_id = dh.id) as item_count
     FROM don_hang dh
     LEFT JOIN ban b ON b.id = dh.ban_id
     LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
     LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
     WHERE dh.ca_lam_id = $1 
       AND dh.trang_thai = 'OPEN'
       AND dh.opened_at < $2
     GROUP BY dh.id, dh.ban_id, dh.order_type, dh.opened_at, b.ten_ban, b.khu_vuc_id, kv.ten
     ORDER BY dh.id`,
    [shiftId, shift.started_at]
  );
  
  return {
    count: result.rows.length,
    orders: result.rows
  };
}

/**
 * Get all orders for a specific shift
 * Lấy danh sách đơn hàng của ca (hoặc món đã làm nếu là ca KITCHEN)
 */
export async function getShiftOrders(shiftId) {
  const shift = await getById(shiftId);
  if (!shift) {
    const err = new Error('Không tìm thấy ca làm.');
    err.status = 404;
    throw err;
  }

  const { pool } = await import('../db.js');

  // Nếu là ca KITCHEN: trả về danh sách món đã làm
  if (shift.shift_type === 'KITCHEN') {
    const { rows } = await pool.query(
      `SELECT
         dhct.id,
         dhct.don_hang_id,
         dhct.mon_id,
         dhct.bien_the_id,
         dhct.so_luong,
         dhct.ghi_chu,
         dhct.trang_thai_che_bien,
         dhct.started_at,
         dhct.finished_at,
         EXTRACT(EPOCH FROM (dhct.finished_at - dhct.started_at))::INT AS prep_time_seconds,
         m.ten AS mon_ten,
         m.ma AS mon_ma,
         btm.ten_bien_the AS bien_the_ten,
         dh.id AS order_id,
         dh.order_type,
         dh.ban_id,
         dh.trang_thai AS order_status,
         dh.opened_at AS order_opened_at,
         dh.closed_at AS order_closed_at,
         b.ten_ban,
         kv.ten AS khu_vuc_ten
       FROM don_hang_chi_tiet dhct
       JOIN don_hang dh ON dh.id = dhct.don_hang_id
       LEFT JOIN ban b ON b.id = dh.ban_id
       LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
       LEFT JOIN mon m ON m.id = dhct.mon_id
       LEFT JOIN mon_bien_the btm ON btm.id = dhct.bien_the_id
       WHERE dhct.maker_id = $1
         AND dhct.trang_thai_che_bien = 'DONE'
         AND dhct.started_at >= $2
         AND dhct.started_at < COALESCE($3, NOW())
       ORDER BY dhct.finished_at DESC`,
      [shift.nhan_vien_id, shift.started_at, shift.closed_at]
    );
    return rows;
  }

  // Nếu là ca CASHIER: trả về danh sách đơn hàng
  const { default: posRepository } = await import('../repositories/posRepository.js');
  const orders = await posRepository.getCurrentShiftOrders(shiftId);
  return orders;
}

/**
 * Force close shift with open orders handling
 * Đóng ca khi còn đơn OPEN - chuyển đơn sang ca tiếp theo
 */
export async function forceCloseShift({ shiftId, userId, actualCash, note, transferOrders = true }) {
  const current = await getById(shiftId);
  if (!current) {
    const err = new Error('Không tìm thấy ca làm.');
    err.status = 404;
    throw err;
  }
  
  if (current.status !== 'OPEN') {
    const err = new Error('Ca làm đã đóng hoặc không ở trạng thái OPEN.');
    err.status = 400;
    throw err;
  }

  const { pool } = await import('../db.js');
  
  // Nếu chọn chuyển đơn sang ca sau
  if (transferOrders) {
    // Set ca_lam_id = NULL cho các đơn OPEN
    // Khi ca mới mở, sẽ được gán lại
    await pool.query(
      `UPDATE don_hang 
       SET ca_lam_id = NULL 
       WHERE ca_lam_id = $1 AND trang_thai = 'OPEN'`,
      [shiftId]
    );
  }

  // Aggregate và đóng ca bình thường (chỉ tính đơn đã PAID)
  const summary = await aggregateShift(shiftId);
  const openingCash = current.opening_cash || 0;
  const expectedCash = summary.payments.cash || 0;
  const totalExpected = openingCash + expectedCash;
  const cashDiff = (actualCash ?? 0) - totalExpected;

  const closed = await closeShiftTx({
    shiftId,
    closedBy: userId,
    expectedCash: totalExpected,
    actualCash: actualCash ?? 0,
    cashDiff,
    summary,
    note: note ? `${note} [Có đơn chuyển ca]` : '[Có đơn chuyển ca]',
  });

  return {
    shift: closed,
    summary: {
      ...summary,
      openingCash,
      expectedCash,
      totalExpected,
      actualCash: actualCash ?? 0,
      cashDiff
    }
  };
}
