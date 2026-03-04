# Phase 04 — Update POS Webhook Handler

**Status:** `pending`
**Blocked by:** Phase 01 (cancel code), Phase 02 (status-mapper), Phase 03 (google-sheets)
**File:** `src/routes/webhook-pos.ts`

## Overview

Fix the POS webhook handler to:
1. Trigger on `NEW (0)` instead of `SHIPPED (2)`
2. Uncomment and fix `appendRow` with the simplified 3-col schema
3. Use `data.bill_phone_number` as the phone field
4. Remove debug `getColumnNames()` call
5. Add cancellation handler (after Phase 01 confirms the status code)

## Changes Required

### 1. Fix creation trigger (already wired to `shouldCreateAppSheetEntry`)
No change to the `if` condition — just fix `shouldCreateAppSheetEntry()` in Phase 02.
The route already calls `shouldCreateAppSheetEntry(data.status)`.

### 2. Fix `appendRow` call — uncomment and update
```ts
// OLD (commented out, 6 fields)
// await appendRow({
//   orderNumber: data.id,
//   goiDichVu: data.goi_dich_vu,
//   delivery: data.delivery,
//   soLuongMon: data.so_luong_mon,
//   doUot: data.do_uot,
//   customerPhone: data.customer_phone,
//   status: APPSHEET_STATUSES.ARRIVED,
// })

// NEW (3 fields only)
await appendRow({
  orderNumber: data.id,
  phone: data.bill_phone_number,
  status: APPSHEET_STATUSES.ARRIVED,
})
```

Note: `data.bill_phone_number` is already validated in `posWebhookSchema`.

### 3. Uncomment logEvent for creation success
```ts
logEvent({
  eventType: 'pos:webhook:created',
  payload: { orderNumber: data.id, status: APPSHEET_STATUSES.ARRIVED },
  status: 'success',
})
```

### 4. Remove `getColumnNames()` call
Delete the debug call entirely:
```ts
// DELETE this line:
await getColumnNames()
```
Also remove the `getColumnNames` import from `@/services/google-sheets`.

### 5. Add cancellation handler (after Phase 01)
```ts
// POS Cancelled → Mark AppSheet row as Cancelled
if (shouldCancelAppSheetEntry(data.status)) {
  try {
    const existing = await findRowByOrderNumber(data.id)
    if (existing) {
      await updateStatus(data.id, 'Cancelled')
      logEvent({
        eventType: 'pos:webhook:cancelled',
        payload: { orderNumber: data.id },
        status: 'success',
      })
    }
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logEvent({
      eventType: 'pos:webhook:cancelled',
      payload: { orderNumber: data.id },
      status: 'error',
      error: msg,
    })
    return c.json({ error: 'Failed to cancel AppSheet entry' }, 500)
  }
}
```

### 6. Remove / keep the old Shipped→Delivered block
The commented-out `shouldMarkAppSheetDelivered` block can be deleted entirely — that flow no longer exists (AppSheet now drives status, not POS).

### 7. Update imports
- Remove `getColumnNames` import
- Keep `findRowByOrderNumber`, `appendRow`
- Add `updateStatus` (needed for cancel handler)
- Add `shouldCancelAppSheetEntry` from status-mapper

## Flow After Changes

```
POS webhook received
  └─ status == NEW (0)
       ├─ duplicate check (findRowByOrderNumber)
       ├─ appendRow({ orderNumber, phone, status: 'Arrived' })
       └─ log success

  └─ status == CANCELLED (TBD)
       ├─ findRowByOrderNumber
       ├─ updateStatus(orderNumber, 'Cancelled')
       └─ log success

  └─ any other status → return { ok: true }
```

## Related Files

- `src/utils/status-mapper.ts` (Phase 02) — trigger functions
- `src/services/google-sheets.ts` (Phase 03) — appendRow, findRowByOrderNumber, updateStatus
- `src/__tests__/webhook-pos.test.ts` (Phase 06)

## Success Criteria

- [ ] `getColumnNames` removed (no import, no call)
- [ ] `appendRow` called with `{ orderNumber, phone, status }` (3 fields)
- [ ] Duplicate guard still works (findRowByOrderNumber check)
- [ ] Cancel handler implemented (pending Phase 01)
- [ ] Old Shipped/Delivered commented block deleted
- [ ] No TypeScript errors
