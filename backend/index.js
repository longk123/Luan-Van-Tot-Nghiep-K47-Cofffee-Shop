import os from 'os';
import pkg from './package.json' with { type: 'json' };
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';

// Import middleware
import { requestId } from './src/middleware/requestId.js';
import { errorHandler } from './src/middleware/error.js';


const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(requestId); // Gắn request ID
// app.use('/api', generalRateLimit); // Tắt rate limit để dễ test

// Health & demo
app.get('/api/v1/hello', (_req, res) => {
  res.json({ message: 'Xin chào từ backend v1!' });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'backend',
    version: pkg.version,
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    hostname: os.hostname(),
  });
});

// Mount các router
import authRouter from './src/routes/auth.js';   // <— router đăng nhập/đăng ký
app.use('/api/v1/auth', authRouter);

import dbTestRouter from './src/routes/dbtest.js'; // <— router test DB tách riêng
app.use('/api/v1', dbTestRouter);

import tablesRouter from './src/routes/tables.js'; // <— router quản lý bàn
app.use('/api/v1/tables', tablesRouter);

import shiftsRouter from './src/routes/shifts.js'; // <— router quản lý ca làm
app.use('/api/v1/shifts', shiftsRouter);

import posRouter from './src/routes/pos.js'; // <— router quản lý điểm bán hàng
app.use('/api/v1/pos', posRouter);

import posEventsRouter from './src/routes/posEvents.js'; // <— router SSE events
app.use('/api/v1/pos', posEventsRouter);

import areasRouter from './src/routes/areas.js'; // <— router quản lý khu vực
app.use('/api/v1/areas', areasRouter);

import menuRouter from './src/routes/menu.js'; // <— router quản lý menu
app.use('/api/v1/menu', menuRouter);

import reservationsRouter from './src/routes/reservations.js'; // <— router đặt bàn
app.use('/api/v1', reservationsRouter);

import paymentsRouter from './src/routes/payments.js'; // <— router thanh toán
app.use('/api/v1', paymentsRouter);

import invoiceRouter from './src/routes/invoice.js'; // <— router in hóa đơn
app.use('/api/v1', invoiceRouter);

// Error handling middleware (phải ở cuối)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend chạy tại http://localhost:${PORT}`);
  console.log(`📁 Cấu trúc MVC đã được áp dụng`);
});
