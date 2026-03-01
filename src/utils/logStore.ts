/**
 * In-memory log store for API calls and errors. Used by the Settings > Log tab.
 * Subscribers are notified when new entries are added.
 */

export type LogLevel = 'request' | 'response' | 'error' | 'info';

export interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  method?: string;
  url?: string;
  status?: number;
  message: string;
  details?: string;
}

const MAX_LOGS = 500;
const logs: LogEntry[] = [];
const listeners = new Set<() => void>();

let idCounter = 0;
function nextId() {
  return `log_${Date.now()}_${++idCounter}`;
}

function notify() {
  listeners.forEach((f) => f());
}

export function addLog(entry: Omit<LogEntry, 'id' | 'time'>) {
  const full: LogEntry = {
    ...entry,
    id: nextId(),
    time: new Date().toISOString(),
  };
  logs.push(full);
  if (logs.length > MAX_LOGS) logs.shift();
  notify();
}

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function clearLogs() {
  logs.length = 0;
  notify();
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
