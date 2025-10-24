// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';

function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`🔍 Auth middleware - User authenticated:`, req.user);
    return next();
  } catch (e) {
    console.log(`❌ Auth middleware - Token verification failed:`, e.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export { authRequired };
