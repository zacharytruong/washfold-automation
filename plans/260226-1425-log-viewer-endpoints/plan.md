---
title: "Log Viewer API Endpoints"
description: "Add authenticated GET endpoints for viewing SQLite logs via browser/curl"
status: complete
priority: P3
effort: 1h
branch: feat/logs-routes
tags: [logs, api, auth, phase-6]
created: 2026-02-26
completed: 2026-02-26
---

# Log Viewer API Endpoints

## Overview

Add 3 GET endpoints to expose existing SQLite log query functions behind bearer token auth. Zero new dependencies — reuses existing logger functions and Hono middleware pattern.

## Phases

| Phase | Description | Status | File |
|-------|-------------|--------|------|
| 01 | Config + auth middleware + routes + registration + tests | Complete | [phase-01](./phase-01-log-viewer-implementation.md) |

## Architecture

```
GET /logs/* → Bearer Token Check → Query Logger → JSON Response
```

## Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/config.ts` | Modify | Add `logViewerSecret` (optional) |
| `src/middleware/auth-log-viewer.ts` | Create | Bearer token middleware |
| `src/routes/logs.ts` | Create | 3 GET endpoints |
| `src/index.ts` | Modify | Register log routes |
| `src/__tests__/logs.test.ts` | Create | Endpoint tests |

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `LOG_VIEWER_SECRET` | No (skip auth in dev) | — | Bearer token for log access |
