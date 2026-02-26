# API Endpoints

**Last Updated:** 2026-02-25
**Framework:** Hono.js
**Server Port:** 3000 (configurable via `PORT` env var)

## Current Endpoints (Phase 06)

### 1. Server Status
**Route:** `GET /`
**Status:** Implemented

**Response:**
```json
200 OK
{
  "status": "ok",
  "service": "washfold-automation"
}
```

**Use:** Quick check that server is running

---

### 2. Health Check
**Route:** `GET /health`
**Status:** Implemented

**Response:**
```json
200 OK
{
  "status": "healthy",
  "timestamp": "2026-02-26T14:30:00Z"
}
```

**Use:** Monitoring, load balancer health probes

---

## Log Viewer Endpoints (Phase 06)

### Authentication

All log viewer endpoints require Bearer token authentication:

```
Authorization: Bearer {LOG_VIEWER_SECRET}
```

**Behavior:**
- **Production:** Returns 403 if `LOG_VIEWER_SECRET` not configured
- **Development:** Skips auth if `LOG_VIEWER_SECRET` not set
- **Invalid token:** Returns 401

---

### 1. Recent Logs
**Route:** `GET /logs/recent?limit=50`
**Status:** Implemented

**Query Parameters:**
- `limit` (optional, default: 50) - Fetch up to N most recent logs (clamped 1-500)

**Response (Success):**
```json
200 OK
{
  "logs": [
    {
      "id": 42,
      "timestamp": "2026-02-26T14:29:00Z",
      "eventType": "sheets:update",
      "payload": "{\"orderId\":\"POS-12345\",\"status\":\"Delivered\"}",
      "status": "success",
      "error": null
    },
    {
      "id": 41,
      "timestamp": "2026-02-26T14:28:00Z",
      "eventType": "botcake:send",
      "payload": "{\"phone\":\"+84384123456\",\"message\":\"Order shipped\"}",
      "status": "success",
      "error": null
    }
  ],
  "count": 2
}
```

**Use:** Real-time operational monitoring, troubleshooting recent activity

---

### 2. Error Logs
**Route:** `GET /logs/errors?limit=50`
**Status:** Implemented

**Query Parameters:**
- `limit` (optional, default: 50) - Fetch up to N error logs (clamped 1-500)

**Response (Success):**
```json
200 OK
{
  "logs": [
    {
      "id": 40,
      "timestamp": "2026-02-26T14:27:00Z",
      "eventType": "sheets:append",
      "payload": "{\"orderNumber\":\"ORD-999\"}",
      "status": "error",
      "error": "Sheet quota exceeded after 3 retries"
    }
  ],
  "count": 1
}
```

**Use:** Debug failures, investigate incidents, retry analysis

---

### 3. Logs by Event Type
**Route:** `GET /logs/type/:type?limit=50`
**Status:** Implemented

**Path Parameters:**
- `type` (required) - Event type filter (e.g., `sheets:update`, `pos:order`, `botcake:send`)

**Query Parameters:**
- `limit` (optional, default: 50) - Max logs to return (clamped 1-500)

**Response (Success):**
```json
200 OK
{
  "logs": [
    {
      "id": 35,
      "timestamp": "2026-02-26T14:20:00Z",
      "eventType": "pos:order",
      "payload": "{\"orderId\":\"POS-123\",\"status\":11}",
      "status": "success",
      "error": null
    }
  ],
  "count": 1
}
```

**Response (No Matches):**
```json
200 OK
{
  "logs": [],
  "count": 0
}
```

**Use:** Component-specific debugging, audit trails, operational dashboards

---

## Webhook Endpoints (Phase 03)

### Authentication
Webhooks validated via HMAC-SHA256 query parameter (no bearer token needed)

---

## Planned Endpoints (Phase 07+)

### POS Webhook Ingestion
**Route:** `POST /webhook/pos`
**Status:** Planned (Phase 03)
**Authentication:** HMAC-SHA256 signature verification

**Request Headers:**
```
Content-Type: application/json
X-Webhook-Signature: sha256={hmac_signature}
```

**Request Body:**
```json
{
  "event": "order.status_changed",
  "orderId": "POS-12345",
  "orderNumber": "ORDER-001",
  "newStatus": 11,
  "estimatedDelivery": "2026-02-26",
  "deliveryOption": "Standard",
  "customerPhone": "+84384123456",
  "timestamp": "2026-02-25T18:00:00Z"
}
```

**Response (Success):**
```json
202 Accepted
{
  "success": true,
  "orderId": "POS-12345",
  "processed": true
}
```

**Response (Error):**
```json
400 Bad Request
{
  "success": false,
  "error": "Invalid signature",
  "orderId": "POS-12345"
}
```

**Process:**
1. Verify HMAC signature against `WEBHOOK_SECRET`
2. Parse order data
3. Convert POS status to AppSheet status
4. Update Google Sheets
5. Send WhatsApp notification
6. Log event to SQLite
7. Return 202 Accepted

**Error Scenarios:**
- Invalid signature → 400 Bad Request
- Missing required fields → 400 Bad Request
- Sheet update fails → 500 Internal Server Error
- Botcake notification fails → Logged but doesn't block (non-critical)

---

### Manual Operations

#### Sync Order Status
**Route:** `POST /api/sync`
**Status:** Planned (Phase 04)
**Authentication:** Bearer token (future)

**Request Body:**
```json
{
  "orderId": "POS-12345",
  "force": false
}
```

**Response:**
```json
200 OK
{
  "success": true,
  "orderId": "POS-12345",
  "posStatus": 11,
  "appsheetStatus": "Delivering",
  "sheetUpdated": true,
  "notificationSent": true
}
```

**Use:** Manual order sync, debugging status mismatches

---

#### Get Order Details
**Route:** `GET /api/orders/:orderId`
**Status:** Planned (Phase 04)

**Response:**
```json
200 OK
{
  "orderId": "POS-12345",
  "orderNumber": "ORDER-001",
  "status": "Delivering",
  "estimatedDelivery": "2026-02-26",
  "customerPhone": "+84384123456",
  "sheetData": {
    "rowIndex": 2,
    "lastUpdated": "2026-02-25T18:00:00Z"
  },
  "posData": {
    "shopId": "shop-xyz",
    "posStatus": 11
  }
}
```

**Response (Not Found):**
```json
404 Not Found
{
  "error": "Order not found",
  "orderId": "POS-12345"
}
```

---

#### Get Recent Events
**Route:** `GET /api/events?limit=50&type=sheets:update`
**Status:** Planned (Phase 05)
**Authentication:** Future (admin only)

**Query Parameters:**
- `limit` (optional, default: 50) - Number of recent events
- `type` (optional) - Filter by event type (e.g., `sheets:update`, `botcake:send`)
- `status` (optional) - Filter by status (`success`, `error`, `warning`)

**Response:**
```json
200 OK
{
  "events": [
    {
      "id": 42,
      "timestamp": "2026-02-25T18:00:00Z",
      "eventType": "sheets:update",
      "payload": { "orderId": "POS-12345", "status": "Delivering" },
      "status": "success",
      "error": null
    },
    {
      "id": 41,
      "timestamp": "2026-02-25T17:59:00Z",
      "eventType": "botcake:send",
      "payload": { "phone": "+84384123456", "orderNumber": "ORDER-001" },
      "status": "success",
      "error": null
    }
  ],
  "total": 42,
  "limit": 50
}
```

---

## Request/Response Format

### Standard Response Structure

**Success:**
```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-02-25T18:00:00Z"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "ERROR_CODE",
  "timestamp": "2026-02-25T18:00:00Z"
}
```

### Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful operation with response |
| 201 | Created | Resource created |
| 202 | Accepted | Async operation queued |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Auth valid but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Data already exists or conflict |
| 500 | Server Error | Internal error, see logs |
| 503 | Service Unavailable | External API down |

---

## Authentication Strategy

### Phase 01-02: No Auth
Health checks and status endpoints require no authentication.

### Phase 03: Webhook Verification
Webhooks validated via HMAC-SHA256:
```typescript
const signature = req.headers.get('X-Webhook-Signature')
const body = await req.text()
const hash = crypto.createHmac('sha256', WEBHOOK_SECRET)
  .update(body)
  .digest('hex')
const isValid = signature === `sha256=${hash}`
```

### Phase 04+: Bearer Tokens (Future)
```
Authorization: Bearer {token}
```

Token format: JWT with `iat`, `exp`, `sub` claims

---

## Rate Limiting (Future)

**Phase 05+ Consideration:**
- 100 requests/minute per IP
- 1000 requests/hour per API key
- Webhook ingestion: 10 concurrent, 1000/minute burst

---

## Error Handling

### Common Error Responses

#### Invalid Webhook Signature
```json
400 Bad Request
{
  "success": false,
  "error": "Invalid webhook signature",
  "errorCode": "INVALID_SIGNATURE"
}
```

#### Order Not Found
```json
404 Not Found
{
  "success": false,
  "error": "Order POS-12345 not found in sheet",
  "errorCode": "ORDER_NOT_FOUND",
  "orderId": "POS-12345"
}
```

#### External Service Unavailable
```json
503 Service Unavailable
{
  "success": false,
  "error": "Google Sheets API temporarily unavailable",
  "errorCode": "EXTERNAL_SERVICE_ERROR",
  "service": "google_sheets"
}
```

---

## Development Testing

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

### Test POS Webhook (Future)
```bash
BODY='{"event":"order.status_changed","orderId":"TEST-001",...}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -mac HMAC -macopt key=$WEBHOOK_SECRET | cut -d' ' -f2)

curl -X POST http://localhost:3000/webhooks/pancake \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$BODY"
```

---

## Related Documentation
- [System Architecture](./system-architecture.md) - Component design
- [Code Standards](./code-standards.md) - Implementation patterns
