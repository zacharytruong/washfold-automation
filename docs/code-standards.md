# Code Standards & Codebase Structure

**Last Updated:** 2026-02-25
**Enforced By:** ESLint + TypeScript strict mode

## Directory Structure

```
washfold-automation/
├── src/
│   ├── index.ts                 # Hono server entry point
│   ├── config.ts                # Type-safe environment configuration
│   ├── services/                # External API integrations
│   │   ├── google-sheets.ts      # Sheets API wrapper
│   │   ├── pancake-pos.ts        # POS API wrapper
│   │   └── botcake.ts            # WhatsApp notifications
│   ├── utils/                   # Utilities & data transformations
│   │   ├── status-mapper.ts      # POS ↔ AppSheet status conversion
│   │   └── logger.ts             # SQLite event logging
│   └── __tests__/               # Unit tests
│       ├── status-mapper.test.ts
│       ├── logger.test.ts
│       └── botcake.test.ts
├── docs/                        # Documentation (this folder)
├── plans/                       # Implementation plans & reports
├── tsconfig.json                # TypeScript strict configuration
├── eslint.config.js             # ESLint rules (@antfu/eslint-config)
├── package.json                 # Dependencies & scripts
├── bun.lock                     # Dependency lock file
└── README.md                    # Project overview
```

## Naming Conventions

### Files
- **TypeScript files:** `kebab-case.ts` (e.g., `google-sheets.ts`, `status-mapper.ts`)
- **Test files:** `{module}.test.ts` (located in `__tests__/` directory)
- **Directories:** `kebab-case/` (e.g., `services/`, `utils/`)

### Functions & Variables
- **camelCase** for functions and variables
  ```typescript
  export function getOrder(orderId: string) { }
  export const sheetsClient: sheets_v4.Sheets | null = null
  ```

### Constants
- **UPPER_SNAKE_CASE** for constants
  ```typescript
  const BASE_URL = 'https://pos.pages.fm/api/v1'
  const POS_STATUSES = { NEW: 0, CONFIRMED: 3 }
  ```

### Interfaces & Types
- **PascalCase** for interfaces and types
  ```typescript
  interface OrderData { }
  type PosStatusCode = typeof POS_STATUSES[keyof typeof POS_STATUSES]
  ```

## TypeScript Strict Mode

All code follows TypeScript strict mode (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Requirements:**
- No `any` types without explicit `// @ts-expect-error` comment
- All function parameters must have type annotations
- Return types should be explicit (except arrow functions in obvious contexts)
- Handle null/undefined explicitly

### Example: Proper Type Safety
```typescript
// ✅ GOOD
export interface OrderData {
  orderNumber: string
  customerPhone: string
}

export async function appendRow(orderData: OrderData): Promise<void> {
  if (!orderData.orderNumber) {
    throw new Error('Order number required')
  }
}

// ❌ WRONG
export async function appendRow(orderData: any): Promise<any> {
  // No type safety
}
```

## Module Organization

### Service Modules
Each service follows this pattern:

```typescript
/**
 * Module description
 * External dependencies & authentication method
 */

import type { ReturnType } from 'library'
import { getConfig } from '../config.ts'
import { logEvent } from '../utils/logger.ts'

// Type definitions first
export interface ServiceResponse { }

// Client initialization with caching
let client: ServiceClient | null = null
function getClient(): ServiceClient { }

// Public functions with JSDoc
/**
 * Function description
 * @param param description
 * @returns description
 */
export async function publicFunction(param: Type): Promise<ReturnType> {
  try {
    // Implementation
    logEvent({ eventType: 'action', payload, status: 'success' })
  } catch (error) {
    logEvent({ eventType: 'action', payload, status: 'error', error: message })
    throw error
  }
}

// Private helper functions at bottom
function helperFunction(): void { }
```

### Utility Modules
Utilities export pure functions or constants without side effects:

```typescript
/**
 * Pure utility module description
 */

// Constants
export const CONSTANT_VALUE = 'value'

// Type definitions
export type UtilType = { }

// Public functions
export function transform(input: Type): ResultType {
  return result
}
```

## Error Handling

### All API Calls Must Be Wrapped
```typescript
try {
  const response = await fetch(url, { method: 'PUT', ... })
  logEvent({ eventType, payload, status: 'success' })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  logEvent({ eventType, payload, status: 'error', error: message })
  throw error  // Or return error response, depending on context
}
```

### Error Messages Are Logged
Every error must be logged with context:
- `eventType` - what operation (e.g., `sheets:update`, `pos:get`)
- `payload` - input data (e.g., orderId, parameters)
- `error` - human-readable message
- `status: 'error'`

### Return Types Indicate Success/Failure
```typescript
// Option 1: Response object with success flag
interface ApiResponse {
  success: boolean
  message?: string
}

// Option 2: Throw on error
async function updateOrder(id: string): Promise<void>

// Option 3: Return null on not found
async function findOrder(id: string): Promise<Order | null>
```

## Logging Strategy

All service operations log events to SQLite:

```typescript
logEvent({
  eventType: 'service:operation',  // Component:action format
  payload: { orderId, status },     // Input/context data
  status: 'success',                // success | error | warning
  error: 'error message if failed'
})
```

**Event Type Naming:** `{service}:{action}`
- `sheets:append` - Row added to sheet
- `sheets:update` - Cell updated
- `pos:update` - POS order status changed
- `botcake:send` - WhatsApp message sent

## Testing Patterns

### Unit Test Structure
```typescript
import { test, expect } from 'bun:test'
import { functionToTest } from '../module.ts'

test('should do X when given Y', () => {
  const result = functionToTest(input)
  expect(result).toBe(expected)
})

test('should handle error when Z', () => {
  expect(() => functionToTest(badInput)).toThrow()
})
```

### Coverage Requirements
- All public functions must have tests
- Test both happy path and error cases
- Use descriptive test names (should..., when...)
- Test edge cases (empty input, null, invalid format)

### Running Tests
```bash
bun test                    # Run all tests
bun test --watch           # Watch mode
bun test status-mapper     # Run specific file tests
```

## ESLint Configuration

ESLint configuration uses `@antfu/eslint-config`:
```bash
bun run lint       # Check for linting errors
bun run lint:fix   # Auto-fix fixable issues
```

### Key Rules Enforced
- No unused variables
- Consistent naming conventions
- No console.log in production code (use logger)
- Proper TypeScript types
- No `var` (use `let` or `const`)
- Trailing commas on multi-line constructs

### Ignoring Rules
Only in exceptional cases with comment:
```typescript
// eslint-disable-next-line rule-name
const result = someCode()
```

## Documentation Standards

### JSDoc Comments for Public APIs
```typescript
/**
 * Brief description of function
 *
 * Longer description if needed, explaining behavior and side effects
 *
 * @param orderId - The order ID to look up
 * @param status - New status to set (AppSheet format)
 * @returns true if update succeeded, false if order not found
 * @throws Error if API call fails
 */
export async function updateStatus(orderId: string, status: string): Promise<boolean>
```

### Module Header Comments
```typescript
/**
 * Google Sheets API wrapper for order data management
 * Uses service account authentication
 */
```

### Inline Comments for Complex Logic
```typescript
// Skip header row (index 0), data starts at index 1
for (let i = 1; i < rows.length; i++) {
  // Implementation
}
```

## Code Quality Guidelines

### Keep Functions Small
- Aim for < 30 lines per function
- Extract complex operations into separate functions
- One responsibility per function

### Use Descriptive Names
```typescript
// ✅ GOOD
function formatPhoneToPsid(phone: string): string
function isValidPhone(phone: string): boolean
const statusMessages: Record<string, string> = { }

// ❌ VAGUE
function format(p: string): string
function check(data: any): boolean
const messages: any = { }
```

### Avoid Deep Nesting
```typescript
// ✅ PREFER
if (!condition) return
// Rest of logic at normal indent

// ❌ AVOID
if (condition) {
  if (nested) {
    if (deeper) {
      // Logic buried
    }
  }
}
```

### Use Type Aliases for Complex Types
```typescript
export type PosStatusCode = typeof POS_STATUSES[keyof typeof POS_STATUSES]
type LogEventInput = { eventType: string; payload: unknown }
```

## Imports & Exports

### Import Order
```typescript
// 1. External libraries
import { google } from 'googleapis'
import { Database } from 'bun:sqlite'

// 2. Internal modules with relative paths
import { getConfig } from '../config.ts'
import { logEvent } from '../utils/logger.ts'

// 3. Types
import type { sheets_v4 } from 'googleapis'
```

### Named Exports for Functions
```typescript
// ✅ GOOD - Easy to find what's public
export function appendRow() { }
export interface OrderData { }
export const COLUMNS = { }

// ❌ AVOID - Unclear what's public
export default { appendRow, OrderData }
```

## Performance Considerations

- **Service Caching:** Initialize clients once, reuse (see `getClient()` patterns)
- **Synchronous Logging:** SQLite writes happen synchronously for reliability
- **Lazy Initialization:** Config and clients initialized on first use
- **No Blocking:** Event loop not blocked by I/O (all async operations)

## Security Guidelines

- **Never log API keys** - Use config getters, verify in code review
- **Validate inputs** - Phone numbers, order IDs before API calls
- **Type-safe queries** - Use parameterized statements for SQL
- **Error messages** - Don't expose internal stack traces to API responses
- **Webhook verification** - HMAC signature validation (Phase 3)

## Development Workflow

### Before Committing
```bash
bun run lint:fix        # Auto-fix linting issues
bun run typecheck       # Check TypeScript compilation
bun test                # Run all tests
```

### Commit Message Format
Use Conventional Commits:
```
type(scope): description

[optional body with details]

[optional footer: Fixes #123]
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `style`

Example:
```
feat(services): add google-sheets wrapper with CRUD operations
```

## Related Documentation
- [System Architecture](./system-architecture.md) - Component design
- [API Endpoints](./api-endpoints.md) - Route specifications
- [Codebase Summary](./codebase-summary.md) - File reference
