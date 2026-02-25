# Code Review: Phase 1 Project Setup

**Date:** 2026-02-25
**Reviewer:** code-reviewer
**Branch:** feat/phase-01
**Phase:** Phase 1 - Project Setup

---

## Scope

| Item | Value |
|------|-------|
| Files reviewed | 6 |
| Total LOC | ~130 |
| Focus | Phase 1 initial setup |
| Scout findings | See "Edge Cases Found" section |

**Files:**
- `/Users/zacharytruong/projects/personal/washfold-automation/src/index.ts` (25 lines)
- `/Users/zacharytruong/projects/personal/washfold-automation/src/config.ts` (81 lines)
- `/Users/zacharytruong/projects/personal/washfold-automation/eslint.config.js` (16 lines)
- `/Users/zacharytruong/projects/personal/washfold-automation/package.json` (25 lines)
- `/Users/zacharytruong/projects/personal/washfold-automation/tsconfig.json` (30 lines)
- `/Users/zacharytruong/projects/personal/washfold-automation/.env.example` (18 lines)

---

## Overall Assessment

**Rating: GOOD - Ready for Phase 2 with minor improvements**

Phase 1 setup is solid. Clean structure, proper TypeScript config, type-safe env handling. Lint and type-check pass. A few minor issues need attention before Phase 2.

---

## Critical Issues

**None found.**

---

## High Priority

### H1: `validateConfig()` commented out in index.ts

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/index.ts` (lines 3-5)

**Problem:** The fail-fast validation is disabled, defeating its purpose. Production could start with missing env vars.

```typescript
// Comment out for development without env vars
// validateConfig()
```

**Impact:** Server starts without required credentials; will fail at runtime when services are called.

**Fix:** Use conditional validation based on `NODE_ENV`:

```typescript
import { validateConfig } from './config'

// Validate config in non-development environments
if (process.env.NODE_ENV !== 'development') {
  validateConfig()
}
```

Or better - always validate but make it explicit what's missing:

```typescript
// Always validate, but continue in dev mode with warnings
const isDevMode = process.env.NODE_ENV === 'development'
try {
  validateConfig()
} catch (error) {
  if (isDevMode) {
    console.warn('Config validation failed in dev mode:', error.message)
  } else {
    throw error
  }
}
```

---

### H2: PORT parsed twice

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/index.ts` (line 17) and `/Users/zacharytruong/projects/personal/washfold-automation/src/config.ts` (line 68)

**Problem:** PORT is parsed in both `index.ts` and `config.ts`. Inconsistent and duplicated logic.

```typescript
// index.ts
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000

// config.ts
port: getEnvVarAsNumber('PORT', 3000),
```

**Fix:** Use config module consistently:

```typescript
// src/index.ts
import { getConfig } from './config'

const { port } = getConfig()
```

---

## Medium Priority

### M1: Missing NODE_ENV in .env.example

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/.env.example`

**Problem:** No `NODE_ENV` documented. Should indicate expected values for clarity.

**Fix:** Add to .env.example:

```env
# Environment
NODE_ENV=development
```

---

### M2: No types for Hono context extensions

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/index.ts`

**Problem:** When Phase 2 adds middleware, need typed context for config/logger access.

**Fix (prepare for Phase 2):** Consider creating types file now:

```typescript
// src/types.ts
import type { Context } from 'hono'

export interface Env {
  Variables: {
    config: import('./config').Config
  }
}
```

---

### M3: README.md outdated

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/README.md`

**Problem:** Still shows `bun init` boilerplate. Doesn't reflect actual project commands.

**Fix:** Update with actual commands:

```markdown
# washfold-automation

Middleware service for syncing Pancake POS with AppSheet workflow.

## Setup

```bash
bun install
cp .env.example .env  # Configure environment
```

## Development

```bash
bun run dev    # Hot-reload server on :3000
bun run lint   # Check code style
```

## Production

```bash
bun run start
```
```

---

### M4: GOOGLE_SERVICE_ACCOUNT_JSON as string

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/src/config.ts` (line 62)

**Problem:** JSON stored as string env var. Will need parsing before use. Consider validating JSON structure at config time.

**Fix (for Phase 2):** Add JSON validation:

```typescript
function getEnvVarAsJson<T>(key: string): T {
  const value = getEnvVar(key)
  try {
    return JSON.parse(value) as T
  } catch {
    throw new Error(`Environment variable ${key} must be valid JSON`)
  }
}
```

---

## Low Priority

### L1: jsx option unnecessary

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/tsconfig.json` (line 4)

**Problem:** `"jsx": "react-jsx"` is set but this is a backend API service - no JSX used.

```json
"jsx": "react-jsx",
```

**Impact:** Minimal - doesn't cause issues, just noise.

**Fix:** Remove or comment out:

```json
// "jsx": "react-jsx",  // Not needed for API-only service
```

---

### L2: `@types/bun` pinned to `latest`

**File:** `/Users/zacharytruong/projects/personal/washfold-automation/package.json` (line 21)

**Problem:** Using `latest` can cause CI reproducibility issues.

```json
"@types/bun": "latest"
```

**Fix:** Lock to specific version after `bun install`:

```json
"@types/bun": "^1.3.4"
```

---

## Edge Cases Found by Scout

| Category | Finding |
|----------|---------|
| **Data flow** | config.ts caches config but cache isn't cleared if env changes (OK for production, watch in tests) |
| **Boundary** | getEnvVarAsNumber doesn't handle float inputs (parses as int only) - OK for PORT |
| **Error state** | Empty string env var passes required check (fixed by `!value` returning true for `""`) |
| **Async** | No async concerns in Phase 1 - all sync |
| **State mutation** | cachedConfig is mutable; no issue currently but consider `Object.freeze()` for safety |

---

## Positive Observations

1. **Clean file structure** - Follows planned architecture exactly
2. **Strict TypeScript** - `strict: true`, `noUncheckedIndexedAccess: true` enabled
3. **Proper error messages** - Config errors identify missing variable by name
4. **No hardcoded secrets** - All sensitive values via env vars
5. **Appropriate ignores** - `.gitignore` covers common sensitive/build files
6. **ESLint config** - Sensible @antfu/eslint-config with reasonable overrides

---

## Verification Results

| Check | Result |
|-------|--------|
| `bun run lint` | PASS (0 errors) |
| `bunx tsc --noEmit` | PASS (0 errors) |
| Type coverage | 100% (strict mode) |
| Security scan | No secrets in code |

---

## Recommended Actions

### Before Phase 2

1. **[HIGH]** Fix PORT duplication - use config module in index.ts
2. **[HIGH]** Enable `validateConfig()` with proper dev/prod handling
3. **[MED]** Add `NODE_ENV` to .env.example

### During Phase 2

4. **[MED]** Add JSON validation for GOOGLE_SERVICE_ACCOUNT_JSON when implementing Google Sheets service
5. **[MED]** Create types.ts for Hono context extensions

### Optional

6. **[LOW]** Update README.md with actual project info
7. **[LOW]** Pin @types/bun to specific version
8. **[LOW]** Remove jsx option from tsconfig

---

## Plan Compliance

Checking Phase 1 TODO list from `plans/260225-1414-internal-ops-workflow/phase-01-project-setup.md`:

| Task | Status |
|------|--------|
| Run `bun init -y` | DONE |
| Install dependencies | DONE |
| Create `tsconfig.json` | DONE |
| Create `eslint.config.js` | DONE |
| Create `.env.example` | DONE |
| Create `src/config.ts` | DONE |
| Update `package.json` scripts | DONE |
| Verify `bun run dev` starts without errors | DONE |

**Phase 1 Success Criteria:**
- [x] `bun run dev` starts Hono server
- [x] `bun run lint` passes
- [ ] All env vars validated at startup (commented out - needs fix)
- [x] TypeScript compiles without errors

---

## Unresolved Questions

1. Should `validateConfig()` log warnings in dev mode or silently continue?
2. Is `googleapis` dependency needed in Phase 1 or should be added in Phase 2?

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Critical issues | 0 |
| High priority | 2 |
| Medium priority | 4 |
| Low priority | 2 |
| Type coverage | 100% |
| Lint issues | 0 |
| Files under 200 LOC | 6/6 |
