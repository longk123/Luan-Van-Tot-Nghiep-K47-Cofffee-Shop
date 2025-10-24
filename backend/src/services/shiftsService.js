// src/services/shiftsService.js
import { 
  getMyOpenShift, 
  getMyOpenShiftWithUser, 
  openShift, 
  closeShift, 
  getById,
  aggregateShift,
  closeShiftTx,
  getShiftWithSummary
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
    opening_cash: row.opening_cash,
    nhan_vien: {
      user_id: row.nv_id,
      full_name: row.nv_full_name,
      username: row.nv_username,
      email: row.nv_email
    }
  };
}

export async function open({ nhanVienId, openingCash, openedBy }) {
  // Không cho mở nếu đã có ca OPEN
  const exists = await getMyOpenShift(nhanVienId);
  if (exists) {
    const err = new Error('Nhân viên đang có ca OPEN.');
    err.status = 400;
    err.code = 'SHIFT_ALREADY_OPEN';
    throw err;
  }

  try {
    const shift = await openShift({ nhanVienId, openingCash, openedBy });
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
  
  return {
    shift,
    summary
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

  // 2) Kiểm tra còn đơn OPEN không
  const { pool } = await import('../db.js');
  const openOrders = await pool.query(
    `SELECT id, ban_id, order_type FROM don_hang WHERE ca_lam_id = $1 AND trang_thai = 'OPEN'`,
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

  // 4) Tính tiền mặt:
  // expected_cash = tiền thu trong ca (CASH)
  // total_expected = opening_cash (đầu ca) + expected_cash (thu trong ca)
  // cash_diff = actual_cash (đếm thực tế) - total_expected
  const openingCash = current.opening_cash || 0;
  const expectedCash = summary.payments.cash || 0; // Tiền thu trong ca
  const totalExpected = openingCash + expectedCash; // Tổng tiền phải có
  const cashDiff = (actualCash ?? 0) - totalExpected;

  // 5) Ghi nhận đóng ca trong transaction (có FOR UPDATE hàng ca)
  const closed = await closeShiftTx({
    shiftId,
    closedBy: userId,
    expectedCash: totalExpected, // Lưu tổng tiền phải có
    actualCash: actualCash ?? 0,
    cashDiff,
    summary,
    note,
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
