# Phase 03 — Simplify Google Sheets Service

**Status:** `completed`
**Priority:** High (affects both webhook routes)
**File:** `src/services/google-sheets.ts`

## Overview

Simplify the Google Sheets service from a 7-column schema to 3 columns (OrderNumber, Phone, Status). Remove `getCustomerPhone` since phone now comes from AppSheet webhook payload.

## Current Schema (7 cols)

```
A: OrderNumber | B: GoiDichVu | C: Delivery | D: SoLuongMon | E: DoUot | F: Phone | G: Status
```

## New Schema (3 cols)

```
A: OrderNumber | B: Phone | C: Status
```

## Changes Required

### 1. Update `AppSheetOrderData` interface
```ts
// OLD
export interface AppSheetOrderData {
  orderNumber: string
  goiDichVu: string
  delivery: string
  soLuongMon: number
  doUot: boolean
  customerPhone: string
  status: string
}

// NEW
export interface AppSheetOrderData {
  orderNumber: string
  phone: string
  status: string
}
```

### 2. Update `AppSheetRowData` interface
Remove `AppSheetRowData extends AppSheetOrderData` — or keep pattern but with new fields:
```ts
export interface AppSheetRowData extends AppSheetOrderData {
  rowIndex: number
}
```

### 3. Update `COLUMNS` mapping
```ts
const COLUMNS = {
  ORDER_NUMBER: 0,
  PHONE: 1,
  STATUS: 2,
} as const
```

### 4. Update `appendRow()`
```ts
// Write only 3 columns: [orderNumber, phone, status]
values: [[orderData.orderNumber, orderData.phone, orderData.status]]
// Range: A:C (was A:G)
```

### 5. Update `findRowInternal()` / `findRowByOrderNumber()`
Update row parsing to map new 3-col indices:
```ts
return {
  rowIndex: i + 1,
  orderNumber: String(row[COLUMNS.ORDER_NUMBER] ?? ''),
  phone: String(row[COLUMNS.PHONE] ?? ''),
  status: String(row[COLUMNS.STATUS] ?? ''),
}
```

### 6. Remove `getCustomerPhone()`
No longer needed — phone comes from AppSheet webhook payload directly. Delete the function entirely.

### 7. Review `updateStatus()`
Currently unused in active code paths. Assess whether it's still needed:
- Flow 4 (cancel) may use it to mark row as "Cancelled"
- If kept, ensure it targets the correct column index (now col C = index 2)

## Pre-Deploy Warning

**Existing rows in "NewOrder" sheet use the old 7-column layout.** Column indices will be wrong for old data after deploy. Options:
- Clear the sheet before deploying (recommended for dev/test environments)
- Migrate existing rows to new 3-col format
- Accept that old rows will be misread (acceptable if sheet is low-volume / fresh)

## Related Files

- `src/routes/webhook-pos.ts` (Phase 04) — calls `appendRow`, `findRowByOrderNumber`
- `src/routes/webhook-appsheet.ts` (Phase 05) — no longer calls `getCustomerPhone`
- `src/__tests__/webhook-pos.test.ts` (Phase 06)

## Success Criteria

- [ ] `AppSheetOrderData` has exactly 3 fields: orderNumber, phone, status
- [ ] `appendRow` writes exactly 3 columns to `NewOrder!A:C`
- [ ] `findRowByOrderNumber` returns correct 3-field object
- [ ] `getCustomerPhone` deleted (no references remain)
- [ ] TypeScript compiles with no errors
