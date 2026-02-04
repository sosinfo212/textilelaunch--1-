import jwt from 'jsonwebtoken';
import { db } from '../index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'textilelaunch-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 */
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Authentication middleware
 * Checks for session in database via sessionId cookie
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    let sessionId = null;

    // Debug: log cookies and session check (always log for debugging)
    console.log(`[AUTH] ${req.method} ${req.path}`);
    console.log(`[AUTH] Cookies object:`, req.cookies);
    console.log(`[AUTH] Cookie sessionId:`, req.cookies?.sessionId);
    console.log(`[AUTH] All cookie keys:`, Object.keys(req.cookies || {}));
    console.log(`[AUTH] Cookie header:`, req.headers.cookie);

    // Check for session ID in cookie (preferred method - sessions stored in DB)
    if (req.cookies && req.cookies.sessionId) {
      sessionId = req.cookies.sessionId;
      
      // Fetch session from database
      const [sessions] = await db.execute(
        'SELECT token, user_id, expires_at FROM sessions WHERE id = ? AND expires_at > NOW()',
        [sessionId]
      );
      
      if (sessions.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Session not found or expired for sessionId:', sessionId);
        }
        return res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
      }
      
      token = sessions[0].token;
      req.userId = sessions[0].user_id;
    } else {
      // Fallback: check Authorization header (for backward compatibility)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      // Legacy: check old token cookie
      else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      }
      // Fallback: check x-user-id header (for backward compatibility during migration)
      else if (req.headers['x-user-id']) {
        const userId = req.headers['x-user-id'];
        // Verify user exists
        const [users] = await db.execute(
          'SELECT id, email, name, role FROM users WHERE id = ?',
          [userId]
        );
        if (users.length > 0) {
          req.user = users[0];
          req.userId = userId;
          return next();
        }
      }
      
      if (!token) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('No authentication method found - cookies:', Object.keys(req.cookies || {}), 'headers:', req.headers.authorization ? 'present' : 'missing');
        }
        return res.status(401).json({ error: 'Authentication required. Please login.' });
      }
      
      // Verify token is valid
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
      }
      req.userId = decoded.userId;
    }

    // Verify token is valid (if we have one and didn't get it from session)
    if (token && !sessionId) {
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
      }
      req.userId = decoded.userId;
    }

    // Fetch user to ensure they still exist and are active
    const [users] = await db.execute('SELECT id, email, name, role FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      // Delete invalid session
      if (sessionId) {
        await db.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
      }
      return res.status(401).json({ error: 'User not found or session invalid.' });
    }
    req.user = users[0]; // Attach user object to request

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token, but attaches user if token is valid
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers['x-user-id']) {
      const userId = req.headers['x-user-id'];
      const [users] = await db.execute(
        'SELECT id, email, name, role FROM users WHERE id = ?',
        [userId]
      );
      if (users.length > 0) {
        req.user = users[0];
        req.userId = userId;
      }
      return next();
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        const [users] = await db.execute(
          'SELECT id, email, name, role FROM users WHERE id = ?',
          [decoded.userId]
        );
        if (users.length > 0) {
          req.user = users[0];
          req.userId = decoded.userId;
        }
      }
    }

    next();
  } catch (error) {
    // Continue even if auth fails in optional mode
    next();
  }
};

/**
 * Admin only middleware
 * Must be used after authenticate middleware
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
