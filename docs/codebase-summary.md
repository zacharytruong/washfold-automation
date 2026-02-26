# Codebase Summary

**Last Updated:** 2026-02-26
**Phase:** 03 (Webhook Endpoints)
**Total LOC:** ~850 | **Files:** 16 core + 5 test

## Quick Navigation

- [Architecture Layers](#architecture-layers)
- [Module Inventory](#module-inventory)
- [Key Interfaces](#key-interfaces)
- [Common Patterns](#common-patterns)

## Architecture Layers

```
┌─────────────────────────────────┐
│   Hono Routes (Phase 3)         │  POST /webhook/pos, POST /webhook/appsheet
├─────────────────────────────────┤
│   Validation Schemas (Phase 3)   │  Zod schemas for POS & AppSheet payloads
├─────────────────────────────────┤
│   Services Layer (Phase 2)       │  Google Sheets, Pancake POS, Botcake
├─────────────────────────────────┤
│   Utilities (Phase 2-3)          │  Status mapper, Logger, Timing-safe comparison
├─────────────────────────────────┤
│   Config & Environment (Phase 1) │  Type-safe configuration
└─────────────────────────────────┘
```

## Module Inventory

### Core Application
- **`src/index.ts`** (85 LOC) - Hono server entry point with route handlers and global error handler
- **`src/config.ts`** (102 LOC) - Type-safe environment validation with fail-fast semantics

### Routes Layer (Phase 03)
| Module | Lines | Purpose |
|--------|-------|---------|
| `src/routes/webhook-pos.ts` | 78 | POST /webhook/pos handler with Zod validation |
| `src/routes/webhook-appsheet.ts` | 85 | POST /webhook/appsheet handler with timing-safe auth |

### Schemas Layer (Phase 03)
| Module | Lines | Purpose |
|--------|-------|---------|
| `src/schemas/pos-webhook.schema.ts` | 18 | Zod schema for POS webhook payload validation |
| `src/schemas/appsheet-webhook.schema.ts` | 14 | Zod schema for AppSheet webhook payload validation |

### Services Layer (Phase 02)
| Module | Lines | Purpose |
|--------|-------|---------|
| `src/services/google-sheets.ts` | 199 | Sheets API wrapper (append, update, find rows) |
| `src/services/pancake-pos.ts` | 115 | POS API wrapper (update order status, get order) |
| `src/services/botcake.ts` | 139 | WhatsApp notification via Botcake flows |

### Utilities Layer (Phase 02-03)
| Module | Lines | Purpose |
|--------|-------|---------|
| `src/utils/status-mapper.ts` | 94 | Bidirectional POS ↔ AppSheet status conversion |
| `src/utils/logger.ts` | 153 | SQLite event logging with query functions |
| `src/utils/timing-safe-equal.ts` | 12 | Timing-safe string comparison for webhook auth |

### Tests (Phase 02-03)
| Module | Tests | Coverage |
|--------|-------|----------|
| `src/__tests__/status-mapper.test.ts` | 8 | Mapper conversions & edge cases |
| `src/__tests__/logger.test.ts` | 15 | Logger initialization & queries |
| `src/__tests__/botcake.test.ts` | 8 | Phone validation & PSID formatting |
| `src/__tests__/webhook-pos.test.ts` | 4 | POS webhook validation & payload handling |
| `src/__tests__/webhook-appsheet.test.ts` | 4 | AppSheet webhook auth & status update |

**Total Tests:** 39 passing (Phase 2: 31 + Phase 3: 8)

## Key Interfaces

### Configuration
```typescript
interface Config {
  pancakeApiKey: string
  pancakeShopId: string
  botcakeAccessToken: string
  botcakePageId: string
  googleSheetsId: string
  googleServiceAccountJson: string
  webhookSecret: string
  port: number
}
```

### Order Data
```typescript
interface OrderData {
  orderNumber: string
  estimatedDelivery: string
  deliveryOption: string
  status: string
  customerPhone: string
}

interface SheetRowData extends OrderData {
  rowIndex: number  // 1-indexed for Sheets API
}
```

### Logging
```typescript
interface LogEventInput {
  eventType: string
  payload: unknown
  status: 'success' | 'error' | 'warning'
  error?: string | null
}

interface LogEntry {
  id: number
  timestamp: string
  eventType: string
  payload: string
  status: 'success' | 'error' | 'warning'
  error: string | null
}
```

## Common Patterns

### Error Handling
All service calls wrap operations in try-catch with event logging:
```typescript
try {
  // API call
  logEvent({ eventType, payload, status: 'success' })
} catch (error) {
  logEvent({ eventType, payload, status: 'error', error: message })
  throw error
}
```

### Service Initialization
Services initialize clients on first use and cache them:
```typescript
let client: Client | null = null
function getClient(): Client {
  if (client) return client
  client = initializeClient()
  return client
}
```

### Status Mapping
Bidirectional mapping with pass-through for unmapped statuses:
```typescript
posToAppSheet(0) → 'Pending'  // Mapped
appSheetToPos('Pending') → 0
posToAppSheet(999) → 'Unknown(999)'  // Unmapped pass-through
```

## Dependencies

**Production:**
- `hono` - Web framework
- `googleapis` - Google Sheets API client
- `bun:sqlite` - Built-in SQLite database

**Development:**
- `@antfu/eslint-config` - ESLint rules
- `@types/bun` - Bun type definitions
- `eslint` - Code linting

## Environment Variables

**Required (Phase 02):**
- `PANCAKE_API_KEY` - POS shop API token
- `PANCAKE_SHOP_ID` - Shop ID for API endpoints
- `BOTCAKE_ACCESS_TOKEN` - WhatsApp bot access token
- `BOTCAKE_PAGE_ID` - Botcake page identifier
- `GOOGLE_SHEETS_ID` - Spreadsheet ID
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Google service account JSON (minified)
- `WEBHOOK_SECRET` - HMAC secret for webhook verification

**Optional:**
- `PORT` (default: 3000) - Server port
- `NODE_ENV` - 'production' or 'development' (dev by default)

## Completed Phases

- **Phase 1 (Complete):** Project setup with Bun, Hono, ESLint, TypeScript strict mode
- **Phase 2 (Complete):** Core services (Google Sheets, Pancake POS, Botcake) + utilities + 31 tests
- **Phase 3 (Complete):** Webhook endpoints (POST /webhook/pos, POST /webhook/appsheet) with Zod validation + timing-safe auth + 8 new tests

## Next Steps

- **Phase 4:** Error handling & retry logic with exponential backoff
- **Phase 5:** Deployment to Railway with persistent SQLite volume
- **Phase 6:** Monitoring, alerting, and production hardening
