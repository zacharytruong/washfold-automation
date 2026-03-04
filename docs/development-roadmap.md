# Development Roadmap

**Last Updated:** 2026-03-04
**Current Phase:** 06 (Integration Redesign - Complete)
**Overall Progress:** 100% Complete

---

## Phase Overview

```
Phase 01          Phase 02          Phase 03          Phase 04          Phase 05
Foundation        Core Services     Webhooks          Error Handling    Deploy
[████████]  →     [████████]   →    [████████]   →    [████████]   →    [████████]
Feb 14-25         Feb 25            Feb 26            Feb 26             Feb 26
Complete          Complete          Complete          Complete           Complete
```

---

## Phase 01: Foundation (✓ Complete)
**Dates:** Feb 14-25, 2026
**Status:** Complete
**Progress:** 100%

### Deliverables
- [x] Bun project initialization
- [x] Hono framework setup
- [x] TypeScript strict mode configuration
- [x] ESLint configuration (@antfu/eslint-config)
- [x] Type-safe environment configuration
- [x] Health check endpoints
- [x] README with setup instructions

### Key Decisions
- **Runtime:** Bun (fast, native TypeScript support)
- **Framework:** Hono (lightweight, route-based)
- **Type Safety:** Strict mode enforced
- **Code Quality:** ESLint + TypeScript strict

### Outcomes
- Clean project foundation
- Type-safe configuration management
- Ready for service implementation

---

## Phase 02: Core Services (✓ Complete)
**Dates:** Feb 25, 2026
**Status:** Complete
**Progress:** 100%

### Deliverables

#### Services (5 modules)
- [x] **Google Sheets Service** (`src/services/google-sheets.ts`)
  - Append rows to tracking sheet
  - Find orders by ID
  - Update order status
  - Service account authentication

- [x] **Pancake POS Service** (`src/services/pancake-pos.ts`)
  - Fetch order details
  - Update order status
  - Handle API errors

- [x] **Botcake WhatsApp Service** (`src/services/botcake.ts`)
  - Format phone to PSID
  - Validate phone numbers
  - Send status notifications
  - Vietnamese message templates

#### Utilities (2 modules)
- [x] **Status Mapper** (`src/utils/status-mapper.ts`)
  - Bidirectional POS ↔ AppSheet mapping
  - Handle unmapped statuses
  - Query helper functions

- [x] **Logger** (`src/utils/logger.ts`)
  - SQLite event persistence
  - Query by type/status
  - Error log retrieval

#### Tests (3 modules)
- [x] **Status Mapper Tests** (8 tests)
- [x] **Logger Tests** (15 tests)
- [x] **Botcake Tests** (8 tests)
- Total: 31 passing tests

### Key Decisions
- **Logging:** SQLite for reliability and queryability
- **Status Mapping:** Bidirectional with pass-through for unmapped
- **Error Handling:** Log-and-throw pattern for consistency
- **Testing:** Unit tests for all public APIs

### Code Review Results
- **Score:** 8/10
- **Issues Found:** 1 minor (untyped credentials parsing)
- **Code Quality:** Good error handling, consistent patterns

### Outcomes
- Core integration services ready
- Comprehensive test coverage
- SQLite logging infrastructure
- All operations auditable

---

## Phase 03: Webhook Integration (→ In Planning)
**Estimated Dates:** Feb 26-27, 2026
**Status:** Planned
**Expected Progress:** 70% → 100%

### Deliverables

#### Webhook Endpoint
- [ ] **POST /webhooks/pancake**
  - Accept order update events
  - HMAC-SHA256 signature verification
  - Parse POS order data
  - Trigger synchronization

#### Integration Logic
- [ ] **Order Sync Handler**
  - Convert POS status to AppSheet
  - Update Google Sheets
  - Send WhatsApp notification
  - Log transaction to SQLite

#### Error Handling
- [ ] **Failure Recovery**
  - Queue failed webhooks
  - Exponential backoff strategy
  - Detailed error logging
  - Manual retry endpoint

#### Security
- [ ] **HMAC Verification**
  - Signature validation before processing
  - Reject unsigned webhooks
  - Clear error messages for debugging

### Testing
- [ ] Unit tests for webhook handler
- [ ] HMAC signature validation tests
- [ ] Integration tests with real services
- [ ] Error scenario coverage

### Success Criteria
- [x] Webhook endpoint receives and validates requests
- [x] Orders sync from POS to Sheets automatically
- [x] WhatsApp notifications trigger on status change
- [x] All operations logged correctly

---

## Phase 04: Error Handling & Retry Logic (✓ Complete)
**Dates:** Feb 26, 2026
**Status:** Complete
**Progress:** 100%

### Deliverables

#### Retry Utility (Phase 4)
- [x] **src/utils/retry.ts** - Exponential backoff wrapper
  - Configurable max attempts (default: 3)
  - Configurable base delay (default: 1000ms)
  - Configurable max delay (default: 10000ms)
  - Exponential backoff: 2^(attempt-1) * baseDelay
  - Random jitter to prevent thundering herd
  - Logging of each attempt and exhaustion

#### Service Integration
- [x] **google-sheets.ts** - All operations wrapped with retry
  - `appendRow()` - retry on transient failures
  - `findRowByOrderId()` - retry on transient failures
  - `updateStatus()` - retry on transient failures

- [x] **pancake-pos.ts** - All operations wrapped with retry
  - `updateOrderStatus()` - retry on transient failures
  - `getOrder()` - retry on transient failures

- [x] **botcake.ts** - All operations wrapped with retry
  - `sendStatusNotification()` - retry on transient failures

#### Testing (Phase 4)
- [x] **src/__tests__/retry.test.ts** (7 tests)
  - Success on first attempt
  - Recovery on retry
  - Exhaustion after max attempts
  - Exponential backoff validation
  - Custom retry options
  - Non-Error throws handling

### Key Decisions
- **Exponential backoff:** Prevents server overload on recoverable failures
- **Jitter:** Prevents synchronized retries across multiple clients
- **Logging:** Each attempt logged for debugging and monitoring
- **Transparent:** Retry logic hidden inside withRetry wrapper

### Outcomes
- All transient API failures automatically retried
- 46 total tests passing (31 + 8 + 7)
- Production-ready error resilience

---

## Phase 05: Deployment & Containerization (✓ Complete)
**Dates:** Feb 26, 2026
**Status:** Complete
**Progress:** 100%
**Updated:** Mar 4, 2026 - Integration redesign implemented

### Deliverables

#### Docker Configuration
- [x] **Dockerfile**
  - Base image: `oven/bun:1.3.4` (lightweight, includes runtime)
  - Multi-layer build for dependency caching
  - Non-root user `bun` for security
  - Health check: Bun-based HTTP check to `/health`
  - Port: 3000 (internal)

#### Build Context
- [x] **.dockerignore**
  - Excludes: `node_modules`, `.env`, test files, documentation
  - Excludes: `.git`, git config, build artifacts
  - Size optimization for faster builds

#### Railway Deployment Configuration
- [x] **railway.toml**
  - Builder: Dockerfile
  - Health check path: `/health`
  - Health check timeout: 300s
  - Restart policy: On failure, max 3 retries
  - Service port: 3000 (internal)

#### Environment Management
- [x] Railway environment variable configuration
  - All sensitive config via environment
  - No hardcoded credentials
  - Supports POS, Botcake, Google Sheets, Webhooks

### Key Decisions
- **Bun container:** Lightweight, optimized for TypeScript runtime
- **Non-root user:** Security best practice
- **Health check:** Prevents traffic routing to unhealthy instances
- **Restart policy:** Automatic recovery from transient failures

### Deployment Process
1. Push to git repository
2. Railway detects changes
3. Build Docker image
4. Run health check
5. Deploy to production
6. Configure webhook URLs in POS & AppSheet

### Outcomes
- Production-ready containerized application
- Automated health checking
- Automatic restart on failure
- Support for Railway or any Docker-compatible platform

---

## Phase 06 Enhancement: POS ↔ AppSheet Integration Redesign (✓ Complete)
**Dates:** Mar 4, 2026
**Status:** Complete
**Progress:** 100%

### Changes Made

#### Google Sheets Schema Simplification
- **Before:** 7 columns (OrderNumber, EstimatedDelivery, DeliveryOption, Status, CustomerPhone, etc.)
- **After:** 3 columns (OrderNumber, Phone, Status)
- **Impact:** Cleaner schema, phone data now sourced from webhooks instead of lookups
- **File:** `src/services/google-sheets.ts`

#### POS Webhook Trigger Realignment
- **Before:** CONFIRMED (3) triggered order creation
- **After:** NEW (0) triggers order creation
- **Rationale:** Captures orders at earliest stage for immediate AppSheet sync
- **File:** `src/routes/webhook-pos.ts`

#### New Status Handlers
- Added: `shouldCancelAppSheetEntry()` - Handles POS CANCELLED (4) → mark row as "Cancelled"
- Added: `shouldMarkDelivered()` - Handles AppSheet "Delivery" → POS RECEIVED (3)
- Added: `getPosDeliveredCode()` - Returns RECEIVED code
- **File:** `src/utils/status-mapper.ts`

#### AppSheet Webhook Improvements
- **Added:** Optional `phone` field in webhook payload validation
- **Removed:** `getCustomerPhone()` Sheets lookup (eliminated dependency chain)
- **Change:** Phone now passed directly from AppSheet automation
- **Handlers:** Both STORAGE and Delivery handlers now support phone-based notifications
- **File:** `src/routes/webhook-appsheet.ts`, `src/schemas/appsheet-webhook.schema.ts`

#### Authentication Consistency
- POS webhook now uses same timing-safe secret verification as AppSheet
- Both webhooks: `timingSafeEqual(secret, config.webhookSecret)`
- **File:** `src/routes/webhook-pos.ts`

### Testing Impact
- All existing 60 tests still passing
- No new tests required (schema simplified, triggers clarified)
- Integration pattern: webhook → status check → Sheets operation → optional notification

### Documentation Updates
- Updated system architecture: webhook flows, schema changes, trigger logic
- Updated codebase summary: order data structures, module line counts
- This roadmap entry documents redesign decisions

---

## Parallel Considerations (All Phases)

### Documentation
- **Phase 01:** README, setup instructions ✓
- **Phase 02:** Code standards, architecture, API endpoints ✓
- **Phase 03:** Webhook integration guide ✓
- **Phase 04:** Error handling & retry patterns ✓
- **Phase 05:** Deployment & containerization ✓

### Code Quality
- **All Phases:** ESLint passes, TypeScript strict, tests passing
- **Code Review:** Required before merge
- **Test Coverage:** > 80% for critical paths

### Dependencies
- **Monitoring:** Phase 05 depends on Phase 04 API endpoints
- **Deployment:** Phase 05 depends on complete Phase 03+04
- **Dashboard:** Phase 04 API endpoints must be stable first

---

## Dependency Graph

```
Phase 01: Foundation
    ↓
Phase 02: Core Services
    ↓
Phase 03: Webhooks
    ↓
Phase 04: Retry & Error Handling ← (CURRENT)
    ↓
Phase 05: Deployment & Containerization
    ↓
Phase 06: Monitoring, Alerting, Production Hardening (PLANNED)
```

---

## Milestone Tracking

### Completed Milestones
- [x] **M1: Project Setup** (Feb 14-25)
  - Bun + Hono initialized
  - TypeScript configured
  - ESLint rules established

- [x] **M2: Integration Services** (Feb 25)
  - All 3 service modules implemented
  - Status mapper and logger complete
  - 31 tests passing

- [x] **M3: Real-time Sync** (Feb 26)
  - Webhook endpoints working
  - Orders syncing automatically
  - Customers receiving notifications
  - 8 webhook tests passing

- [x] **M4: Error Resilience** (Feb 26)
  - Retry logic with exponential backoff
  - All services wrapped with withRetry
  - 7 retry tests passing
  - 46 total tests passing

- [x] **M5: Production Ready** (Feb 26)
  - Dockerfile with Bun runtime
  - Railway deployment config
  - Health checks configured
  - Non-root user for security

### Upcoming Milestones
- [ ] **M6: Production Monitoring** (Planned)
  - Health check monitoring
  - Error rate tracking
  - API response time metrics
  - Alert rules for failures

- [ ] **M7: Developer APIs** (Planned)
  - Manual sync endpoint
  - Event query API
  - Order details API

- [ ] **M8: Dashboard & Analytics** (Planned)
  - Real-time order status view
  - Event history explorer
  - Error log viewer

---

## Known Issues & Backlog

### Current Phase (Phase 05)
- **Database Persistence:** SQLite logs stored in ephemeral filesystem
  - Impact: Logs lost on container restart
  - Fix: Mount persistent volume in production (Phase 06)

### Future Considerations
- **POS API Rate Limiting** (Phase 06)
  - May need queue for webhook processing
  - Decision: Implement if limits hit during production testing

- **Data Consistency** (Phase 06)
  - Manual sync endpoint needed for recovery
  - Idempotent operations required

- **Webhook Reliability** (Phase 06)
  - Queue implementation for offline resilience
  - Dead letter queue for failed webhooks

---

## Team Checklist

### Before Moving to Phase 06 (Production Monitoring)
- [x] Phase 05 deployment complete
- [x] All 46 tests passing
- [x] Retry logic tested
- [x] Docker image built and tested
- [x] Railway config validated
- [ ] Production environment ready
- [ ] Monitoring dashboards configured
- [ ] Alert rules defined
- [ ] On-call rotation established

---

## Related Documentation
- [Project Overview & PDR](./project-overview-pdr.md) - Requirements
- [System Architecture](./system-architecture.md) - Design details
- [Code Standards](./code-standards.md) - Implementation guidelines
- [API Endpoints](./api-endpoints.md) - Route specifications
