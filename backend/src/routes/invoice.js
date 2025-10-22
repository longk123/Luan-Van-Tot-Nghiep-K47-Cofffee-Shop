// src/routes/invoice.js
import { Router } from 'express';
import invoiceController from '../controllers/invoiceController.js';

const router = Router();

// GET /api/v1/hoa-don/:orderId - Lấy dữ liệu hóa đơn (JSON)
// GET /api/v1/hoa-don/:orderId?format=pdf - Xuất PDF
router.get('/hoa-don/:orderId', invoiceController.getInvoiceData);

// GET /api/v1/hoa-don/:orderId/pdf - Xuất PDF trực tiếp
router.get('/hoa-don/:orderId/pdf', invoiceController.getInvoicePdf);

// POST /api/v1/hoa-don/:orderId/print-log - Ghi log in hóa đơn
router.post('/hoa-don/:orderId/print-log', invoiceController.logInvoicePrint);

export default router;

