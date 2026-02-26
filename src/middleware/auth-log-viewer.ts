/**
 * Bearer token authentication middleware for log viewer endpoints
 * Skips auth in dev when LOG_VIEWER_SECRET is not set
 * Returns 403 in production when not configured
 */

import type { Context, Next } from 'hono'
import { getConfig, isDev } from '../config.ts'
import { timingSafeEqual } from '../utils/timing-safe-equal.ts'

export async function authLogViewer(c: Context, next: Next): Promise<Response | void> {
  const { logViewerSecret } = getConfig()

  // No secret configured
  if (!logViewerSecret) {
    if (isDev()) {
      return next()
    }
    return c.json({ error: 'Log viewer not configured' }, 403)
  }

  // Extract bearer token
  const authHeader = c.req.header('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  if (!timingSafeEqual(token, logViewerSecret)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return next()
}
