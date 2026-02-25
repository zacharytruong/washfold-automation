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

### Google Sheets
- **Columns:** OrderNumber, Estimated Delivery, DeliveryOption, Status, CustomerPhone
- **Auth:** Service Account with Sheets API enabled

### PSID Formatting
- Botcake PSID = `wa_{phone}` (e.g., phone `84384123456` → PSID `wa_84384123456`)
- Strip `+` from phone number before formatting

---

## Status Mapping

| POS Code | POS Status | AppSheet Status |
|----------|------------|-----------------|
| 0 | New | Pending |
| 3 | Confirmed | Processing |
| 11 | Shipped | Delivering |
| 12 | Received | Delivered |

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
- **Status:** Pending
- **Files:** `package.json`, `tsconfig.json`, `eslint.config.js`, `.env.example`, `src/config.ts`

### Phase 2: Core Services
- **Status:** Pending
- **Files:** `src/services/*.ts`, `src/utils/*.ts`

### Phase 3: Webhook Endpoints
- **Status:** Pending
- **File:** `src/index.ts`

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
