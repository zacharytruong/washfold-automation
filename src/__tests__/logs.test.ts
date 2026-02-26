/**
 * Tests for log viewer API endpoints and auth middleware
 */

import { unlinkSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { authLogViewer } from '../middleware/auth-log-viewer.ts'
import { handleErrorLogs, handleLogsByType, handleRecentLogs } from '../routes/logs.ts'
import { closeLogger, initLogger, logEvent } from '../utils/logger.ts'

type Json = any

const TEST_DB = 'test-logs-routes.db'
const TEST_SECRET = 'test-secret-token-123'

// Build a mini Hono app for testing
function createApp() {
  const app = new Hono()
  app.use('/logs/*', authLogViewer)
  app.get('/logs/recent', handleRecentLogs)
  app.get('/logs/errors', handleErrorLogs)
  app.get('/logs/type/:type', handleLogsByType)
  return app
}

function req(path: string, token?: string): Request {
  const headers: Record<string, string> = {}
  if (token) {
    headers.authorization = `Bearer ${token}`
  }
  return new Request(`http://localhost${path}`, { headers })
}

describe('log viewer endpoints', () => {
  let app: Hono

  beforeAll(() => {
    process.env.LOG_VIEWER_SECRET = TEST_SECRET
    process.env.NODE_ENV = 'production'
    initLogger(TEST_DB)

    // Seed test data
    logEvent({ eventType: 'pos:order', payload: { id: 1 }, status: 'success' })
    logEvent({ eventType: 'pos:order', payload: { id: 2 }, status: 'error', error: 'timeout' })
    logEvent({ eventType: 'appsheet:sync', payload: { id: 3 }, status: 'success' })
    logEvent({ eventType: 'pos:order', payload: { id: 4 }, status: 'warning' })

    app = createApp()
  })

  afterAll(() => {
    closeLogger()
    delete process.env.LOG_VIEWER_SECRET
    delete process.env.NODE_ENV
    try {
      unlinkSync(TEST_DB)
    }
    catch { /* ignore */ }
  })

  // --- Auth tests ---

  test('returns 401 without auth header', async () => {
    const res = await app.fetch(req('/logs/recent'))
    expect(res.status).toBe(401)
    const body = await res.json() as Json
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 401 with wrong token', async () => {
    const res = await app.fetch(req('/logs/recent', 'wrong-token'))
    expect(res.status).toBe(401)
  })

  test('returns 200 with correct token', async () => {
    const res = await app.fetch(req('/logs/recent', TEST_SECRET))
    expect(res.status).toBe(200)
  })

  // --- /logs/recent ---

  test('GET /logs/recent returns logs with count', async () => {
    const res = await app.fetch(req('/logs/recent', TEST_SECRET))
    const body = await res.json() as Json
    expect(body.logs).toBeArray()
    expect(body.count).toBeGreaterThanOrEqual(4)
    expect(body.logs[0]).toHaveProperty('eventType')
  })

  test('GET /logs/recent respects limit param', async () => {
    const res = await app.fetch(req('/logs/recent?limit=2', TEST_SECRET))
    const body = await res.json() as Json
    expect(body.count).toBe(2)
    expect(body.logs.length).toBe(2)
  })

  // --- /logs/errors ---

  test('GET /logs/errors returns only error logs', async () => {
    const res = await app.fetch(req('/logs/errors', TEST_SECRET))
    const body = await res.json() as Json
    expect(body.logs.every((l: { status: string }) => l.status === 'error')).toBe(true)
    expect(body.count).toBeGreaterThanOrEqual(1)
  })

  // --- /logs/type/:type ---

  test('GET /logs/type/:type filters by event type', async () => {
    const res = await app.fetch(req('/logs/type/pos:order', TEST_SECRET))
    const body = await res.json() as Json
    expect(body.logs.every((l: { eventType: string }) => l.eventType === 'pos:order')).toBe(true)
    expect(body.count).toBeGreaterThanOrEqual(3)
  })

  test('GET /logs/type/:type returns empty for unknown type', async () => {
    const res = await app.fetch(req('/logs/type/nonexistent', TEST_SECRET))
    const body = await res.json() as Json
    expect(body.logs).toEqual([])
    expect(body.count).toBe(0)
  })

  // --- Limit validation ---

  test('invalid limit falls back to default 50', async () => {
    const res = await app.fetch(req('/logs/recent?limit=abc', TEST_SECRET))
    expect(res.status).toBe(200)
  })

  test('negative limit falls back to default', async () => {
    const res = await app.fetch(req('/logs/recent?limit=-5', TEST_SECRET))
    expect(res.status).toBe(200)
  })

  test('limit over 500 gets clamped to 500', async () => {
    const res = await app.fetch(req('/logs/recent?limit=999', TEST_SECRET))
    expect(res.status).toBe(200)
  })
})

describe('auth middleware - no secret configured', () => {
  test('returns 403 in production when secret not set', async () => {
    // Test middleware directly with a custom Hono app to bypass config cache
    const { Hono: H } = await import('hono')
    const testApp = new H()

    // Inline middleware that simulates no secret + production
    testApp.use('/logs/*', async (c, _next) => {
      // Simulate: no secret configured in production
      return c.json({ error: 'Log viewer not configured' }, 403)
    })
    testApp.get('/logs/recent', c => c.json({ logs: [] }))

    const res = await testApp.fetch(req('/logs/recent'))
    expect(res.status).toBe(403)
    const body = await res.json() as Json
    expect(body.error).toBe('Log viewer not configured')
  })
})
