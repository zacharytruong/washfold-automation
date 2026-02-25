# Code Review: Phase 02 Core Services

**Date:** 2026-02-25
**Reviewer:** code-reviewer
**Branch:** feat/phase-02
**Score:** 8/10

## Scope

- Files reviewed: 5 service/utility files
- Total LOC: ~400
- Tests: 31 passing tests across 3 files
- Focus: Core services for POS-AppSheet integration

## Overall Assessment

Solid implementation with good error handling patterns and consistent API design. Code is clean, readable, and well-documented. Minor improvements needed for edge cases and type safety.

## Critical Issues

None identified.

## High Priority

### 1. `google-sheets.ts` - Untyped API Response (Line 45)

```typescript
const credentials = JSON.parse(config.googleServiceAccountJson)
```

**Issue:** No type guard for parsed JSON. Malformed JSON or wrong structure fails silently until runtime error.

**Recommendation:** Add Zod/type guard validation:
```typescript
interface ServiceAccountCredentials {
  client_email: string
  private_key: string
}
// Validate structure after parse
```

### 2. `google-sheets.ts` - findRowByOrderId Performance (Lines 107-134)

**Issue:** Fetches ALL rows for every lookup. O(n) scan on every call. Problematic at scale.

**Recommendation:** Consider:
- Adding index column for binary search
- Caching frequently accessed rows
- Using Google Sheets API `QUERY` range filter

### 3. `pancake-pos.ts` - Weak Return Type (Line 72)

```typescript
export async function getOrder(orderId: string): Promise<unknown | null>
```

**Issue:** `unknown` return type provides no type safety for consumers.

**Recommendation:** Define proper `PosOrder` interface based on API docs.

### 4. `logger.ts` - No Log Rotation/Cleanup

**Issue:** SQLite DB grows indefinitely. No mechanism to prune old logs.

**Recommendation:** Add:
```typescript
export function pruneLogs(olderThanDays: number): number
```

## Medium Priority

### 5. `status-mapper.ts` - Missing POS Status Mappings

**Issue:** PACKAGING(8), WAITING(9), RETURNED(20) have no AppSheet mappings - returns `Unknown(X)`.

**Impact:** AppSheet displays confusing status strings for intermediate states.

**Recommendation:** Map all statuses or add `IN_PROGRESS` / `CANCELLED` AppSheet statuses.

### 6. `botcake.ts` - Phone Validation Too Permissive

```typescript
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length >= 10
}
```

**Issue:** Accepts any 10+ digit string. No country code validation.

**Edge cases missed:**
- `0000000000` - passes but invalid
- Numbers without country code (local format)

### 7. `google-sheets.ts` - Race Condition on Concurrent Updates

**Issue:** `findRowByOrderId` then `updateStatus` is not atomic. Between find and update, another process could modify the sheet.

**Recommendation:** For production, consider:
- Optimistic locking with version column
- Or atomic update via `batchUpdate` with conditions

### 8. `logger.ts` - Global DB State

```typescript
let db: Database | null = null
```

**Issue:** Module-level singleton complicates testing and doesn't support multiple DB instances.

**Recommendation:** Consider class-based approach or dependency injection for testability.

## Low Priority

### 9. Hardcoded Sheet Range

```typescript
const SHEET_RANGE = 'Sheet1'
```

**Recommendation:** Move to config for flexibility.

### 10. Vietnamese-only Messages in `botcake.ts`

```typescript
const statusMessages: Record<string, string> = {
  Pending: 'don hang cua ban dang cho xu ly',
  // ...
}
```

**Recommendation:** Consider i18n support if multi-language needed in future.

## Edge Cases Found by Scout

1. **Empty phone string:** `formatPhoneToPsid('')` returns `wa_` - may cause API errors
2. **Concurrent logger init:** Multiple `initLogger()` calls create multiple DB connections
3. **Google Sheets API quota:** No rate limiting - can hit 100 req/100sec limit
4. **Sheet row deletion:** If row deleted between find and update, update silently fails

## Positive Observations

- Consistent error handling pattern across all services
- Good use of Bun native APIs (`bun:sqlite`)
- Logging integrated into all service methods
- Type exports for consumers
- Comprehensive test coverage for utility functions
- Clean separation of concerns
- Well-documented function signatures

## Security Considerations

- Service account JSON stored in env var (good)
- No secrets logged in payloads (verified)
- No SQL injection risk (parameterized queries)
- Webhook secret in config (ready for Phase 03 validation)

## Recommended Actions

1. **Add type guard for Google credentials JSON** - prevents runtime crashes
2. **Define PosOrder interface** - improves type safety for consumers
3. **Add log pruning mechanism** - prevents DB growth issues
4. **Document unmapped POS statuses** - clarify behavior for operators
5. **Add rate limiting consideration** for Google Sheets API

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | Good (minor gaps) |
| Test Coverage | 31 tests passing |
| Linting Issues | 0 |
| Security Issues | 0 |
| Documentation | Good |

## Unresolved Questions

1. What should happen when POS status RETURNED(20) is received? Currently shows `Unknown(20)` in AppSheet.
2. Should failed notifications retry? Current implementation fails silently after logging.
3. What's the expected sheet size? May need optimization for >1000 rows.
