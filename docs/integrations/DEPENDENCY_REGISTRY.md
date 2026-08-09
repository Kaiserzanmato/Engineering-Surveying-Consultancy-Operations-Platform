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
| Vendor/service | Managed PostgreSQL (e.g., Neon via Vercel Marketplace) — exact vendor TBD |
| Purpose | Primary structured data store: users, RBAC, projects, workflow state, audit/security events, retention metadata |
| Data processed | Personal data (client/employee), project data, audit evidence — classify per `docs/privacy/DATA_MAP.md` once drafted |
| Region | TBD — data-residency confirmation required first |
| Authentication | Connection-string/credential via secret manager, not committed |
| Permissions | Application service role only; no shared superuser in app runtime |
| SLA | Vendor-dependent — confirm before production |
| Rate limits | Connection pool limits per plan |
| Security/privacy docs | Vendor-specific — attach once selected |
| Subprocessors | Vendor-dependent — document once selected |
| Cost | Plan-dependent |
| Fallback | Self-hosted Postgres if managed option is rejected |
| Exit/migration plan | Standard `pg_dump`/logical replication — Postgres is not proprietary |
| Status | **Confirmed direction — not yet provisioned; region/residency still open, see IMPLEMENTATION_PLAN §1** |

## Private object storage

| Field | Value |
|---|---|
| Vendor/service | Vercel Blob (private) or S3-compatible via Marketplace — exact vendor TBD |
| Purpose | Field photos, technical files, document versions — private-by-default, signed short-lived access per `/TECHNICAL_ARCHITECTURE.md` §15 |
| Data processed | Potentially sensitive project/field imagery and documents |
| Region | TBD — same residency question as database |
| Authentication | Signed URL generation server-side only |
| Permissions | Project-scoped access classification, enforced server-side |
| SLA | Vendor-dependent |
| Rate limits | Vendor-dependent |
| Security/privacy docs | Attach once selected |
| Subprocessors | Attach once selected |
| Cost | Usage-based — monitor as field upload volume grows |
| Fallback | S3-compatible alternative if primary choice rejected |
| Exit/migration plan | Bulk export via vendor API/CLI |
| Status | **Confirmed direction — not yet provisioned** |

## Authentication provider

| Field | Value |
|---|---|
| Vendor/service | Managed auth provider supporting MFA (e.g., Clerk) — exact vendor TBD |
| Purpose | Login, session management, MFA for System Administrator (mandatory) and privileged roles (recommended) per PRD §8 |
| Data processed | Credentials, session tokens, MFA enrollment data — highly sensitive |
| Region | TBD |
| Authentication | N/A (this is the auth layer itself) |
| Permissions | Admin console access restricted to System Administrator role |
| SLA | Vendor-dependent |
| Rate limits | Login attempt / brute-force protection must be confirmed as a vendor feature or built at app layer |
| Security/privacy docs | Attach once selected |
| Subprocessors | Attach once selected |
| Cost | Plan-dependent, typically per-MAU |
| Fallback | Self-hosted auth (e.g., NextAuth + Postgres) if managed vendor rejected — higher engineering burden for MFA/session security |
| Exit/migration plan | Confirm user-export capability before adoption — auth vendor lock-in is high-risk to migrate later |
| Status | **Confirmed direction — not yet provisioned; this is the highest-risk vendor choice to get wrong, pick carefully at provisioning time** |

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

---

## Process notes

- When any row above moves from "Proposed" to actually provisioned, update this file in the same commit and record the actual vendor, actual region, actual SLA/docs links — do not leave placeholder text after real provisioning.
- CI must include (once scaffolding exists): dependency vulnerability scanning, lockfile integrity checks, outdated-critical-dependency review, SBOM generation where tooling supports it (`/TECHNICAL_ARCHITECTURE.md` §11).
- Do not add a new third-party dependency (npm package or external service) without adding a row here first.
