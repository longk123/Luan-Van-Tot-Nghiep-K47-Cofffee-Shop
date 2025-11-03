// src/routes/areas.js
import express from 'express';
import Joi from 'joi';
import service from '../services/areasService.js';

const router = express.Router();

// GET /api/v1/areas?include_counts=1
router.get('/', async (req, res, next) => {
  try {
    const includeCounts = ['1', 'true', 'yes'].includes(String(req.query.include_counts).toLowerCase());
    const data = await service.list({ includeCounts });
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

// POST /api/v1/areas
router.post('/', async (req, res, next) => {
  try {
    const schema = Joi.object({
      ten: Joi.string().min(1).required(),
      mo_ta: Joi.string().allow(null, ''),
      thu_tu: Joi.number().integer().min(0).default(0),
      active: Joi.boolean().default(true),
    });
    const payload = await schema.validateAsync(req.body);
    const area = await service.create(payload);
    res.status(201).json({ ok: true, data: area });
  } catch (e) { next(e); }
});

// PUT /api/v1/areas/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = Joi.object({
      ten: Joi.string().min(1),
      mo_ta: Joi.string().allow(null, ''),
      thu_tu: Joi.number().integer().min(0),
      active: Joi.boolean(),
    }).min(1);
    const payload = await schema.validateAsync(req.body);
    const area = await service.update(id, payload);
    res.json({ ok: true, data: area });
  } catch (e) { next(e); }
});

// PATCH /api/v1/areas/:id/toggle-active (toggle active status)
router.patch('/:id/toggle-active', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const area = await service.toggleActive(id);
    res.json({ ok: true, data: area });
  } catch (e) { next(e); }
});

// DELETE /api/v1/areas/:id (hard delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await service.remove(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/v1/areas/:id/tables
router.get('/:id/tables', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await service.tablesByArea(id);
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

export default router;
