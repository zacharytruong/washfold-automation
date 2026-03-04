# Phase 02 — Update Status Mapper

**Status:** `pending`
**Priority:** High (foundation — routes depend on this)
**File:** `src/utils/status-mapper.ts`

## Overview

Update the status mapping layer to reflect new business flows. All route handlers derive their trigger logic from this module — change here, change everywhere cleanly.

## Changes Required

### 1. Fix `shouldCreateAppSheetEntry()`
```ts
// OLD — triggers on SHIPPED (2)
return posStatusCode === POS_STATUSES.SHIPPED

// NEW — triggers on NEW (0)
return posStatusCode === POS_STATUSES.NEW
```

### 2. Add `shouldMarkDelivered()`
New function for the "Delivery" AppSheet status:
```ts
export function shouldMarkDelivered(appSheetStatus: string): boolean {
  return appSheetStatus === APPSHEET_STATUSES.DELIVERED
}
```

### 3. Add `getPosDeliveredCode()`
```ts
export function getPosDeliveredCode(): number {
  return POS_STATUSES.RECEIVED // code 3
}
```

### 4. Add `shouldCancelAppSheetEntry()`
Blocked on Phase 01 — needs verified cancellation code:
```ts
export function shouldCancelAppSheetEntry(posStatusCode: number): boolean {
  return posStatusCode === POS_STATUSES.CANCELLED // TBD
}
```

### 5. Update APPSHEET_STATUSES
Add "Delivery" string constant:
```ts
APPSHEET_STATUSES = {
  ...existing,
  DELIVERY: 'Delivery',  // new — triggers POS Delivered
}
```

### 6. Update POS_STATUSES (after Phase 01)
Add CANCELLED code once verified.

### 7. Update/remove stale comments
- `shouldMarkAppSheetDelivered()` — review if still needed or can be removed
- Update JSDoc comments to reflect new trigger codes

## Related Files

- `src/routes/webhook-pos.ts` (Phase 04)
- `src/routes/webhook-appsheet.ts` (Phase 05)
- `src/__tests__/status-mapper.test.ts` (Phase 06)

## Success Criteria

- [ ] `shouldCreateAppSheetEntry(0)` returns `true`, `shouldCreateAppSheetEntry(2)` returns `false`
- [ ] `shouldMarkDelivered('Delivery')` returns `true`
- [ ] `shouldUpdatePosStatus('Lưu kho / STORAGE')` still returns `true`
- [ ] All exports compile without errors
