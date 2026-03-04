# System Architecture

**Last Updated:** 2026-03-04
**Current Phase:** 06 (Integration Redesign)

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

**Endpoints (Phase 06):**
- `GET /` - Root status check (ok)
- `GET /health` - Health check with timestamp
- `GET /logs/recent` - Fetch recent logs (auth required, Phase 06)
- `GET /logs/errors` - Fetch error logs only (auth required, Phase 06)
- `GET /logs/type/:type` - Fetch logs by event type (auth required, Phase 06)
- `POST /webhook/pos` - POS order webhook with Zod validation, duplicate prevention, raw payload logging
- `POST /webhook/appsheet` - AppSheet status update with timing-safe secret comparison

### Layer 1.5: Middleware
**Directory:** `src/middleware/`
**Responsibility:** Request/response cross-cutting concerns

#### Log Viewer Auth Middleware
**File:** `src/middleware/auth-log-viewer.ts`

**Purpose:** Bearer token authentication for log viewer endpoints

| Function | Responsibility |
|----------|-----------------|
| `authLogViewer(c, next)` | Validate Bearer token; skip in dev if secret not configured; return 403 in prod if unconfigured |

**Behavior:**
- **Production + no secret:** 403 error
- **Development + no secret:** Skip auth (call `next()`)
- **Missing Bearer header:** 401 error
- **Invalid token:** 401 error (timing-safe comparison)
- **Valid token:** Continue to handler

**Token Format:** Plain string (LOG_VIEWER_SECRET environment variable)

### Layer 2: Services
**Directory:** `src/services/`
**Responsibility:** External API integration

#### Google Sheets Service
**File:** `src/services/google-sheets.ts`

| Function | Purpose | Returns |
|----------|---------|---------|
| `appendRow(orderData)` | Add order to tracking sheet | `void` (or error) |
| `findRowByOrderNumber(orderNumber)` | Locate order row | `AppSheetRowData \| null` |
| `updateStatus(orderNumber, status)` | Update order status cell | `boolean` |

**Authentication:** Service account JSON (OAuth2)
**Sheet Format:** Columns A-C (OrderNumber, Phone, Status) - simplified 3-col schema

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

**Key Triggers:**
- `shouldCreateAppSheetEntry(code)` - Returns true for POS NEW(0)
- `shouldCancelAppSheetEntry(code)` - Returns true for POS CANCELLED(4)
- `shouldMarkDelivered(status)` - Returns true for AppSheet "Delivery"
- `shouldUpdatePosStatus(status)` - Returns true for AppSheet "Lưu kho / STORAGE"

| Function | Purpose |
|----------|---------|
| `getPosDeliveredCode()` | Get POS code for delivered state (RECEIVED = 3) |
| `getPosWaitForPickupCode()` | Get POS code for wait state (WAITING = 9) |
| `getPosStatusName(code)` | Get human-readable name |
| `getAllPosStatusCodes()` | Get all valid POS status codes |

#### Log Viewer Routes
**File:** `src/routes/logs.ts`

**Purpose:** Handler functions for log query endpoints (Phase 06)

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `handleRecentLogs(c)` | GET /logs/recent | Return recent logs with limit (clamped 1-500) |
| `handleErrorLogs(c)` | GET /logs/errors | Return error-status logs only |
| `handleLogsByType(c)` | GET /logs/type/:type | Return logs filtered by event type |

**Limit Handling:**
- Default: 50
- Min: 1, Max: 500
- Invalid/missing: Falls back to 50

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
| `getRecentLogs(limit)` | Fetch recent events (ordered by timestamp DESC) |
| `getLogsByEventType(type, limit)` | Filter by event type, ordered by timestamp DESC |
| `getErrorLogs(limit)` | Fetch error entries only, ordered by timestamp DESC |
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

**Validation:**
- Required variables throw error if missing at startup
- Optional: LOG_VIEWER_SECRET (allows auth-free log viewing in dev mode)

**Config Properties (Phase 06):**

| Property | Required | Purpose |
|----------|----------|---------|
| `pancakeApiKey` | Yes | POS API token |
| `pancakeShopId` | Yes | Shop identifier |
| `botcakeAccessToken` | Yes | WhatsApp bot token |
| `botcakePageId` | Yes | Botcake page ID |
| `googleSheetsId` | Yes | Spreadsheet identifier |
| `googleServiceAccountJson` | Yes | Google auth JSON |
| `webhookSecret` | Yes | HMAC secret for webhooks |
| `logViewerSecret` | No | Bearer token for /logs/* endpoints |
| `port` | No | Server port (default: 3000) |

## Data Structures

### Order Entity
```typescript
AppSheetOrderData {
  orderNumber: string      // POS order ID (from data.id)
  phone: string           // Customer WhatsApp number
  status: string          // Current status (AppSheet format)
}

AppSheetRowData extends AppSheetOrderData {
  rowIndex: number        // 1-indexed row in Google Sheets
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
**Trigger:** Pancake POS order status change

**Flow:**
1. POS sends webhook with order data (id, status, bill_phone_number, etc.)
2. Verify webhook secret (query param) with timing-safe comparison
3. Log raw payload before validation
4. Zod schema validates payload structure
5. If status = NEW (0):
   - Check for duplicate (prevent POS retry duplicates)
   - Append row to Google Sheets: OrderNumber, Phone, Status="Arrived"
6. If status = CANCELLED (4):
   - Find existing AppSheet row by OrderNumber
   - Update status to "Cancelled"
7. Return 200 OK
8. Log event with payload, status, timing

**Security:** HMAC timing-safe comparison on webhook_secret query param

### AppSheet Webhook: /webhook/appsheet
**Trigger:** AppSheet status change via automation

**Flow:**
1. AppSheet sends webhook with OrderNumber, Status, and optional Phone
2. Verify webhook secret (query param) with timing-safe comparison
3. Log raw payload before validation
4. Zod schema validates payload structure (phone field optional)
5. Log all status changes (for audit trail, even non-actionable ones)
6. If status = "Lưu kho / STORAGE":
   - Update POS order status to "Wait for pickup" (code 9)
   - If phone present in payload: Send WhatsApp notification via Botcake
   - Log notification result (non-fatal failure)
7. If status = "Delivery":
   - Update POS order status to "Received/Delivered" (code 3)
   - If phone present in payload: Send WhatsApp notification via Botcake
   - Log notification result (non-fatal failure)
8. Return 200 OK
9. Log event with action taken

**Security:** HMAC timing-safe comparison on webhook_secret query param
**Phone Resolution:** Retrieved from AppSheet webhook payload (not Sheets lookup)

## Integration Points

### Incoming (Phase 03-06 - Complete)
- **POS Webhooks:** `POST /webhook/pos` receives order updates, creates/updates AppSheet entries
- **AppSheet Webhooks:** `POST /webhook/appsheet` receives status updates, syncs to POS + WhatsApp
- **Log Viewer:** `GET /logs/*` queries SQLite for operational visibility (Phase 06)

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
**Required (Phase 02-05):**
- `PANCAKE_API_KEY` - POS API token
- `PANCAKE_SHOP_ID` - Shop ID
- `BOTCAKE_ACCESS_TOKEN` - WhatsApp bot token
- `BOTCAKE_PAGE_ID` - Botcake page ID
- `GOOGLE_SHEETS_ID` - Spreadsheet ID
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Service account JSON
- `WEBHOOK_SECRET` - HMAC secret for webhook verification

**Optional (Phase 06):**
- `LOG_VIEWER_SECRET` - Bearer token for log viewer endpoints (auth skipped in dev if not set, 403 in prod)

**Server:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - 'production' or 'development' (controls auth behavior)

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
