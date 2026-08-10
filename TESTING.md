# Testing — Point View Operations Platform

**Status:** 2026-08-11. Describes what actually exists in this repo today, not an aspirational target — cross-check against `docs/AGENT_HANDOFF.md` for the most recent changes to this strategy.

## Running tests

```bash
bun run test          # full suite (unit + integration)
bun run lint
bunx next typegen && bunx tsc --noEmit
bun run build          # production build, also type-checks
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, `bun run test`, and the production build on every push.

## The test pyramid

```text
Unit tests
    +
Real-database RBAC integration tests
    +
Targeted page/route authorization tests
```

### Unit tests (`src/**/*.test.ts`)

Pure-function tests — no database, no Next.js runtime, no mocking beyond what a plain function needs. Covers scoping helpers (`src/lib/crm/leads.ts`, `src/lib/projects.ts`), status-transition rules, form-field parsers, address/postal logic. Fast, and the right layer for exhaustively covering a function's edge cases (empty input, invalid enum values, boundary conditions).

### Real-database RBAC integration tests (`**/*.integration.test.ts`)

Introduced 2026-08-10 for the Projects slice, extended 2026-08-11 to Leads, Clients, Users/Roles, and page-level authorization (`docs/AGENT_HANDOFF.md` Entries 16-17). These call the actual, unmodified server actions and page components against a real Postgres instance — not a simulation of the authorization logic, the logic itself.

**Why this layer exists:** unit tests prove a scoping function (e.g. `projectInScope`) is correct in isolation. They can't catch a bug in how the pieces *compose* — the actual DB query, the actual `authorize()` call, the actual permission grants in `scripts/seed.ts`, wired together the way production really runs them. `src/lib/projects.ts`'s `projectMembersInScope` had exactly this kind of bug caught only once a test called it in a more realistic way (see Entry 15) — this layer generalizes that catch.

**How it works** (see `test/db-test-utils.ts`):
- [`@electric-sql/pglite`](https://pglite.dev) gives each test file a fresh, ephemeral, in-memory **real Postgres** instance (WASM-compiled, not a mock/fake) — no Docker, no network dependency, no risk to the real dev/prod Neon database.
- Schema is built by replaying this repo's actual `drizzle/*.sql` migration files in order, not a hand-written fixture that could drift from what production runs.
- RBAC data is seeded from `scripts/seed.ts`'s exported `roles`/`permissions`/`grants` — the exact same arrays applied to real environments via `bun run db:seed`, not a duplicated copy that could silently diverge.
- Only two things are mocked: `@clerk/nextjs/server`'s `auth()` (so a test controls who's "signed in") and `@/db`'s `getDb()` (so actions hit the test database). `setUserStatus` additionally needs `clerkClient()` mocked — it makes a real Clerk backend API call (`banUser`/`unbanUser`) in production, which must never fire in a test.
- `next/navigation`'s `redirect()`/`notFound()` are **not** mocked — read their actual Next.js source before assuming otherwise. Both just throw a plain `Error` with a digest string (`"NEXT_REDIRECT;..."` / `"...;404"`) with no request-context/`AsyncLocalStorage` dependency, so real behavior runs and tests assert on the thrown digest.
- `next/cache`'s `revalidatePath` **is** mocked (no-op) — its real implementation depends on Next's request-scoped async storage and throws outside an actual request.

**What's covered today:** Projects, Leads, Clients, and Users/Roles server actions, each exercised against every role in `docs/security/RBAC_MATRIX.md`, plus a shared page-authorization file covering the corresponding list/detail pages. See each `*.integration.test.ts` file's own header comment for specifics.

**Writing a new one:** copy the mock/harness boilerplate from an existing `*.integration.test.ts` file (they're intentionally near-identical at the top) rather than reinventing it. Import the actual server actions/pages, not a re-implementation. Seed fixtures via direct `db.insert(schema.<table>)` calls for setup, and the real actions/pages for the behavior under test.

**Known limitation:** `createTestDb()` re-applies every migration file from scratch per test file (not per test) — fine at the current migration/test-file count, would need reconsideration if either grows large enough to slow the suite down noticeably. Running 5 PGlite instances concurrently used to be enough CPU contention to blow past first a 10s, then even a 30s `hookTimeout` (observed 2026-08-11 running the full suite together) — raising the timeout further was just tolerating worse contention instead of fixing it, and a flaky-under-load suite is worse than a slightly slower reliable one. `vitest.config.ts` now sets `fileParallelism: false` (only one PGlite instance ever boots at a time) plus a modest `hookTimeout: 20_000` safety margin. Full suite currently takes roughly 25-35s wall-clock running sequentially — slower than the old parallel best-case, but reliably so, confirmed stable across repeated runs.

### Page/route authorization tests

A subset of the integration layer, specifically calling React Server Component page functions directly (they're just async functions — calling one returns a plain React-element object graph when not rendered to a DOM, no jsdom needed) and asserting on:
- Whether the call resolves (authorized) or rejects with a 404-digest error (denied), same convention as the app's own `AuthorizationError` → `notFound()` pattern.
- For list pages, the actual rows an authorized user would see (walking the returned element tree by `type`/`key`, not by rendered markup) — e.g. confirming an Administrative Staff's Leads list contains only their own assigned leads, not just that the page loads.
- For conditional UI (e.g. Owner/GM's read-only Users & Roles view vs. System Administrator's full view), that the *controls themselves* are absent from the tree, not just that a test happens not to click them — see `page-authorization.integration.test.ts`'s `findAll()` helper.

**Known limitation:** this covers Projects, Leads, Clients, and the Users/Roles admin page. It does not attempt full DOM rendering (no React Testing Library / jsdom) — client-side interactivity within a page isn't exercised here, only the server-side data-access/authorization path a request would hit before any client code runs.

## What's explicitly NOT tested (by design, not oversight)

- Anything behind a feature that doesn't exist yet — Field Operations, Technical Processing, Review/Approval, Billing, Audit viewer, System Settings. No tests exist because no permission keys or code paths exist (see `docs/security/RBAC_MATRIX.md`).
- Cross-browser/device/accessibility testing (`AGENTS.md` Phases K/L) — no automated Playwright/axe suite exists yet.
- Load/performance testing.
- The full `docs/release/RELEASE_EVIDENCE.md` checklist (`AGENTS.md` Phase Q) — that document does not exist yet; creating a partially-filled version now would overstate production readiness given the gaps above and in `docs/security/THREAT_MODEL.md` §5.
