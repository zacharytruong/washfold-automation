# Phase 06 — Update Tests

**Status:** `pending`
**Blocked by:** Phases 02–05 (all implementation must be done first)
**Files:**
- `src/__tests__/status-mapper.test.ts`
- `src/__tests__/webhook-appsheet.test.ts`
- `src/__tests__/webhook-pos.test.ts`

## Overview

Update existing tests to match new logic and add coverage for new flows. Tests should be run with `bun test` after all changes.

---

## `status-mapper.test.ts`

### Changes

**`shouldCreateAppSheetEntry` — invert expectations:**
```ts
// OLD (wrong after Phase 02)
test('returns true for Confirmed (3)', () => {
  expect(shouldCreateAppSheetEntry(POS_STATUSES.CONFIRMED)).toBe(true)
})
test('returns false for other statuses', () => {
  expect(shouldCreateAppSheetEntry(POS_STATUSES.NEW)).toBe(false) // WRONG — will be true
})

// NEW
test('returns true for New (0)', () => {
  expect(shouldCreateAppSheetEntry(POS_STATUSES.NEW)).toBe(true)
})
test('returns false for other statuses', () => {
  expect(shouldCreateAppSheetEntry(POS_STATUSES.CONFIRMED)).toBe(false)
  expect(shouldCreateAppSheetEntry(POS_STATUSES.SHIPPED)).toBe(false)
  expect(shouldCreateAppSheetEntry(POS_STATUSES.RECEIVED)).toBe(false)
})
```

**Add `shouldMarkDelivered` tests:**
```ts
describe('shouldMarkDelivered', () => {
  test('returns true for Delivery status', () => {
    expect(shouldMarkDelivered(APPSHEET_STATUSES.DELIVERY)).toBe(true)
  })
  test('returns false for other statuses', () => {
    expect(shouldMarkDelivered(APPSHEET_STATUSES.STORAGE_READY)).toBe(false)
    expect(shouldMarkDelivered(APPSHEET_STATUSES.ARRIVED)).toBe(false)
  })
})
```

**Add `getPosDeliveredCode` test:**
```ts
describe('getPosDeliveredCode', () => {
  test('returns RECEIVED status code (3)', () => {
    expect(getPosDeliveredCode()).toBe(3)
  })
})
```

**Fix `APPSHEET_STATUSES` test:**
Current test expects `STORAGE_READY = 'Storage / Ready'` but actual value is `'Lưu kho / STORAGE'`.
Also add `DELIVERY` constant:
```ts
expect(APPSHEET_STATUSES.STORAGE_READY).toBe('Lưu kho / STORAGE') // fix this
expect(APPSHEET_STATUSES.DELIVERY).toBe('Delivery') // add this
```

**Fix `getAllPosStatusCodes` test:**
Current test expects codes 11, 12, 20 which don't exist in the enum.
Update to only assert codes that actually exist:
```ts
test('returns all POS status codes', () => {
  const codes = getAllPosStatusCodes()
  expect(codes).toContain(POS_STATUSES.NEW)      // 0
  expect(codes).toContain(POS_STATUSES.CONFIRMED) // 1
  expect(codes).toContain(POS_STATUSES.SHIPPED)   // 2
  expect(codes).toContain(POS_STATUSES.RECEIVED)  // 3
  expect(codes).toContain(POS_STATUSES.WAITING)   // 9
})
```

**Fix `getPosStatusName` test:**
Current test expects `CONFIRMED` for code 3, `SHIPPED` for code 11 — mismatched with actual enum.
Update to match real enum values:
```ts
expect(getPosStatusName(0)).toBe('NEW')
expect(getPosStatusName(1)).toBe('CONFIRMED')
expect(getPosStatusName(2)).toBe('SHIPPED')
expect(getPosStatusName(3)).toBe('RECEIVED')
```

**Remove `shouldMarkAppSheetDelivered` tests** if that function is deleted in Phase 02.

---

## `webhook-appsheet.test.ts`

### Changes

**Add `phone` to all test payloads:**
```ts
// Add phone to existing valid payload tests
{ order_number: 12345, status: 'Storage / Ready', phone: '0987654321' }
```

**Add "Delivery" schema tests:**
```ts
test('validates Delivery status with phone', () => {
  const result = appsheetWebhookSchema.safeParse({
    order_number: '12345',
    status: 'Delivery',
    phone: '0987654321',
  })
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.status).toBe('Delivery')
    expect(result.data.phone).toBe('0987654321')
  }
})

test('accepts missing phone (optional field)', () => {
  const result = appsheetWebhookSchema.safeParse({
    order_number: '12345',
    status: 'Delivery',
  })
  expect(result.success).toBe(true) // phone is optional
})
```

**Fix existing test string:**
Current test uses `'Storage / Ready'` but actual status is `'Lưu kho / STORAGE'`.
Either update the test string or keep it — it's testing schema, not status logic.

---

## `webhook-pos.test.ts`

### Changes

Current tests only cover **schema validation** (not the route handler). No handler logic tests exist.

**Update `makePayload` default status:**
```ts
// OLD
status: 2  // shipped

// NEW — reflect the actual trigger status
status: 0  // new
status_name: 'new'
```

**Add test for status 0 explicitly:**
```ts
test('validates status 0 (New)', () => {
  const result = posWebhookSchema.safeParse(makePayload({ status: 0, status_name: 'new' }))
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.status).toBe(0)
  }
})
```

---

## Run Tests

```bash
bun test
```

Expected: all tests pass with no failures.

## Success Criteria

- [ ] `shouldCreateAppSheetEntry(0)` → true; `shouldCreateAppSheetEntry(1)` → false
- [ ] `shouldMarkDelivered('Delivery')` → true
- [ ] `getPosDeliveredCode()` → 3
- [ ] `APPSHEET_STATUSES.STORAGE_READY` → `'Lưu kho / STORAGE'`
- [ ] AppSheet schema accepts optional `phone`
- [ ] All stale status code assertions removed/fixed
- [ ] `bun test` exits with 0 failures
