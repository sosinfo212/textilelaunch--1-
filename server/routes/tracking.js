import express from 'express';
import { db } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { parseUserAgent } from '../utils/parseUserAgent.js';

const router = express.Router();

// 1x1 transparent GIF (43 bytes)
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * GET /api/tracking/pixel
 * Tracking pixel: returns 1x1 GIF and records/updates product_views.
 * Query: productId (required), sessionId (required), timeSpent (optional, seconds).
 * Device and browser from User-Agent, or override with query params device= &browser=
 */
router.get('/pixel', async (req, res) => {
  try {
    const { productId, sessionId, timeSpent } = req.query || {};
    const ua = req.get('User-Agent') || '';
    const { device: uaDevice, browser: uaBrowser } = parseUserAgent(ua);
    const device = (req.query.device && String(req.query.device).slice(0, 50)) || uaDevice;
    const browser = (req.query.browser && String(req.query.browser).slice(0, 100)) || uaBrowser;

    if (!productId || !sessionId) {
      res.set('Content-Type', 'image/gif');
      return res.send(PIXEL_GIF);
    }

    const pid = String(productId).slice(0, 191);
    const sid = String(sessionId).slice(0, 191);
    let timeSec = 0;
    if (timeSpent != null) {
      const n = parseInt(String(timeSpent), 10);
      if (!isNaN(n) && n >= 0) timeSec = Math.min(n, 86400);
    }

    const [products] = await db.execute('SELECT id FROM products WHERE id = ?', [pid]);
    if (products.length === 0) {
      res.set('Content-Type', 'image/gif');
      return res.send(PIXEL_GIF);
    }

    const viewId = `pv_${uuidv4()}`;
    await db.execute(
      `INSERT INTO product_views (id, product_id, session_id, first_seen_at, time_spent_seconds, device, browser)
       VALUES (?, ?, ?, NOW(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         time_spent_seconds = GREATEST(COALESCE(time_spent_seconds, 0), VALUES(time_spent_seconds)),
         device = COALESCE(VALUES(device), device),
         browser = COALESCE(VALUES(browser), browser)`,
      [viewId, pid, sid, timeSec, device, browser]
    );
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') console.error('Tracking pixel error:', err);
  }
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.send(PIXEL_GIF);
});

/**
 * POST /api/tracking/pixel
 * Beacon endpoint: same data as GET but in body (for sendBeacon with JSON).
 * Body: { productId, sessionId, timeSpentSeconds?, device?, browser? }
 */
router.post('/pixel', express.json(), async (req, res) => {
  try {
    const body = req.body || {};
    let { productId, sessionId, timeSpentSeconds, device: bodyDevice, browser: bodyBrowser } = body;
    const ua = req.get('User-Agent') || '';
    const { device: uaDevice, browser: uaBrowser } = parseUserAgent(ua);
    const device = (bodyDevice && String(bodyDevice).slice(0, 50)) || uaDevice;
    const browser = (bodyBrowser && String(bodyBrowser).slice(0, 100)) || uaBrowser;

    if (!productId || !sessionId) {
      return res.status(400).json({ error: 'productId and sessionId required' });
    }

    const pid = String(productId).slice(0, 191);
    const sid = String(sessionId).slice(0, 191);
    let timeSec = 0;
    if (timeSpentSeconds != null) {
      const n = typeof timeSpentSeconds === 'number' ? timeSpentSeconds : parseInt(String(timeSpentSeconds), 10);
      if (!isNaN(n) && n >= 0) timeSec = Math.min(Math.round(n), 86400);
    }

    const [products] = await db.execute('SELECT id FROM products WHERE id = ?', [pid]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });

    const viewId = `pv_${uuidv4()}`;
    await db.execute(
      `INSERT INTO product_views (id, product_id, session_id, first_seen_at, time_spent_seconds, device, browser)
       VALUES (?, ?, ?, NOW(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         time_spent_seconds = GREATEST(COALESCE(time_spent_seconds, 0), VALUES(time_spent_seconds)),
         device = COALESCE(VALUES(device), device),
         browser = COALESCE(VALUES(browser), browser)`,
      [viewId, pid, sid, timeSec, device, browser]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Analytics not configured' });
    }
    console.error('Tracking pixel POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
