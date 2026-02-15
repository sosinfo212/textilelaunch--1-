import express from 'express';
import { db } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const EVENT_TYPES = ['cta_click', 'time_spent'];

/**
 * POST /api/analytics/events
 * Track product-specific events (e.g. CTA clicks).
 * Body: { productId, productSlug, eventType, timestamp?, sessionId }
 */
router.post('/events', async (req, res) => {
  try {
    const { productId, productSlug, eventType, timestamp, sessionId } = req.body || {};
    if (!productId || typeof productId !== 'string' || productId.length > 191) {
      return res.status(400).json({ error: 'productId required' });
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 191) {
      return res.status(400).json({ error: 'sessionId required' });
    }
    const type = (eventType && typeof eventType === 'string') ? eventType.trim() : 'cta_click';
    const slug = (productSlug && typeof productSlug === 'string') ? productSlug.slice(0, 191) : productId;
    const id = `ev_${uuidv4()}`;

    const [products] = await db.execute('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });

    await db.execute(
      `INSERT INTO analytics_events (id, product_id, product_slug, session_id, event_type, event_value)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [id, productId, slug, sessionId, type]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Analytics not configured' });
    }
    console.error('Analytics events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/analytics/time
 * Track active time spent on a product landing page.
 * Body: { productId, sessionId, timeSpentSeconds }
 * Call when user leaves, route changes, or page unloads.
 */
router.post('/time', async (req, res) => {
  try {
    const { productId, sessionId, timeSpentSeconds } = req.body || {};
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'productId required' });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId required' });
    }
    let secs = timeSpentSeconds;
    if (typeof secs === 'string') secs = parseInt(secs, 10);
    if (typeof secs !== 'number' || isNaN(secs) || secs < 0) {
      return res.status(400).json({ error: 'timeSpentSeconds required (number)' });
    }
    secs = Math.min(Math.round(secs), 86400);

    const [products] = await db.execute('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });

    const id = `ev_${uuidv4()}`;
    const slug = productId;
    await db.execute(
      `INSERT INTO analytics_events (id, product_id, product_slug, session_id, event_type, event_value, created_at)
       VALUES (?, ?, ?, ?, 'time_spent', ?, NOW())`,
      [id, productId, slug, sessionId, secs]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Analytics not configured' });
    }
    console.error('Analytics time error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/summary/:productId
 * Aggregated stats for a product (auth, owner only).
 * Returns: { clickCount, totalTimeSpentSeconds }
 */
router.get('/summary/:productId', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const [products] = await db.execute('SELECT owner_id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });
    if (products[0].owner_id !== userId) return res.status(403).json({ error: 'Not authorized' });

    let clickCount = 0;
    let totalTimeSpentSeconds = 0;
    try {
      const [clicks] = await db.execute(
        "SELECT COUNT(*) AS cnt FROM analytics_events WHERE product_id = ? AND event_type = 'cta_click'",
        [productId]
      );
      if (clicks.length) clickCount = Number(clicks[0].cnt) || 0;

      const [time] = await db.execute(
        "SELECT COALESCE(SUM(event_value), 0) AS total FROM analytics_events WHERE product_id = ? AND event_type = 'time_spent'",
        [productId]
      );
      if (time.length) totalTimeSpentSeconds = Number(time[0].total) || 0;
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
    }

    res.json({
      productId,
      clickCount,
      totalTimeSpentSeconds,
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
