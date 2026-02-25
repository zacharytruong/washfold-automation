# Phase 5: Deployment

## Context Links
- [Main Plan](./plan.md)
- [Phase 4: Error Handling](./phase-04-error-handling.md)

## Overview
- **Priority:** Medium
- **Status:** Pending
- **Description:** Deploy to Railway with Docker, configure webhooks

## Requirements

### Functional
- Deploy Bun app to Railway
- Persistent SQLite storage
- Environment variables configured
- Webhook URLs configured in POS and AppSheet

### Non-functional
- Auto-deploy on git push
- Health check monitoring
- ~$5/mo cost target

## Files to Create

| File | Purpose |
|------|---------|
| `Dockerfile` | Bun runtime container |
| `railway.toml` | Railway configuration |

## Implementation Steps

### 1. Create Dockerfile

```dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["bun", "run", "start"]
```

### 2. Create railway.toml

```toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[service]
internalPort = 3000
```

### 2.1 Configure Railway Volume for SQLite Persistence
<!-- Updated: Validation Session 1 - SQLite requires persistent volume -->

1. In Railway dashboard → Service → Settings → Volumes
2. Add volume:
   - Mount path: `/app/data`
   - Size: 1GB (expandable)
3. Update SQLite path in config: `DATABASE_PATH=/app/data/logs.db`
4. Add to `.env.example`: `DATABASE_PATH=/app/data/logs.db`

### 3. Railway Setup

1. Create new project on Railway
2. Connect GitHub repository
3. Configure environment variables:
   - `PANCAKE_API_KEY`
   - `PANCAKE_SHOP_ID`
   - `BOTCAKE_ACCESS_TOKEN`
   - `BOTCAKE_PAGE_ID`
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `WEBHOOK_SECRET`
   - `PORT=3000`
4. Deploy

### 4. Configure Pancake POS Webhook

1. Go to Pancake POS Settings → Webhooks
2. Add webhook URL: `https://<railway-domain>/webhook/pos`
3. Select events: Order Created, Order Updated
4. Save and test

### 5. Configure AppSheet Automation

1. Open AppSheet app
2. Go to Automation → Bots
3. Create new bot triggered on Status column change
4. Add action: Call webhook
5. URL: `https://<railway-domain>/webhook/appsheet?secret=WEBHOOK_SECRET`
6. Method: POST
7. Body: `{"order_number": "<<[OrderNumber]>>", "status": "<<[Status]>>", "customer_phone": "<<[CustomerPhone]>>"}`
8. Save and test

### 6. Verify End-to-End

1. Create test order in POS → verify appears in Google Sheets
2. Update status in AppSheet → verify POS updated + WhatsApp sent
3. Check logs in SQLite for all events

## Todo List

- [ ] Create `Dockerfile`
- [ ] Create `railway.toml`
- [ ] Set up Railway project
- [ ] Configure environment variables
- [ ] Deploy to Railway
- [ ] Get production URL
- [ ] Configure Pancake POS webhook
- [ ] Configure AppSheet automation
- [ ] Test POS → Sheets flow
- [ ] Test AppSheet → POS + WhatsApp flow
- [ ] Monitor logs for errors

## Success Criteria

- Railway deployment succeeds
- Health check passes
- POS webhook creates Sheets rows
- AppSheet webhook updates POS + sends notifications
- Logs capture all events
- Cost under $10/mo

## Monitoring

- Railway dashboard for metrics
- SQLite logs for event history
- Set up alerts for failed webhooks (optional)

## Rollback Plan

1. Railway supports instant rollback to previous deployment
2. Keep local development environment ready
3. Can switch webhooks to ngrok for emergency debugging
