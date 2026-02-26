---
title: Phase 3 - Webhook Endpoints
description: Implement Hono webhook endpoints for POS and AppSheet integrations with Zod validation and security features
status: complete
priority: high
effort: medium
branch: feat/phase-03
tags: [webhooks, validation, security, hono, zod]
created: 2026-02-26
completed: 2026-02-26
---

# Phase 3: Webhook Endpoints

## Context Links
- [Main Plan](./plan.md)
- [Phase 2: Core Services](./phase-02-core-services.md)

## Overview
- **Priority:** High
- **Status:** Complete
- **Description:** Implement Hono webhook endpoints for POS and AppSheet integrations
- **Completed:** 2026-02-26
- **Test Coverage:** 8 new tests (39 total with Phase 2)

## Requirements

### Functional
- POST /webhook/pos: Receive POS order, sync to Google Sheets
- POST /webhook/appsheet: Receive AppSheet status update, sync to POS + notify customer
- GET /health: Health check for Railway

### Non-functional
- Validate webhook payloads using Zod schemas with safeParse
- Return HTTP 400 + Zod error details on validation failure
- Return appropriate HTTP status codes
- Log all events (including raw payloads before validation)
<!-- Updated: Validation Session 3 - Zod validation with 400 + error details -->

## File to Modify

| File | Purpose |
|------|---------|
| `src/index.ts` | Hono app with all routes |

## Implementation Steps

### 1. Create Hono App (`src/index.ts`)

```typescript
import { Hono } from 'hono'
import { config } from './config'
import { googleSheets } from './services/google-sheets'
import { pancakePos } from './services/pancake-pos'
import { botcake } from './services/botcake'
import { statusMapper } from './utils/status-mapper'
import { logger } from './utils/logger'
```

### 2. Health Check Endpoint

```typescript
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))
```

### 3. POS Webhook Endpoint

```typescript
app.post('/webhook/pos', async (c) => {
  // 0. LOG RAW PAYLOAD FIRST (schema not verified yet)
  const rawPayload = await c.req.json()
  logger.logEvent('pos_webhook_raw', { payload: rawPayload })

  // 1. Check if status = Confirmed (3) → Create AppSheet entry
  if (shouldCreateAppSheetEntry(rawPayload.status)) {
    // 2. Extract: OrderNumber, Gói dịch vụ, Delivery, Số lượng món, Đồ ướt, CustomerPhone
    // 3. Append row to Google Sheets with status = "Arrived"
    // 4. Store CustomerPhone for WhatsApp lookup
  }

  // 5. Check if status = Shipped (11) or Delivered (12) → Update AppSheet to "Delivered"
  if (shouldMarkAppSheetDelivered(rawPayload.status)) {
    // Update existing AppSheet row status to "Delivered"
  }

  // 6. Log event and return 200
})
```
<!-- Updated: Validation Session 2 - Conditional triggers, not all statuses sync -->

Expected POS webhook payload (verify with actual):
```json
{
  "order_number": 12345,
  "customer_phone": "+84384123456",
  "goi_dich_vu": "5kg",
  "delivery": "Same-day Delivery",
  "so_luong_mon": 3,
  "do_uot": false,
  "status": 3
}
```

### 4. AppSheet Webhook Endpoint

```typescript
app.post('/webhook/appsheet', async (c) => {
  // 1. Verify webhook secret (query param or header)
  // 2. Parse: OrderNumber, Status
  const { order_number, status } = await c.req.json()

  // 3. LOG ALL STATUS CHANGES (for debugging)
  logger.logEvent('appsheet_status_change', { order_number, status })

  // 4. ONLY ACT if status = "Storage / Ready"
  if (shouldUpdatePosStatus(status)) {
    // 5. Get CustomerPhone from stored POS data
    const phone = await googleSheets.getCustomerPhone(order_number)
    // 6. Update POS order status to "Wait for pickup" (code 9)
    await pancakePos.updateOrderStatus(order_number, getPosWaitForPickupCode())
    // 7. Send WhatsApp notification via Botcake
    await botcake.sendStatusNotification(phone, order_number, 'Ready for pickup')
  }

  // 8. Return 200
})
```
<!-- Updated: Validation Session 2 - Only "Storage / Ready" triggers POS update + WhatsApp -->

Expected AppSheet webhook payload:
```json
{
  "order_number": 12345,
  "status": "Storage / Ready"
}
```

Auth: `?secret=WEBHOOK_SECRET` query param

### 5. Error Handling Middleware

```typescript
app.onError((err, c) => {
  logger.logEvent('error', { error: err.message, stack: err.stack })
  return c.json({ error: 'Internal server error' }, 500)
})
```

### 6. Start Server

```typescript
export default {
  port: config.PORT,
  fetch: app.fetch,
}
```

## Todo List

- [x] Create `src/index.ts` with Hono app
- [x] Implement GET /health
- [x] Implement POST /webhook/pos with Zod validation + raw payload logging
- [x] Implement POST /webhook/appsheet with timing-safe secret comparison
- [x] Add global error handling middleware
- [x] Create Zod schemas (pos-webhook.schema.ts, appsheet-webhook.schema.ts)
- [x] Create timing-safe comparison utility
- [x] Write comprehensive tests for both endpoints (8 tests)
- [x] Verify all 39 tests passing
- [x] Lint clean with ESLint

## Success Criteria

- `bun run dev` starts server
- GET /health returns 200 with JSON
- POST /webhook/pos creates row in Google Sheets
- POST /webhook/appsheet updates POS + sends WhatsApp notification
- Invalid requests return appropriate error codes
- All events logged to SQLite

## Security Considerations

- Validate WEBHOOK_SECRET on AppSheet endpoint
- Sanitize phone numbers before processing
- Log but don't expose internal errors to clients

## Next Steps

After completion, proceed to [Phase 4: Error Handling](./phase-04-error-handling.md)
