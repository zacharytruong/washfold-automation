---
title: POS ↔ AppSheet Integration Redesign
status: completed
created: 2026-03-03
brainstorm: plans/reports/brainstorm-260303-1522-pos-appsheet-integration-redesign.md
---

# POS ↔ AppSheet Integration Redesign

## Overview

Refactor the Pancake POS ↔ AppSheet (Google Sheets "NewOrder" tab) integration to reflect new business flows:
- POS trigger changed: `SHIPPED (2)` → `NEW (0)`
- Sheet schema simplified: 7 cols → 3 cols (OrderNumber, Phone, Status)
- Phone now in AppSheet webhook payload (no Sheets lookup)
- New "Delivery" status handler
- POS cancellation handler (marks AppSheet row)

## Phases

| # | Phase | Status | File |
|---|---|---|---|
| 01 | Verify POS cancellation status code | `completed` | [phase-01](./phase-01-verify-cancellation-status.md) |
| 02 | Update status-mapper | `completed` | [phase-02](./phase-02-update-status-mapper.md) |
| 03 | Simplify google-sheets service | `completed` | [phase-03](./phase-03-simplify-google-sheets.md) |
| 04 | Update POS webhook handler | `completed` | [phase-04](./phase-04-update-pos-webhook.md) |
| 05 | Update AppSheet webhook handler | `completed` | [phase-05](./phase-05-update-appsheet-webhook.md) |
| 06 | Update tests | `completed` | [phase-06](./phase-06-update-tests.md) |

## Key Dependencies

```
Phase 01 → Phase 04 (cancel handler needs verified status code)
Phase 02 → Phase 04, 05 (status-mapper functions used in both routes)
Phase 03 → Phase 04, 05 (google-sheets API shape change affects routes)
Phase 04, 05 → Phase 06 (tests verify the routes)
```

## Pre-Deploy Checklist

- [ ] Verify POS cancellation status code from Pancake API docs/support
- [ ] Configure AppSheet to include `phone` field in webhook payload
- [ ] Clear or migrate existing "NewOrder" sheet rows (column shift: 7→3 cols)
- [ ] Run full test suite before deploy
