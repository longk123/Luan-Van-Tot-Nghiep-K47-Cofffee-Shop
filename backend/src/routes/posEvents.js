// File path: D:\my-thesis\backend\src\routes\posEvents.js
// src/routes/posEvents.js
import { Router } from 'express';
import { bus } from '../utils/eventBus.js';
import { addSSEClient, getSSEEmitter } from '../utils/sse.js';

const router = Router();

// GET /api/v1/pos/events
router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  res.flushHeaders();

  // Add to SSE clients
  addSSEClient(res);

  const send = (evt) => {
    res.write(`event: change\n`);
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  };

  // gửi ping mỗi 20s để giữ kết nối
  const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 20000);

  // Listen to both old eventBus and new SSE emitter
  bus.on('change', send);
  const sseEmitter = getSSEEmitter();
  sseEmitter.on('shift.opened', send);
  sseEmitter.on('shift.closed', send);

  req.on('close', () => {
    clearInterval(ping);
    bus.off('change', send);
    sseEmitter.off('shift.opened', send);
    sseEmitter.off('shift.closed', send);
    res.end();
  });
});

export default router;
