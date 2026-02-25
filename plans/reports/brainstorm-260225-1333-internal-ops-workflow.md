# Brainstorm Summary: Internal Operations Workflow Integration

**Date:** 2026-02-25
**Status:** Finalized
**Volume:** <1000 orders/day

---

## Problem Statement

Integrate existing business tools (Botcake, Pancake POS, AppSheet) to enable:
1. **POS → AppSheet sync**: Auto-create entry when order created in POS
2. **AppSheet → POS + Customer**: Update POS order status + notify customer via WhatsApp when staff updates status

## Existing Stack

| Tool | Purpose | Integration Method |
|------|---------|-------------------|
| Botcake | WhatsApp automation | REST/HTTP API |
| Pancake POS | Order management | Webhooks + REST API |
| AppSheet | Staff UI/workflow | Google Sheets backend + Automation |

---

## Recommended Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     INBOUND FLOW (Order Created)                │
├─────────────────────────────────────────────────────────────────┤
│  Pancake POS ──webhook──▶ Hono API ──▶ Google Sheets API        │
│                          (POST /webhook/pos)    (append row)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   OUTBOUND FLOW (Status Update)                 │
├─────────────────────────────────────────────────────────────────┤
│  AppSheet ──automation──▶ Hono API ──┬──▶ Pancake POS API       │
│  (on status change)     (POST /webhook│   (update order)        │
│                          /appsheet)   │                         │
│                                       └──▶ Botcake API          │
│                                           (send message)        │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology | Cost/Month | Rationale |
|-----------|------------|------------|-----------|
| Runtime | Bun | Free | Fast TS runtime, built-in test runner |
| Framework | Hono | Free | Lightweight, fast, Cloudflare-compatible |
| Hosting | Railway | ~$5 | Auto-deploy, scales, good free tier |
| Logging | SQLite (Turso) | Free tier | Simple, no separate DB server |
| Sheets API | googleapis | Free | Official client, well-documented |
| Linting | ESLint + Prettier | Free | Code quality + consistent formatting |
| Config | @antfu/eslint-config | Free | Opinionated, Prettier-integrated |

### Project Structure

```
washfold-automation/
├── src/
│   ├── index.ts                # Hono app entry
│   ├── routes/
│   │   ├── pos-webhook.ts      # POST /webhook/pos
│   │   └── appsheet-webhook.ts # POST /webhook/appsheet
│   ├── services/
│   │   ├── google-sheets.ts    # Sheets API wrapper
│   │   ├── pancake-pos.ts      # POS API wrapper
│   │   └── botcake.ts          # Botcake API wrapper
│   ├── utils/
│   │   ├── status-mapper.ts    # POS ↔ AppSheet status mapping
│   │   └── logger.ts           # SQLite logging
│   └── config.ts               # Environment variables
├── package.json
├── Dockerfile                  # Railway deployment
├── .env.example
├── eslint.config.js
└── biome.json / prettier.config.js
```

---

## Key Design Decisions

### 1. Stateless Middleware
- No complex database. SQLite for logging only.
- Google Sheets = single source of truth
- Simplifies deployment and maintenance

### 2. Status Mapping (Configurable)
```typescript
// utils/status-mapper.ts
const STATUS_MAP: Record<string, { appsheet: string; pos: string }> = {
  'new': { appsheet: 'Pending', pos: 'NEW' },
  'processing': { appsheet: 'In Progress', pos: 'PROCESSING' },
  'delivered': { appsheet: 'Delivered', pos: 'COMPLETED' },
  // ... user will provide exact mappings
}
```

### 3. Webhook Security
- Verify POS webhook signatures (check Pancake docs)
- AppSheet: Use secret token in webhook URL
- Rate limiting via Hono middleware

### 4. Error Handling
- Retry failed API calls (3 attempts, exponential backoff)
- Log all failures to SQLite for debugging
- Return appropriate HTTP status codes

### 5. Idempotency
- Deduplicate by order ID + timestamp
- Prevent duplicate Sheets entries on webhook retries

---

## Evaluated Alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Custom Hono/Bun** | Full control, cheap ($5/mo), exactly fits needs | Requires maintenance | ✅ Selected |
| n8n (self-hosted) | Visual builder, low-code | Steeper learning curve, more resources | Good alternative |
| Make.com/Zapier | No hosting, easy setup | Expensive at scale ($30-50/mo), less control | Not recommended |
| Google Apps Script | Free, native Sheets | Limited debugging, cold starts, no ecosystem | Not recommended |

---

## Implementation Considerations

### Prerequisites
- [ ] Pancake POS API documentation (webhook format, auth)
- [ ] Botcake API documentation (message endpoints, auth)
- [ ] Google Cloud project with Sheets API enabled
- [ ] AppSheet webhook/automation setup guide
- [ ] Exact status mapping table (POS ↔ AppSheet)

### Security Checklist
- [ ] Webhook signature verification
- [ ] Environment variables for all secrets
- [ ] HTTPS only (Railway handles this)
- [ ] Rate limiting on endpoints

### Monitoring
- SQLite logs queryable via Turso dashboard
- Railway provides basic metrics
- Consider adding health check endpoint: `GET /health`

---

## Success Metrics

1. **Reliability**: 99.9% webhook processing success rate
2. **Latency**: <2s from POS event to Sheets entry
3. **Customer notification**: <5s from AppSheet update to WhatsApp message
4. **Error visibility**: All failures logged with context

---

## Next Steps

1. Gather API documentation from all services
2. Define exact status mapping table
3. Create detailed implementation plan
4. Set up Railway project + environment
5. Implement webhook receivers
6. Test end-to-end flow

---

## Pending Information from User

- [ ] Exact status mapping (POS status ↔ AppSheet status)
- [ ] Pancake POS webhook payload format
- [ ] Botcake API endpoint for sending messages
- [ ] Google Sheets structure (columns, sheet name)
