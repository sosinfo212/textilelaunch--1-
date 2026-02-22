import express from 'express';
import crypto from 'crypto';
import { db } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encrypt.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://trendycosmetix.com';

// List affiliate connections (no credentials)
router.get('/affiliate', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await db.execute(
      'SELECT id, user_id, name, login_url, created_at FROM affiliate_connections WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json({ connections: rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      loginUrl: r.login_url,
      createdAt: r.created_at
    })) });
  } catch (err) {
    console.error('List affiliate connections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update affiliate connection
router.post('/affiliate', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { id, name, loginUrl, email, password } = req.body;
    if (!name || !loginUrl || !email || password === undefined) {
      return res.status(400).json({ error: 'name, loginUrl, email and password are required' });
    }
    const emailEncrypted = encrypt(email);
    const passwordEncrypted = encrypt(password);
    const connectionId = id || `aff_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (id) {
      const [existing] = await db.execute(
        'SELECT id FROM affiliate_connections WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      await db.execute(
        'UPDATE affiliate_connections SET name = ?, login_url = ?, email_encrypted = ?, password_encrypted = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [name, loginUrl, emailEncrypted, passwordEncrypted, id, userId]
      );
      return res.json({ connection: { id, name, loginUrl, createdAt: new Date() } });
    }

    await db.execute(
      'INSERT INTO affiliate_connections (id, user_id, name, login_url, email_encrypted, password_encrypted) VALUES (?, ?, ?, ?, ?, ?)',
      [connectionId, userId, name, loginUrl, emailEncrypted, passwordEncrypted]
    );
    res.status(201).json({ connection: { id: connectionId, name, loginUrl, createdAt: new Date() } });
  } catch (err) {
    console.error('Save affiliate connection error:', err);
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Affiliate integrations not set up. Run database migration add-affiliate-integrations.sql' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete affiliate connection
router.delete('/affiliate/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const [result] = await db.execute(
      'DELETE FROM affiliate_connections WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete affiliate connection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Allowed origins for launch URL (so Connect opens on your domain, not localhost)
const ALLOWED_LAUNCH_ORIGINS = [
  'https://trendycosmetix.com',
  'http://trendycosmetix.com',
  'https://www.trendycosmetix.com',
  'http://www.trendycosmetix.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
function launchBaseUrl(req) {
  const origin = req.body && req.body.origin;
  if (origin && ALLOWED_LAUNCH_ORIGINS.includes(origin)) return origin;
  return FRONTEND_URL;
}

// Create one-time launch token and return bridge URL (opens in new tab to auto-login)
router.post('/affiliate/:id/launch', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const [conn] = await db.execute(
      'SELECT id, login_url, email_encrypted, password_encrypted FROM affiliate_connections WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (conn.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
    await db.execute(
      'INSERT INTO affiliate_launch_tokens (token, user_id, connection_id, expires_at) VALUES (?, ?, ?, ?)',
      [token, userId, id, expiresAt]
    );
    const base = launchBaseUrl(req);
    const launchUrl = `${base}/integrations/affiliate/connect?token=${token}`;
    res.json({ launchUrl });
  } catch (err) {
    console.error('Create launch token error:', err);
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Affiliate integrations not set up.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: exchange one-time token for credentials (used by bridge page)
router.get('/affiliate/launch', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    const [rows] = await db.execute(
      'SELECT t.connection_id, c.login_url, c.email_encrypted, c.password_encrypted FROM affiliate_launch_tokens t JOIN affiliate_connections c ON c.id = t.connection_id WHERE t.token = ? AND t.expires_at > NOW()',
      [token]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }
    const r = rows[0];
    await db.execute('DELETE FROM affiliate_launch_tokens WHERE token = ?', [token]);

    let csrfToken = null;
    try {
      const loginPageRes = await fetch(r.login_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TextileLaunch/1.0)' }
      });
      const html = await loginPageRes.text();
      const hiddenMatch = html.match(/name=["']_token["']\s+value=["']([^"']+)["']/i);
      const metaMatch = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
      if (hiddenMatch) csrfToken = hiddenMatch[1];
      else if (metaMatch) csrfToken = metaMatch[1];
    } catch (e) {
      console.warn('Could not fetch CSRF token from login page:', e.message);
    }

    res.json({
      loginUrl: r.login_url,
      email: decrypt(r.email_encrypted),
      password: decrypt(r.password_encrypted),
      loginFieldName: 'email',
      passwordFieldName: 'password',
      csrfToken: csrfToken || undefined
    });
  } catch (err) {
    console.error('Launch affiliate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
