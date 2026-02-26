# System Architecture

**Last Updated:** 2026-02-26
**Current Phase:** 03 (Webhook Endpoints)

## System Overview

washfold-automation synchronizes order data across three platforms:
1. **Pancake POS** - Order management & status source
2. **Google Sheets** - Order tracking & data persistence
3. **Botcake/WhatsApp** - Customer notifications

## Data Flow Architecture

```
┌──────────────────┐
│  Pancake POS     │
│  (Orders)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│   Webhook Ingestion      │  ← Phase 3
│   (HMAC verification)    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│   Status Mapper          │  ← Phase 2
│   POS ↔ AppSheet         │
└────────┬─────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐  ┌──────────────────┐
│  Sheets │  │ Botcake/WhatsApp │
│ (Track) │  │ (Notify)         │
└─────────┘  └──────────────────┘
```

## Component Architecture

### Layer 1: Server & Routing
**File:** `src/index.ts`
**Responsibility:** HTTP server initialization, route registration

**Endpoints (Phase 03):**
- `GET /health` - Health check with timestamp
- `POST /webhook/pos` - POS order webhook with Zod validation, duplicate prevention, raw payload logging
- `POST /webhook/appsheet` - AppSheet status update with timing-safe secret comparison

### Layer 2: Services
**Directory:** `src/services/`
**Responsibility:** External API integration

#### Google Sheets Service
**File:** `src/services/google-sheets.ts`

| Function | Purpose | Returns |
|----------|---------|---------|
| `appendRow(orderData)` | Add order to tracking sheet | `void` (or error) |
| `findRowByOrderId(orderId)` | Locate order row | `SheetRowData \| null` |
| `updateStatus(orderId, status)` | Update order status cell | `boolean` |

**Authentication:** Service account JSON (OAuth2)
**Sheet Format:** Columns A-E (OrderNumber, EstimatedDelivery, DeliveryOption, Status, CustomerPhone)

#### Pancake POS Service
**File:** `src/services/pancake-pos.ts`

| Function | Purpose | Returns |
|----------|---------|---------|
| `updateOrderStatus(orderId, statusCode)` | Change order status in POS | `PosOrderUpdateResponse` |
| `getOrder(orderId)` | Retrieve order details | `unknown \| null` |

**API:** `https://pos.pages.fm/api/v1`
**Auth:** Bearer token (API key)
**Status Codes:** 0=NEW, 3=CONFIRMED, 8=PACKAGING, 9=WAITING, 11=SHIPPED, 12=RECEIVED, 20=RETURNED

#### Botcake (WhatsApp) Service
**File:** `src/services/botcake.ts`

| Function | Purpose | Returns |
|----------|---------|---------|
| `sendStatusNotification(phone, orderNumber, status, name?)` | Send WhatsApp message | `BotcakeResponse` |
| `formatPhoneToPsid(phone)` | Convert phone to PSID format | `string` |
| `isValidPhone(phone)` | Validate phone number | `boolean` |

**API:** `https://botcake.io/api/public_api/v1`
**Auth:** Access token header
**Format:** PSID = `wa_` + phone digits (e.g., `wa_84384123456`)

### Layer 3: Utilities
**Directory:** `src/utils/`
**Responsibility:** Data transformation, logging, cross-cutting concerns

#### Status Mapper
**File:** `src/utils/status-mapper.ts`

**Mappings:**
```
POS Code → AppSheet Status
0        → Pending
3        → Processing
11       → Delivering
12       → Delivered
[other]  → Unknown(code)  [pass-through]
```

| Function | Purpose |
|----------|---------|
| `posToAppSheet(code)` | Convert POS code to AppSheet status |
| `appSheetToPos(status)` | Convert AppSheet status to POS code |
| `isKnownPosStatus(code)` | Check if mapping exists |
| `getPosStatusName(code)` | Get human-readable name |

#### Logger
**File:** `src/utils/logger.ts`

**Database:** SQLite (single file: `logs.db`)
**Schema:**
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,  -- success, error, warning
  error TEXT
)
```

| Function | Purpose |
|----------|---------|
| `initLogger(dbPath?)` | Create/initialize logs table |
| `logEvent(input)` | Insert log entry, return ID |
| `getRecentLogs(limit)` | Fetch recent events |
| `getLogsByEventType(type, limit)` | Filter by event type |
| `getErrorLogs(limit)` | Fetch error entries only |
| `closeLogger()` | Close database connection |

**Event Types:**
- `sheets:append` - Order added to sheet
- `sheets:find` - Order lookup executed
- `sheets:update` - Order status updated
- `pos:update` - POS order status changed
- `pos:get` - POS order fetched
- `botcake:send` - WhatsApp message sent

### Layer 4: Configuration
**File:** `src/config.ts`

**Responsibility:** Environment validation, type-safe config access

| Function | Purpose |
|----------|---------|
| `getConfig()` | Get validated config (cached) |
| `getPort()` | Safe port retrieval (default: 3000) |
| `isDev()` | Check development mode |
| `validateConfig()` | Fail-fast validation at startup |

**Validation:** Throws error if required variables missing

## Data Structures

### Order Entity
```typescript
OrderData {
  orderNumber: string      // POS order ID
  estimatedDelivery: string  // Delivery date/time
  deliveryOption: string   // Delivery method
  status: string          // Current status (AppSheet format)
  customerPhone: string   // Customer WhatsApp number
}
```

### Log Entry
```typescript
LogEntry {
  id: number              // Auto-incremented
  timestamp: string       // ISO format
  eventType: string       // Component:action
  payload: string         // JSON-stringified data
  status: 'success'|'error'|'warning'
  error: string | null    // Error message if failed
}
```

## Error Handling Strategy

**Current (Phase 03):**
- Try-catch wraps all API calls
- Validation errors return HTTP 400 + Zod issue details
- Service errors logged with event payload and stack trace
- Global error handler returns 500 for unhandled exceptions
- All errors logged to SQLite with event type, payload, and error message
- No retry logic (Phase 4 concern)

**Error Flow:**
```
API Call → Catch Error → Log Event (error status)
         → Return/Throw to Caller
         → Caller handles response
```

## Type Safety

- **Strict TypeScript Mode** enforced in `tsconfig.json`
- **Interfaces** for all data structures (no `any` types)
- **Config validation** happens once at startup
- **Service responses** are typed (e.g., `PosOrderUpdateResponse`)

## Webhook Flow (Phase 3)

### POS Webhook: /webhook/pos
**Trigger:** Pancake POS order status change (e.g., Confirmed)

**Flow:**
1. POS sends webhook with order data (OrderNumber, Status, CustomerPhone, etc.)
2. Endpoint logs raw payload before validation
3. Zod schema validates payload structure
4. If status = Confirmed (3):
   - Extract order fields (OrderNumber, Gói dịch vụ, Delivery, Số lượng món, Đồ ướt, CustomerPhone)
   - Append row to Google Sheets with AppSheet status = "Arrived"
   - Store CustomerPhone for later WhatsApp lookup
5. If status = Shipped (11) or Delivered (12):
   - Find existing AppSheet row by OrderNumber
   - Update status to "Delivered"
6. Return 200 OK with event ID
7. Log event with payload, status, timing

**Security:** No authentication required (POS controls origin)

### AppSheet Webhook: /webhook/appsheet
**Trigger:** AppSheet status change via automation (e.g., Storage/Ready)

**Flow:**
1. AppSheet sends webhook with OrderNumber and Status
2. Endpoint extracts query param secret
3. Timing-safe comparison with WEBHOOK_SECRET (prevents timing attacks)
4. Log all status changes (for audit trail, even non-actionable ones)
5. If status = "Storage / Ready":
   - Retrieve CustomerPhone from Google Sheets lookup
   - Update POS order status to "Wait for pickup" (code 9)
   - Send WhatsApp notification via Botcake with order details
6. Return 200 OK
7. Log event with action taken

**Security:** HMAC timing-safe comparison on query param

## Integration Points

### Incoming (Phase 3 - Complete)
- **POS Webhooks:** `POST /webhook/pos` receives order updates, creates/updates AppSheet entries
- **AppSheet Webhooks:** `POST /webhook/appsheet` receives status updates, syncs to POS + WhatsApp
- **Manual Sync:** `POST /api/sync` triggers data synchronization

### Outgoing (Current - Phase 02)
- **Sheets API:** `spreadsheets.values.append()`, `.update()`, `.get()`
- **POS API:** PUT `/shops/{shopId}/orders/{orderId}`
- **Botcake API:** POST `/pages/{pageId}/flows/send_content`

## Security Considerations

- **Webhook Verification:** HMAC-SHA256 signature validation (Phase 3)
- **API Keys:** Stored in environment variables, never logged
- **Phone Numbers:** Validated before sending to Botcake
- **Service Account:** JSON key for Google Sheets (restricted scopes)

## Performance Characteristics

- **Sheet Operations:** Single request per operation (append, update, get)
- **POS Operations:** Single request per order
- **Botcake:** Single request per notification
- **Logging:** Synchronous writes to SQLite (non-blocking for now)
- **Service Caching:** Clients initialized once and reused

## Deployment Architecture

**Current:** Single process, all integrations in one service

**Future Considerations:**
- Database connection pooling for high volume
- Webhook queue for reliability
- Separate monitoring dashboard
- Rate limiting per API

## Related Documentation
- [Code Standards](./code-standards.md) - Implementation patterns
- [API Endpoints](./api-endpoints.md) - Route specifications
- [Codebase Summary](./codebase-summary.md) - File inventory
