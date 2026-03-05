/**
 * Log viewer GET endpoints
 * Exposes SQLite log query functions behind bearer token auth
 */

import type { Context } from 'hono'
import { getErrorLogs, getLogsByEventType, getRecentLogs } from '@/utils/logger.ts'

/** Parse and clamp limit query param: default 50, min 1, max 500 */
function parseLimit(raw: string | undefined): number {
  if (!raw) {
    return 50
  }
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return 50
  }
  return Math.min(parsed, 500)
}

export function handleRecentLogs(c: Context): Response {
  const limit = parseLimit(c.req.query('limit'))
  const logs = getRecentLogs(limit).toSorted((a, b) => b.id - a.id)
  return c.json({ logs, count: logs.length })
}

export function handleErrorLogs(c: Context): Response {
  const limit = parseLimit(c.req.query('limit'))
  const logs = getErrorLogs(limit)
  return c.json({ logs, count: logs.length })
}

export function handleLogsByType(c: Context): Response {
  const type = c.req.param('type')
  const limit = parseLimit(c.req.query('limit'))
  const logs = getLogsByEventType(type, limit)
  return c.json({ logs, count: logs.length })
}
