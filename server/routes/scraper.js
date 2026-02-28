import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { db } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function findScraperPath() {
  const fromModule = join(__dirname, '..', '..', 'scrapper', 'scraper.py');
  if (existsSync(fromModule)) return fromModule;
  const fromCwd = join(process.cwd(), 'scrapper', 'scraper.py');
  if (existsSync(fromCwd)) return fromCwd;
  return fromModule;
}

const getScraperPath = () => findScraperPath();

router.post('/run', authenticate, express.json(), async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let { url, email, password, apiKey } = req.body || {};
  url = url && String(url).trim();
  email = email && String(email).trim();
  password = password != null ? String(password) : '';

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!apiKey || !String(apiKey).trim()) {
    try {
      const [rows] = await db.execute(
        'SELECT api_key_plaintext FROM app_settings WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (rows.length > 0 && rows[0].api_key_plaintext) {
        apiKey = rows[0].api_key_plaintext.trim();
      }
    } catch (e) {
      // ignore
    }
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required. Provide it in the form or generate one in Settings.' });
    }
  } else {
    apiKey = String(apiKey).trim();
  }

  const SCRAPER_PATH = getScraperPath();
  if (!existsSync(SCRAPER_PATH)) {
    return res.status(503).json({
      error: 'Scraper script not found. Add the scrapper folder to the project and ensure scrapper/scraper.py exists (e.g. commit and deploy scrapper/).',
    });
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const args = [
    SCRAPER_PATH,
    '--website', url,
    '--email', email,
    '--password', password,
    '--api-sync',
  ];

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const env = {
    ...process.env,
    TEXTILELAUNCH_API_KEY: apiKey,
  };
  // Scraper must reach this app's API. Production: use FRONTEND_URL (never localhost). Dev: use localhost.
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = (process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
  const isLocalhost = /^https?:\/\/localhost(\b|$)/i.test(frontendUrl) || /^https?:\/\/127\.0\.0\.1(\b|$)/i.test(frontendUrl);
  if (frontendUrl && (!isProduction || !isLocalhost)) {
    env.TEXTILELAUNCH_API_URL = frontendUrl + '/api';
  } else if (!isProduction) {
    const port = process.env.PORT || 5001;
    env.TEXTILELAUNCH_API_URL = `http://localhost:${port}/api`;
  }
  // Production with no FRONTEND_URL or localhost FRONTEND_URL: leave unset so scraper.py uses DEFAULT_API_BASE_URL

  const projectRoot = dirname(dirname(SCRAPER_PATH));
  const child = spawn(pythonCmd, args, {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const write = (chunk) => {
    if (res.writableEnded) return;
    try {
      res.write(chunk);
    } catch (e) {
      // ignore
    }
  };

  const killChild = () => {
    if (child.killed) return;
    try {
      child.kill('SIGTERM');
    } catch (e) {
      // ignore
    }
  };

  res.on('close', () => killChild());
  res.on('error', () => killChild());

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (data) => write(data));
  child.stderr.on('data', (data) => write(data));

  child.on('error', (err) => {
    write(`\n[Error spawning process: ${err.message}]\n`);
    if (!res.writableEnded) res.end();
  });

  child.on('close', (code, signal) => {
    if (code != null) write(`\n[Process exited with code ${code}]\n`);
    if (signal) write(`\n[Process killed: ${signal}]\n`);
    if (!res.writableEnded) res.end();
  });
});

export default router;
