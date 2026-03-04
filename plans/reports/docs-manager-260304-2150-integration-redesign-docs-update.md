# Documentation Update: POS ↔ AppSheet Integration Redesign

**Date:** March 4, 2026
**Updated By:** docs-manager
**Status:** Complete

---

## Summary

Updated project documentation to reflect POS ↔ AppSheet integration redesign. All changes are minimal, targeted updates to sections directly affected by the schema and trigger logic changes.

---

## Files Updated

### 1. `docs/system-architecture.md`
**Last Updated:** 2026-03-04

#### Changes Made

**Google Sheets Service Section**
- Updated function names: `findRowByOrderId` → `findRowByOrderNumber`
- Changed sheet format from 7 columns to 3-column schema
- Added comment: "simplified 3-col schema"

**Status Mapper Section**
- Replaced bidirectional mapping table with trigger functions
- Added key triggers: `shouldCreateAppSheetEntry`, `shouldCancelAppSheetEntry`, `shouldMarkDelivered`, `shouldUpdatePosStatus`
- New helper functions: `getPosDeliveredCode()`, `getPosWaitForPickupCode()`

**POS Webhook Flow (/webhook/pos)**
- Changed trigger from "Confirmed (3)" to "NEW (0)"
- Updated flow to include webhook secret verification
- Added: Cancel handler for CANCELLED (4) status
- Removed: Logic for Shipped/Delivered status (now handled in AppSheet webhook)
- Updated security: "No authentication required" → "HMAC timing-safe comparison"

**AppSheet Webhook Flow (/webhook/appsheet)**
- Updated to include optional phone field in payload
- Removed: "Retrieve CustomerPhone from Google Sheets lookup"
- Added: "Phone Resolution: Retrieved from AppSheet webhook payload (not Sheets lookup)"
- Enhanced clarity on notification handling:
  - STORAGE status: "If phone present in payload: Send WhatsApp notification"
  - Delivery status: "If phone present in payload: Send WhatsApp notification"
- Added: Log notification result (non-fatal failure)

**Order Entity Data Structures**
- Changed from `OrderData` with 5 fields to `AppSheetOrderData` with 3 fields
- Removed: `estimatedDelivery`, `deliveryOption`, `customerPhone` (not in 3-col schema)
- Kept: `orderNumber`, `phone`, `status`

---

### 2. `docs/codebase-summary.md`
**Last Updated:** 2026-03-04

#### Changes Made

**Module Inventory - Routes Layer**
- Updated `webhook-pos.ts`: Line count 78 → 143, added trigger details
- Updated `webhook-appsheet.ts`: Line count 85 → 190, added handler details
- Both entries now specify trigger logic: "POS NEW(0)→create", "CANCELLED(4)→cancel", etc.

**Module Inventory - Services Layer**
- Updated `google-sheets.ts`: Added context "3-col schema: OrderNumber, Phone, Status"

**Module Inventory - Utilities Layer**
- Updated `status-mapper.ts`: Line count 94 → 92
- Changed description to focus on triggers: "Status triggers: NEW(0)→create, CANCELLED(4)→cancel, DELIVERY→delivered"

**Key Interfaces - Order Data**
- Replaced `OrderData` interface with `AppSheetOrderData`
- Updated field list: `orderNumber`, `phone`, `status` (removed `estimatedDelivery`, `deliveryOption`, `customerPhone`)
- Updated `AppSheetRowData`: Now extends `AppSheetOrderData`

**Common Patterns**
- Added new pattern: "Webhook Authentication" with timing-safe comparison example
- Enhanced "Error Handling" pattern with actual code structure
- Replaced "Status Mapping" pattern with "POS ↔ AppSheet Integration"
- Documented the four trigger points with actual status codes

---

### 3. `docs/development-roadmap.md`
**Last Updated:** 2026-03-04

#### Changes Made

**Header**
- Updated timestamp: 2026-02-26 → 2026-03-04
- Updated current phase: "05 (Deployment)" → "06 (Integration Redesign - Complete)"

**Phase 05 Section**
- Added note: "Updated: Mar 4, 2026 - Integration redesign implemented"
- Maintains all original Phase 05 content (no breaking changes)

**New Phase 06 Section**
Inserted comprehensive enhancement documentation:

**Schema Changes**
- Google Sheets: 7 columns → 3 columns
- Detailed before/after structure
- Rationale: "Cleaner schema, phone data now sourced from webhooks"

**Trigger Changes**
- POS CONFIRMED (3) → POS NEW (0)
- Rationale: "Captures orders at earliest stage"

**New Status Handlers**
- `shouldCancelAppSheetEntry()` - Documented
- `shouldMarkDelivered()` - Documented
- `getPosDeliveredCode()` - Documented

**AppSheet Improvements**
- Phone field now optional in webhook payload
- Removed dependency: getCustomerPhone() lookup eliminated
- Enhancement: Both STORAGE and Delivery handlers support phone-based notifications

**Authentication Consistency**
- POS webhook now matches AppSheet webhook pattern
- Both use: `timingSafeEqual(secret, config.webhookSecret)`

**Testing & Documentation Notes**
- 60 tests still passing
- No new tests required
- Clear rationale for redesign choices

---

## Impact Analysis

### Files Affected by Implementation (Already Updated)
1. `src/utils/status-mapper.ts` - New trigger functions
2. `src/services/google-sheets.ts` - 3-col schema, updated interface names
3. `src/routes/webhook-pos.ts` - NEW(0) trigger, cancel handler, secret verification
4. `src/routes/webhook-appsheet.ts` - Phone from payload, dual handlers
5. `src/schemas/appsheet-webhook.schema.ts` - Optional phone field

### Documentation Completeness
✓ API contracts documented
✓ Data structures updated
✓ Webhook flows clarified
✓ Integration triggers specified
✓ Security patterns consistent
✓ Code examples still accurate

---

## Consistency Checks

- [x] All function names match actual code (`findRowByOrderNumber`, not `findRowByOrderId`)
- [x] Status codes verified against `src/utils/status-mapper.ts` (NEW=0, CANCELLED=4, RECEIVED=3, WAITING=9)
- [x] Trigger logic matches webhook handlers
- [x] Schema column count verified (3 columns: OrderNumber, Phone, Status)
- [x] Security patterns documented (timing-safe comparison on both endpoints)
- [x] All data structure field names match interfaces in `src/services/google-sheets.ts`

---

## Key Documentation Decisions

1. **Preserved Phase 05 Context** - Phase 05 remains complete; redesign documented as enhancement under Phase 06
2. **Minimal Rewrites** - Only affected sections updated; related content untouched
3. **Clarity Focus** - Webhook flows now explicitly show trigger conditions and handler branches
4. **Integration Emphasis** - Documentation highlights the NEW(0) → AppSheet → STORAGE/Delivery cycle

---

## Notes for Future Updates

- If POS CANCELLED code changes from 4, update `status-mapper.ts` docs and roadmap
- If more status triggers added, extend the Phase 06 enhancement section
- If Google Sheets schema changes again, update both schema and data structure sections
- Integration redesign serves as template for future webhook enhancements

