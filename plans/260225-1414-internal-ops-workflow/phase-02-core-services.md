# Phase 2: Core Services

## Context Links
- [Main Plan](./plan.md)
- [Phase 1: Project Setup](./phase-01-project-setup.md)

## Overview
- **Priority:** High
- **Status:** Complete
- **Description:** Implement service wrappers for Google Sheets, Pancake POS, Botcake, plus utilities
- **Completed:** 2026-02-25
- **Test Coverage:** 31 tests passing

## Requirements

### Functional
- Google Sheets: append rows, update status, find by order ID
- Pancake POS: update order status
- Botcake: send WhatsApp notifications
- Status mapper: bidirectional POS ↔ AppSheet conversion
- Logger: SQLite-based event logging

### Non-functional
- Type-safe interfaces
- Error handling with meaningful messages
- Reusable across endpoints

## Files to Create

| File | Purpose |
|------|---------|
| `src/utils/status-mapper.ts` | POS ↔ AppSheet status conversion |
| `src/utils/logger.ts` | SQLite logging |
| `src/services/google-sheets.ts` | Sheets API wrapper |
| `src/services/pancake-pos.ts` | POS API wrapper |
| `src/services/botcake.ts` | WhatsApp notification wrapper |

## Implementation Steps

### 1. Status Mapper (`src/utils/status-mapper.ts`)

```typescript
// POS status codes
const POS_STATUSES = {
  NEW: 0,
  CONFIRMED: 3,
  PACKAGING: 8,
  WAITING: 9,
  SHIPPED: 11,
  RECEIVED: 12,
  RETURNED: 20,
} as const

// AppSheet status strings
const APPSHEET_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
} as const

// Mapping functions
posToAppSheet(posCode: number): string  // Returns original code as string if unmapped
appSheetToPos(appSheetStatus: string): number | null  // Returns null if unmapped
isKnownPosStatus(posCode: number): boolean  // Check if status has AppSheet mapping
```
<!-- Updated: Validation Session 1 - Handle unmapped statuses gracefully with pass-through -->

### 2. Logger (`src/utils/logger.ts`)

Use Bun's built-in SQLite:
```typescript
import { Database } from 'bun:sqlite'

// Create logs table: id, timestamp, event_type, payload, status, error
// Functions: logEvent(), getRecentLogs()
```

### 3. Google Sheets Service (`src/services/google-sheets.ts`)

```typescript
import { google } from 'googleapis'

// Auth via service account JSON
// Functions:
appendRow(orderData: OrderData): Promise<void>
updateStatus(orderId: string, status: string): Promise<void>
findRowByOrderId(orderId: string): Promise<RowData | null>
```

### 4. Pancake POS Service (`src/services/pancake-pos.ts`)

```typescript
// PUT https://pos.pages.fm/api/v1/shops/{SHOP_ID}/orders/{ORDER_ID}
// Headers: Authorization with API key
// Body: { status: number }
updateOrderStatus(orderId: string, statusCode: number): Promise<void>
```

### 5. Botcake Service (`src/services/botcake.ts`)

```typescript
// POST https://botcake.io/api/public_api/v1/pages/{page_id}/flows/send_content
// Headers: access-token
formatPhoneToPsid(phone: string): string  // Strip +, prefix with wa_
sendStatusNotification(phone: string, orderNumber: string, status: string): Promise<void>
```

## Todo List

- [x] Create `src/utils/status-mapper.ts`
- [x] Create `src/utils/logger.ts` with SQLite
- [x] Create `src/services/google-sheets.ts`
- [x] Create `src/services/pancake-pos.ts`
- [x] Create `src/services/botcake.ts`
- [x] Add type definitions for all interfaces
- [x] Test each service individually

## Success Criteria

- Status mapper converts correctly in both directions
- Logger writes events to SQLite file
- Google Sheets service authenticates and performs CRUD
- Pancake POS service updates order status
- Botcake service formats PSID and sends messages

## Next Steps

After completion, proceed to [Phase 3: Webhook Endpoints](./phase-03-webhook-endpoints.md)
