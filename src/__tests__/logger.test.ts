import { unlinkSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  closeLogger,
  getErrorLogs,
  getLogsByEventType,
  getRecentLogs,
  initLogger,
  logEvent,
} from '../utils/logger.ts'

const TEST_DB = 'test-logs.db'

describe('logger', () => {
  beforeAll(() => {
    initLogger(TEST_DB)
  })

  afterAll(() => {
    closeLogger()
    try {
      unlinkSync(TEST_DB)
    }
    catch {
      // Ignore if file doesn't exist
    }
  })

  test('logs success event', () => {
    const id = logEvent({
      eventType: 'test:success',
      payload: { key: 'value' },
      status: 'success',
    })
    expect(id).toBeGreaterThan(0)
  })

  test('logs error event with error message', () => {
    const id = logEvent({
      eventType: 'test:error',
      payload: { orderId: '123' },
      status: 'error',
      error: 'Something went wrong',
    })
    expect(id).toBeGreaterThan(0)
  })

  test('logs warning event', () => {
    const id = logEvent({
      eventType: 'test:warning',
      payload: 'string payload',
      status: 'warning',
    })
    expect(id).toBeGreaterThan(0)
  })

  test('retrieves recent logs', () => {
    const logs = getRecentLogs(10)
    expect(logs.length).toBeGreaterThanOrEqual(3)
    expect(logs[0]?.eventType).toBeDefined()
    expect(logs[0]?.status).toBeDefined()
  })

  test('retrieves logs by event type', () => {
    const logs = getLogsByEventType('test:success')
    expect(logs.length).toBeGreaterThanOrEqual(1)
    expect(logs[0]?.eventType).toBe('test:success')
  })

  test('retrieves error logs only', () => {
    const errorLogs = getErrorLogs()
    expect(errorLogs.every(log => log.status === 'error')).toBe(true)
  })
})
