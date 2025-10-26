import os from 'os';
import pkg from './package.json' with { type: 'json' };
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Set timezone to Vietnam
process.env.TZ = 'Asia/Ho_Chi_Minh';

import express from 'express';
import cors from 'cors';

// Import middleware
import { requestId } from './src/middleware/requestId.js';
import { errorHandler } from './src/middleware/error.js';


const app = express();

// Middleware setup
app.use(cors());

// Raw body parser cho webhook signature verification
// Phải đặt TRƯỚC express.json() để capture raw body
app.use('/api/v1/payments/payos/webhook', (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});

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

import kitchenRouter from './src/routes/kitchen.js'; // <— router bếp/pha chế (KDS)
app.use('/api/v1/kitchen', kitchenRouter);

import analyticsRouter from './src/routes/analytics.js'; // <— router analytics cho Manager
app.use('/api/v1/analytics', analyticsRouter);

import inventoryRouter from './src/routes/inventory.js'; // <— router quản lý tồn kho
app.use('/api/v1/inventory', inventoryRouter);

import paymentSuccessRouter from './src/routes/paymentSuccess.js'; // <— router payment redirect
app.use('/', paymentSuccessRouter);

// Error handling middleware (phải ở cuối)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend chạy tại http://localhost:${PORT}`);
  console.log(`📁 Cấu trúc MVC đã được áp dụng`);
});
