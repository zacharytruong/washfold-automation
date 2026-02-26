---
title: Phase 2 - Core Services
description: Implement service wrappers for Google Sheets, Pancake POS, Botcake, plus utilities and logger
status: complete
priority: high
effort: medium
branch: feat/phase-02
tags: [services, integration, logging, status-mapper]
created: 2026-02-25
completed: 2026-02-25
---

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
// POS status codes (only sync-relevant ones)
const POS_STATUSES = {
  CONFIRMED: 3,      // Triggers AppSheet entry creation
  WAIT_FOR_PICKUP: 9, // Set when AppSheet = "Storage / Ready"
  SHIPPED: 11,       // Triggers AppSheet "Delivered"
  DELIVERED: 12,     // Triggers AppSheet "Delivered"
} as const

// AppSheet workflow statuses
const APPSHEET_STATUSES = {
  ARRIVED: 'Arrived',
  WASHED: 'Washed',
  DRIED: 'Dried',
  FOLDED: 'Folded',
  STORAGE_READY: 'Storage / Ready',  // Triggers POS update
  DELIVERED: 'Delivered',
} as const

// Sync trigger functions (NOT bidirectional mapping)
shouldCreateAppSheetEntry(posCode: number): boolean  // true if posCode === 3
shouldUpdatePosStatus(appSheetStatus: string): boolean  // true if "Storage / Ready"
shouldMarkAppSheetDelivered(posCode: number): boolean  // true if 11 or 12
getPosWaitForPickupCode(): number  // returns 9
```
<!-- Updated: Validation Session 2 - New AppSheet statuses and conditional sync logic -->

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
// Arrival table columns (from POS):
// OrderNumber, Gói dịch vụ, Delivery, Số lượng món, Đồ ướt, Status
// Manual columns: Đối tác, PIC

interface ArrivalOrderData {
  orderNumber: number
  goiDichVu: 'Tiny 2kg' | '5kg' | 'Giày'
  delivery: 'Same-day Delivery' | 'Next-day Delivery' | 'No'
  soLuongMon: number
  doUot: boolean  // default false
  status: 'Arrived'  // always Arrived on creation
  customerPhone: string  // stored for WhatsApp lookup
}

// Functions:
appendArrivalRow(orderData: ArrivalOrderData): Promise<void>
updateStatus(orderNumber: number, status: string): Promise<void>
findByOrderNumber(orderNumber: number): Promise<RowData | null>
getCustomerPhone(orderNumber: number): Promise<string | null>  // For WhatsApp
```
<!-- Updated: Validation Session 2 - New Arrival table columns -->

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
- [ ] Add Zod schemas for all service function params in `src/schemas/`
- [ ] Rewrite `src/config.ts` with Zod z.object() schema
- [ ] Add safeParse validation to all exported functions
<!-- Updated: Validation Session 3 - Zod schemas for all service functions + config rewrite -->

## Success Criteria

- Status mapper converts correctly in both directions
- Logger writes events to SQLite file
- Google Sheets service authenticates and performs CRUD
- Pancake POS service updates order status
- Botcake service formats PSID and sends messages

## Next Steps

After completion, proceed to [Phase 3: Webhook Endpoints](./phase-03-webhook-endpoints.md)
