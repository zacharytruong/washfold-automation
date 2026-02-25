# Phase 1: Project Setup

## Context Links
- [Main Plan](./plan.md)
- [Brainstorm Report](../reports/brainstorm-260225-1333-internal-ops-workflow.md)

## Overview
- **Priority:** High
- **Status:** Complete
- **Description:** Initialize Bun project with Hono, TypeScript, ESLint, and environment configuration

## Requirements

### Functional
- Bun project with TypeScript support
- Hono framework configured
- ESLint + Prettier with @antfu/eslint-config
- Environment variables loaded securely

### Non-functional
- Type-safe configuration
- Development hot-reload

## Files to Create

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `eslint.config.js` | ESLint + Prettier rules |
| `.env.example` | Environment template |
| `src/config.ts` | Type-safe env loading |

## Implementation Steps

1. Initialize Bun project
```bash
bun init -y
```

2. Install production dependencies
```bash
bun add hono googleapis
```

3. Install dev dependencies
```bash
bun add -d @antfu/eslint-config typescript @types/bun eslint
```

4. Create `tsconfig.json` with strict mode

5. Create `eslint.config.js` with @antfu/eslint-config

6. Create `.env.example` with all required variables:
   - `PANCAKE_API_KEY`
   - `PANCAKE_SHOP_ID`
   - `BOTCAKE_ACCESS_TOKEN`
   - `BOTCAKE_PAGE_ID`
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `WEBHOOK_SECRET`
   - `PORT`

7. Create `src/config.ts` with Zod-like validation (manual since we keep deps minimal)

8. Add scripts to `package.json`:
   - `dev`: `bun run --hot src/index.ts`
   - `start`: `bun run src/index.ts`
   - `lint`: `eslint .`
   - `lint:fix`: `eslint . --fix`

## Todo List

- [x] Run `bun init -y`
- [x] Install dependencies
- [x] Create `tsconfig.json`
- [x] Create `eslint.config.js`
- [x] Create `.env.example`
- [x] Create `src/config.ts`
- [x] Update `package.json` scripts
- [x] Verify `bun run dev` starts without errors

## Success Criteria

- `bun run dev` starts Hono server on configured port
- `bun run lint` passes with no errors
- All env vars validated at startup (fail fast if missing)
- TypeScript compiles without errors

## Next Steps

After completion, proceed to [Phase 2: Core Services](./phase-02-core-services.md)
