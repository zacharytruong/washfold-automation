/**
 * Hono server entry point
 * Routes POS and AppSheet webhooks for wash-fold order sync
 */

import { Hono } from 'hono'
import { getPort, isDev, validateConfig } from '@/config.ts'
import { authLogViewer } from '@/middleware/auth-log-viewer.ts'
import { handleErrorLogs, handleLogsByType, handleRecentLogs } from '@/routes/logs.ts'
import { handleAppSheetWebhook } from '@/routes/webhook-appsheet.ts'
import { handlePosWebhook } from '@/routes/webhook-pos.ts'
import { logEvent } from '@/utils/logger.ts'

const app = new Hono()

// Health check - always available, even during config validation
app.get('/', c => c.json({ status: 'ok', service: 'washfold-automation' }))
app.get('/health', c => c.json({ status: 'healthy', timestamp: new Date().toISOString() }))

// Log viewer endpoints (auth middleware applied to all /logs/* routes)
app.use('/logs/*', authLogViewer)
app.get('/logs/recent', handleRecentLogs)
app.get('/logs/errors', handleErrorLogs)
app.get('/logs/type/:type', handleLogsByType)

// Webhook endpoints
app.post('/webhook/pos', handlePosWebhook)
app.post('/webhook/appsheet', handleAppSheetWebhook)

// Global error handler
app.onError((err, c) => {
  const message = err instanceof Error ? err.message : String(err)
  logEvent({
    eventType: 'server:error',
    payload: { path: c.req.path, method: c.req.method },
    status: 'error',
    error: message,
  })
  return c.json({ error: 'Internal server error' }, 500)
})

const port = getPort()
console.log(`Server starting on port ${port}`)

// Validate config after server starts (non-blocking, allows health checks to work)
if (!isDev()) {
  try {
    validateConfig()
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('⚠ Config validation failed:', message)
    logEvent({
      eventType: 'startup:config-error',
      payload: { error: message },
      status: 'warning',
    })
  }
}

export default {
  port,
  fetch: app.fetch,
}
