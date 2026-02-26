/**
 * Retry utility with exponential backoff for transient API failures
 * Used by all service wrappers (Google Sheets, Pancake POS, Botcake)
 */

import { logEvent } from './logger.ts'

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
}

/**
 * Execute an async function with retry and exponential backoff
 * Logs each retry attempt for debugging
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === opts.maxAttempts) {
        logEvent({
          eventType: 'retry:exhausted',
          payload: { context, attempt, maxAttempts: opts.maxAttempts, error: lastError.message },
          status: 'error',
          error: `All ${opts.maxAttempts} attempts failed: ${lastError.message}`,
        })
        break
      }

      // Exponential backoff with jitter: 1s, 2s, 4s... + random jitter, capped at maxDelayMs
      const delay = Math.min(
        opts.baseDelayMs * 2 ** (attempt - 1) + Math.random() * opts.baseDelayMs,
        opts.maxDelayMs,
      )

      logEvent({
        eventType: 'retry:attempt',
        payload: { context, attempt, maxAttempts: opts.maxAttempts, nextDelayMs: delay },
        status: 'warning',
        error: lastError.message,
      })

      await Bun.sleep(delay)
    }
  }

  throw lastError
}
