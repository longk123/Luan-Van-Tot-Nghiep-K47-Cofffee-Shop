// src/routes/paymentSuccess.js
// Route xử lý redirect từ PayOS sau khi thanh toán
import { Router } from 'express';

const router = Router();

// GET /payment-success
router.get('/payment-success', (req, res) => {
  const { ref, orderCode, status } = req.query;
  
  // Redirect về frontend POS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/?payment=success&ref=${ref || orderCode || ''}`);
});

// GET /payment-cancel
router.get('/payment-cancel', (req, res) => {
  const { ref, orderCode } = req.query;
  
  // Redirect về frontend POS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/?payment=cancel&ref=${ref || orderCode || ''}`);
});

export default router;

