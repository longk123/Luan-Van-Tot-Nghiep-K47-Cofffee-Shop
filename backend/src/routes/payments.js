// src/routes/payments.js
import { Router } from 'express';
import paymentsCtrl from '../controllers/paymentsController.js';
// import { authRequired } from '../middleware/auth.js';  // TẮT TẠM ĐỂ DEBUG

const router = Router();

// router.use(authRequired);  // TẮT TẠM ĐỂ DEBUG

// === PAYMENT METHODS ===

// Danh sách phương thức thanh toán
router.get('/payments/methods', paymentsCtrl.listPaymentMethods);

// === ORDER PAYMENTS ===

// Lấy danh sách thanh toán của đơn
router.get('/pos/orders/:orderId/payments', paymentsCtrl.listOrderPayments);

// Thu tiền (multi-tender)
router.post('/pos/orders/:orderId/payments', paymentsCtrl.createPayment);

// Void một payment
router.post('/pos/orders/:orderId/payments/:paymentId/void', paymentsCtrl.voidPayment);

// Refund một payment
router.post('/pos/orders/:orderId/payments/:paymentId/refund', paymentsCtrl.refundPayment);

// === SETTLEMENT ===

// Tổng tiền & còn phải trả
router.get('/pos/orders/:orderId/settlement', paymentsCtrl.getOrderSettlement);

// === PAYOS PAYMENT GATEWAY ===

// Tạo payment request với PayOS
router.post('/payments/payos/create', paymentsCtrl.createPayOSPayment);

// Webhook từ PayOS (public endpoint - không cần auth)
router.post('/payments/payos/webhook', paymentsCtrl.payOSWebhook);

// Kiểm tra trạng thái payment
router.get('/payments/payos/status/:refCode', paymentsCtrl.checkPayOSStatus);

// DEMO: Giả lập thanh toán thành công (để test UI)
router.post('/payments/payos/simulate-success/:refCode', paymentsCtrl.simulatePayOSSuccess);

// Xử lý return URL từ PayOS (khi redirect về)
router.post('/payments/payos/process-return/:orderCode', paymentsCtrl.processPayOSReturn);

export default router;

