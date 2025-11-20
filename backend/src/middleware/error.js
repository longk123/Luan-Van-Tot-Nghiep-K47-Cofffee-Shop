// backend/src/middleware/error.js
// Xử lý lỗi tập trung

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error Handler:', err);
  console.error('   Name:', err.name);
  console.error('   Message:', err.message);
  console.error('   Status:', err.status);

  // Lỗi từ httpErrors.js (BadRequest, NotFound, Unauthorized, Forbidden)
  if (err.name === 'BadRequest' || err.name === 'NotFound' || err.name === 'Unauthorized' || err.name === 'Forbidden') {
    return res.status(err.status || 400).json({
      error: err.message || 'Lỗi yêu cầu',
      code: err.code
    });
  }

  // Lỗi validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: err.details || err.message
    });
  }

  // Lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token không hợp lệ'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token đã hết hạn'
    });
  }

  // Lỗi database
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      error: 'Dữ liệu đã tồn tại'
    });
  }

  if (err.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      error: 'Tham chiếu không hợp lệ'
    });
  }

  // Lỗi mặc định
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ';

  res.status(statusCode).json({
    error: message,
    code: err.code,
    ...(err.openOrders && { openOrders: err.openOrders }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware để bắt async errors
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export {
  errorHandler,
  asyncHandler
};
