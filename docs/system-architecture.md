# System Architecture

**Last Updated:** 2026-02-26
**Current Phase:** 05 (Deployment)

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
**Responsibility:** Data transformation, logging, cross-cutting concerns, transient failure handling

#### Retry Handler (Phase 4)
**File:** `src/utils/retry.ts`

**Purpose:** Exponential backoff wrapper for all API calls

| Function | Purpose |
|----------|---------|
| `withRetry<T>(fn, context, options?)` | Execute async operation with retries |

**Configuration:**
- Max attempts: 3 (default, configurable)
- Base delay: 1000ms (configurable)
- Max delay: 10000ms (configurable)
- Backoff: Exponential (2^n) + random jitter

**Applied To:**
- All Google Sheets API calls
- All Pancake POS API calls
- All Botcake/WhatsApp API calls

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

## Error Handling & Retry Strategy (Phase 4)

**Current Implementation:**
- All API calls wrapped in `withRetry()` with exponential backoff
- Validation errors return HTTP 400 + Zod issue details
- Service errors logged with event payload and error message
- Each retry attempt logged for debugging
- Global error handler returns 500 for unhandled exceptions
- All operations (including retries) logged to SQLite

**Error Flow with Retry:**
```
API Call → withRetry wrapper
  Attempt 1 → Fail → Log retry:attempt → Sleep (1s + jitter)
  Attempt 2 → Fail → Log retry:attempt → Sleep (2s + jitter)
  Attempt 3 → Fail/Success
    - Success → Log success event
    - Fail → Log retry:exhausted → Throw error
         → Catch Error → Log Event (error status)
         → Return/Throw to Caller
```

**Backoff Calculation:**
```
Delay = min(baseDelay * 2^(attempt-1) + random(baseDelay), maxDelay)
Example: 1s, 2s, 4s (capped at 10s)
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

## Deployment Architecture (Phase 5)

### Docker Containerization
**File:** `Dockerfile`
- **Base Image:** `oven/bun:1.3.4` (lightweight, includes Bun runtime)
- **Build Strategy:** Multi-layer with lockfile caching
  1. Copy `package.json` + `bun.lock`
  2. Install production dependencies
  3. Copy source code
  4. Switch to non-root `bun` user
- **Health Check:** Bun-based check to `/health` endpoint (no curl dependency)
- **Port:** 3000 (internal)

### Railway Deployment
**File:** `railway.toml`
- **Builder:** Dockerfile
- **Health Check Path:** `/health`
- **Health Check Timeout:** 300s
- **Restart Policy:** On failure, max 3 retries
- **Service Port:** 3000 (internal)

### Docker Build Context
**File:** `.dockerignore`
- **Excluded:** `node_modules`, `.env`, test files, documentation
- **Included:** Source code, dependencies from lockfile

### Deployment Flow
```
Git Push → Railway detects change
        → Build Docker image
        → Run health check to /health endpoint
        → Deploy to production
        → Configure webhook URLs in POS & AppSheet
```

### Persistent State
- **Logs Database:** `logs.db` stored in ephemeral filesystem (acceptable for now)
- **Future:** Mount persistent volume for logs across deployments

### Environment Configuration
All sensitive config via Railway environment variables:
- `PANCAKE_API_KEY` - POS API token
- `PANCAKE_SHOP_ID` - Shop ID
- `BOTCAKE_ACCESS_TOKEN` - WhatsApp bot token
- `BOTCAKE_PAGE_ID` - Botcake page ID
- `GOOGLE_SHEETS_ID` - Spreadsheet ID
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Service account JSON
- `WEBHOOK_SECRET` - HMAC secret
- `PORT` - Server port (default: 3000)

### Future Considerations
- Database connection pooling for high volume
- Webhook queue for reliability
- Separate monitoring dashboard
- Rate limiting per API
- Persistent SQLite volume for production logs

## Related Documentation
- [Code Standards](./code-standards.md) - Implementation patterns
- [API Endpoints](./api-endpoints.md) - Route specifications
- [Codebase Summary](./codebase-summary.md) - File inventory
