// File path: D:\my-thesis\backend\src\routes\posEvents.js
// src/routes/posEvents.js
import { Router } from 'express';
import { bus } from '../utils/eventBus.js';

const router = Router();

// GET /api/v1/pos/events
router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  const send = (evt) => {
    res.write(`event: change\n`);
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  };

  // gửi ping mỗi 20s để giữ kết nối
  const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 20000);

  bus.on('change', send);

  req.on('close', () => {
    clearInterval(ping);
    bus.off('change', send);
    res.end();
  });
});

export default router;
