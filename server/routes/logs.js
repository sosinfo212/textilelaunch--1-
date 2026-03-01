import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getEntries, addSSE } from '../utils/serverLog.js';

const router = express.Router();

/** GET /api/logs - return recent server log entries */
router.get('/', authenticate, (req, res) => {
  try {
    res.json({ logs: getEntries() });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /api/logs/stream - SSE stream of new log entries (real-time) */
router.get('/stream', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  addSSE(res);
  req.on('close', () => res.end());
});

export default router;
