# Threat Model — Point View V1

**Status:** Initial architecture-level draft, 2026-08-09. Written before Phase F feature implementation, per `AGENTS.md` Phase C ordering ("document mitigations before coding sensitive features"). This is a living document — update it whenever a data flow, trust boundary, or major dependency changes (`TECHNICAL_ARCHITECTURE.md` §5.1).

Not a certification or a completed penetration test. It is the design-time basis for the security negative tests required in each feature slice (`AGENTS.md` Phase F step 9) and for Phase J security testing.

---

## 1. System boundary and trust zones

```
[Untrusted]                [Trust boundary 1]              [Trust boundary 2]           [Trust boundary 3]
Client devices  --HTTPS-->  Vercel edge / Next.js  --auth-->  Application domain logic  --creds-->  Data layer
(desktop/mobile/            (App Router, middleware,          (RBAC enforcement,                    (Neon Postgres,
 field, browsers)            server actions/routes)            business rules)                       Vercel Blob)
                                                                      |
                                                                      v
                                                          [Trust boundary 4]
                                                          External services (Clerk auth,
                                                          optional AI provider — OFF by default)
```

Every arrow crossing a trust boundary is a place authorization must be re-checked server-side. Per `TECHNICAL_ARCHITECTURE.md` §5.3: `ALLOW = active_user AND permission_granted AND resource_in_scope AND action_allowed`. This is enforced once, centrally — not re-implemented per route.

## 2. Actors

From PRD §12: System Administrator, Owner/GM, Administrative Staff, Field Team Leader, Survey/Field Personnel, CAD/Technical Operator, Technical Reviewer/Approver, Finance/Billing, Sales/Client Intake. Plus: unauthenticated visitor (public marketing/login surface only), external auth provider (Clerk), external DB/storage providers (Neon, Vercel Blob), optional future AI provider (OFF by default, not yet in scope).

## 3. Assets

- Client and employee personal data (PRD §7 data inventory — names, contact info, project associations). **Implemented as of the CRM/Intake slice**: lead and client/contact records (`leads`, `clients`, `contacts` tables) hold real prospective- and actual-client contact information — the first real store of external-party personal data in the system, not just internal user accounts.
- Project/technical data (field submissions, photos, technical files, CAD tracking status) — client-confidential, some safety/engineering-relevant.
- Billing status data.
- Audit/security event logs (integrity-sensitive — tampering here hides other attacks).
- Authentication credentials/sessions (held by Clerk, not by us — reduces but does not eliminate our exposure; session tokens still flow through our app).
- AI prompts/outputs (not yet in scope — AI is OFF by default; revisit this section before Phase N).

## 4. Threats (per `TECHNICAL_ARCHITECTURE.md` §5.1 / `AGENTS.md` Phase C)

| Threat | Relevant to | Mitigation | Status |
|---|---|---|---|
| Account takeover | Auth provider, sessions | Clerk-managed auth; MFA app-level enforcement for System Administrator (`src/lib/auth/mfa.ts`); suspend revokes all Clerk sessions via `banUser` | Suspend-revokes-sessions: **implemented**. MFA: **built but deliberately disabled** — Clerk's Hobby plan (currently in use) offers no MFA strategy at all (confirmed 2026-08-09 in its dashboard; both Authenticator app and SMS are Pro-only). `MFA_ENFORCEMENT_ENABLED = false` in `src/lib/auth/mfa.ts` with a non-blocking dashboard nudge in its place. **This is a real gap against PRD §8's "MFA mandatory for System Administrator" — must be resolved (Clerk Pro upgrade, or an alternative MFA path) before production**, tracked here so it isn't silently forgotten |
| Broken access control / horizontal leakage | All scoped resources (leads, and eventually project-scoped resources) | Single server-side authorization function (`src/lib/auth/authorize.ts`) implementing the ALLOW rule, called in every protected layout/page/server action — **now the sole enforcement point, not defense-in-depth on top of middleware** (see below) | **Implemented**, including the first real exercise of the `resourceInScope` hook: `administrative_staff` can only view/edit/convert leads assigned to them (`src/lib/crm/leads.ts`'s `leadInScope`, wired through `authorize()`'s `resourceInScope` param in `src/app/(app)/crm/leads/actions.ts`) — out-of-scope leads return 404. Project-level scoping still has no resource to test against — revisit once Projects ships |
| Vertical privilege escalation (admin escalation) | Role/permission management | Role changes restricted to `users:manage_roles` (System Administrator only, per `docs/security/RBAC_MATRIX.md`); server action re-validates on every call, not just UI-hidden buttons; last-System-Administrator removal is blocked | **Implemented** — see `src/app/admin/users/actions.ts` |
| Insecure direct object reference (file ID enumeration) | Document/photo repository | Signed, short-lived URLs for all private Blob access; opaque non-sequential asset IDs; server-side project-scope check before signing a URL | P1, private storage slice |
| Signed-link leakage | Vercel Blob private access | Short TTL on signed URLs; do not embed signed URLs in logs, emails without expiry awareness; regenerate rather than reuse | P1, private storage slice |
| Malicious file upload | Field operations, technical file upload | MIME + extension validation, file-size limits, sanitized filenames, no executable content served inline, malware scanning where practical (PRD §8 File Security) | P1, field ops + storage slices |
| XSS | Any user-generated content rendered in UI (notes, comments, client names) | React's default output escaping (do not use `dangerouslySetInnerHTML` on user input); CSP where feasible | P1, ongoing per-slice review (Phase G) |
| Injection (SQL) | All database access | Parameterized queries only (Drizzle/Neon driver's tagged-template SQL, never string-concatenated queries) | **Implemented and followed** in `src/db/schema.ts` / `src/app/admin/users/actions.ts` — P0 architecture rule, enforced in every slice going forward |
| CSRF | State-changing routes/forms | Next.js Server Actions' built-in CSRF protections; explicit checks on any non-Server-Action mutation endpoint | **Implemented** for `/admin/users` (Server Actions only, no custom mutation endpoints yet) |
| SSRF | Any server-side fetch triggered by user input (none planned for V1 beyond auth/DB/storage/AI provider calls) | No user-controllable URL fetching in V1; if added later, restrict to an allowlist | Not currently applicable — revisit if a feature needs outbound fetch |
| Credential leakage | Env vars, logs, error messages | Secrets only in Vercel env vars (never committed — `.gitignore` covers `.env*`); no stack traces/secrets in user-facing errors (PRD §8) | **Implemented**, enforced by CI secret scan (`.github/workflows/ci.yml`) |
| Denial of service / cost abuse | Public routes, AI endpoints (future), file uploads | Rate limiting (not yet implemented), upload size limits (not applicable yet, no upload feature), Vercel's platform-level DDoS protections | **Gap — rate limiting not yet implemented, tracked as P0.** The webhook route (`/api/webhooks/clerk`) and `/sign-in` are the two currently-live unauthenticated endpoints and are the nearest-term exposure |
| API abuse (repeated expensive calls) | Any mutating/heavy endpoint | Same rate-limiting gap as above; applies doubly to any future AI endpoint (token/cost caps mandatory before AI is enabled, per PRD §11) | **Gap — P0 for core API, mandatory pre-condition for Tier 3 AI** |
| Supply-chain compromise | npm/bun dependencies | `bun audit` in CI, lockfile committed and verified (`--frozen-lockfile`), dependency registry (`docs/integrations/DEPENDENCY_REGISTRY.md`) updated per new dependency | **Implemented**, CI enforces the scan; registry discipline is a process control |
| Insider misuse | Any privileged role | Audit logging of privileged actions, permission changes (PRD §8 Auditability); audit log itself has no dedicated read-access restriction yet beyond general DB access | **Partially implemented** — `audit_events` table exists and is written on every role assignment/revocation, suspend/reactivate, and Clerk user sync (`src/lib/audit.ts`). No admin UI to *view* the audit log yet, and no separate access-control layer on the audit data itself beyond normal DB permissions |
| AI prompt injection | Future optional AI features | Not applicable yet — AI is OFF by default. Must be addressed in `docs/ai/AI_INVENTORY.md` and this threat model before any AI feature ships (Phase N gate) | Deferred — AI not in scope for P0/P1 |
| AI sensitive-data leakage | Future optional AI features | Same as above — data minimization required before any AI feature processes personal data | Deferred |

## 5. Current known gaps (honest state after the identity/RBAC slice, 2026-08-09)

The identity/RBAC slice resolved the biggest gap (no authorization layer) and made audit logging real for the areas it covers. Remaining gaps, still real:

1. **No rate limiting exists anywhere.** The webhook route and `/sign-in` are unauthenticated and reachable right now — nearest-term exposure. Needs a decision on implementation (Vercel-native, or an Upstash Redis-backed limiter) before this goes further.
2. **Audit log has no viewer UI and no dedicated access restriction of its own** — see the Insider misuse row above.
3. **`resourceInScope` is now exercised (leads) but still untested against a Project-scoped resource** — the CRM/Intake slice proved the mechanism works for one case (lead assignment); don't assume that alone proves it'll compose correctly once Projects adds a second, differently-shaped scope (project membership) on top.
4. **No in-app user invitation flow** — new accounts currently require either signing in for the first time (webhook-synced with zero roles, inert) plus a manual role grant, or direct Clerk-dashboard action. See `docs/security/RBAC_MATRIX.md` known limitations.
5. **MFA is not enforced** — Clerk's Hobby plan has no MFA strategy available; enforcement code exists (`src/lib/auth/mfa.ts`) but is off via `MFA_ENFORCEMENT_ENABLED = false`, with a non-blocking dashboard nudge instead. Blocks a PRD §8 requirement. Owner decision needed: upgrade to Clerk Pro, or find another MFA path, before production.
6. Everything from the original draft that's still not built: malicious file upload defenses (no upload feature yet), signed-link handling (no file storage feature yet), CSRF specifics beyond Server Actions' defaults, CSP headers.
7. **`src/proxy.ts` no longer calls `auth.protect()`** — removed 2026-08-09 after it was found to be rewriting Next.js's own internal same-origin RSC fetches (post-Server-Action refresh, `<Link>` prefetch) to a 404 page even for signed-in users, because Clerk's development-instance "dev browser" cookie handshake doesn't reliably propagate to that request shape. This did not weaken access control — `authorize()` in every layout/page/action was already the real enforcement, per the same reasoning as Clerk's own `createRouteMatcher` deprecation notice — but it does mean there is now exactly one enforcement layer instead of two. If `authorize()` is ever missing from a new page (a coding mistake, not a framework gap), there is no middleware-level fallback to catch it. **A real production Clerk instance (once a domain is configured, see `docs/integrations/DEPENDENCY_REGISTRY.md`) would not have the dev-browser limitation and could safely reintroduce middleware-level `protect()`** as a genuine defense-in-depth layer — full context in `docs/AGENT_HANDOFF.md` Entry 10.

## 6. Next update triggers

Update this document when:
- Rate limiting is implemented (resolve gap 1).
- An audit log viewer / access-control layer is built (resolve gap 2).
- The Projects slice ships and exercises `resourceInScope` for a second, differently-shaped case (resolve gap 3).
- MFA is actually enabled and `MFA_ENFORCEMENT_ENABLED` flipped to `true` (resolve gap 5).
- Any new external service is added (extend §1 trust boundary diagram and §3 assets).
- AI is enabled for any feature (extend §4 AI-related rows from "deferred" to "planned"/"implemented", cross-link `docs/ai/AI_INVENTORY.md`).
