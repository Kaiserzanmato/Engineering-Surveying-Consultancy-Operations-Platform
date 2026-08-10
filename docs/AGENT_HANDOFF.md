# Agent Handoff Log

Coordination log for multi-tool agentic engineering (Claude Code, Codex, Antigravity) per `/AGENTS.md` §8. Append one entry per handoff; do not rewrite prior entries. Keep entries concise — reference `/PRD.md`, `/TECHNICAL_ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` instead of restating them.

---

## Entry 1 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (Phase A only — audit, not implementation)

**Objective:** Execute Phase A — Repository/Risk Audit per `/AGENTS.md`, before any broad feature development.

**Files changed:**
- Cloned empty repo `Kaiserzanmato/Engineering-Surveying-Consultancy-Operations-Platform` to local working copy.
- Added canonical docs at repo root: `PRD.md`, `TECHNICAL_ARCHITECTURE.md`, `AGENTS.md`, `DOCUMENTATION_INDEX.md` (copied from source package, no content changes).
- Created `docs/IMPLEMENTATION_PLAN.md` (new).
- Created `docs/AGENT_HANDOFF.md` (this file, new).
- Created `docs/integrations/DEPENDENCY_REGISTRY.md` (new).
- Created empty scaffolding dirs: `docs/privacy/`, `docs/security/`, `docs/ai/`, `docs/accessibility/`, `docs/compatibility/`, `docs/release/` (no content yet — populated in later phases per canonical build prompt).

**Tests:** None applicable — no code exists yet.

**Privacy/security impact:** None — audit-only, no data processing logic introduced. Confirmed no secrets present (repo was empty; nothing to scan).

**Unresolved risk:**
- Repository was found completely empty at audit start — there is no existing implementation, contrary to what "repository audit" might imply. Flagged to user directly; not silently reinterpreted as "build everything now."
- Architecture/vendor selection (hosting, DB, storage, auth, AI provider) is undecided — see `docs/IMPLEMENTATION_PLAN.md` §1. This blocks Phase E and all P0 scaffolding until the user confirms or redirects.
- No threat model, PIA, or data map exist yet. Per build prompt Phase B/C, these should be drafted before schema/identity work begins, not after.
- No CI/CD, no dependency registry entries beyond proposals (nothing is actually provisioned yet — see `docs/integrations/DEPENDENCY_REGISTRY.md`, all rows are "proposed / not yet provisioned").

**Device/browser impact:** N/A — no UI exists yet.

**Next task:** Pending user confirmation of the architecture table in `docs/IMPLEMENTATION_PLAN.md` §1. Once confirmed, next agent (or this agent in a follow-up turn) should begin P0 scaffolding: project init, managed Postgres + storage + auth provisioning, CI skeleton, and open `docs/security/THREAT_MODEL.md` + `docs/privacy/DATA_MAP.md` drafts in parallel per build prompt Phase B/C ordering (these precede Phase E architecture validation and Phase F feature builds).

**Do not simultaneously rewrite:** N/A — no feature ownership assigned yet since no features exist.

---

## Entry 2 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (P0 scaffolding)

**Objective:** User confirmed the Vercel-native architecture table (`docs/IMPLEMENTATION_PLAN.md` §1) and asked to proceed directly into P0 scaffolding.

**Files changed:**
- Scaffolded Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, package manager `bun`. `package.json` name set to `point-view-operations-platform` (directory name has capitals, invalid for npm/Vercel project names).
- Merged the Next.js auto-generated `<!-- BEGIN/END:nextjs-agent-rules -->` block into `AGENTS.md` on top of the canonical build protocol (create-next-app initially overwrote it — restored from git history and merged).
- Rewrote `README.md` with project-specific pointers (was generic create-next-app boilerplate).
- Pinned `turbopack.root` in `next.config.ts` to avoid Turbopack picking up an unrelated `package-lock.json` in the parent home directory.
- Verified `bun run lint`, `bunx tsc --noEmit`, `bun run build` all pass clean.
- Linked Vercel project `point-view-operations-platform` (org `oliveripsioco-3103s-projects`) via `vercel link`; GitHub repo auto-connected for preview/production deploys.
- Provisioned Vercel Blob **private** store `point-view-storage` (region `iad1` — see unresolved risk below) and pulled `BLOB_READ_WRITE_TOKEN` into `.env.local` (gitignored).
- Added `.github/workflows/ci.yml`: lockfile-verified install, lint, typecheck, build, Gitleaks secret scan, `bun audit` dependency scan. Deliberately no test job yet (no tests exist) — add per-category jobs alongside the first real tests, not as placeholders.
- Drafted `docs/security/THREAT_MODEL.md` (architecture-level; explicitly marks which mitigations are implemented vs. planned — currently only CI secret/dependency scanning and `.gitignore` secret exclusion are real).
- Drafted `docs/privacy/DATA_MAP.md` (data inventory by PRD §18 entity; all retention periods and regions marked TBD pending client/business input, not invented).
- Updated `docs/IMPLEMENTATION_PLAN.md` §1 and `docs/integrations/DEPENDENCY_REGISTRY.md` status rows from "proposed" to "confirmed direction."

**Tests:** None yet — CI runs lint/typecheck/build/secret-scan/dependency-scan only, all currently green.

**Privacy/security impact:**
- Vercel Blob private store provisioned in `iad1` (US East) by default, before data-residency requirements were confirmed. **May need reprovisioning** once the Philippine DPA residency question (`docs/privacy/DATA_MAP.md` open question 1) is answered.
- No server-side authorization layer, rate limiting, or audit logging exist yet — all three are flagged as explicit P0 gaps in `docs/security/THREAT_MODEL.md` §5.

**Unresolved risk:**
- **Neon Postgres and Clerk auth are NOT yet provisioned.** Both `vercel integration add` calls returned `action_required` — Vercel Marketplace requires the account owner to accept each provider's marketplace terms in-browser (CLI cannot drive this handshake):
  - Neon: `https://vercel.com/oliveripsioco-3103s-projects/~/integrations/accept-terms/neon?source=cli`
  - Clerk: `https://vercel.com/oliveripsioco-3103s-projects/~/integrations/accept-terms/clerk?source=cli`
  Once accepted, re-run `vercel integration add neon --no-claim` and `vercel integration add clerk --no-claim` from the repo root.
- Data residency (region) for all three provisioned/pending services is unresolved — see `docs/privacy/DATA_MAP.md` open questions.
- Retention periods, privacy owner, and security owner are still unassigned — same open-questions list.

**Device/browser impact:** N/A — no UI beyond the default Next.js starter page exists yet.

**Next task:** Once the user accepts the two marketplace terms links above, provision Neon + Clerk, run `vercel env pull --yes` to sync the new env vars, then begin the Identity/RBAC vertical slice (first item in `AGENTS.md` Phase F feature order) — schema, server-side authorization function (the ALLOW rule from `TECHNICAL_ARCHITECTURE.md` §5.3), and its negative security tests, per `docs/IMPLEMENTATION_PLAN.md` §2 P1 list item 1.

---

## Entry 3 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (P0 scaffolding, continued)

**Objective:** User accepted both marketplace terms (Neon, Clerk); finish provisioning.

**Files changed:**
- Ran `vercel integration add neon --no-claim` — provisioned Neon Postgres resource `neon-chestnut-pocket`, region **AWS `us-east-1`**. Auto-connected to the Vercel project; `DATABASE_URL`/`DATABASE_URL_UNPOOLED`/`PG*`/`POSTGRES_*` env vars pulled into `.env.local` (gitignored).
- Ran `vercel integration add clerk --no-claim` — provisioned Clerk resource `clerk-orange-bucket`. `CLERK_SECRET_KEY`/`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` pulled into `.env.local`. Clerk's own region is not exposed via env vars — check its dashboard before production if residency matters.
- Updated `docs/integrations/DEPENDENCY_REGISTRY.md` rows for both to "Provisioned" with actual resource names/regions.

**Tests:** None — no app code touches these yet.

**Privacy/security impact:**
- Neon landed in `us-east-1`, same US-East region family as the Blob store (`iad1`) — at least internally consistent, but neither is Philippines/APAC. Residency question (`docs/privacy/DATA_MAP.md` open question 1) is still open and now blocks three provisioned resources, not one, if the answer turns out to require in-region hosting.
- Clerk's default Neon connection role and MFA are **not yet configured**. MFA for System Administrator is mandatory per PRD §8 and must be enabled in Clerk's dashboard before the identity/RBAC slice is considered done — not automatic from provisioning alone.

**Unresolved risk:**
- Data residency still unanswered — now affects Neon, Blob, and (unconfirmed) Clerk regions.
- Neon's default database role is not yet scoped to least-privilege for the app runtime.
- Clerk MFA is not yet enabled/enforced for any role.

**Device/browser impact:** N/A.

**Next task:** Identity/RBAC vertical slice — Drizzle (or equivalent) schema against Neon, Clerk SDK integration (`@clerk/nextjs`) with MFA enabled for System Administrator in Clerk's dashboard, the single server-side authorization function implementing the ALLOW rule (`TECHNICAL_ARCHITECTURE.md` §5.3), and negative authorization tests, per `docs/IMPLEMENTATION_PLAN.md` §2 P1 item 1 and `AGENTS.md` Phase F's ten-step slice checklist.

---

## Entry 4 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (P0 scaffolding, residency follow-up)

**Objective:** Checked in with the user on the data-residency open question before starting Identity/RBAC. No legal requirement was pre-documented anywhere in the proposal/PRD (confirmed by grep — only a generic "have counsel review the final agreement" line exists). Gave the user relevant background (Philippine DPA does not mandate strict data localization, unlike some countries) plus a concrete non-legal reason to still care: field/office users are Philippines-based and US-East hosting adds real latency. User chose to move to Singapore (`sin1`) now, while it's free (no data exists yet).

**Files changed:**
- Deleted and recreated the Neon resource: `neon-chestnut-pocket` (us-east-1) → `neon-purple-tree` (`sin1`/`ap-southeast-1`), via `vercel integration-resource remove --disconnect-all --yes` then `vercel integration add neon --no-claim -m region=sin1`.
- Deleted and recreated the Blob store: `point-view-storage` (iad1) → `point-view-storage` (`sin1`), via `vercel integration-resource remove` then `vercel blob create-store --region sin1`.
- Clerk (`clerk-orange-bucket`) left as-is — its region isn't exposed via this CLI's provisioning metadata; noted in the data map as something to check in Clerk's dashboard if residency becomes a hard requirement later.
- Updated `docs/integrations/DEPENDENCY_REGISTRY.md` and `docs/privacy/DATA_MAP.md` to reflect actual final regions and to record this as a UX/latency decision, explicitly not a confirmed legal one — flagged for legal counsel confirmation before production.

**Tests:** N/A — no schema/data existed in either resource before deletion, so nothing was lost.

**Privacy/security impact:** None beyond what's already logged — this only changes *where* infrastructure lives, not what data flows exist (none yet).

**Unresolved risk:** Same as Entry 3, minus the region inconsistency. Still open: legal confirmation of residency requirement (informal, non-legal-advice reasoning was used to make a practical call, not a substitute for actual counsel review before production), Clerk's actual data region, retention periods, privacy/security owners.

**Device/browser impact:** N/A.

**Next task:** Unchanged from Entry 3 — Identity/RBAC vertical slice is next.

---

## Entry 5 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (Identity/RBAC vertical slice)

**Objective:** Build the first real feature slice per `AGENTS.md` Phase F order: identity/RBAC — schema, Clerk integration, the central `authorize()` function, seeded role/permission catalog, MFA gate, audit logging, minimal UI, and tests.

**Files changed (high level — see git log for the full diff):**
- `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `drizzle/` — Drizzle schema (users, roles, permissions, role_permissions, user_roles, audit_events) and migration, applied to the `sin1` Neon instance via `scripts/migrate.ts` (not `drizzle-kit push` — no TTY in this environment).
- `src/proxy.ts` — Clerk middleware, renamed from the legacy `middleware.ts` convention (Next.js 16 renamed the file convention to `proxy.ts`; confirmed by reading `node_modules/next/dist/docs`, per the auto-generated warning in `AGENTS.md`'s Next.js block). Deny-by-default matcher; no public `/sign-up` route (see below).
- `src/lib/auth/authorize.ts` — the single server-side ALLOW-rule function (`TECHNICAL_ARCHITECTURE.md` §5.3), split into a pure `evaluateAllow()` (unit-tested) and `authorize()`/`can()` wrappers that touch Clerk + DB.
- `src/lib/auth/mfa.ts` — app-level MFA enforcement for System Administrator (Clerk's Marketplace plan tier doesn't expose per-role MFA policy, so this is enforced in code: redirect to `/account/security` if `twoFactorEnabled` is false).
- `src/lib/audit.ts` — append-only `audit_events` writer.
- `src/app/api/webhooks/clerk/route.ts` — syncs Clerk users into the local `users` table on create/update/delete. **Not yet registered with Clerk** — see unresolved risk below.
- `src/app/dashboard/`, `src/app/admin/users/` — protected dashboard shell and the first real admin UI (list users, assign/revoke roles, suspend/reactivate — suspend also calls Clerk's `banUser`/`unbanUser` to actually revoke sessions, not just flip a local flag).
- `scripts/seed.ts` — seeds the 9 PRD §12 roles and 3 permission keys (`users:read`, `users:manage_roles`, `users:suspend` — deliberately nothing for unbuilt feature areas).
- `scripts/bootstrap-admin.ts` — one-time CLI script to grant the first System Administrator (`bun run db:bootstrap-admin -- <email>`), since role assignment normally requires already having `users:manage_roles`.
- Tests: `src/lib/auth/authorize.test.ts` (11 cases covering the ALLOW rule, including negative cases), `src/db/schema.test.ts` (role catalog + invalid-input rejection). Added `vitest` + config; CI now has a `test` job.
- Docs: `docs/security/RBAC_MATRIX.md` (new — the required doc per `AGENTS.md` §6), `docs/security/THREAT_MODEL.md` (updated — several rows moved from "planned" to "implemented"), `docs/IMPLEMENTATION_PLAN.md` (P0 checklist mostly checked off, P1 item 1 marked done-for-its-scope).

**Tests:** `bun run test` (11/11 passing), `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean. Manual smoke test via `bun dev` + curl: homepage renders, `/sign-in` renders, `/dashboard` and `/admin/users` correctly redirect unauthenticated requests to Clerk's hosted sign-in. **Not tested: an actual authenticated user going through sign-in → dashboard → admin/users → role assignment.** That needs a real Clerk sign-in (email/phone verification), which wasn't done in this session — the user should sign in once and confirm the flow works end-to-end.

**Privacy/security impact:**
- First real enforcement of "deny by default" (`TECHNICAL_ARCHITECTURE.md` §5.3) — `authorize()` is the single gate, used in both the two real protected surfaces (no per-route hand-rolled checks).
- Suspend now actually revokes Clerk sessions (`banUser`), not just a local DB flag — matches PRD §8 "Suspended account session revocation."
- Self-suspend and last-admin-removal are both blocked as operational safety rails (not PRD requirements, judgment calls — flagged in `docs/security/RBAC_MATRIX.md`).
- Clerk's SDK (7.7.1) logged a deprecation warning for `createRouteMatcher` (recommends resource-based checks instead of middleware path-matching). Already mitigated in practice — `authorize()` in each page/layout is the real check, `proxy.ts` is defense-in-depth — but flagged in a code comment and `THREAT_MODEL.md` in case Clerk removes it in a future major version.

**Unresolved risk:**
- **The Clerk webhook is not registered.** `src/app/api/webhooks/clerk/route.ts` exists and is correct, but nothing calls it yet — `CLERK_WEBHOOK_SIGNING_SECRET` isn't set, and Clerk's dashboard needs a webhook endpoint pointing at the deployed URL (`https://.../api/webhooks/clerk`) with the `user.created`/`user.updated`/`user.deleted` events subscribed. **Until this is done, signing in does NOT create a local `users` row**, which means `getCurrentUser()` returns null for everyone and the whole app is inaccessible past the homepage. This is the single most important next step — bigger than starting the CRM slice.
- No in-app invite flow (see `docs/security/RBAC_MATRIX.md` known limitations) — first admin bootstrap requires DB access (`bun run db:bootstrap-admin`).
- Rate limiting still doesn't exist (carried over from Entry 1-4, still P0, still not addressed).
- `resourceInScope` in `authorize()` is unexercised — no project-scoped resource exists to test it against yet.

**Device/browser impact:** Not tested on real devices/browsers yet — only curl + reading rendered HTML. Layout uses Tailwind with relative/flex sizing, no fixed desktop-only widths, but no actual responsive/accessibility pass (Phase D/L) has been done.

**Next task, in order:**
1. ~~Register the Clerk webhook~~ — **done** (Entry 6 below).
2. Sign in once as a real user, confirm the local `users` row appears (webhook working), then run `bun run db:bootstrap-admin -- <your-email>` to become the first System Administrator.
3. Manually verify the full flow in a browser: dashboard loads, `/admin/users` shows your account, role assignment/suspend work, MFA redirect triggers correctly for a System Administrator without a second factor.
4. Only after that: start the CRM/Intake slice (P1 item 2).

---

## Entry 6 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (Identity/RBAC slice, unblocking)

**Objective:** Register the Clerk webhook that Entry 5 left as the blocking next step.

**What happened:** The Clerk instance provisioned via Vercel Marketplace (`clerk-orange-bucket`) doesn't appear in the user's normal `dashboard.clerk.com` login — it's Vercel-managed, not tied to that Clerk account. Discovered via the `clerk` CLI (`bunx --bun clerk api /webhooks/svix -X POST -d '{}'`) that Clerk delegates webhook management to Svix, and the CLI can mint a one-time Svix dashboard login link scoped to the instance's webhook app (`POST /webhooks/svix` then `/webhooks/svix_url`). Handed that link to the user; they created the endpoint themselves in Svix's UI (browser step, same category as the earlier Marketplace terms-acceptance — not something the CLI can complete unattended) and pasted back the signing secret.

**Files changed:** None in the repo — this was infrastructure configuration, not code.

**Infra changes:**
- Svix endpoint created: `https://point-view-operations-platform.vercel.app/api/webhooks/clerk`, subscribed to `user.created`, `user.updated`, `user.deleted`.
- `CLERK_WEBHOOK_SIGNING_SECRET` added to Vercel (Production + Preview as sensitive, Development as plain) via `vercel env add`, piped through stdin rather than passed as a CLI flag (avoids the secret sitting in shell history / process listing). Pulled into local `.env.local` via `vercel env pull`.
- Redeployed production (`vercel deploy --prod --yes`) so the live deployment picks up the new env var — Vercel does not retroactively inject env vars into already-built deployments.
- Updated `docs/integrations/DEPENDENCY_REGISTRY.md`'s Clerk row with the actual endpoint/secret status.

**Tests:** Verified live — an unsigned POST to `https://point-view-operations-platform.vercel.app/api/webhooks/clerk` correctly returns 400 "Verification failed" (svix signature check working). Homepage returns 200. **Not yet verified: a real Clerk-signed webhook delivery actually reaching the route and creating a `users` row** — that only happens on an actual sign-in, which hasn't occurred yet.

**Privacy/security impact:** None new — this closes the gap flagged in Entry 5 (webhook route existed but wasn't reachable/registered). The signing secret was pasted in plaintext into the conversation by the user; it was not echoed back in any tool output or committed to the repo, and is stored only in Vercel's env var store and the gitignored local `.env.local`.

**Unresolved risk:** Same as Entry 5 minus the webhook gap. Still pending: someone actually signing in to confirm the sync works, bootstrapping the first admin, and a real browser walkthrough of the RBAC UI.

**Next task:** User signs in once, confirms their `users` row was created (proves the webhook fired correctly), then runs `bun run db:bootstrap-admin -- <their-email>`.

---

## Entry 7 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (Identity/RBAC slice, full manual verification + MFA gap discovered)

**Objective:** Walk the user through the rest of manual verification (sign in, bootstrap admin, exercise the MFA gate) that Entry 6 left as the next step.

**What happened, in order:**
1. User signed in via Google OAuth at `https://point-view-operations-platform.vercel.app/`. Confirmed via direct DB query: exactly one `users` row (`oliver.ipsioco@docypherlabs.com`), proving the webhook sync from Entry 6 actually works end-to-end, not just passing a signature-verification smoke test.
2. Ran `bun run db:bootstrap-admin -- oliver.ipsioco@docypherlabs.com` — granted `system_administrator`.
3. User refreshed `/dashboard` → correctly redirected to `/account/security?mfaRequired=1` with the banner — confirms `authorize()`, role loading, and the MFA gate all work correctly together.
4. **Discovered a real blocker while trying to complete MFA setup**: Clerk's Security tab showed no MFA option at all (only Password / Active devices / Delete account). Investigated via the Clerk dashboard (reached through Vercel's "Open in Clerk" link, since this Marketplace-provisioned instance doesn't show up under the user's normal `dashboard.clerk.com` login) → Configure → Multi-factor: both "Authenticator application" and "SMS verification code" are tagged **Pro** — the current **Hobby (free) plan has no MFA strategy available at all**.
5. Asked the user how to proceed rather than assuming; they chose to relax enforcement for now rather than upgrade Clerk or pause.

**Side note on a wrong turn:** Before reaching the "Open in Clerk" link, this agent briefly tried `clerk auth login` (an OAuth device-flow to claim the Clerk app via the CLI) in the background, then killed it mid-flow when deciding the Vercel-dashboard path was safer/more appropriate for the user to drive themselves. The killed process had already opened a real Safari tab; the user later clicked into that stale tab and hit a "Safari can't connect to the server" error against a local callback port that no longer had a listener. No harm done (dead local loopback callback, nothing exposed), but flagging it as a process lesson: don't background an interactive auth flow like that without warning the user it'll open a browser tab, and clean up more deliberately than a bare `pkill` when abandoning an approach mid-flight.

**Files changed:**
- `src/lib/auth/mfa.ts` — added `MFA_ENFORCEMENT_ENABLED = false` constant gating the whole function; enforcement logic itself is unchanged, just currently short-circuited. Re-enabling once Clerk has an MFA strategy is a one-line flip, not a rewrite.
- `src/app/dashboard/page.tsx` — added a non-blocking amber banner shown to System Administrator accounts without a second factor, so the gap stays visible instead of silently disappearing now that the hard redirect is off.
- Docs updated: `docs/integrations/DEPENDENCY_REGISTRY.md` (Clerk's Cost/Status rows — Hobby plan, no MFA strategy available), `docs/security/THREAT_MODEL.md` (Account takeover row + new gap 5 + trigger), `docs/security/RBAC_MATRIX.md` (known limitations note).

**Tests:** `bun run test` (11/11), `bunx tsc --noEmit`, `bun run lint` all clean after the change. Not yet redeployed to production as of writing this entry — see next task.

**Privacy/security impact:** This is the first deliberate, user-approved deviation from a PRD-mandated control (§8: "MFA mandatory for System Administrators"). It's scoped narrowly (one boolean, one route's enforcement), documented in three places (code comment, THREAT_MODEL.md, RBAC_MATRIX.md, DEPENDENCY_REGISTRY.md — four, actually), and paired with a visible in-app reminder rather than being silent. Explicitly NOT resolved: whether Point View wants to pay for Clerk Pro, or pursue a different MFA path. That's a decision for the user/client, not something to default into.

**Unresolved risk:**
- MFA gap (above) — needs an owner decision before production, tracked in `docs/security/THREAT_MODEL.md` gap 5.
- Everything else carried over from Entry 5/6 unchanged (rate limiting, audit log viewer, `resourceInScope` unexercised, no invite flow).

**Device/browser impact:** First real confirmation the flow works in an actual browser (Safari, macOS) — sign-in, dashboard, MFA redirect all rendered and behaved correctly. Still no cross-browser/device/accessibility pass (Phase D/L).

**Next task:** Commit and redeploy this change (the user is currently blocked from reaching `/dashboard`/`/admin/users` until the MFA gate is disabled in production, not just locally). Then: user re-verifies `/admin/users` is reachable and usable. After that, this slice is fully manually verified end-to-end and CRM/Intake (P1 item 2) can start.

---

## Entry 8 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (Identity/RBAC slice — final verification)

**Objective:** Confirm `/admin/users` is fully usable in production after Entry 7's fix, closing out manual verification for this slice.

**What happened:** Deployed Entry 7's change, user refreshed `/admin/users` in production and confirmed: their account is listed with the `System Administrator` role badge (with a working remove control), the role-assignment dropdown correctly lists the 8 *other* roles (excludes the one already assigned — confirms the `availableRoles` filter in `src/app/admin/users/page.tsx` works), an `Assign` button, `Status: Active`, and a `Suspend` control. All rendering and, by construction (Server Actions, no separate "it doesn't do anything" report from the user), functioning.

**Files changed:** None — verification only.

**Tests:** Manual, in a real browser, in production. This is the first time every piece of the slice — webhook sync, role bootstrap, `authorize()`, the MFA gate (now correctly non-blocking), and the full `/admin/users` CRUD surface — has been confirmed working together outside of unit tests and curl smoke checks.

**Status: identity/RBAC vertical slice is DONE for its defined scope** (see `docs/security/RBAC_MATRIX.md` for exactly what "done" covers and what's deliberately excluded — teams, project-level scope, invite flow, MFA enforcement). Remaining open items are tracked, not forgotten:
- MFA enforcement disabled pending a Clerk Pro decision (`docs/security/THREAT_MODEL.md` gap 5).
- Rate limiting, audit log viewer, `resourceInScope` still unexercised (gaps 1–3).
- No in-app invite flow (gap 4).

**Next task:** Per `docs/IMPLEMENTATION_PLAN.md` §2, P1 item 2 — CRM/Intake (leads, qualification, client profile, contacts) — pending user go-ahead.

---

## Entry 9 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (CRM/Intake vertical slice)

**Objective:** User said "start now" on CRM/Intake, the next item in `AGENTS.md` Phase F's feature order.

**Files changed (high level — see git log for the full diff):**
- `src/db/schema.ts` — added `service_types`, `leads` (with `lead_status` enum: new/contacted/qualified/disqualified/converted), `clients` (`client_type`, `client_status` enums), `contacts`. `leads.convertedClientId` is deliberately NOT a FK (avoids a circular constraint with `clients.sourceLeadId`, which IS the authoritative direction).
- `scripts/seed.ts` — added `leads:read`, `leads:manage`, `clients:read`, `clients:manage`, `service_types:manage` permissions and grants per PRD §12's CRM rows, with judgment calls documented inline for the matrix's ambiguous "Assigned"/"Limited"/"Full/Assigned" entries.
- `src/lib/crm/leads.ts` — pure helpers: `hasUnscopedLeadAccess`, `leadInScope` (the scoping rule for `administrative_staff`), `canTransitionLeadStatus` (the status state machine). Pulled out of the "use server" actions file specifically so they're unit-testable (Next.js Server Action files can only export async functions).
- `src/app/(app)/crm/leads/actions.ts`, `src/app/(app)/crm/clients/actions.ts` — createLead, updateLeadDetails, changeLeadStatus, claimLead, assignLead, convertLeadToClient; createClient, updateClient, createContact, updateContact. All `authorize()`-gated, audit-logged.
- `src/app/(app)/crm/leads/page.tsx` + `[id]/page.tsx`, `src/app/(app)/crm/clients/page.tsx` + `[id]/page.tsx` — list/detail UI.
- `src/app/(app)/admin/service-types/` — minimal catalog admin (list + create only, no edit/delete yet). Deliberately ships with zero seeded service types — Point View's actual service catalog isn't documented anywhere in the PRD/proposal, so this wasn't guessed.
- `src/lib/crm/leads.test.ts` — 14 new unit tests (scoping logic, status transition state machine).
- **Route restructure**: moved `dashboard/`, `admin/`, and the new `crm/` under a `(app)` route group with one shared `layout.tsx` (auth check + MFA gate + nav). Fixes a real gap: `/admin/users` previously had no nav bar at all (it was a separate route tree from `/dashboard`, so didn't inherit that layout) — the user's own screenshot of `/admin/users` showed this. Route group syntax means URLs are unchanged (`/admin/users` still resolves the same), confirmed via production build output listing the same routes as before.
- Docs: `docs/security/RBAC_MATRIX.md`, `docs/privacy/DATA_MAP.md`, `docs/security/THREAT_MODEL.md`, `docs/IMPLEMENTATION_PLAN.md` all updated.

**A correction made mid-slice:** Initially wrote `leadInScope` as a manual sequential check after `authorize()` (`const actor = await authorize(...); if (!leadInScope(before, actor)) throw ...`), which technically worked but bypassed the `authorize()` function's own `resourceInScope` parameter — the exact mechanism it was built for. Refactored `updateLeadDetails`, `changeLeadStatus`, and `convertLeadToClient` to fetch the lead first, then call `authorize("leads:manage", { resourceInScope: (user) => leadInScope(before, user) })`, so the documented architecture (single `authorize()` call is the actual enforcement point) matches what the code does. `claimLead` and `assignLead` intentionally don't use `leadInScope` — they have their own distinct rules (claim requires unassigned; reassign requires unscoped access).

**Tests:** `bun run test` (25/25, up from 11), `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean. Manual dev-server smoke test: unauthenticated requests to all new routes correctly redirect (one transient 404 on first Turbopack compile of `/crm/leads`, resolved on retry — not a real issue, noted here in case it recurs and looks alarming).

**Privacy/security impact:** This is the first slice that stores personal data about people *outside* the organization (lead and client contact info) — see the updated `docs/privacy/DATA_MAP.md` and `docs/security/THREAT_MODEL.md` §3 Assets. No new privacy controls beyond what RBAC already provides (no PII-specific export/deletion tooling yet — still covered by the general "no deletion code path exists yet" gap already tracked). Deliberately did not invent a service catalog — real data has to come from the client.

**Unresolved risk:**
- No deletion/export code path for leads or clients (data-subject rights support from PRD §7 §7.5 — not built anywhere yet, tracked generally, not CRM-specific).
- The "Full/Assigned" and "Assigned" PRD §12 ambiguities for Clients (Admin Staff, Field/CAD/Reviewer) were resolved as documented judgment calls, not confirmed with the client — see `docs/security/RBAC_MATRIX.md`.
- No lead deduplication — creating a lead with the same contact info as an existing one is currently unguarded.
- Everything carried over from Entry 5–8 unchanged (rate limiting, MFA, audit log viewer, invite flow).

**Device/browser impact:** Not yet manually verified in a real browser (unlike identity/RBAC, which the user walked through end-to-end). Dev-server curl smoke tests only. Recommend the user click through `/crm/leads` → create a lead → qualify → convert → `/crm/clients` at least once before considering this slice fully verified, the same way identity/RBAC was.

**Next task:** User verification of the CRM flow in a real browser. After that, per `docs/IMPLEMENTATION_PLAN.md` §2, Projects (P1 item 3) is next — and is the slice that will finally give the `resourceInScope` mechanism a second, project-membership-shaped case to prove itself against.

---

## Entry 10 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (CRM slice, user-driven fixes from real browser testing)

**Objective:** User actually tested the CRM flow in production (the "next task" from Entry 9) and reported two issues.

**Fix 1 — lead source as free text.** User asked for a dropdown instead of a text input for "Source." Converted `leads.source` from `text` to a new `lead_source` Postgres enum (referral/website/phone/walk_in/social_media/email/event/other) — a generic CRM concept, not Point-View-specific data, so unlike `service_types` a small closed enum was proportionate rather than another admin-managed table. Three live test leads already had `source = "Referral"` (free-text, capitalized) — checked live data before writing the migration, then hand-edited drizzle-kit's generated SQL to normalize case (and bucket anything unrecognized into "other") before the type change, since a direct cast would have failed on the mismatch. Added `parseLeadSource()` validator + tests.

**Fix 2 — "buttons not working" (the significant one).** User reported clicking Save/status buttons on `/crm/leads/[id]` did nothing visible. Investigation:
1. Checked the audit log directly — mutations WERE succeeding. ~20 `lead.updated`/`lead.reassigned` events in under 7 minutes, several pairs 1-4 seconds apart, meaning the user was clicking repeatedly because the page never visibly confirmed success, not because the save was failing.
2. User's browser console showed `Failed to load resource: 404` for `leads?_rsc=...`, `/admin/users?_rsc=...`, `/crm/clients?_rsc=...` — these are Next.js's own background RSC fetches (post-Server-Action page refresh, `<Link>` prefetch), not the mutation itself.
3. First hypothesis (wrong, but harmless): thought this was a Vercel edge-cache artifact from my own earlier unauthenticated curl testing polluting the CDN cache. Ran `vercel cache purge --type cdn`. Didn't fix it — the `age`/`etag` I was reading turned out to just reflect the static `/404` page's build time, not a per-request cache entry. No harm done, but the diagnosis was wrong and I should have realized sooner that my own curl tests are never authenticated, so they can't reproduce a signed-in user's issue.
4. Real root cause: Clerk's development instance (no production domain configured — see `docs/integrations/DEPENDENCY_REGISTRY.md`) needs a "dev browser" cookie handshake for `auth.protect()` to recognize a session. Top-level page navigations get this automatically; same-origin `fetch()`-based RSC requests (exactly what breaks here) don't reliably get it. `auth.protect()` in `src/proxy.ts` was rewriting those to a static 404 even for Oliver's fully signed-in session.
5. Fix: removed `auth.protect()`/`createRouteMatcher` from `src/proxy.ts` entirely, keeping bare `clerkMiddleware()` for the request context `auth()`/`currentUser()` need. This is not a security downgrade — `authorize()` in every protected layout/page/action was already the real, sole-source-of-truth enforcement (this file was explicitly documented as "defense-in-depth, not the sole gate" since the identity/RBAC slice), and it matches Clerk's own deprecation guidance to move off `createRouteMatcher` toward resource-based checks. Verified locally and in production: unauthenticated requests to `/dashboard`, `/admin/users`, `/crm/leads` still correctly redirect (now via the `(app)` layout's `getCurrentUser()` check rather than middleware); the previously-404ing RSC-shaped request now returns 200.

**Files changed:**
- `src/db/schema.ts`, `scripts/seed.ts` (unaffected by source-enum, no permission changes needed), `drizzle/0002_flaky_donald_blake.sql` (hand-edited — see Fix 1), `src/lib/crm/leads.ts` (+`LeadSource` type, `LEAD_SOURCE_LABELS`, `parseLeadSource`), `src/lib/crm/leads.test.ts` (+3 tests), `src/app/(app)/crm/leads/actions.ts`, `src/app/(app)/crm/leads/page.tsx`, `src/app/(app)/crm/leads/[id]/page.tsx` (select instead of input for source).
- `src/proxy.ts` — rewritten, see Fix 2.
- `docs/security/THREAT_MODEL.md` — Broken access control row updated (single enforcement layer now, not defense-in-depth-over-middleware), new gap 7 documenting the change and why a future production Clerk instance could safely reintroduce middleware protection.

**Tests:** `bun run test` (28/28), `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean before each deploy. Verified live in production after each fix (curl with real navigation vs. RSC-prefetch headers; audit log inspection; user's own browser for the button behavior).

**Privacy/security impact:** Fix 2 removes a redundant enforcement layer but does not reduce actual protection — confirmed by testing that unauthenticated access is still denied via the remaining layer. Flagged as a real (if narrow) risk in THREAT_MODEL.md gap 7: a future page that forgets to call `authorize()` now has no middleware fallback to catch it. Code review discipline matters more now than it did with the (buggy) belt-and-suspenders middleware in place.

**Unresolved risk:**
- The underlying Clerk dev-instance limitation (no production domain) still exists — this fix works around its consequence for RSC fetches specifically, but doesn't resolve the root cause. User confirmed no domain is available yet for a full Clerk production migration; that's deferred as a separate, deliberate task (needs domain acquisition + DNS + new OAuth credentials + re-registering the webhook against a new production signing secret).
- Everything carried over from Entry 9 unchanged.

**Device/browser impact:** This entry's fixes were driven BY real browser testing (the user's), which is exactly the verification step Entry 9 was waiting on. Confirmed working in their actual browser session after Fix 2 deployed — pending their explicit re-confirmation message, but the technical verification (curl RSC-shape test returning 200, audit log showing continued correct behavior) is solid.

**Next task:** User re-verifies buttons now work without needing manual refresh. Then, whenever ready: Projects (P1 item 3), and separately, a deliberate decision on the Clerk production-domain migration (needs: a domain, Google OAuth production credentials, new webhook registration) — not urgent, but real, and now doubly motivated since it would also let middleware-level `auth.protect()` be safely reintroduced.

---

## Entry 11 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (CRM slice, second round of real-browser-driven fixes)

**Objective:** User tried converting a lead to a client and reported it "seemed not showing," plus asked for a structured/country-adaptive billing address (explicit examples: Philippines needs street 1/2, barangay, city, province, ZIP; US needs street 1/2, city, state, ZIP) and general "fluency" fixes.

**Investigation (Fix 1 — the crash):** Pulled the actual server error via `vercel logs --environment production` instead of guessing from the client-side symptom. Found: `Error: Cannot move a lead from "qualified" to "qualified"` — the user had double-clicked "Mark qualified"; the first click succeeded, the second (already in flight or clicked before the UI updated) correctly failed my own transition-validation check, but as an ugly uncaught crash instead of a graceful no-op. Root cause: **no form in the app disabled its submit button while its action was in flight**, so any status-changing button was vulnerable to this exact double-submit race. The client that appeared to exist without the lead updating was created via a *separate*, manual "New client" submission the user made afterward as a workaround — not by the (never-actually-reached) convert action.

**Fix 1:** Made `changeLeadStatus`, `claimLead`, and `convertLeadToClient` idempotent for the "already in the target state" case (return/redirect instead of throwing) — the end state the user wanted was already true, so there's no reason to error.

**Fix 2 (the "fluency" ask, broad):** Built `src/components/submit-button.tsx` (`useFormStatus`-based, disables + shows a pending state while its form's action runs) and swapped all 14 plain `<button type="submit">` instances across the app to use it. This closes off the whole class of double-submit bugs Fix 1 patched one instance of, not just the lead-status case.

**Fix 3 (structured address, the large ask):** Replaced `clients.billingAddress` (free text) with 7 structured columns (`billingLine1/2`, `billingSubLocality`, `billingCity`, `billingStateProvince`, `billingPostalCode`, `billingCountry`). Migration note: `drizzle-kit generate` wanted an interactive prompt to disambiguate "is this a rename?" (no TTY available in this environment) — worked around it by splitting into two unambiguous migrations (add 7 columns + backfill the one existing free-text value into `billingLine1`, then drop the old column), rather than hand-writing the drizzle-kit meta snapshot JSON (too easy to get subtly wrong and corrupt future diffing).

Built `src/lib/countries.ts` (full ISO 3166-1 English short-name list, public standardized data, not invented) and `src/lib/address.ts` (per-country field labels/visibility). Deliberately only hand-tuned labels for PH, US, CA, GB, AU — countries whose conventions are well-established enough to state confidently — everything else gets sensible generic labels ("State / Province / Region", "Postal code") rather than guessed conventions for the other ~185 countries, which risked being wrong. `src/components/address-fields.tsx` is a client component (needs interactivity: labels change live as the country dropdown changes) rendering the country select + adaptive fields with fixed form field names.

**Files changed:** `src/db/schema.ts`, `drizzle/0003_flaky_tusk.sql` (add + backfill), `drizzle/0004_needy_pete_wisdom.sql` (drop old column), `src/lib/countries.ts` (new), `src/lib/address.ts` (new), `src/lib/address.test.ts` (new, 8 tests), `src/components/address-fields.tsx` (new), `src/components/submit-button.tsx` (new), `src/app/(app)/crm/leads/actions.ts` (idempotency), `src/app/(app)/crm/clients/actions.ts` (structured address), `src/app/(app)/crm/clients/page.tsx`, `src/app/(app)/crm/clients/[id]/page.tsx`, plus every file touched for the submit-button swap (`crm/leads/page.tsx`, `crm/leads/[id]/page.tsx`, `admin/users/page.tsx`, `admin/service-types/page.tsx`).

**Tests:** `bun run test` (37/37, up from 28), `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean. Verified the address migration against live data: the one existing client's free-text `"Makati"` billing address correctly landed in `billing_line1` after both migrations ran, nothing lost.

**Privacy/security impact:** None new — this is UX/data-modeling work on an already-access-controlled surface. `parseAddressFields()` validates the country code against the real ISO list server-side (not just trusting the client-side select), consistent with the app's existing pattern of never trusting client-submitted enum-like values (see `parseRoleSlug`, `parseLeadSource`).

**Unresolved risk / known limitations:**
- Country-specific address labels are only accurate for 5 countries (PH, US, CA, GB, AU); everything else uses generic labels. This was a deliberate scope decision (stated to the user implicitly through the code comments, not yet explicitly confirmed with them) rather than fabricating conventions for 190+ countries without a canonical reference — flag if the user expected full per-country accuracy.
- No postal-code format validation (e.g. PH ZIP is 4 digits, US ZIP is 5 or 9) — fields accept any text. Not currently a blocker, but a natural next hardening step if data quality matters more later.
- Leads still have a single free-text `location` field (PRD's general field notes/site location, not a formal billing address) — not restructured, since the user's request was specifically about billing address.
- Everything carried over from Entry 10 unchanged (Clerk production domain still not configured; that's still separate and deliberate).

**Device/browser impact:** Not yet re-verified by the user in a real browser after this round of fixes (unlike the previous "buttons not working" cycle, which they confirmed themselves). Recommend they retry: double-click a status button (should no longer crash, button should visibly disable), and try creating/editing a client with a Philippines address (should show Barangay + Province fields) and a US address (should show State + ZIP) to confirm the adaptive labels work as asked.

**Next task:** User verification of both fixes in their browser. Then Projects (P1 item 3), same as Entry 10's next-task note.

---

## Entry 12 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (CRM slice, real Philippine cascading address data)

**Objective:** User asked for real cascading Province -> City -> Barangay dropdowns with postal-code auto-fill (explicit example: Cavite -> Kawit/Imus/General Trias/Tanza -> Tabon I/Tabon II), and asked for "similar practice" for other countries.

**Scope-setting (before writing code):** Flagged clearly that hand-authoring a ~42,000-barangay database from memory was not something to attempt — wrong data presented as authoritative would be worse than the existing free-text fields. Checked npm for real, community-maintained packages instead of fabricating. Confirmed the user's own example against real data *before* proposing anything (see below) rather than assuming a package was trustworthy from its README alone. Asked the user to scope this explicitly rather than silently deciding: they chose PH-real-data-now, other-countries-stay-as-is (a global equivalent would need a paid address-autocomplete API like Google Places — flagged as a separate future decision, not attempted here).

**What was verified before adopting:**
- `psgc` (PSA Standard Geographic Code data, MIT, zero deps): queried it directly — Cavite's municipality list includes Kawit, Imus, General Trias, Tanza (user's exact example); Kawit's barangay list includes "Tabon I" and "Tabon II" (user's exact example, including the numbering style).
- `use-postal-ph` (postal codes per municipality, MIT): Kawit's postal code returned as 4104, which matches public record (general knowledge check, not just trusting the package).

**Implementation:**
- `src/lib/ph-address.ts` — thin wrapper: `getPhProvinces()`, `getPhMunicipalities(province)`, `getPhBarangays(province, municipality)` (matched by name AND province, since some municipality names repeat across provinces — e.g. "San Fernando" — and the flat `municipalities.filter()` API alone can't disambiguate), `getPhPostalCode(municipality)`.
- `src/components/address-fields.tsx` — rewritten: when country === "PH", renders real cascading `<select>`s (Province -> City/Municipality -> Barangay) with postal code auto-fill on municipality change (still editable, in case of override); every other country keeps the existing free-text fields with adaptive labels from Entry 11 unchanged. The PSGC module is dynamically `import()`-ed only when PH is selected — confirmed via build output that it lands in its own ~2.8MB chunk, not the shared bundle every visitor downloads.
- 6 new tests in `src/lib/ph-address.test.ts`, directly encoding the user's own example as the regression check (Cavite/Kawit/Tabon I+II/4104) plus a province-mismatch edge case and a not-found case.
- Two lint fixes surfaced by this work (not suppressed): `use-postal-ph`'s exported factory function is literally named `usePostalPH`, which eslint's `react-hooks/rules-of-hooks` flags as a hook by naming convention even though it isn't one — renamed on import (`createPostalPhClient`) rather than disabling the rule. Also fixed a genuine `setState`-in-effect anti-pattern in the loading-state logic (derived `phLoading` from existing state instead of a redundant `useState`).
- `docs/integrations/DEPENDENCY_REGISTRY.md` — new row for both packages, including the explicit caveat that only the user's own example was individually spot-checked, not all ~1,600 municipalities.

**Files changed:** `src/lib/ph-address.ts` (new), `src/lib/ph-address.test.ts` (new), `src/components/address-fields.tsx` (rewritten), `package.json`/`bun.lock` (added `psgc`, `use-postal-ph`), `docs/integrations/DEPENDENCY_REGISTRY.md`.

**Tests:** `bun run test` (43/43, up from 37), `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean. Confirmed via `.next/static/chunks` inspection that the PSGC data landed in an isolated chunk (lazy-loaded), not the main bundle.

**Privacy/security impact:** None new — static reference data bundled at build time, no new external calls or data flows. `billingSubLocality`/`billingCity`/`billingStateProvince`/`billingPostalCode` are still plain text columns server-side (no new validation added there beyond what Entry 11 already has) — the cascading UI makes it *easier* to enter correct PH data but doesn't enforce it came from the dropdown (a user could still submit arbitrary text via a non-JS client or by editing the DOM; not a new risk, this was already true for every field).

**Unresolved risk / known limitations:**
- Only the user's own example (Cavite/Kawit) was individually verified against real-world knowledge. The other ~1,600 PH municipalities' data is trusted from the upstream package, not independently checked one by one — realistic given the scale, but worth knowing if a user ever reports a specific wrong barangay or postal code.
- Postal codes are per-municipality, not per-barangay (matches how Philippine ZIP codes actually work in most cases — a few very large cities like Manila have district-level codes the auto-fill won't capture correctly, but the field stays editable).
- Global "similar practice" for other countries is explicitly NOT built — user chose to defer that, and it would need a paid API (Google Places Autocomplete or similar), a separate vendor decision.
- Everything else carried over from Entry 11 unchanged.

**Device/browser impact:** Not yet verified by the user in a real browser. Recommend: pick Philippines as country, confirm Province -> City -> Barangay cascades correctly and postal code auto-fills (try Cavite -> Kawit specifically, matching the original example), then confirm switching back to a non-PH country (e.g. United States) correctly reverts to the free-text State/ZIP fields.

**Next task:** User verification of the PH cascading address flow. Then Projects (P1 item 3), same as prior entries' next-task note.

---

## Entry 13 — 2026-08-09 — Claude Code (Sonnet 5)

**Role:** Builder (CRM slice, fix for a real user-reported data gap in Entry 12's PH address feature)

**Objective:** User tested Entry 12's PH cascading address feature and reported: "Kawit is working but when I tried other locations it isn't working" (screenshot: Cavite -> Imus selected, Barangay dropdown stuck on the placeholder, ZIP blank). Root-caused and fixed.

**Root cause:** Direct inspection of `psgc`'s actual exported data (not assumed from its README) showed it returns **zero barangays for every actual *city* in Cavite** — Bacoor, Cavite City, Dasmariñas, Imus, Tagaytay, Trece Martires — and one municipality, General Trias. Entry 12's spot-check happened to only test Kawit, which is a *municipality*, not a *city*, so this class of gap wasn't caught before shipping. This was psgc's own data gap, not a bug in `ph-address.ts`'s integration code.

**Alternatives evaluated before switching:**
- `select-philippines-address` — rejected. `npm audit` (run in a scratchpad-only test install, never added to the real project) showed a severely outdated `axios` transitive dependency with multiple unfixed high-severity CVEs (SSRF, credential leakage, prototype pollution, "No fix available").
- `phil-reg-prov-mun-brgy` (MIT, zero runtime deps) — adopted. Verified directly before switching: Imus now returns 97 real barangays, Kawit still returns 23 including "Tabon I"/"Tabon II" (Entry 12's original example still holds). Ran a full coverage sweep afterward (standalone Node script, not just spot-checks): 0 of 1,641 listed cities/municipalities across all 88 provinces return zero barangays — the class of bug that broke Imus is closed for every entry this package actually lists.

**New gap found by the broadened test suite itself:** this package's Cavite city list is missing "Dasmariñas" entirely (21 entries vs. the real 23 LGUs) — a different failure mode than psgc's (an *absent* entry, not an *empty-barangay* one), so the coverage sweep (which only iterates entries that exist) can't catch it. Rather than treating this as fully solved, added a real mitigation: `AddressFields` now has a "Can't find your city or barangay? Enter it manually" toggle that switches those two fields to free text so a user is never blocked, whether or not other individual cities are missing elsewhere in the country (not exhaustively checked).

**Implementation:**
- `bun remove psgc && bun add phil-reg-prov-mun-brgy`.
- `src/lib/ph-address.ts` — rewritten against the new package's API (`getCityMunByProvince`, `getBarangayByMun`), with a `normalizeName()` step to convert its ALL-CAPS, suffix-inconsistent naming ("IMUS CITY", "TRECE MARTIRES CITY (Capital)", "GEN. MARIANO ALVAREZ") into clean Title Case for both display and matching against `use-postal-ph`'s plainer naming. Public function signatures unchanged, so `AddressFields.tsx` needed no changes for the swap itself.
- `src/types/phil-reg-prov-mun-brgy.d.ts` (new) — the package ships no TypeScript types; a minimal ambient declaration was needed to clear `tsc`'s `TS7016`.
- `src/lib/ph-address.test.ts` — regression tests for the 5 previously-broken Cavite cities that this package does list, plus a broad sanity check iterating every province/city it returns. Dasmariñas intentionally excluded from the hardcoded regression list with a comment explaining why (it's a known absent-entry gap, not the empty-barangay bug the test exists to catch).
- `src/components/address-fields.tsx` — added the manual-entry fallback described above.
- `docs/integrations/DEPENDENCY_REGISTRY.md` — updated the PH geo/postal row: new package, the `select-philippines-address` CVE rejection, and the disclosed Dasmariñas gap.

**Files changed:** `src/lib/ph-address.ts`, `src/lib/ph-address.test.ts`, `src/types/phil-reg-prov-mun-brgy.d.ts` (new), `src/components/address-fields.tsx`, `package.json`/`bun.lock` (removed `psgc`, added `phil-reg-prov-mun-brgy`), `docs/integrations/DEPENDENCY_REGISTRY.md`.

**Tests:** `bun run lint`, `bunx next typegen && bunx tsc --noEmit`, `bun run test` (46/46), `rm -rf .next && bun run build` — all clean.

**Privacy/security impact:** None new — same as Entry 12 (static reference data, no new external calls). The manual-entry fallback doesn't loosen server-side validation; `billingCity`/`billingSubLocality` were always plain text columns regardless of whether the UI presented a dropdown or a text input.

**Unresolved risk / known limitations:**
- Dasmariñas, Cavite is confirmed absent from this dataset's city list; other individual missing cities elsewhere in the country are possible but not exhaustively checked. Mitigated via the manual-entry toggle rather than left as a silent dead end.
- Same postal-code-is-per-municipality caveat as Entry 12 (a few large cities have district-level codes the auto-fill won't capture; field stays editable).
- Global "similar practice" for non-PH countries remains explicitly deferred (Entry 12's scoping decision, unchanged).

**Device/browser impact:** Not yet re-verified by the user in a real browser. Recommend: retry the exact case from their bug report (Cavite -> Imus, confirm barangays now populate and ZIP auto-fills to 4103), then try Cavite -> Dasmariñas specifically to confirm it's absent from the dropdown but the manual-entry toggle lets them enter it anyway.

**Next task:** User verification of this fix (especially the originally-reported Imus case). Then Projects (P1 item 3), same as prior entries' next-task note.

---

## Entry 14 — 2026-08-10 — Claude Code (Sonnet 5)

**Role:** Builder (Projects vertical slice, P1 item 3)

**Objective:** Client (Point View) asked for a status check against the original Core MVP proposal ahead of the 2026-08-13 scope meeting; the deployed build was found to have Identity/RBAC + CRM/Intake shipped but no Projects entity at all — the next item in this file's own plan. Built it.

**What shipped:** `projects` table (project number, client, service type, location, status, current stage, blocker, start/target/actual dates, billing-status placeholder) + `project_members` join table (PRD §18's `ProjectMember`) — schema, migration (`drizzle/0005_clever_stick.sql`, purely additive: 2 new tables + 1 new enum, no changes to existing tables), `src/lib/projects.ts` (status parsing + scoping helpers), server actions (`createProject`, `updateProject`, `addProjectMember`, `removeProjectMember`), `/projects` list page (with scoped create form) and `/projects/[id]` detail page (edit form + team roster), nav link, seed permissions/grants.

**Scoping decision (the one worth flagging closely):** PRD §12's Projects row and Clients row both say "Admin=Full/Assigned" — but they were resolved *differently*. Clients (built first) had no assignment mechanism to scope against, so "Full/Assigned" was granted as full unscoped manage. Projects introduces `ProjectMember`, a real mechanism, so this slice reads "Full/Assigned" literally: `administrative_staff` is scoped to projects they're a member of (mirrors `leadInScope`/Lead assignment exactly), auto-added as a member on creation so they aren't locked out of what they just made. Field Team Leader/Survey-Field Personnel/CAD Operator/Technical Reviewer get scoped **read-only** (no `projects:manage` yet — their real write actions belong to their own future slices: Field Operations, Technical Processing, Review/Approval). Finance gets unscoped read (billing needs cross-project visibility). Sales gets no access at all ("Pre-project" read as: their involvement ends at Client creation per PRD §13). All flagged in `docs/security/RBAC_MATRIX.md`'s Interpretation notes for client validation, same practice as every prior ambiguous PRD cell.

**A real bug caught before it shipped:** first draft of `removeProjectMember` used `eq(a) && eq(b)` as a Drizzle `where()` condition instead of `and(eq(a), eq(b))` — in JS, `&&` on two truthy objects just evaluates to the second operand, so the query would have silently filtered by `userId` alone and deleted that user's membership from **every** project, not just the one specified. Caught on re-reading the action before running it, not by a test (no test covers this path — see Unresolved risk below). Fixed to `and(...)`.

**Files changed:** `src/db/schema.ts` (projects, projectMembers tables + relations), `drizzle/0005_clever_stick.sql` (new), `src/lib/projects.ts` (new), `src/lib/projects.test.ts` (new, 12 tests), `src/app/(app)/projects/actions.ts` (new), `src/app/(app)/projects/page.tsx` (new), `src/app/(app)/projects/[id]/page.tsx` (new), `src/app/(app)/layout.tsx` (nav link), `scripts/seed.ts` (2 new permissions, 9 new grants, updated header comment), `docs/security/RBAC_MATRIX.md`, `docs/IMPLEMENTATION_PLAN.md`.

**Tests:** `bun run lint`, `bunx next typegen && bunx tsc --noEmit`, `bun run test` (58/58, up from 46), `rm -rf .next && bun run build` — all clean. Migration applied against the dev database (`bun run db:migrate`) and seed re-run (idempotent, `bun run db:seed` — 10 permissions/35 grants, up from 8/21). **Not yet done:** no server action has been exercised against real data in a browser — this is unit-tested + build-verified only, same starting point Entry 6 (CRM slice) was at before its own round of user-reported bugs (idempotency, button state, address structure). Expect a similar follow-up cycle once the user clicks through it.

**Privacy/security impact:** New personal data surface: `ProjectMember` links users to projects (who's on what project — operationally necessary, not excess collection). `projects` table has no new sensitive-data classification beyond what `clients`/`leads` already carry (project number, location, dates, billing-status text — no new category of personal data). Server-side authorization follows the established single-gate pattern (`authorize()` + `resourceInScope`) — no route reads `projects:*` state without going through it. `billingStatus` is free text with no validation, same posture as other free-text operational fields elsewhere in the app.

**Unresolved risk / known limitations:**
- Not yet verified by the user in a real browser (see Tests above) — recommend: sign in as an unscoped role (System Administrator or Owner/GM) first to create a project and confirm the client/service-type dropdowns populate correctly, then (if a second test account with `administrative_staff` exists) confirm that role only sees projects it's a member of.
- No test directly exercises `removeProjectMember`'s SQL `where()` clause end-to-end (the bug described above was caught by inspection, not by a failing test) — a integration-level test against a real/test DB would close this gap; none of this repo's current tests hit the database (all are pure-function unit tests), so this is a pre-existing gap in the test strategy, not one newly introduced here.
- `billingStatus`/`currentStage`/`blocker` are unvalidated free text — intentional for now (see IMPLEMENTATION_PLAN.md's note that Workflow/Billing slices will formalize these), but worth knowing if the client expects structure here already.
- Project member picker has no search/pagination (plain `<select>` over all active users) — fine at current user-base size, called out in RBAC_MATRIX.md's Known limitations.
- Everything carried over from Entry 13 unchanged (PH address handling, Dasmariñas gap, MFA disabled pending Clerk Pro decision).

**Device/browser impact:** Not yet verified — same caveat as Tests above.

**Next task:** User verification of the Projects slice in a real browser (create a project, confirm client/service dropdowns, confirm scoped-role visibility if a second test account exists). Then Workflow engine (P1 item 4) — templates, stages, dependencies, checklists, approval gates, per `docs/IMPLEMENTATION_PLAN.md` §2.

---

## Entry 15 — 2026-08-11 — Claude Code (Sonnet 5)

**Role:** Security/Privacy Reviewer (RBAC correction on the Projects slice) — executed from a written review instruction the user supplied (`POINT_VIEW_RBAC_REVIEW_CLAUDE_DOCTOR_CLEANUP_AND_PRODUCTION_READINESS_INSTRUCTION.md`), not self-initiated. Explicit stop condition in that instruction: no production deployment during this pass.

**Objective:** Entry 14 shipped `projects:manage` as a single permission covering both ordinary project editing (client, status, dates, etc.) and team-roster changes (`addProjectMember`/`removeProjectMember`). Review instruction identified this as too broad: changing who's on a project's `ProjectMember` roster changes who is *authorized* on that project at all, not just what data looks like — a materially different, higher-stakes action than editing a text field, and it deserved its own permission rather than riding along on `projects:manage`.

**What was already correct** (confirmed, not changed): System Administrator/Owner-GM unscoped full access; Administrative Staff scoped to assigned projects; Field Team Leader/Survey-Field Personnel/CAD Operator/Technical Reviewer scoped read-only; Finance unscoped read-only; Sales no access. All of Entries 14's role-scoping judgment calls held up under review — the only real finding was the membership/editing bundling.

**What changed:**
- New permission `projects:manage_members`, granted only to `system_administrator`/`owner_gm` (unscoped) — `administrative_staff` explicitly does NOT get it by default (documented as a pending Point View decision if they should later).
- `src/lib/projects.ts`: added `hasUnscopedProjectManageMembers` and `projectMembersInScope` (new, separate from `projectInScope` — not a reuse, so the two scopes can diverge independently later).
- `src/app/(app)/projects/actions.ts`: `addProjectMember`/`removeProjectMember` now authorize on `projects:manage_members` instead of `projects:manage`. `createProject`'s auto-add-creator-as-member bootstrap behavior is unchanged and deliberately does NOT route through the new permission (documented inline why: it's a one-time creation side effect, not a standing grant of membership-management authority).
- `src/app/(app)/projects/[id]/page.tsx`: split the page's single `canManage` boolean into `canManage` (edit form) and a new `canManageMembers` (roster add/remove UI) so the UI can't show controls the server would reject anyway.

**A real bug caught by a test, not by inspection this time:** first draft of `projectMembersInScope` mirrored `projectInScope`'s pattern — unscoped roles pass, otherwise fall back to "is this user a project member." Two new unit tests (`src/lib/projects.test.ts`) calling the function directly, bypassing `authorize()`'s permission-possession gate, failed: `administrative_staff` (a real project member, but holding `projects:manage` not `projects:manage_members`) came back "in scope" for membership administration. The function was only safe in production because `authorize()` always checks `permission_granted` before calling `resourceInScope` — but that's safety-by-caller-discipline, not safety-by-construction, and this codebase has been deliberately avoiding that pattern (see `authorize.ts`'s own `evaluateAllow` being unit-testable specifically so deny-by-default logic doesn't depend on mocking the whole call chain). Fixed: `projectMembersInScope` has no membership-based fallback at all now — returns `hasUnscopedProjectManageMembers(user)` and nothing else, since no scoped role currently holds the permission to have a fallback rule for. Documented in the function's own comment why a future scoped grant needs a deliberate rule + test, not a restored generic fallback.

**Files changed:** `src/lib/projects.ts`, `src/lib/projects.test.ts` (+6 tests, 12→18 in this file), `src/app/(app)/projects/actions.ts`, `src/app/(app)/projects/[id]/page.tsx`, `scripts/seed.ts` (new permission + grants + comment), `docs/security/RBAC_MATRIX.md` (new "Project membership administration" section, required-clarification blockquote per the review instruction, updated Known limitations), `docs/security/THREAT_MODEL.md` (gap 3 resolved with the bug-caught-by-test account, "Broken access control" row updated).

**Tests:** `bun run lint`, `bunx next typegen && bunx tsc --noEmit`, `bun run test` — first run caught the `projectMembersInScope` bug (2 failing tests), fixed, re-ran clean: **64/64 passing** (up from 58 in Entry 14). `rm -rf .next && bun run build` clean. No schema/migration change needed (permissions are data rows, not schema) — `bun run db:seed` re-run (idempotent), then independently verified against the dev DB directly (a one-off script, not committed) that `projects:manage_members` landed on exactly `[owner_gm, system_administrator]` and `projects:manage` is unchanged at `[administrative_staff, owner_gm, system_administrator]`. No stale-grant reconciliation was needed — `administrative_staff`'s existing `projects:manage` row is untouched; the correction is enforced by which permission the server action checks, not by revoking a grant.

**Security assessment against the review instruction's checklist:**
- Cross-project read/write blocked: unchanged from Entry 14, re-verified by the existing `projectInScope` tests, still passing.
- Membership escalation blocked: **this was the actual finding** — fixed as described above.
- Direct-action bypass blocked: `addProjectMember`/`removeProjectMember` call `authorize()` themselves (not relying on the page hiding a button) — unchanged pattern from Entry 14, still holds under the new permission.
- ID enumeration / role privilege escalation: no new surface introduced by this change; out-of-scope resources still 404, not 403 (deliberately preserved per the review instruction's §18 — no proven issue found with that convention, so it wasn't touched).
- **Not done this pass**: no live database-level negative-authorization tests (guessed IDs, direct server-action calls with a manipulated `projectId`, suspended-user-mid-session, etc.) — this repo's test suite is 100% pure-unit (no test hits a real or test database anywhere, a gap already flagged in Entry 14 and every entry before it). The review instruction's Section 23/24 ask for these; they're not satisfied by what shipped today. Flagging explicitly rather than claiming coverage that doesn't exist.

**Unresolved risk / known limitations:**
- The database-level negative-test gap above is the most important carry-forward — unit tests prove the *scoping functions* are correct in isolation (and just proved their value by catching a real bug), but nothing proves the full request-to-response path enforces them against a real Postgres instance with real rows. Recommend this become explicit scope in a future slice rather than staying an ambient gap.
- `createProject`'s project-insert + membership-insert sequence is NOT wrapped in a database transaction — the `neon-http` Drizzle driver this app uses does not support transactions (confirmed via `node_modules/drizzle-orm/neon-http/migrator.d.ts`'s own note), the same pre-existing constraint every other multi-insert flow in this codebase (e.g. `convertLeadToClient`) already lives with. Documented inline in `createProject` as "safely ordered, not atomic" — a crash between the two inserts leaves the creator locked out of a project they made (fail-safe: less access than intended) rather than anyone gaining access they shouldn't (fail-open). Not fixed this pass — would need a driver change (e.g. a pooled/WebSocket Neon connection) to get real transactions, out of scope for a permissions correction.
- VTA (Revision 2's named operational role) still has no permission model — explicitly not invented this pass, tracked in `docs/security/RBAC_MATRIX.md`'s Known limitations, per the review instruction's explicit direction not to guess at it.
- Everything from Entry 14 not touched by this review remains as documented there (PH address handling, MFA disabled pending Clerk Pro, no in-app invite flow, etc.).

**Deployment status:** Not deployed. Committed and left for the user to push/deploy on their own schedule — the review instruction this entry executed explicitly prohibits production deployment during this pass, and no request to deploy was given for this change specifically.

**Next task:** Human review of this permission split (particularly whether `administrative_staff` should eventually get `projects:manage_members` for their own assigned projects — currently defaulted to no). Database-level negative-authorization tests (Sections 23-24 of the review instruction) if that coverage gap is worth closing before Workflow engine (P1 item 4) starts. Otherwise, Workflow engine is still next per `docs/IMPLEMENTATION_PLAN.md`.
