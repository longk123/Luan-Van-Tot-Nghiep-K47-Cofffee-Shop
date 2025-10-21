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

export default router;

