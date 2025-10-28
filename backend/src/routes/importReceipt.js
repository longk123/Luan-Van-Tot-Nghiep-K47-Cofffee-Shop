// src/routes/importReceipt.js
import { Router } from 'express';
import importReceiptController from '../controllers/importReceiptController.js';
import { authRequired as auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// GET /api/v1/phieu-nhap/:importId - Lấy dữ liệu phiếu nhập (JSON)
router.get('/phieu-nhap/:importId', auth, authorize(['manager', 'admin']), importReceiptController.getImportReceiptData);

// GET /api/v1/phieu-nhap/:importId/pdf - Xuất PDF trực tiếp
router.get('/phieu-nhap/:importId/pdf', auth, authorize(['manager', 'admin']), importReceiptController.getImportReceiptPdf);

// POST /api/v1/phieu-nhap/:importId/print-log - Ghi log in phiếu
router.post('/phieu-nhap/:importId/print-log', auth, authorize(['manager', 'admin']), importReceiptController.logImportReceiptPrint);

export default router;
