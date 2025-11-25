// src/routes/invoice.js
import { Router } from 'express';
import invoiceController from '../controllers/invoiceController.js';
import { authRequired as auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// GET /api/v1/hoa-don/:orderId - Lấy dữ liệu hóa đơn (JSON)
// GET /api/v1/hoa-don/:orderId?format=pdf - Xuất PDF
// Cho phép cashier, manager, admin, waiter (waiter chỉ xem đơn của mình)
router.get('/hoa-don/:orderId', auth, authorize(['cashier', 'manager', 'admin', 'waiter']), invoiceController.getInvoiceData);

// GET /api/v1/hoa-don/:orderId/pdf - Xuất PDF trực tiếp
router.get('/hoa-don/:orderId/pdf', auth, authorize(['cashier', 'manager', 'admin', 'waiter']), invoiceController.getInvoicePdf);

// POST /api/v1/hoa-don/:orderId/print-log - Ghi log in hóa đơn
router.post('/hoa-don/:orderId/print-log', auth, authorize(['cashier', 'manager', 'admin', 'waiter']), invoiceController.logInvoicePrint);

export default router;

