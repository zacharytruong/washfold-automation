# Code Review: Log Viewer Endpoints

**Date:** 2026-02-26
**Branch:** feat/logs-routes
**Reviewer:** code-reviewer agent

---

## Scope

- Files: 5 (2 new source, 1 new test, 2 modified)
- LOC: ~200 total across all files
- Focus: security (auth bypass, timing attacks), correctness, error handling, style consistency

**Files reviewed:**
- `src/middleware/auth-log-viewer.ts` (new)
- `src/routes/logs.ts` (new)
- `src/config.ts` (modified — added `logViewerSecret`)
- `src/index.ts` (modified — route registration)
- `src/__tests__/logs.test.ts` (new)

---

## Overall Assessment

Solid, well-structured implementation. Auth is properly guarded, timing-safe comparison is used correctly, SQL is parameterized, and the test suite is comprehensive. Two security issues need attention: a length-leak in `timingSafeEqual` and a missing rate-limit on the auth middleware. One test is a stub that doesn't exercise the real middleware. Everything else is clean.

---

## Critical Issues

None that cause data loss or hard breakage, but the two items below have security implications.

---

## High Priority

### 1. Timing oracle via length comparison in `timingSafeEqual`

**File:** `src/utils/timing-safe-equal.ts:7`

The current implementation short-circuits and returns `false` immediately when lengths differ. This leaks the **byte-length of the secret** to an attacker who can measure response time — they can enumerate candidate token lengths by observing faster rejections.

```typescript
// Current — leaks length information
if (a.length !== b.length) {
  return false
}
```

Fix: pad both buffers to the same length before XOR-ing, or use `node:crypto`'s `timingSafeEqual` which operates on `Buffer`/`Uint8Array` of equal length:

```typescript
import { timingSafeEqual as cryptoTSE } from 'node:crypto'

export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)

  // Pad shorter buffer so both have same length — prevents length oracle
  const maxLen = Math.max(bufA.length, bufB.length)
  const padA = new Uint8Array(maxLen)
  const padB = new Uint8Array(maxLen)
  padA.set(bufA)
  padB.set(bufB)

  // cryptoTSE requires same-length buffers
  return cryptoTSE(padA, padB) && bufA.length === bufB.length
}
```

The `&& bufA.length === bufB.length` check at the end is now safe because the timing-sensitive comparison is already complete.

---

### 2. No rate limiting on `/logs/*` auth endpoint

An attacker can brute-force the bearer token with unlimited requests — there is no rate-limit middleware in front of the auth check. For a production internal tool this is low-risk given the secret complexity, but it is an OWASP API7 gap.

Recommendation: add a simple sliding-window counter (Bun's built-in Map + timestamp) or use a lightweight package like `hono-rate-limiter`. Even IP-based blocking of 10 failed attempts/minute removes the bulk of risk.

---

## Medium Priority

### 3. The "no secret configured in production" test is a stub, not a real integration test

**File:** `src/__tests__/logs.test.ts:141–159`

The `describe('auth middleware - no secret configured')` block bypasses the real `authLogViewer` and inlines a mock middleware. It verifies the JSON shape but does not exercise the actual branch in `auth-log-viewer.ts` (line 19: `return c.json({ error: 'Log viewer not configured' }, 403)`).

The reason this workaround exists is that `getConfig()` caches its result (`cachedConfig`), so resetting `LOG_VIEWER_SECRET` between test suites has no effect.

Fix options:
- Export a `resetConfigCache()` function (one line: `cachedConfig = null`) for test use only
- Or accept that the stub is intentional and add a comment explaining the cache constraint

The real auth path is currently untested.

---

### 4. `handleLogsByType` does no input sanitization on `:type` param

**File:** `src/routes/logs.ts:34`

The `:type` path param is passed directly to `getLogsByEventType` which uses a parameterized query — so SQL injection is **not** a risk. However, an arbitrarily long or malformed string will hit the database unnecessarily.

Minor hardening (optional, YAGNI if traffic is internal-only):

```typescript
const MAX_TYPE_LENGTH = 64
const type = c.req.param('type').slice(0, MAX_TYPE_LENGTH)
```

---

### 5. Route ordering: `/logs/recent` and `/logs/errors` are safe, but document the intent

**File:** `src/index.ts:26–29`

Hono matches routes in registration order. `app.use('/logs/*', authLogViewer)` is registered before the GET handlers, which is correct. This is fine, but worth a comment since the order matters:

```typescript
// Auth middleware MUST be registered before route handlers
app.use('/logs/*', authLogViewer)
```

---

## Low Priority

### 6. `type Json = any` in test file

**File:** `src/__tests__/logs.test.ts:12`

Against the no-`any` rule in `code-standards.md`. Can be replaced with `unknown` and type narrowing, or inline assertions. Minor in test code but inconsistent with codebase standard.

```typescript
// Replace
type Json = any
// With typed assertions at usage sites, e.g.:
const body = await res.json() as { logs: unknown[]; count: number }
```

---

## Edge Cases Found by Scout

- **Config cache**: `getConfig()` caches on first call. Any test that mutates `process.env` after first load will see stale config. Already manifests in item 3 above.
- **Empty `:type` param**: Hono will 404 before reaching `handleLogsByType` if `:type` is empty (URL pattern won't match), so no handler-level guard needed.
- **`limit=0` param**: `parseLimit` returns 50 for `0` because `parsed < 1` catches it. Correct behavior, but not covered by a test.
- **`payload` field in log response**: `LogEntry.payload` is stored and returned as a JSON string, not a parsed object. Callers consuming the API will need to `JSON.parse(entry.payload)` themselves. This is an API design choice, but should be documented.

---

## Positive Observations

- Timing-safe comparison is used — most developers skip this entirely. The approach is correct in spirit.
- All SQL queries use parameterized statements — no injection risk.
- `parseLimit` clamps properly and handles `NaN`, negative numbers, and missing params.
- The dev bypass (no secret = open in dev, 403 in prod) is a sensible DX choice.
- Test suite covers all three endpoints, auth scenarios, and limit edge cases — 12 tests, 0 failures.
- File sizes are well within the 200-line limit; separation of concerns is clean.
- `logViewerSecret` correctly marked as non-required in config with `getEnvVar('LOG_VIEWER_SECRET', false)`.

---

## Recommended Actions

1. **[High]** Fix timing oracle in `timingSafeEqual` — pad buffers before comparison or delegate to `node:crypto`
2. **[High]** Add IP-based rate limiting to `/logs/*` before shipping to production
3. **[Medium]** Export `resetConfigCache()` or add comment explaining why the no-secret test is a stub
4. **[Low]** Replace `type Json = any` in test file with typed assertions
5. **[Optional]** Clamp `:type` param length if this endpoint will be internet-accessible

---

## Metrics

- Type coverage: 100% (tsc --noEmit clean)
- Lint issues: 0 (eslint clean)
- Test results: 12/12 pass
- File sizes: all under 200 lines

---

## Unresolved Questions

- Is `LOG_VIEWER_SECRET` documented in `.env.example` or Railway variable config? Not visible in reviewed files.
- Should `payload` be returned as parsed JSON object rather than string? Consistent with current logger design but may surprise API consumers.
- Is the `/logs/*` endpoint intended to be publicly routable (e.g., behind Railway's public URL) or internal-only (VPN/private network)? This affects urgency of the rate-limit recommendation.
