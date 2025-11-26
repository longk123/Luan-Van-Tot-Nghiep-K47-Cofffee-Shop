/**
 * Routes: Shipper Wallet
 * API routes cho ví giao hàng
 */

import { Router } from 'express';
import { authRequired as auth } from '../middleware/auth.js';
import walletController from '../controllers/walletController.js';

const router = Router();

// ===== ROUTES CHO WAITER (shipper) =====

// GET /api/v1/wallet/me - Lấy thông tin ví của tôi
router.get('/me', auth, walletController.getMyWallet);

// GET /api/v1/wallet/transactions - Lấy lịch sử giao dịch của tôi
router.get('/transactions', auth, walletController.getMyTransactions);

// GET /api/v1/wallet/check-limit - Kiểm tra hạn mức ví
router.get('/check-limit', auth, walletController.checkLimit);

// GET /api/v1/wallet/unrecorded - Lấy đơn chưa ghi nhận
router.get('/unrecorded', auth, walletController.getUnrecordedOrders);

// POST /api/v1/wallet/sync - Đồng bộ đơn chưa ghi nhận
router.post('/sync', auth, walletController.syncOrders);

// ===== ROUTES CHO CASHIER/MANAGER =====

// GET /api/v1/wallet/all - Lấy danh sách tất cả ví
router.get('/all', auth, walletController.getAllWallets);

// GET /api/v1/wallet/pending-summary - Tổng quan tiền chưa nộp
router.get('/pending-summary', auth, walletController.getPendingSummary);

// GET /api/v1/wallet/user/:userId - Lấy ví của một user
router.get('/user/:userId', auth, walletController.getWalletByUser);

// GET /api/v1/wallet/user/:userId/transactions - Lấy lịch sử giao dịch của user
router.get('/user/:userId/transactions', auth, walletController.getUserTransactions);

// POST /api/v1/wallet/settle - Xác nhận nộp tiền
router.post('/settle', auth, walletController.settleWallet);

// POST /api/v1/wallet/settle-all - Nộp tất cả tiền
router.post('/settle-all', auth, walletController.settleAll);

// GET /api/v1/wallet/shift-stats/:shiftId - Thống kê theo ca
router.get('/shift-stats/:shiftId', auth, walletController.getShiftStats);

// ===== ROUTES CHO ADMIN =====

// POST /api/v1/wallet/adjust - Điều chỉnh số dư
router.post('/adjust', auth, walletController.adjustBalance);

// PUT /api/v1/wallet/user/:userId/limit - Cập nhật hạn mức
router.put('/user/:userId/limit', auth, walletController.updateLimit);

export default router;
