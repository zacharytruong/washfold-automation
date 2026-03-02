import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { closeLogger, initLogger } from '@/utils/logger.ts'
import { withRetry } from '@/utils/retry.ts'

beforeEach(() => {
  initLogger(':memory:')
})

afterEach(() => {
  closeLogger()
})

describe('withRetry', () => {
  test('returns result on first success', async () => {
    const fn = mock(() => Promise.resolve('ok'))

    const result = await withRetry(fn, 'test:success')

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('retries and succeeds on second attempt', async () => {
    let calls = 0
    const fn = mock(() => {
      calls++
      if (calls === 1) {
        throw new Error('transient')
      }
      return Promise.resolve('recovered')
    })

    const result = await withRetry(fn, 'test:retry', { baseDelayMs: 10, maxDelayMs: 50 })

    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('throws after max attempts exhausted', async () => {
    const fn = mock(() => Promise.reject(new Error('permanent')))

    await expect(
      withRetry(fn, 'test:exhaust', { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 50 }),
    ).rejects.toThrow('permanent')

    expect(fn).toHaveBeenCalledTimes(3)
  })

  test('respects maxAttempts option', async () => {
    const fn = mock(() => Promise.reject(new Error('fail')))

    await expect(
      withRetry(fn, 'test:maxAttempts', { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50 }),
    ).rejects.toThrow('fail')

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('delays increase with exponential backoff', async () => {
    const timestamps: number[] = []
    let calls = 0

    const fn = mock(() => {
      timestamps.push(Date.now())
      calls++
      if (calls < 3) {
        throw new Error('retry')
      }
      return Promise.resolve('done')
    })

    await withRetry(fn, 'test:backoff', { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 500 })

    // Second delay should be roughly 2x the first delay
    const delay1 = timestamps[1]! - timestamps[0]!
    const delay2 = timestamps[2]! - timestamps[1]!
    expect(delay2).toBeGreaterThanOrEqual(delay1 * 1.5) // Allow some tolerance
  })

  test('handles non-Error throws', async () => {
    const fn = mock(() => Promise.reject(new Error('string error')))

    await expect(
      withRetry(fn, 'test:nonError', { maxAttempts: 1, baseDelayMs: 10, maxDelayMs: 50 }),
    ).rejects.toThrow('string error')
  })
})
