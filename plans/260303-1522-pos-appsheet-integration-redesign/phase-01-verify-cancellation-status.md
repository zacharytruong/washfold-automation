# Phase 01 — Verify POS Cancellation Status Code

**Status:** `completed`
**Priority:** High (blocks Phase 04 cancel handler)
**Type:** Research / manual verification

## Overview

The POS_STATUSES enum has no "CANCELLED" entry. Before implementing the cancellation handler, we must know the exact Pancake POS numeric status code for a cancelled order.

## Current POS Status Codes

```ts
POS_STATUSES = {
  NEW: 0,
  CONFIRMED: 1,
  SHIPPED: 2,
  RECEIVED: 3,
  RETURNED: 5,
  PACKAGING: 8,
  WAITING: 9,
}
```

## Steps

1. Check Pancake POS API documentation for full list of order status codes
2. Alternatively, trigger a test cancellation on a real order and observe the webhook payload (`status` field)
3. Check existing webhook logs in `/logs` endpoint for any cancellation events to identify the code
4. Confirm with `status_name` field in webhook payload (e.g., "Cancelled", "Hủy", etc.)

## Expected Output

- Confirmed numeric code for cancelled orders (e.g., `4` or `6`)
- Confirm `status_name` string for the cancelled state
- Update `POS_STATUSES` enum in `status-mapper.ts` with `CANCELLED: <code>`

## Related Files

- `src/utils/status-mapper.ts` — add CANCELLED to POS_STATUSES
- `src/schemas/pos-webhook.schema.ts` — verify status field accepts the cancel code
- `src/routes/webhook-pos.ts` — implement cancel handler after code is known

## Unresolved Questions

- Is "RETURNED (5)" equivalent to cancelled in this workflow? If so no new code needed.
- Does Pancake POS send a webhook when an order is cancelled, or is it a manual staff action?
