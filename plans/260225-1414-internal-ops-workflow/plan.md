---
title: Internal Operations Workflow Integration
description: Middleware service to auto-sync POS orders → AppSheet and AppSheet status updates → POS + customer notifications
status: in-progress
priority: high
effort: 5-phase project
branch: feat/phase-03
tags: [integration, webhooks, automation, pos, appsheet, whatsapp]
created: 2026-02-25
updated: 2026-02-26
---

# Implementation Plan: Internal Operations Workflow Integration

## Context

**Problem:** Manual sync between Pancake POS orders and AppSheet workflow tracking causes delays and errors. Staff must manually update both systems.

**Solution:** Build middleware service to auto-sync POS orders → AppSheet and AppSheet status updates → POS + customer notifications.

**Brainstorm ref:** `plans/reports/brainstorm-260225-1333-internal-ops-workflow.md`

---

## Architecture

```
POS Order Created → Webhook → Middleware → Google Sheets (AppSheet reads)
AppSheet Status Update → Automation → Middleware → POS API + Botcake API
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Framework | Hono |
| Hosting | Railway (~$5/mo) |
| Logging | SQLite (local file) |
| Sheets | googleapis |
| Linting | ESLint + Prettier (@antfu/eslint-config) |

---

## API Reference

### Pancake POS
- **Base:** `https://pos.pages.fm/api/v1`
- **Auth:** API Key header
- **Update:** `PUT /shops/{SHOP_ID}/orders/{ORDER_ID}`
- **Statuses:** 0=New, 3=Confirmed, 8=Packaging, 9=Waiting, 11=Shipped, 12=Received, 20=Returned

### Botcake (WhatsApp)
- **Endpoint:** `POST https://botcake.io/api/public_api/v1/pages/{page_id}/flows/send_content`
- **Auth:** `access-token` header
- **Body:**
```json
{
  "psid": "wa_84xxxxxxxxx",
  "payload": { "user_full_name": "Customer" },
  "data": {
    "version": "v2",
    "content": {
      "messages": [{ "type": "text", "text": "Your order status: {{status}}" }]
    }
  }
}
```

### Google Sheets (AppSheet "Arrival" Table)
- **Columns:**
  - OrderNumber: number (from POS)
  - Gói dịch vụ: [Tiny 2kg, 5kg, Giày] (from POS)
  - Delivery: [Same-day Delivery, Next-day Delivery, No] (from POS)
  - Số lượng món: number (from POS)
  - Đồ ướt: boolean (from POS, default false)
  - Đối tác: [Vân Anh HBT, null] (manual)
  - PIC: string/email (manual)
  - Status: AppSheet workflow status
- **Auth:** Service Account with Sheets API enabled
- **Note:** CustomerPhone from POS data, stored separately for WhatsApp notifications

### PSID Formatting
- Botcake PSID = `wa_{phone}` (e.g., phone `84384123456` → PSID `wa_84384123456`)
- Strip `+` from phone number before formatting

---

## Status Mapping

### AppSheet Statuses (Workflow Order)
`Arrived` → `Washed` → `Dried` → `Folded` → `Storage / Ready` → `Delivered`

### POS Statuses
| Code | Status |
|------|--------|
| 3 | Confirmed |
| 9 | Wait for pickup |
| 11 | Shipped |
| 12 | Delivered |

### Sync Triggers (NOT bidirectional for all)
| Trigger | Action |
|---------|--------|
| POS Confirmed (3) | Create AppSheet entry with "Arrived" status |
| AppSheet "Storage / Ready" | Update POS to "Wait for pickup" (9) + WhatsApp notification |
| POS Shipped (11) OR Delivered (12) | Update AppSheet to "Delivered" |

---

## Project Structure

```
washfold-automation/
├── src/
│   ├── index.ts                    # Hono app entry + routes
│   ├── services/
│   │   ├── google-sheets.ts        # Sheets API wrapper
│   │   ├── pancake-pos.ts          # POS API wrapper
│   │   └── botcake.ts              # Botcake API wrapper
│   ├── utils/
│   │   ├── status-mapper.ts        # Bidirectional status mapping
│   │   └── logger.ts               # SQLite logging
│   └── config.ts                   # Environment config
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── eslint.config.js
```

---

## Implementation Phases

### Phase 1: Project Setup
- **Status:** Complete
- **Files:** `package.json`, `tsconfig.json`, `eslint.config.js`, `.env.example`, `src/config.ts`

### Phase 2: Core Services
- **Status:** Complete
- **Files:** `src/services/*.ts`, `src/utils/*.ts`
- **Tests:** 31 passing

### Phase 3: Webhook Endpoints
- **Status:** Complete
- **Files:** `src/index.ts`, `src/routes/webhook-pos.ts`, `src/routes/webhook-appsheet.ts`, `src/schemas/pos-webhook.schema.ts`, `src/schemas/appsheet-webhook.schema.ts`, `src/utils/timing-safe-equal.ts`
- **Tests:** 39 passing (31 from Phase 2 + 8 new webhook tests)

### Phase 4: Error Handling & Retry
- **Status:** Pending
- **Files:** Update all services

### Phase 5: Deployment
- **Status:** Pending
- **Files:** `Dockerfile`, `railway.toml`

---

## Phase Details

See individual phase files for detailed implementation steps:
- [Phase 1: Project Setup](./phase-01-project-setup.md)
- [Phase 2: Core Services](./phase-02-core-services.md)
- [Phase 3: Webhook Endpoints](./phase-03-webhook-endpoints.md)
- [Phase 4: Error Handling](./phase-04-error-handling.md)
- [Phase 5: Deployment](./phase-05-deployment.md)

---

## Environment Variables

```env
# Pancake POS
PANCAKE_API_KEY=your_api_key
PANCAKE_SHOP_ID=your_shop_id

# Botcake
BOTCAKE_ACCESS_TOKEN=your_token
BOTCAKE_PAGE_ID=waba_xxxxx

# Google Sheets
GOOGLE_SHEETS_ID=spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Security
WEBHOOK_SECRET=random_secret_for_appsheet
```

---

## Verification

1. **Unit test services**: Mock API responses, verify status mapping
2. **Local webhook testing**: Use `bun run dev` + ngrok
3. **POS → Sheets flow**: Create test order in POS, verify Sheets entry
4. **AppSheet → POS flow**: Update status in AppSheet, verify POS update + WhatsApp message
5. **Error scenarios**: Test API failures, verify retry and logging

---

## Pending Actions

- [ ] Create Google Cloud project + enable Sheets API
- [ ] Create service account + download JSON key
- [ ] Get Pancake API key from Settings
- [ ] Get Botcake access token from Settings → API
- [ ] Share Google Sheet with service account email
- [ ] Set up AppSheet automation to call webhook on status change

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| POS webhook format changes | Log raw payloads, validate schema |
| Rate limits on APIs | Implement backoff, queue if needed |
| Google Sheets concurrent writes | Use row-level locking via update |
| Invalid phone format | Validate/normalize before PSID conversion |

---

## Validation Log

### Session 1 — 2026-02-25
**Trigger:** Initial plan validation before implementation
**Questions asked:** 4

#### Questions & Answers

1. **[Assumptions]** The plan assumes a specific POS webhook payload format. Have you verified the actual Pancake POS webhook schema, or should we implement flexible parsing with raw payload logging first?
   - Options: Schema is verified | Not verified yet (Recommended) | Will provide sample payload
   - **Answer:** Not verified yet (Recommended)
   - **Rationale:** Must log raw payloads first to discover actual schema before hardcoding parsing logic

2. **[Architecture]** SQLite for logging won't persist on Railway (ephemeral filesystem). How should we handle logging?
   - Options: SQLite with Railway Volume (Recommended) | Console logs only | External service
   - **Answer:** SQLite with Railway Volume (Recommended)
   - **Rationale:** Persistent volume ensures logs survive deployments; ~$0.25/GB/mo is acceptable

3. **[Scope]** Status mapping is incomplete. POS has Packaging(8), Waiting(9), Returned(20) but plan only maps 4 statuses. How should unmapped statuses be handled?
   - Options: Add mappings now | Pass-through with logging (Recommended) | Ignore unmapped
   - **Answer:** Pass-through with logging (Recommended)
   - **Rationale:** Forward unmapped statuses as-is, log for review, iterate based on actual usage

4. **[Assumptions]** Do you have the required API credentials ready (Pancake API key, Botcake token, Google service account)?
   - Options: Yes, all ready | Partially ready | Not yet (Recommended)
   - **Answer:** Not yet (Recommended)
   - **Rationale:** Implement with mocks/stubs first, configure real credentials before deployment testing

#### Confirmed Decisions
- **POS parsing**: Flexible parsing with raw payload logging before structured extraction
- **Logging**: SQLite with Railway persistent volume
- **Status mapping**: Pass-through unmapped statuses with logging
- **Development approach**: Implement with mocks first, add real credentials later

#### Action Items
- [ ] Add raw payload logging to POS webhook endpoint
- [ ] Configure Railway volume for SQLite persistence
- [ ] Implement pass-through logic for unmapped status codes
- [ ] Create mock service implementations for local development

#### Impact on Phases
- Phase 2: Update status-mapper.ts to handle unmapped statuses gracefully
- Phase 3: Add raw payload logging before parsing in /webhook/pos
- Phase 5: Add Railway volume configuration for SQLite persistence

---

### Session 2 — 2026-02-26
**Trigger:** Re-validation with corrected workflow requirements
**Questions asked:** 6

#### Questions & Answers

1. **[Architecture]** The POS API uses numeric codes (3=Confirmed, 9=Waiting, 11=Shipped, 12=Received). Does 'Wait for pickup' map to code 9 (WAITING)?
   - Options: Yes, code 9 = Wait for pickup | Different code
   - **Answer:** Yes, code 9 = Wait for pickup
   - **Rationale:** Confirms POS status code mapping for "Wait for pickup" status

2. **[Scope]** When POS order is 'Confirmed' (code 3), should ONLY 'Confirmed' trigger AppSheet entry creation, or also other statuses?
   - Options: Only Confirmed (Recommended) | Multiple statuses
   - **Answer:** Only Confirmed (Recommended)
   - **Rationale:** Prevents duplicate entries; only initial confirmation creates AppSheet record

3. **[Architecture]** Should we send WhatsApp notification when updating POS to 'Wait for pickup'?
   - Options: Yes, notify customer (Recommended) | No notification | Different notification trigger
   - **Answer:** Yes, notify customer (Recommended)
   - **Rationale:** Customer needs to know order is ready for pickup

4. **[Architecture]** When POS changes to 'Shipped' or 'Delivered', AppSheet becomes 'Delivered'. Should both statuses trigger this?
   - Options: Both trigger 'Delivered' | Only Delivered | Different handling
   - **Answer:** Both trigger 'Delivered'
   - **Rationale:** Either shipping or final delivery marks order complete in AppSheet

5. **[Data]** What AppSheet fields can be auto-filled from POS vs manual input?
   - Options: Only OrderNumber auto-filled | OrderNumber + Delivery auto-filled | I'll specify field mapping
   - **Answer:** User specified field mapping
   - **Custom input:** POS provides: OrderNumber, Delivery, Gói dịch vụ, Số lượng món, Đồ ướt (default false). Manual: PIC, Đối tác
   - **Rationale:** Defines exact data flow from POS to AppSheet

6. **[Logging]** Should webhook log non-actionable AppSheet status changes (Arrived→Washed→Dried→Folded)?
   - Options: Yes, log all changes (Recommended) | Only log actionable changes
   - **Answer:** Yes, log all changes (Recommended)
   - **Rationale:** Enables debugging and audit trail without triggering POS updates

#### Confirmed Decisions
- **POS code mapping:** Code 9 = "Wait for pickup"
- **Entry trigger:** Only POS Confirmed (3) creates AppSheet entry
- **Notification:** WhatsApp sent when POS updated to "Wait for pickup"
- **Delivered sync:** Both POS Shipped (11) and Delivered (12) → AppSheet "Delivered"
- **Phone storage:** CustomerPhone from POS, stored for WhatsApp lookup
- **Logging:** Log all AppSheet changes, act only on "Storage / Ready"

#### Action Items
- [ ] Rewrite status-mapper.ts with new AppSheet statuses and conditional sync logic
- [ ] Update google-sheets.ts for new Arrival table columns
- [ ] Update webhook handlers for new sync triggers (not bidirectional)
- [ ] Store CustomerPhone separately for WhatsApp notifications

#### Impact on Phases
- Phase 2: Complete rewrite of status-mapper.ts with new statuses; update google-sheets.ts columns
- Phase 3: Rewrite webhook logic—POS webhook only on Confirmed, AppSheet webhook only acts on "Storage / Ready"

---

### Session 3 — 2026-02-26
**Trigger:** Adding Zod schema validation across all functions before Phase 3 implementation
**Questions asked:** 4

#### Questions & Answers

1. **[Scope]** Zod can validate both webhook payloads (external input) and internal function params. Where should Zod validation be applied?
   - Options: Webhook payloads only (Recommended) | All functions with params | Webhooks + service public APIs
   - **Answer:** All functions with params
   - **Rationale:** Full runtime validation on every exported function ensures type safety beyond TypeScript compile-time checks

2. **[Architecture]** Config validation currently uses manual getEnvVar() checks. Should config.ts also be rewritten with Zod?
   - Options: Yes, replace with Zod (Recommended) | No, keep current approach
   - **Answer:** Yes, replace with Zod
   - **Rationale:** Zod schema replaces manual getEnvVar/getEnvVarAsNumber, providing consistent validation pattern and cleaner typed output

3. **[Architecture]** Where should Zod schemas live in the project structure?
   - Options: src/schemas/ directory (Recommended) | Inline in each service file | Single src/schemas.ts file
   - **Answer:** src/schemas/ directory
   - **Rationale:** Dedicated folder keeps schemas colocated and organized by domain (pos-webhook, appsheet-webhook, config, etc.)

4. **[Architecture]** How should Zod validation errors be handled in webhook endpoints?
   - Options: 400 + Zod error details (Recommended) | 400 + generic message | 200 + log warning
   - **Answer:** 400 + Zod error details
   - **Rationale:** Return HTTP 400 with formatted Zod issues for debugging. Log raw payload + validation errors for audit trail.

#### Confirmed Decisions
- **Validation scope:** All exported functions with params get Zod schemas + safeParse
- **Config rewrite:** Replace manual getEnvVar() with Zod z.object() schema
- **Schema location:** `src/schemas/` directory with per-domain files
- **Error handling:** 400 + Zod error details on webhook validation failure, log raw payload

#### Action Items
- [ ] Install zod dependency (`bun add zod`)
- [ ] Create `src/schemas/` directory with domain schema files
- [ ] Add Zod schemas for all service function params (pancake-pos, google-sheets, botcake)
- [ ] Rewrite `src/config.ts` to use Zod for env validation
- [ ] Add Zod schemas for webhook payloads (POS, AppSheet) in Phase 3
- [ ] Update `docs/code-standards.md` with Zod validation patterns
- [ ] Add safeParse to all exported functions

#### Impact on Phases
- Phase 2: Add Zod schemas to all service functions (pancake-pos.ts, google-sheets.ts, botcake.ts, status-mapper.ts); rewrite config.ts with Zod
- Phase 3: Add webhook payload Zod schemas; return 400 + Zod error details on validation failure
- Docs: Update code-standards.md with Zod validation section and schema patterns
