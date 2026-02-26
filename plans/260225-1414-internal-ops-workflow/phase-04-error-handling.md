# Phase 4: Error Handling & Retry

## Context Links
- [Main Plan](./plan.md)
- [Phase 3: Webhook Endpoints](./phase-03-webhook-endpoints.md)

## Overview
- **Priority:** Medium
- **Status:** Complete
- **Description:** Add retry logic with exponential backoff and comprehensive error handling

## Requirements

### Functional
- Retry failed API calls up to 3 times
- Exponential backoff between retries
- Log failures with full context

### Non-functional
- Graceful degradation
- No data loss on transient failures

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/google-sheets.ts` | Add retry wrapper |
| `src/services/pancake-pos.ts` | Add retry wrapper |
| `src/services/botcake.ts` | Add retry wrapper |
| `src/utils/retry.ts` | Create retry utility |

## Implementation Steps

### 1. Create Retry Utility (`src/utils/retry.ts`)

```typescript
interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === options.maxAttempts) break

      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.min(
        options.baseDelayMs * Math.pow(2, attempt - 1),
        options.maxDelayMs
      )

      await Bun.sleep(delay)
    }
  }

  throw lastError
}
```

### 2. Wrap Service Methods

Update each service to use `withRetry`:

```typescript
// google-sheets.ts
async appendRow(orderData: OrderData): Promise<void> {
  return withRetry(async () => {
    // existing implementation
  })
}

// pancake-pos.ts
async updateOrderStatus(orderId: string, statusCode: number): Promise<void> {
  return withRetry(async () => {
    // existing implementation
  })
}

// botcake.ts
async sendStatusNotification(...): Promise<void> {
  return withRetry(async () => {
    // existing implementation
  })
}
```

### 3. Enhanced Error Logging

Update logger to capture:
- Attempt number
- Error type
- Full request/response context
- Timestamp of each attempt

### 4. Webhook Response Strategy

- If Google Sheets fails after retries: Return 500, POS will retry webhook
- If POS update fails: Log error, still send notification (partial success)
- If Botcake fails: Log error, return 200 (notification is non-critical)

## Todo List

- [x] Create `src/utils/retry.ts`
- [x] Update `google-sheets.ts` with retry
- [x] Update `pancake-pos.ts` with retry
- [x] Update `botcake.ts` with retry
- [x] Enhance logger for retry context
- [x] Test failure scenarios
- [x] Verify exponential backoff timing

## Success Criteria

- Transient failures auto-recover within 3 attempts
- Permanent failures logged with full context
- Webhooks return appropriate status codes
- No silent data loss

## Next Steps

After completion, proceed to [Phase 5: Deployment](./phase-05-deployment.md)
