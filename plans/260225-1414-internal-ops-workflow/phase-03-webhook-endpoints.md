# Phase 3: Webhook Endpoints

## Context Links
- [Main Plan](./plan.md)
- [Phase 2: Core Services](./phase-02-core-services.md)

## Overview
- **Priority:** High
- **Status:** Pending
- **Description:** Implement Hono webhook endpoints for POS and AppSheet integrations

## Requirements

### Functional
- POST /webhook/pos: Receive POS order, sync to Google Sheets
- POST /webhook/appsheet: Receive AppSheet status update, sync to POS + notify customer
- GET /health: Health check for Railway

### Non-functional
- Validate webhook payloads
- Return appropriate HTTP status codes
- Log all events

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
  // 1. Parse order data from POS webhook (flexible extraction)
  // 2. Extract: OrderNumber, CustomerPhone, EstimatedDelivery, DeliveryOption, Status
  // 3. Map POS status → AppSheet status (pass-through if unmapped)
  // 4. Append row to Google Sheets
  // 5. Log event with mapping result
  // 6. Return 200
})
```
<!-- Updated: Validation Session 1 - Log raw payload before parsing, schema unverified -->
```

Expected POS webhook payload (verify with actual):
```json
{
  "order_id": "123",
  "order_number": "WF-001",
  "customer_phone": "+84384123456",
  "estimated_delivery": "2026-02-26",
  "delivery_option": "pickup",
  "status": 0
}
```

### 4. AppSheet Webhook Endpoint

```typescript
app.post('/webhook/appsheet', async (c) => {
  // 1. Verify webhook secret (query param or header)
  // 2. Parse: OrderNumber, Status, CustomerPhone
  // 3. Map AppSheet status → POS status code
  // 4. Update POS order status
  // 5. Send WhatsApp notification via Botcake
  // 6. Log event
  // 7. Return 200
})
```

Expected AppSheet webhook payload:
```json
{
  "order_number": "WF-001",
  "status": "Processing",
  "customer_phone": "84384123456"
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

- [ ] Create `src/index.ts` with Hono app
- [ ] Implement GET /health
- [ ] Implement POST /webhook/pos
- [ ] Implement POST /webhook/appsheet with secret validation
- [ ] Add error handling middleware
- [ ] Test endpoints with curl/httpie
- [ ] Verify logging works

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
