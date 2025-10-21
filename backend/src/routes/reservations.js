// src/routes/reservations.js
import { Router } from 'express';
import reservationsCtrl from '../controllers/reservationsController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// Tất cả routes đều yêu cầu auth
router.use(authRequired);

// === RESERVATIONS ===

// Tạo đặt bàn mới
router.post('/reservations', reservationsCtrl.createReservation);

// Lấy danh sách theo ngày
router.get('/reservations', reservationsCtrl.listReservations);

// Chi tiết 1 đặt bàn
router.get('/reservations/:id', reservationsCtrl.getReservationDetail);

// Cập nhật thông tin
router.patch('/reservations/:id', reservationsCtrl.updateReservation);

// === QUẢN LÝ BÀN ===

// Gán bàn
router.post('/reservations/:id/tables', reservationsCtrl.assignTables);

// Bỏ gán bàn
router.delete('/reservations/:id/tables/:tableId', reservationsCtrl.unassignTable);

// === ACTIONS ===

// Xác nhận đặt bàn
router.post('/reservations/:id/confirm', reservationsCtrl.confirmReservation);

// Check-in (tạo order)
router.post('/reservations/:id/check-in', reservationsCtrl.checkInReservation);

// Hủy đặt bàn
router.post('/reservations/:id/cancel', reservationsCtrl.cancelReservation);

// Đánh dấu no-show
router.post('/reservations/:id/no-show', reservationsCtrl.markNoShow);

// Hoàn thành
router.post('/reservations/:id/complete', reservationsCtrl.completeReservation);

// === UTILITIES ===

// Tìm bàn trống
router.get('/tables/availability', reservationsCtrl.searchAvailableTables);

// Lấy đặt bàn sắp tới của 1 bàn
router.get('/tables/:id/upcoming-reservation', reservationsCtrl.getUpcomingReservation);

export default router;

