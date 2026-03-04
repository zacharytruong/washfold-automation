# Phase 05 — Update AppSheet Webhook Handler

**Status:** `completed`
**Blocked by:** Phase 02 (status-mapper), Phase 03 (google-sheets)
**Files:** `src/routes/webhook-appsheet.ts`, `src/schemas/appsheet-webhook.schema.ts`

## Overview

1. Add `phone` field to AppSheet webhook schema
2. Replace `getCustomerPhone` Sheets lookup with phone from payload
3. Add "Delivery" status handler (update POS to RECEIVED + botcake confirm)

## Changes Required

### 1. Update `appsheet-webhook.schema.ts`

```ts
// OLD
export const appsheetWebhookSchema = z.object({
  order_number: z.union([z.string(), z.number()]).transform(String),
  status: z.string().min(1),
})

// NEW
export const appsheetWebhookSchema = z.object({
  order_number: z.union([z.string(), z.number()]).transform(String),
  status: z.string().min(1),
  phone: z.string().optional(), // optional — not all statuses need it, but guard in handler
})
```

Note: `phone` is optional at schema level to avoid hard failures if AppSheet config lags behind code. The handler guards for its presence before sending notifications.

### 2. Update `webhook-appsheet.ts` — remove `getCustomerPhone` import
```ts
// DELETE this import:
import { getCustomerPhone } from '@/services/google-sheets.ts'
```

### 3. Use phone from payload in "Lưu kho / STORAGE" handler
```ts
// OLD
const phone = await getCustomerPhone(order_number)

// NEW — phone from destructured payload
const { order_number, status, phone } = result.data

// Notification block: use phone directly
if (posUpdateSuccess) {
  if (phone) {
    await sendStatusNotification(phone, order_number, 'Ready for pickup')
    logEvent({ eventType: 'appsheet:webhook:notification', payload: { order_number, phone: '***' }, status: 'success' })
  }
  else {
    logEvent({ eventType: 'appsheet:webhook:notification', payload: { order_number }, status: 'warning', error: 'Phone missing from payload, skipping notification' })
  }
}
```

### 4. Add "Delivery" status handler

After the existing "Lưu kho / STORAGE" block, add:

```ts
// AppSheet "Delivery" → Update POS to Delivered + confirm notification
if (shouldMarkDelivered(status)) {
  let posUpdateSuccess = false

  try {
    const posResult = await updateOrderStatus(order_number, getPosDeliveredCode())
    posUpdateSuccess = posResult.success
    if (!posResult.success) {
      logEvent({
        eventType: 'appsheet:webhook:pos_update',
        payload: { order_number, posStatusCode: getPosDeliveredCode() },
        status: 'error',
        error: posResult.message ?? 'POS update failed',
      })
    }
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logEvent({ eventType: 'appsheet:webhook:pos_update', payload: { order_number }, status: 'error', error: msg })
    return c.json({ error: 'Failed to update POS status to Delivered' }, 500)
  }

  if (posUpdateSuccess && phone) {
    try {
      await sendStatusNotification(phone, order_number, 'Delivered')
      logEvent({ eventType: 'appsheet:webhook:notification', payload: { order_number, phone: '***' }, status: 'success' })
    }
    catch (error) {
      // Non-fatal — log and continue
      const msg = error instanceof Error ? error.message : String(error)
      logEvent({ eventType: 'appsheet:webhook:notification', payload: { order_number }, status: 'error', error: msg })
    }
  }

  return c.json({ ok: true, action: posUpdateSuccess ? 'pos_delivered_and_notified' : 'pos_update_failed' })
}
```

### 5. Update imports from status-mapper
```ts
// ADD
import { shouldMarkDelivered, getPosDeliveredCode } from '@/utils/status-mapper.ts'
```

## Revised Handler Flow

```
AppSheet webhook received
  └─ status == "Lưu kho / STORAGE"
       ├─ update POS → WAITING (9)
       └─ botcake notify (phone from payload)

  └─ status == "Delivery"
       ├─ update POS → RECEIVED (3)
       └─ botcake confirm (phone from payload)

  └─ any other status → { ok: true, action: 'logged' }
```

## Related Files

- `src/schemas/appsheet-webhook.schema.ts` — add phone field
- `src/utils/status-mapper.ts` (Phase 02) — `shouldMarkDelivered`, `getPosDeliveredCode`
- `src/services/botcake.ts` — `sendStatusNotification` (unchanged)
- `src/services/pancake-pos.ts` — `updateOrderStatus` (unchanged)
- `src/__tests__/webhook-appsheet.test.ts` (Phase 06)

## Success Criteria

- [ ] Schema includes optional `phone` field
- [ ] `getCustomerPhone` import removed; no Sheets lookup in appsheet webhook
- [ ] "Lưu kho / STORAGE" handler uses `phone` from payload
- [ ] "Delivery" handler updates POS to RECEIVED (3) and calls botcake
- [ ] Both handlers log correctly on success/error/warning
- [ ] No TypeScript errors
