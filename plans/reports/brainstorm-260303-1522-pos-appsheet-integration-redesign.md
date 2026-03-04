# Brainstorm: POS ↔ AppSheet Integration Redesign

**Date:** 2026-03-03
**Status:** Agreed — ready for implementation plan

---

## Problem Statement

The integration between Pancake POS and AppSheet (via Google Sheets "NewOrder" tab) needs rethinking:
- POS trigger changed from SHIPPED to NEW
- AppSheet row schema simplified to 3 fields
- Phone now passed in AppSheet webhook payload (no more Sheets lookup)
- New "Delivery" status handler needed
- Cancellation flow needed (POS cancel → update/mark AppSheet row)

---

## System Glossary

| Term | System | Key |
|---|---|---|
| `posOrder` | Pancake POS | `posOrder.id` |
| `appsheetOrder` | AppSheet (via Google Sheets "NewOrder" tab) | `appsheetOrder.OrderNumber` |
| Link | `posOrder.id === appsheetOrder.OrderNumber` | |

---

## New Integration Flow

### Flow 1: POS New → Create AppSheet entry
- Trigger: `posOrder.status == NEW (code 0)`
- Action: Append row to "NewOrder" sheet
  - `OrderNumber = posOrder.id`
  - `Phone = posOrder.bill_phone_number`
  - `Status = "Arrived"`
- Guard: Check duplicate by OrderNumber before appending

### Flow 2: AppSheet "Lưu kho / STORAGE" → POS + notify
- Trigger: `appsheetOrder.status == "Lưu kho / STORAGE"`
- AppSheet sends: `{ order_number, status, phone }`
- Actions:
  1. Update `posOrder.status` → WAITING (code 9) = "Wait for pickup"
  2. Call botcake API with `phone` to notify customer

### Flow 3: AppSheet "Delivery" → POS + confirm
- Trigger: `appsheetOrder.status == "Delivery"`
- AppSheet sends: `{ order_number, status, phone }`
- Actions:
  1. Update `posOrder.status` → RECEIVED (code 3) = "Delivered"
  2. Call botcake API with `phone` to confirm delivery

### Flow 4: POS Cancelled → Mark AppSheet row
- Trigger: POS cancellation status (code TBD — needs verification)
- Action: Update "NewOrder" sheet row status to "Cancelled" (or delete row)

---

## Agreed Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Phone source (notifications) | AppSheet webhook payload | Eliminates Sheets lookup — simpler, faster |
| Sheet schema | Simplified to 3 cols (OrderNumber, Phone, Status) | YAGNI — only needed fields |
| Initial AppSheet status | `Arrived` | Same as before, AppSheet workflow unchanged |
| POS "Delivered" code | RECEIVED (3) | Existing enum value |
| Cancelled orders | Handle — mark/update AppSheet row | Avoid orphan rows |

---

## Files to Modify

| File | Changes |
|---|---|
| `src/schemas/appsheet-webhook.schema.ts` | Add `phone` field |
| `src/utils/status-mapper.ts` | Fix trigger (NEW=0), add Delivery handler, add cancellation handler |
| `src/services/google-sheets.ts` | Simplify to 3-col schema; remove `getCustomerPhone`; update `appendRow` |
| `src/routes/webhook-pos.ts` | Fix trigger; uncomment `appendRow`; use simplified data; add cancel handler |
| `src/routes/webhook-appsheet.ts` | Use phone from payload; add "Delivery" branch |
| `src/__tests__/webhook-pos.test.ts` | Update tests for new trigger + schema |
| `src/__tests__/webhook-appsheet.test.ts` | Update tests; add Delivery test |
| `src/__tests__/status-mapper.test.ts` | Update for new status functions |

---

## Risks & Open Questions

1. **POS cancellation status code**: Current `POS_STATUSES` has no "CANCELLED" entry. Need to verify the actual Pancake POS numeric code for cancellation before implementing Flow 4.
2. **AppSheet webhook phone field**: AppSheet must be configured to include `phone` in webhook payload. This is an AppSheet config change, not just code.
3. **Column index shift**: Simplifying from 7 → 3 columns means existing data in "NewOrder" may have wrong column indices if old rows exist. Migration/clearing needed before deploy.
