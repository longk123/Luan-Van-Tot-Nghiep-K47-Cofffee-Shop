// src/routes/payments.js
import { Router } from 'express';
import paymentsCtrl from '../controllers/paymentsController.js';
import { authRequired } from '../middleware/auth.js';
import { authorize, cashierOnly, staffOnly } from '../middleware/authorize.js';

const router = Router();

// === PAYMENT METHODS ===

// Danh sách phương thức thanh toán (staff có thể xem)
router.get('/payments/methods', authRequired, staffOnly, paymentsCtrl.listPaymentMethods);

// === ORDER PAYMENTS ===

// Lấy danh sách thanh toán của đơn (staff có thể xem)
router.get('/pos/orders/:orderId/payments', authRequired, staffOnly, paymentsCtrl.listOrderPayments);

// Thu tiền (multi-tender) - CHỈ CASHIER mới có quyền
router.post('/pos/orders/:orderId/payments', authRequired, cashierOnly, paymentsCtrl.createPayment);

// Void một payment - CHỈ CASHIER
router.post('/pos/orders/:orderId/payments/:paymentId/void', authRequired, cashierOnly, paymentsCtrl.voidPayment);

// Refund một payment - CHỈ CASHIER
router.post('/pos/orders/:orderId/payments/:paymentId/refund', authRequired, cashierOnly, paymentsCtrl.refundPayment);

// === SETTLEMENT ===

// Tổng tiền & còn phải trả (staff có thể xem)
router.get('/pos/orders/:orderId/settlement', authRequired, staffOnly, paymentsCtrl.getOrderSettlement);

// === PAYOS PAYMENT GATEWAY ===

// Tạo payment request với PayOS - CHỈ CASHIER
router.post('/payments/payos/create', authRequired, cashierOnly, paymentsCtrl.createPayOSPayment);

// Webhook từ PayOS (public endpoint - không cần auth)
router.post('/payments/payos/webhook', paymentsCtrl.payOSWebhook);

// Kiểm tra trạng thái payment (staff có thể xem)
router.get('/payments/payos/status/:refCode', authRequired, staffOnly, paymentsCtrl.checkPayOSStatus);

// DEMO: Giả lập thanh toán thành công (để test UI)
router.post('/payments/payos/simulate-success/:refCode', paymentsCtrl.simulatePayOSSuccess);

// Xử lý return URL từ PayOS (khi redirect về)
router.post('/payments/payos/process-return/:orderCode', paymentsCtrl.processPayOSReturn);

export default router;

