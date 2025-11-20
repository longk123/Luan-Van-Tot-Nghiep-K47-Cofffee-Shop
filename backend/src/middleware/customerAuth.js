// Customer Authentication Middleware
import jwt from 'jsonwebtoken';
import { Unauthorized } from '../utils/httpErrors.js';

const JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET || 'customer-secret-key';

/**
 * Require customer authentication
 * Use this middleware for protected customer routes
 */
export const customerAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Unauthorized('Token không hợp lệ');
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if it's a customer token
    if (decoded.type !== 'customer') {
      throw new Unauthorized('Token không hợp lệ');
    }

    // Attach customer info to request
    req.customer = {
      customerId: decoded.customerId,
      phone: decoded.phone
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Token không hợp lệ'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token đã hết hạn'));
    }
    next(error);
  }
};

/**
 * Optional customer authentication
 * Use this when you want to allow both authenticated and unauthenticated access
 */
export const optionalCustomerAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      req.customer = null;
      return next();
    }

    const token = authHeader.substring(7);

    // Try to verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type === 'customer') {
      req.customer = {
        customerId: decoded.customerId,
        phone: decoded.phone
      };
    } else {
      req.customer = null;
    }

    next();
  } catch (error) {
    // Invalid token, but continue without authentication
    req.customer = null;
    next();
  }
};

