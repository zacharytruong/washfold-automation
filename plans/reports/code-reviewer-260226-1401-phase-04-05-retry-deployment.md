# Code Review: Phase 4 (Retry/Error Handling) & Phase 5 (Deployment)

**Score: 7/10**

## Scope

- Files reviewed: 7 (retry.ts, google-sheets.ts, pancake-pos.ts, botcake.ts, retry.test.ts, Dockerfile, railway.toml)
- Focus: retry correctness, 5xx handling, nested retry, Docker, security

## Overall Assessment

Solid implementation. Retry logic is clean and well-tested. 5xx/4xx split is correct. Two significant issues: nested retry amplification and missing .dockerignore.

---

## Critical Issues

### 1. Missing .dockerignore -- secrets could leak into image

No `.dockerignore` exists. If `.env`, `logs.db`, `node_modules`, `.git`, or `plans/` exist at build time, they get copied into the Docker image via `COPY src/ src/` (safe) but could leak if Dockerfile changes to `COPY . .` later. More importantly, `bun install` creates `node_modules` before `COPY src/`, so layer caching works, but any future `COPY` additions are risky.

**Fix**: Create `.dockerignore`:
```
.env
.env.*
node_modules
logs.db
.git
plans/
docs/
*.md
src/__tests__/
```

### 2. Dockerfile uses `curl` for healthcheck but Bun image may not have curl

The `oven/bun:1` image is Debian-based and typically includes curl, but this is not guaranteed across versions. If curl is missing, the container will be marked unhealthy and Railway will restart it in a loop.

**Fix**: Use a wget fallback or Bun-based healthcheck:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1))" || exit 1
```

---

## High Priority

### 3. Nested retry amplification in `updateStatus` and `getCustomerPhone`

**`updateStatus`** (line 166-213 in google-sheets.ts): Wrapped in `withRetry`, but internally calls `findRowByOrderNumber` which is also wrapped in `withRetry`. Worst case: 3 outer retries x 3 inner retries = **9 Google Sheets API calls** for a single updateStatus failure. Each with exponential backoff, so max wall time could be ~90s.

**`getCustomerPhone`** (line 219-245): Same pattern -- `withRetry` wrapping a call to `findRowByOrderNumber` which has its own `withRetry`. Another 9-call amplification.

**Impact**: Could hit Google Sheets API rate limits (100 requests/100 seconds per user). Also extends webhook response time significantly.

**Fix options**:
1. Remove `withRetry` from `getCustomerPhone` and `updateStatus` since the inner calls already retry
2. Or create an internal `_findRowByOrderNumber` without retry for use by sibling functions, keeping the public `findRowByOrderNumber` wrapped

Recommended approach (option 2):
```typescript
// Internal - no retry (used by updateStatus, getCustomerPhone)
async function _findRowByOrderNumber(orderNumber: string): Promise<SheetRowData | null> {
  // ... current implementation without withRetry wrapper
}

// Public - with retry
export async function findRowByOrderNumber(orderNumber: string): Promise<SheetRowData | null> {
  return withRetry(() => _findRowByOrderNumber(orderNumber), 'sheets:findRowByOrderNumber')
}

// Uses internal version to avoid nested retry
export async function updateStatus(orderNumber: string, status: string): Promise<boolean> {
  return withRetry(async () => {
    const row = await _findRowByOrderNumber(orderNumber)
    // ...
  }, 'sheets:updateStatus')
}
```

### 4. No jitter in exponential backoff

Current formula: `baseDelayMs * 2^(attempt-1)`. All concurrent retries for the same service will retry at exactly the same intervals, causing "thundering herd" against the same API.

**Fix**: Add jitter:
```typescript
const delay = Math.min(
  opts.baseDelayMs * 2 ** (attempt - 1) + Math.random() * opts.baseDelayMs,
  opts.maxDelayMs,
)
```

---

## Medium Priority

### 5. retry.test.ts "handles non-Error throws" test is misleading

Test name says "handles non-Error throws" but actually throws `new Error('string error')` -- a normal Error. Should test with a raw string throw to validate line 37 of retry.ts (`error instanceof Error ? error : new Error(String(error))`).

**Fix**:
```typescript
test('handles non-Error throws', async () => {
  const fn = mock(() => Promise.reject('string error'))  // raw string, not Error
  await expect(
    withRetry(fn, 'test:nonError', { maxAttempts: 1, baseDelayMs: 10, maxDelayMs: 50 }),
  ).rejects.toThrow('string error')
})
```

### 6. `getOrder` return type is `unknown | null`

In `/Users/zacharytruong/projects/personal/washfold-automation/src/services/pancake-pos.ts` line 67, `unknown | null` simplifies to `unknown` (null is a subset of unknown). Should define a proper `PosOrder` interface or at minimum use `Record<string, unknown> | null`.

### 7. Dockerfile: no pinned Bun version

`FROM oven/bun:1` will float to latest 1.x. A breaking change in Bun could silently break production.

**Fix**: Pin to specific version, e.g. `FROM oven/bun:1.3.4`

### 8. Dockerfile: running as root

No `USER` directive. Container runs as root, which is a security concern if the process is compromised.

**Fix**:
```dockerfile
USER bun
```
(The `oven/bun` image includes a `bun` user.)

---

## Low Priority

### 9. SQLite logger in container -- data loss on restart

`logs.db` is ephemeral inside the container. Every Railway restart loses all logs. For production, consider:
- Mount a persistent volume for `logs.db`
- Or switch to stdout JSON logging (Railway captures stdout)

### 10. `railway.toml` healthcheckTimeout is 100ms -- very tight

If the server is under load, 100ms may not be enough. Railway default is 300. Consider bumping to 300.

---

## Positive Observations

- Clean 5xx vs 4xx separation in POS and Botcake -- 4xx returns failure gracefully, 5xx throws for retry
- Timing-safe secret comparison for webhook auth
- Good error propagation -- webhook handlers catch retry-exhausted errors and return 500
- AppSheet handler correctly gates WhatsApp notification on POS success
- Retry tests cover the key scenarios (success, retry-then-success, exhaustion, backoff verification)
- Dockerfile layer caching is correct (package files first, then source)
- Global error handler in index.ts prevents stack traces leaking to clients

## Recommended Actions (Priority Order)

1. **[HIGH]** Fix nested retry amplification in google-sheets.ts (extract internal _findRowByOrderNumber)
2. **[HIGH]** Add jitter to exponential backoff
3. **[CRITICAL]** Create .dockerignore
4. **[MEDIUM]** Pin Bun version in Dockerfile
5. **[MEDIUM]** Add `USER bun` to Dockerfile
6. **[MEDIUM]** Fix the misleading non-Error test case
7. **[LOW]** Use Bun-based healthcheck instead of curl
8. **[LOW]** Bump Railway healthcheckTimeout to 300
9. **[LOW]** Consider stdout logging for Railway

## Metrics

- Type Coverage: Good (strict config, Zod schemas, typed interfaces)
- Test Coverage: 6 tests for retry utility; no integration tests for nested retry scenario
- Linting: Clean (typecheck passes, 0 errors)

## Unresolved Questions

1. Is there a plan for log persistence in Railway? SQLite on ephemeral filesystem means logs disappear on deploy/restart.
2. Should `getCustomerPhone` even exist as a separate function? It's a thin wrapper around `findRowByOrderNumber` that just extracts one field. Could be inlined at the call site.
3. What is the expected webhook response time SLA? Nested retries could push it to 90+ seconds.
