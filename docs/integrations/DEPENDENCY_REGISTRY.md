# Dependency / Supply-Chain Registry

Per `/TECHNICAL_ARCHITECTURE.md` §11 and `/AGENTS.md` Phase M. Every runtime dependency and third-party service must have a row here before it is adopted, with the fields below. Update this file in the same change that introduces or removes a dependency — do not let it drift from reality.

**Status as of 2026-08-09:** the Vercel-native direction below (hosting, Marketplace Postgres, Vercel Blob, managed auth) is **confirmed** by the user (see `docs/IMPLEMENTATION_PLAN.md` §1). Nothing is provisioned yet — rows move from "Confirmed direction" to "Provisioned" as each service is actually set up, with real vendor/region/SLA details replacing the TBDs. When provisioning, use a real, tested connection — not a placeholder — consistent with the "no fake integrations" rule in `/AGENTS.md` §3.

---

## Core runtime

| Field | Value |
|---|---|
| Vendor/service | Next.js (Vercel) |
| Purpose | Application framework — SSR/App Router, API routes |
| Data processed | All application data passes through this layer |
| Region | Deployment region TBD pending data-residency confirmation |
| Authentication | N/A (framework, not a data processor) |
| Permissions | N/A |
| SLA | Per hosting provider once deployed |
| Rate limits | N/A at framework level; app-level rate limiting required per PRD §8 |
| Security/privacy docs | https://nextjs.org/docs (framework-level; no PII handling of its own) |
| Subprocessors | N/A |
| Cost | Free (OSS framework); hosting cost tracked under hosting row |
| Fallback | N/A — core framework choice, not swappable mid-project without major rework |
| Exit/migration plan | N/A |
| Status | **Confirmed direction — not yet scaffolded** |

## Hosting/compute

| Field | Value |
|---|---|
| Vendor/service | Vercel |
| Purpose | Application hosting, serverless/edge compute, CI/CD integration |
| Data processed | All application traffic and compute |
| Region | TBD — confirm data-residency requirement under Philippine DPA before selecting region |
| Authentication | Vercel account/org (admin-controlled) |
| Permissions | Deployment + env var access — restrict to authorized engineers only |
| SLA | Per Vercel plan tier — confirm before production commitment |
| Rate limits | Function invocation limits per plan |
| Security/privacy docs | https://vercel.com/docs/security |
| Subprocessors | Vercel's own subprocessor list — review before production |
| Cost | Plan-dependent — confirm budget with client |
| Fallback | Self-hosted Next.js (Node server) if platform lock-in becomes a concern |
| Exit/migration plan | Next.js is portable off Vercel to any Node host; document actual migration steps if/when needed |
| Status | **Confirmed direction — not yet provisioned** |

## Database

| Field | Value |
|---|---|
| Vendor/service | Neon Postgres via Vercel Marketplace — resource `neon-purple-tree` |
| Purpose | Primary structured data store: users, RBAC, projects, workflow state, audit/security events, retention metadata |
| Data processed | Personal data (client/employee), project data, audit evidence — classify per `docs/privacy/DATA_MAP.md` |
| Region | `sin1` / AWS `ap-southeast-1` (Singapore) — chosen for latency to Philippines-based users; no confirmed legal residency requirement (Philippine DPA does not mandate strict in-country localization). Originally provisioned in `us-east-1`, recreated in `ap-southeast-1` 2026-08-09 before any schema/data existed. |
| Authentication | `DATABASE_URL` / `DATABASE_URL_UNPOOLED` / `PG*` / `POSTGRES_*` env vars, auto-provisioned into `.env.local` (gitignored) — never committed |
| Permissions | Default Neon role from provisioning; scope down to an app-specific least-privilege role before the identity/RBAC slice ships |
| SLA | Neon's Vercel Marketplace plan tier |
| Rate limits | Connection pool limits per plan (pooled `DATABASE_URL` provided) |
| Security/privacy docs | https://neon.tech/privacy-policy, https://neon.tech/terms-of-service |
| Subprocessors | Neon (AWS-hosted) |
| Cost | Plan-dependent — monitor via Vercel billing |
| Fallback | Self-hosted Postgres if managed option is rejected |
| Exit/migration plan | Standard `pg_dump`/logical replication — Postgres is not proprietary |
| Status | **Provisioned in `sin1`/`ap-southeast-1` 2026-08-09 — no schema exists yet** |

## Private object storage

| Field | Value |
|---|---|
| Vendor/service | Vercel Blob (private) — store name `point-view-storage` |
| Purpose | Field photos, technical files, document versions — private-by-default, signed short-lived access per `/TECHNICAL_ARCHITECTURE.md` §15 |
| Data processed | Potentially sensitive project/field imagery and documents |
| Region | `sin1` (Singapore) — chosen for latency to Philippines-based field/office users; no confirmed legal residency requirement exists (Philippine DPA does not mandate strict in-country localization), this is a UX/latency decision made 2026-08-09. Originally provisioned in `iad1` (US East) then recreated in `sin1` before any data existed. |
| Authentication | `BLOB_READ_WRITE_TOKEN` (auto-provisioned into `.env.local`, gitignored) — signed URL generation server-side only |
| Permissions | Project-scoped access classification, enforced server-side (not yet implemented — no app code exists yet) |
| SLA | Vercel plan tier |
| Rate limits | Vendor-dependent |
| Security/privacy docs | https://vercel.com/docs/vercel-blob/private-storage |
| Subprocessors | Vercel's subprocessor list |
| Cost | Usage-based — monitor as field upload volume grows |
| Fallback | S3-compatible alternative if this choice is rejected |
| Exit/migration plan | Bulk export via `vercel blob list` / API |
| Status | **Provisioned in `sin1` 2026-08-09** |

## Authentication provider

| Field | Value |
|---|---|
| Vendor/service | Clerk via Vercel Marketplace — resource `clerk-orange-bucket` |
| Purpose | Login, session management, MFA for System Administrator (mandatory) and privileged roles (recommended) per PRD §8 |
| Data processed | Credentials, session tokens, MFA enrollment data — highly sensitive |
| Region | Not yet confirmed — check Clerk instance settings in its dashboard before production; not exposed via the provisioned env vars |
| Authentication | `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, auto-provisioned into `.env.local` (gitignored). Webhook: `CLERK_WEBHOOK_SIGNING_SECRET` — endpoint registered 2026-08-09 in Svix (Clerk's webhook infra, app `clerk-orange-bucket`) pointing at `https://point-view-operations-platform.vercel.app/api/webhooks/clerk`, subscribed to `user.created`/`user.updated`/`user.deleted`. Secret set in Vercel (Production + Preview as sensitive, Development as plain) and pulled to `.env.local`. Verified live: an unsigned test POST to the endpoint correctly returned 400 "Verification failed." |
| Permissions | Admin console access restricted to System Administrator role (to be enforced once RBAC exists — Clerk dashboard access itself should also be restricted to authorized engineers only) |
| SLA | Clerk's Vercel Marketplace plan tier |
| Rate limits | Confirm Clerk's built-in brute-force/login-attempt protection is enabled in its dashboard before relying on it |
| Security/privacy docs | https://clerk.com/legal/privacy, https://clerk.com/legal/terms |
| Subprocessors | Clerk |
| Cost | Currently **Hobby (free) plan**. Confirmed 2026-08-09 that Hobby does not include ANY MFA strategy — both Authenticator app (TOTP) and SMS are gated behind Clerk **Pro** in the dashboard (Configure → Multi-factor). Upgrading is a pending decision, not yet made. |
| Fallback | Self-hosted auth (e.g., NextAuth + Postgres) if managed vendor rejected — higher engineering burden for MFA/session security |
| Exit/migration plan | Confirm user-export capability before real users are created — auth vendor lock-in is high-risk to migrate later |
| Status | **Provisioned and integrated (webhook live, sign-in working). MFA enforcement is app-level code that exists but is deliberately disabled** (`MFA_ENFORCEMENT_ENABLED = false` in `src/lib/auth/mfa.ts`) **because the Hobby plan has no MFA strategy to enforce.** PRD §8 requires MFA mandatory for System Administrator before production — this is a tracked, deliberate pre-production gap, not an oversight. Resolve by upgrading to Clerk Pro (or choosing an alternative MFA path) and flipping that one constant back to `true`. |

## AI provider (proposed, OFF by default)

| Field | Value |
|---|---|
| Vendor/service | Provider-abstracted via AI Gateway — no specific model committed |
| Purpose | Optional/bounded assistance only (summaries, classification, extraction) per PRD §11; not enabled until core workflow (P1) is stable |
| Data processed | Must be minimized per AI governance guardrails — no unnecessary PII in prompts |
| Region | TBD |
| Authentication | API key via secret manager |
| Permissions | Feature-flagged per PRD §11; human-in-the-loop required for all technical outputs |
| SLA | Provider-dependent |
| Rate limits | Token caps, cost caps, rate limits mandatory before enabling (PRD §11) |
| Security/privacy docs | Attach once a provider is selected; confirm no training opt-in without explicit approval |
| Subprocessors | Provider-dependent |
| Cost | Budget cap required before enabling — no open-ended spend |
| Fallback | Deterministic workflow rules — app must remain fully functional with AI OFF (PRD §1) |
| Exit/migration plan | Provider abstraction layer is the exit plan — no direct vendor lock-in by design |
| Status | **Not yet proposed for provisioning — do not enable until `docs/ai/AI_INVENTORY.md` exists and P1 core workflow is stable** |

## Philippine geographic/postal data (npm packages, not a hosted service)

| Field | Value |
|---|---|
| Vendor/service | `phil-reg-prov-mun-brgy` (npm, MIT, zero runtime deps) — community package bundling a region/province/city-municipality/barangay hierarchy. `use-postal-ph` (npm, MIT) — postal codes per municipality. |
| Purpose | Real cascading Province -> City/Municipality -> Barangay dropdowns with postal-code auto-fill for `clients.billing*` fields when the Philippines is selected as billing country — see `src/lib/ph-address.ts`, `src/components/address-fields.tsx`. |
| Data processed | No user/client data sent anywhere — this is static reference data bundled into the app, not an API call. |
| Region | N/A — client-side static data, lazy-loaded (own isolated chunk, only fetched when "Philippines" is selected). |
| Authentication | N/A |
| Permissions | N/A |
| SLA | None — not a live service. Risk is data staleness/gaps (see Status), not availability. |
| Rate limits | N/A |
| Security/privacy docs | https://github.com/wysdom28/phil-reg-prov-mun-brgy, https://github.com/blckclov3r/use-postal-ph |
| Subprocessors | N/A |
| Cost | Free |
| Fallback | If a city/barangay isn't listed, `AddressFields` offers a "Can't find your city or barangay? Enter it manually" toggle that switches those two fields to free text — never a hard blocker. If the whole package is abandoned/inaccurate, the country falls back to the generic free-text city/state/postal fields (same as every other country). |
| Exit/migration plan | Just remove the packages and the PH-specific branch in `AddressFields`; falls back to generic fields automatically. |
| Status | **Switched from `psgc` to `phil-reg-prov-mun-brgy` on 2026-08-09** after a user bug report ("Kawit works, other locations don't") surfaced that `psgc` returns zero barangays for every actual *city* in Cavite (Bacoor, Cavite City, Dasmariñas, Imus, Tagaytay, Trece Martires) and some municipalities (General Trias) — a real upstream data gap, not an integration bug. Also evaluated and **rejected** `select-philippines-address`: `npm audit` showed a severely outdated `axios` transitive dependency with multiple unfixed high-severity CVEs (SSRF, credential leakage, prototype pollution). `phil-reg-prov-mun-brgy` was verified against the user's own example before adopting (Cavite -> Kawit -> "Tabon I"/"Tabon II" barangays, still holds; Kawit's postal code 4104 matches public record) and via a full coverage sweep: 0 of 1,641 listed cities/municipalities across all 88 provinces return zero barangays. **Known gap:** this package's Cavite city list is missing "Dasmariñas" entirely (21 entries vs. Cavite's real 23 LGUs) — not caught by the coverage sweep since it checks entries that ARE listed, not entries that should exist but aren't. Other individual missing cities elsewhere in the country have not been exhaustively checked. Mitigated via the manual-entry fallback above rather than blocking the user. Flag if a user reports a missing or wrong barangay/postal code so it can be traced to the upstream package. |

---

## Process notes

- When any row above moves from "Proposed" to actually provisioned, update this file in the same commit and record the actual vendor, actual region, actual SLA/docs links — do not leave placeholder text after real provisioning.
- CI must include (once scaffolding exists): dependency vulnerability scanning, lockfile integrity checks, outdated-critical-dependency review, SBOM generation where tooling supports it (`/TECHNICAL_ARCHITECTURE.md` §11).
- Do not add a new third-party dependency (npm package or external service) without adding a row here first.
