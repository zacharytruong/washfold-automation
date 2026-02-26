# Code Review: Phase 3 - Webhook Endpoints

**Date:** 2026-02-26
**Reviewer:** code-reviewer
**Branch:** feat/phase-03
**Build Status:** PASS (typecheck, lint, 39 tests passing)

## Scope

- Files reviewed: 10 (routes, schemas, services, utils, config, tests)
- LOC changed: ~484 additions
- Focus: webhook handlers, Zod validation, security, edge cases

## Overall Assessment

Solid implementation. Clean separation of concerns (routes/schemas/services/utils). Consistent error handling and logging throughout. Zod validation applied correctly with safeParse. A few security and edge-case issues worth addressing.

## Critical Issues

### 1. POS Webhook Has No Authentication

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/routes/webhook-pos.ts`

The AppSheet webhook validates `?secret=WEBHOOK_SECRET`, but the POS webhook has zero authentication. Any actor can POST to `/webhook/pos` and create rows in Google Sheets.

**Impact:** Unauthorized order creation, data pollution, potential abuse.

**Recommendation:** Add webhook secret validation (query param or HMAC signature header) matching what POS actually sends. At minimum, mirror the AppSheet pattern:

```typescript
const secret = c.req.query('secret')
if (secret !== config.webhookSecret) {
  return c.json({ error: 'Unauthorized' }, 401)
}
```

Or better, use a separate `POS_WEBHOOK_SECRET` if POS supports HMAC signatures.

### 2. Timing-Safe Secret Comparison Missing

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/routes/webhook-appsheet.ts` (line 24)

```typescript
if (secret !== config.webhookSecret) {
```

String equality (`!==`) is vulnerable to timing attacks. Use a constant-time comparison.

**Recommendation:**
```typescript
import { timingSafeEqual } from 'crypto'

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
```

**Severity note:** Low practical risk for this use case (query-param secret over HTTPS), but good practice.

## High Priority

### 3. Duplicate Order Creation on POS Re-delivery

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/routes/webhook-pos.ts` (lines 40-68)

When POS sends `status: 3` (Confirmed), `appendRow` is called unconditionally. If POS retries the webhook (network timeout, POS retry logic), duplicate rows get created in Google Sheets.

**Recommendation:** Check if order already exists before appending:

```typescript
if (shouldCreateAppSheetEntry(data.status)) {
  const existing = await findRowByOrderNumber(data.order_number)
  if (existing) {
    logEvent({ eventType: 'pos:webhook:duplicate', payload: { orderNumber: data.order_number }, status: 'warning' })
    return c.json({ ok: true, action: 'already_exists' })
  }
  await appendRow({ ... })
}
```

### 4. POS Update Failure Silently Continues to WhatsApp

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/routes/webhook-appsheet.ts` (lines 69-89)

When `posResult.success` is `false` (line 71-78), the error is logged but execution continues to send WhatsApp notification. The customer gets notified "ready for pickup" even though POS status was not actually updated.

**Recommendation:** Either return early on POS failure or include the POS failure state in the response:

```typescript
if (!posResult.success) {
  logEvent({ ... })
  return c.json({ error: 'POS update failed, notification skipped' }, 502)
}
```

### 5. Google Sheets Linear Scan Performance

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/services/google-sheets.ts` (lines 112-156)

`findRowByOrderNumber` fetches ALL rows (`A:G`) and linearly scans. As orders grow, this becomes slower and hits Sheets API response size limits.

**Impact:** Medium now, High at scale (hundreds/thousands of orders).

**Recommendation for now:** Acceptable for MVP. When order volume grows, consider:
- Filtering by date range in the Sheets query
- Using a local SQLite lookup table for order-to-row mapping
- Moving to a proper database

## Medium Priority

### 6. Raw Payload Logged Before Auth Check (AppSheet)

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/routes/webhook-appsheet.ts` (lines 34-40)

Auth check happens first (good), but the raw payload JSON parsing at line 35 will throw if the body is not valid JSON, bypassing the structured error handler. The `c.req.json()` call should be wrapped in try-catch.

**Recommendation:**
```typescript
let rawPayload: unknown
try {
  rawPayload = await c.req.json()
} catch {
  return c.json({ error: 'Invalid JSON' }, 400)
}
```

Same applies to `webhook-pos.ts` line 18.

### 7. `customer_phone` Schema Too Permissive

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/schemas/pos-webhook.schema.ts` (line 10)

```typescript
customer_phone: z.string().min(1),
```

Only checks non-empty. Could accept `"abc"` as a phone number. The `botcake.ts` service has `isValidPhone()` that checks for 10+ digits, but validation should happen at schema level too.

**Recommendation:**
```typescript
customer_phone: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone format'),
```

### 8. `so_luong_mon` Transform Could Produce NaN

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/schemas/pos-webhook.schema.ts` (line 13)

```typescript
so_luong_mon: z.union([z.string(), z.number()]).transform(Number),
```

If a non-numeric string is passed (e.g., `"abc"`), `Number("abc")` returns `NaN` and passes validation.

**Recommendation:** Add a `.refine()`:
```typescript
so_luong_mon: z.union([z.string(), z.number()])
  .transform(Number)
  .refine(n => !isNaN(n), 'Must be a valid number'),
```

## Low Priority

### 9. Missing Route File in Code Standards

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/docs/code-standards.md`

The directory structure in code-standards.md does not list `src/routes/` or `src/schemas/` directories. Should be updated to reflect actual structure.

### 10. Health Endpoint Lacks Version Info

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/index.ts` (line 21)

Consider adding a version or git SHA to the health endpoint for deployment debugging.

## Positive Observations

- Clean route/handler separation -- routes are thin, logic stays in services
- Consistent error handling pattern: try/catch with structured logging everywhere
- AppSheet webhook properly masks sensitive data in logs (`phone: '***'`, `providedSecret: '***'`)
- WhatsApp notification failure is non-blocking (line 112-120) -- correct design, order processing should not fail because notification fails
- Zod schemas use `safeParse` consistently with proper 400 responses
- Status mapper has comprehensive unit tests covering all code paths
- Flexible schemas (`union` for order_number accepting string or number) handle real-world API inconsistencies well

## Recommended Actions (Priority Order)

1. **[Critical]** Add authentication to POS webhook endpoint
2. **[High]** Add duplicate order check before `appendRow`
3. **[High]** Decide on POS failure behavior in AppSheet webhook (fail fast vs continue)
4. **[Medium]** Wrap `c.req.json()` in try-catch for malformed JSON
5. **[Medium]** Tighten phone number schema validation
6. **[Medium]** Fix `so_luong_mon` NaN edge case
7. **[Low]** Update code-standards.md directory structure

## Metrics

- Type Coverage: 100% (strict mode, no `any`)
- Test Coverage: Partial (status-mapper fully covered; route handlers, schemas, services lack unit tests)
- Linting Issues: 0
- Build: PASS

## Unresolved Questions

1. Does Pancake POS support HMAC webhook signatures, or only shared-secret auth?
2. What is the expected order volume? Determines urgency of the Sheets linear scan issue (#5).
3. Should POS and AppSheet use separate webhook secrets for better isolation?
4. Are POS webhook retries expected? Determines urgency of duplicate prevention (#3).
