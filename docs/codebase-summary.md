# Codebase Summary

**Last Updated:** 2026-02-25
**Phase:** 02 (Core Services)
**Total LOC:** ~550 | **Files:** 10 core + 3 test

## Quick Navigation

- [Architecture Layers](#architecture-layers)
- [Module Inventory](#module-inventory)
- [Key Interfaces](#key-interfaces)
- [Common Patterns](#common-patterns)

## Architecture Layers

```
┌─────────────────────────────────┐
│   Hono Routes (Phase 3)         │  [Not yet implemented]
├─────────────────────────────────┤
│   Services Layer                 │  Google Sheets, Pancake POS, Botcake
├─────────────────────────────────┤
│   Utilities & Mappers            │  Status mapper, Logger
├─────────────────────────────────┤
│   Config & Environment           │  Type-safe configuration
└─────────────────────────────────┘
```

## Module Inventory

### Core Application
- **`src/index.ts`** (26 LOC) - Hono server entry point with `/` and `/health` routes
- **`src/config.ts`** (102 LOC) - Type-safe environment validation with fail-fast semantics

### Services Layer (Phase 02)
| Module | Lines | Purpose |
|--------|-------|---------|
| `src/services/google-sheets.ts` | 199 | Sheets API wrapper (append, update, find rows) |
| `src/services/pancake-pos.ts` | 115 | POS API wrapper (update order status, get order) |
| `src/services/botcake.ts` | 139 | WhatsApp notification via Botcake flows |

### Utilities Layer (Phase 02)
| Module | Lines | Purpose |
|--------|-------|---------|
| `src/utils/status-mapper.ts` | 94 | Bidirectional POS ↔ AppSheet status conversion |
| `src/utils/logger.ts` | 153 | SQLite event logging with query functions |

### Tests (Phase 02)
| Module | Tests | Coverage |
|--------|-------|----------|
| `src/__tests__/status-mapper.test.ts` | 8 | Mapper conversions & edge cases |
| `src/__tests__/logger.test.ts` | 15 | Logger initialization & queries |
| `src/__tests__/botcake.test.ts` | 8 | Phone validation & PSID formatting |

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

## Next Steps

- **Phase 3:** Webhook endpoints integration
- **Phase 4:** Error handling & retry logic
- **Phase 5:** Deployment & monitoring
