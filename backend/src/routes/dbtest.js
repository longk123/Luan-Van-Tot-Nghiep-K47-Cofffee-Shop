// backend/src/routes/dbtest.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/test-db', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, time: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
