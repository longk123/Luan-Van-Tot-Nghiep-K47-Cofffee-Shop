// src/routes/exports.js
import express from 'express';
import exportController from '../controllers/exportController.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// All export routes require authentication
router.use(authRequired);

// POST /api/v1/reports/export - Universal export endpoint
router.post('/export', exportController.exportReport);

export default router;
