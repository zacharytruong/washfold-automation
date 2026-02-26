/**
 * SQLite-based event logging for webhook events and API calls
 * Uses Bun's built-in SQLite for persistence
 */

import { Database } from 'bun:sqlite'

export interface LogEntry {
  id: number
  timestamp: string
  eventType: string
  payload: string
  status: 'success' | 'error' | 'warning'
  error: string | null
}

export interface LogEventInput {
  eventType: string
  payload: unknown
  status: 'success' | 'error' | 'warning'
  error?: string | null
}

let db: Database | null = null

/**
 * Initialize the logger database
 * Creates the logs table if it doesn't exist
 */
/** Default path: /app/data/logs.db in production (Railway volume), local fallback */
export function initLogger(dbPath = process.env.DATA_DIR ? `${process.env.DATA_DIR}/logs.db` : 'logs.db'): void {
  db = new Database(dbPath)

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
      error TEXT
    )
  `)

  // Index for common queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_event_type ON logs(event_type)`)
}

/**
 * Ensure logger is initialized
 */
function ensureDb(): Database {
  if (!db) {
    initLogger()
  }
  return db!
}

/**
 * Log an event to the database
 */
export function logEvent(input: LogEventInput): number {
  const database = ensureDb()
  const payloadStr = typeof input.payload === 'string' ? input.payload : JSON.stringify(input.payload)

  const stmt = database.prepare(`
    INSERT INTO logs (event_type, payload, status, error)
    VALUES (?, ?, ?, ?)
  `)

  const result = stmt.run(input.eventType, payloadStr, input.status, input.error ?? null)

  return Number(result.lastInsertRowid)
}

/**
 * Get recent log entries
 */
export function getRecentLogs(limit = 100): LogEntry[] {
  const database = ensureDb()

  const stmt = database.prepare<LogEntry, [number]>(`
    SELECT
      id,
      timestamp,
      event_type as eventType,
      payload,
      status,
      error
    FROM logs
    ORDER BY timestamp DESC
    LIMIT ?
  `)

  return stmt.all(limit)
}

/**
 * Get logs by event type
 */
export function getLogsByEventType(eventType: string, limit = 50): LogEntry[] {
  const database = ensureDb()

  const stmt = database.prepare<LogEntry, [string, number]>(`
    SELECT
      id,
      timestamp,
      event_type as eventType,
      payload,
      status,
      error
    FROM logs
    WHERE event_type = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `)

  return stmt.all(eventType, limit)
}

/**
 * Get error logs only
 */
export function getErrorLogs(limit = 50): LogEntry[] {
  const database = ensureDb()

  const stmt = database.prepare<LogEntry, [number]>(`
    SELECT
      id,
      timestamp,
      event_type as eventType,
      payload,
      status,
      error
    FROM logs
    WHERE status = 'error'
    ORDER BY timestamp DESC
    LIMIT ?
  `)

  return stmt.all(limit)
}

/**
 * Close the database connection
 */
export function closeLogger(): void {
  if (db) {
    db.close()
    db = null
  }
}
