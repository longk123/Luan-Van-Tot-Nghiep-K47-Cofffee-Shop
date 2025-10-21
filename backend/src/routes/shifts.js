// src/routes/shifts.js
import { Router } from 'express';
import Joi from 'joi';
import { authRequired as authMiddleware } from '../middleware/auth.js';
import { myOpen, open, close, getCurrentShiftService } from '../services/shiftsService.js';

const router = Router();

// GET /api/v1/shifts/my-open?nhan_vien_id=2
router.get('/my-open', async (req, res, next) => {
  try {
    const nhanVienId = Number(req.query.nhan_vien_id);
    if (!nhanVienId) return res.status(400).json({ error: 'nhan_vien_id is required' });
    const data = await myOpen(nhanVienId);
    res.json({ data });
  } catch (e) { next(e); }
});

// GET /api/v1/shifts/current - với auth middleware
router.get('/current', authMiddleware, async (req, res, next) => {
  try {
    const data = await getCurrentShiftService(req.user.user_id);
    return res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// POST /api/v1/shifts/open
// { nhan_vien_id, opening_cash? }
router.post('/open', async (req, res, next) => {
  try {
    const schema = Joi.object({
      nhan_vien_id: Joi.number().integer().required(),
      opening_cash: Joi.number().integer().min(0).allow(null),
    });
    const { nhan_vien_id, opening_cash } = await schema.validateAsync(req.body);
    const shift = await open({ nhanVienId: nhan_vien_id, openingCash: opening_cash });
    res.status(201).json({ shift });
  } catch (e) { next(e); }
});

// POST /api/v1/shifts/:id/close
// { closing_cash?, note? }
router.post('/:id/close', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = Joi.object({
      closing_cash: Joi.number().integer().min(0).allow(null),
      note: Joi.string().allow('', null),
    });
    const { closing_cash, note } = await schema.validateAsync(req.body);
    const closed = await close(id, { closingCash: closing_cash, note });
    res.json({ shift: closed });
  } catch (e) { next(e); }
});

export default router;
