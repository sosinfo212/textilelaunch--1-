/**
 * In-memory server log for API activity (e.g. product import).
 * Supports SSE so the Settings Log tab can show real-time entries.
 */

const MAX_ENTRIES = 500;
const entries = [];
const sseListeners = new Set();

let idCounter = 0;
function nextId() {
  return `srv_${Date.now()}_${++idCounter}`;
}

function trim() {
  while (entries.length > MAX_ENTRIES) entries.shift();
}

/**
 * Add a log entry and broadcast to SSE clients.
 * @param {{ level: string, method?: string, url?: string, status?: number, message: string, details?: string, count?: number }} entry
 */
export function add(entry) {
  const full = {
    id: nextId(),
    time: new Date().toISOString(),
    level: entry.level || 'info',
    method: entry.method,
    url: entry.url,
    status: entry.status,
    message: entry.message,
    details: entry.details,
    count: entry.count,
    source: 'server',
  };
  entries.push(full);
  trim();
  const data = JSON.stringify(full);
  sseListeners.forEach((res) => {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      sseListeners.delete(res);
    }
  });
}

export function getEntries() {
  return [...entries];
}

/**
 * Register an SSE response for real-time updates. Call res.end() when done.
 * @param {import('express').Response} res
 */
export function addSSE(res) {
  sseListeners.add(res);
  res.on('close', () => sseListeners.delete(res));
}
