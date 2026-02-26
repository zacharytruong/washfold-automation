---
parent: ./plan.md
phase: 01
status: complete
priority: P3
completed: 2026-02-26
---

# Phase 01: Log Viewer Implementation

## Context Links
- [Plan Overview](./plan.md)
- [System Architecture](../../docs/system-architecture.md)
- [Code Standards](../../docs/code-standards.md)
- Existing logger: `src/utils/logger.ts` — `getRecentLogs()`, `getErrorLogs()`, `getLogsByEventType()`

## Overview
Single phase — add bearer token auth middleware, 3 log viewer GET endpoints, register in index.ts, write tests.

## Key Insights
- Logger query functions already exist and are tested (15 tests)
- Hono supports `app.use('/path/*', middleware)` for route-scoped middleware
- Existing pattern: routes in `src/routes/`, one file per domain
- `timing-safe-equal.ts` already exists for safe string comparison

## Requirements

### Functional
- `GET /logs/recent?limit=50` → returns recent logs (default 50, max 500)
- `GET /logs/errors?limit=50` → returns error-only logs
- `GET /logs/type/:type?limit=50` → returns logs filtered by event type
- All endpoints require `Authorization: Bearer <token>` header
- JSON response: `{ logs: LogEntry[], count: number }`

### Non-Functional
- Auth skipped in dev mode when `LOG_VIEWER_SECRET` not set
- Limit param validated: integer, min 1, max 500, default 50
- 401 for missing/invalid token, 400 for invalid params

## Architecture

```
Request → Hono Router
  ├── GET /logs/* → authLogViewer middleware
  │                  ├── 401 (no/bad token)
  │                  └── next() → route handler → logger query → JSON
  └── POST /webhook/* (unchanged)
```

## Related Code Files

### Modify
- `src/config.ts` — Add `logViewerSecret` field (optional string)
- `src/index.ts` — Import and register log routes

### Create
- `src/middleware/auth-log-viewer.ts` — Bearer token check middleware
- `src/routes/logs.ts` — 3 GET endpoint handlers
- `src/__tests__/logs.test.ts` — Tests for endpoints + auth

## Implementation Steps

### Step 1: Update Config (`src/config.ts`)
1. Add `logViewerSecret` to `Config` interface as optional `string`
2. In `getConfig()`, read `LOG_VIEWER_SECRET` via `getEnvVar('LOG_VIEWER_SECRET', false)` (not required)
3. No changes to `validateConfig()` — this var is optional

### Step 2: Create Auth Middleware (`src/middleware/auth-log-viewer.ts`)
1. Create `src/middleware/` directory
2. Export Hono middleware function `authLogViewer`
3. Logic:
   - Get `logViewerSecret` from config
   - If not set and `isDev()` → call `next()` (skip auth in dev)
   - If not set and production → return 403 "Log viewer not configured"
   - Extract `Authorization` header, parse `Bearer <token>`
   - Compare token with `logViewerSecret` using `timingSafeEqual` from `src/utils/timing-safe-equal.ts`
   - If mismatch → return 401 `{ error: 'Unauthorized' }`
   - If match → call `next()`

### Step 3: Create Route Handler (`src/routes/logs.ts`)
1. Export Hono route group or individual handlers
2. Helper: `parseLimit(query: string | undefined): number` — parse limit, default 50, clamp 1-500
3. `GET /logs/recent` — call `getRecentLogs(limit)`, return `{ logs, count: logs.length }`
4. `GET /logs/errors` — call `getErrorLogs(limit)`, return `{ logs, count: logs.length }`
5. `GET /logs/type/:type` — call `getLogsByEventType(type, limit)`, return `{ logs, count: logs.length }`

### Step 4: Register Routes (`src/index.ts`)
1. Import `authLogViewer` middleware
2. Import log route handlers
3. Add `app.use('/logs/*', authLogViewer)` before route registration
4. Add `app.get('/logs/recent', handleRecentLogs)`
5. Add `app.get('/logs/errors', handleErrorLogs)`
6. Add `app.get('/logs/type/:type', handleLogsByType)`

### Step 5: Write Tests (`src/__tests__/logs.test.ts`)
1. Test auth: 401 without token, 401 with wrong token, 200 with correct token
2. Test `/logs/recent`: returns logs array, respects limit param, default limit
3. Test `/logs/errors`: returns only error logs
4. Test `/logs/type/:type`: filters by event type, returns empty for unknown type
5. Test limit validation: string → default, negative → default, >500 → 500

## Todo List
- [x] Add `logViewerSecret` to Config interface and getConfig()
- [x] Create `src/middleware/auth-log-viewer.ts`
- [x] Create `src/routes/logs.ts` with 3 handlers
- [x] Register middleware + routes in `src/index.ts`
- [x] Write tests in `src/__tests__/logs.test.ts`
- [x] Run `bun run typecheck` — no errors
- [x] Run `bun test` — all pass (57 tests)
- [x] Run `bun run lint` — clean

## Success Criteria
- All 3 endpoints return correct JSON with `{ logs, count }`
- Auth blocks unauthenticated requests (401)
- Limit param works correctly (default, clamp, invalid input)
- All existing tests still pass
- TypeScript strict mode — no errors

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Logger not initialized when endpoint hit | Low | Medium | `ensureDb()` already handles lazy init |
| Large log responses | Low | Low | Limit capped at 500 |

## Security Considerations
- Bearer token via timing-safe comparison (reuse existing util)
- No auth bypass in production — if secret not set, return 403
- Log data may contain PII (phone numbers) — auth required
- Don't expose stack traces in error responses

## Next Steps
- Update `docs/system-architecture.md` with new endpoints
- Update `docs/codebase-summary.md` with new files
- Add `LOG_VIEWER_SECRET` to Railway env vars
