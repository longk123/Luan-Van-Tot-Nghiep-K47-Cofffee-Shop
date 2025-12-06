// src/routes/reservations.js
import { Router } from 'express';
import reservationsCtrl from '../controllers/reservationsController.js';
import { authRequired } from '../middleware/auth.js';
import { staffOnly, cashierOnly } from '../middleware/authorize.js';
import { customerAuth } from '../middleware/customerAuth.js';

const router = Router();

// === RESERVATIONS ===

// === UTILITIES (PHẢI ĐẶT TRƯỚC :id ROUTES!) ===

// Tìm bàn trống - public (không cần auth để customer portal dùng)
router.get('/reservations/available-tables', reservationsCtrl.searchAvailableTables);

// === MAIN RESERVATION ROUTES ===

// Tạo đặt bàn mới - YÊU CẦU ĐĂNG NHẬP (khách vãng lai không được đặt bàn)
router.post('/reservations', customerAuth, reservationsCtrl.createReservation);

// Lấy danh sách theo ngày - staff only
router.get('/reservations', authRequired, staffOnly, reservationsCtrl.listReservations);

// Chi tiết 1 đặt bàn - staff only
router.get('/reservations/:id', authRequired, staffOnly, reservationsCtrl.getReservationDetail);

// Cập nhật thông tin - staff only
router.patch('/reservations/:id', authRequired, staffOnly, reservationsCtrl.updateReservation);

// === QUẢN LÝ BÀN ===

// Gán bàn - staff only (waiter cũng có thể gán bàn)
router.post('/reservations/:id/tables', authRequired, staffOnly, reservationsCtrl.assignTables);

// Bỏ gán bàn - staff only
router.delete('/reservations/:id/tables/:tableId', authRequired, staffOnly, reservationsCtrl.unassignTable);

// === ACTIONS ===

// Xác nhận đặt bàn - staff only
router.post('/reservations/:id/confirm', authRequired, staffOnly, reservationsCtrl.confirmReservation);

// Check-in (tạo order) - staff only (waiter cũng có thể check-in)
router.post('/reservations/:id/check-in', authRequired, staffOnly, reservationsCtrl.checkInReservation);

// Hủy đặt bàn - staff only
router.post('/reservations/:id/cancel', authRequired, staffOnly, reservationsCtrl.cancelReservation);

// Đánh dấu no-show - staff only
router.post('/reservations/:id/no-show', authRequired, staffOnly, reservationsCtrl.markNoShow);

// Hoàn thành - staff only
router.post('/reservations/:id/complete', authRequired, staffOnly, reservationsCtrl.completeReservation);

// === UTILITIES ===

// Lấy đặt bàn sắp tới của 1 bàn - staff only
router.get('/reservations/tables/:id/upcoming', authRequired, staffOnly, reservationsCtrl.getUpcomingReservation);

export default router;

