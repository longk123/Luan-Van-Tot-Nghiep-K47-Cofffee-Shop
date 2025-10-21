// backend/src/middleware/requestId.js
// Gắn X-Request-Id để log

import { v4 as uuidv4 } from 'uuid';

const requestId = (req, res, next) => {
  // Tạo request ID nếu chưa có
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Gắn vào request và response
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  
  // Log request với ID
  console.log(`[${requestId}] ${req.method} ${req.path} - ${req.ip}`);
  
  next();
};

export { requestId };
