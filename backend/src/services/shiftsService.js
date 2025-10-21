// src/services/shiftsService.js
import { getMyOpenShift, getMyOpenShiftWithUser, openShift, closeShift, getById } from '../repositories/shiftsRepository.js';

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
