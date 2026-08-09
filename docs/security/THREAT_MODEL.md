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

- Client and employee personal data (PRD §7 data inventory — names, contact info, project associations).
- Project/technical data (field submissions, photos, technical files, CAD tracking status) — client-confidential, some safety/engineering-relevant.
- Billing status data.
- Audit/security event logs (integrity-sensitive — tampering here hides other attacks).
- Authentication credentials/sessions (held by Clerk, not by us — reduces but does not eliminate our exposure; session tokens still flow through our app).
- AI prompts/outputs (not yet in scope — AI is OFF by default; revisit this section before Phase N).

## 4. Threats (per `TECHNICAL_ARCHITECTURE.md` §5.1 / `AGENTS.md` Phase C)

| Threat | Relevant to | Mitigation (planned, tracked against P0/P1 backlog) | Status |
|---|---|---|---|
| Account takeover | Auth provider, sessions | Clerk-managed auth with MFA for System Administrator (mandatory) and privileged roles (recommended); Clerk session revocation on suspend | Planned — Clerk provisioning pending (see `docs/integrations/DEPENDENCY_REGISTRY.md`) |
| Broken access control / horizontal project leakage | All project-scoped resources | Single server-side authorization function implementing the ALLOW rule; every query/action must pass project scope, not just role | P0 — must exist before any P1 feature ships |
| Vertical privilege escalation (admin escalation) | Role/permission management | Role changes restricted to System Administrator; role-change actions are high-risk actions requiring confirmation/reauthentication per PRD §8 | P1, identity/RBAC slice |
| Insecure direct object reference (file ID enumeration) | Document/photo repository | Signed, short-lived URLs for all private Blob access; opaque non-sequential asset IDs; server-side project-scope check before signing a URL | P1, private storage slice |
| Signed-link leakage | Vercel Blob private access | Short TTL on signed URLs; do not embed signed URLs in logs, emails without expiry awareness; regenerate rather than reuse | P1, private storage slice |
| Malicious file upload | Field operations, technical file upload | MIME + extension validation, file-size limits, sanitized filenames, no executable content served inline, malware scanning where practical (PRD §8 File Security) | P1, field ops + storage slices |
| XSS | Any user-generated content rendered in UI (notes, comments, client names) | React's default output escaping (do not use `dangerouslySetInnerHTML` on user input); CSP where feasible | P1, ongoing per-slice review (Phase G) |
| Injection (SQL) | All database access | Parameterized queries only (Drizzle/Neon driver's tagged-template SQL, never string-concatenated queries) | P0 architecture rule, enforced in every slice |
| CSRF | State-changing routes/forms | Next.js Server Actions' built-in CSRF protections; explicit checks on any non-Server-Action mutation endpoint | P1, per-slice |
| SSRF | Any server-side fetch triggered by user input (none planned for V1 beyond auth/DB/storage/AI provider calls) | No user-controllable URL fetching in V1; if added later, restrict to an allowlist | Not currently applicable — revisit if a feature needs outbound fetch |
| Credential leakage | Env vars, logs, error messages | Secrets only in Vercel env vars (never committed — `.gitignore` covers `.env*`); no stack traces/secrets in user-facing errors (PRD §8) | P0, enforced by CI secret scan (`.github/workflows/ci.yml`) |
| Denial of service / cost abuse | Public routes, AI endpoints (future), file uploads | Rate limiting (to be implemented — no rate limiting exists yet, this is a known P0 gap), upload size limits, Vercel's platform-level DDoS protections | **Gap — rate limiting not yet implemented, tracked as P0** |
| API abuse (repeated expensive calls) | Any mutating/heavy endpoint | Same rate-limiting gap as above; applies doubly to any future AI endpoint (token/cost caps mandatory before AI is enabled, per PRD §11) | **Gap — P0 for core API, mandatory pre-condition for Tier 3 AI** |
| Supply-chain compromise | npm/bun dependencies | `bun audit` in CI, lockfile committed and verified (`--frozen-lockfile`), dependency registry (`docs/integrations/DEPENDENCY_REGISTRY.md`) updated per new dependency | P0, CI enforces the scan; registry discipline is a process control |
| Insider misuse | Any privileged role | Audit logging of privileged actions, permission changes, exports, deletions (PRD §8 Auditability); audit log itself access-controlled | P1, audit slice — not yet built, so currently undetectable |
| AI prompt injection | Future optional AI features | Not applicable yet — AI is OFF by default. Must be addressed in `docs/ai/AI_INVENTORY.md` and this threat model before any AI feature ships (Phase N gate) | Deferred — AI not in scope for P0/P1 |
| AI sensitive-data leakage | Future optional AI features | Same as above — data minimization required before any AI feature processes personal data | Deferred |

## 5. Current known gaps (honest state as of this draft)

Because no code exists yet beyond the Next.js scaffold, **every mitigation above is planned, not implemented**, except: CI secret scanning and dependency scanning (`.github/workflows/ci.yml`, live), and `.gitignore` secret exclusion (live). Everything else is a design commitment this document holds the team to — it is not evidence of a control that exists today. Do not cite this document as proof of a passed security control; cite the actual test/code that implements it once it exists (per `AGENTS.md` §4 "Compliance Evidence — what test/evidence demonstrates the control?").

Explicit P0-blocking gaps identified during this draft:
1. **No server-side authorization layer exists yet.** This is the single most important P0 item — every other row in the table above depends on it.
2. **No rate limiting exists anywhere.** Flagged above; needs a decision on implementation (Vercel-native, or an Upstash Redis-backed limiter) before any public-facing mutating endpoint ships.
3. **No audit logging exists yet.** Insider-misuse and tamper-detection mitigations are aspirational until the audit slice is built.

## 6. Next update triggers

Update this document when:
- Identity/RBAC slice is implemented (resolve gap 1).
- Rate limiting is implemented (resolve gap 2).
- Audit logging is implemented (resolve gap 3).
- Any new external service is added (extend §1 trust boundary diagram and §3 assets).
- AI is enabled for any feature (extend §4 AI-related rows from "deferred" to "planned"/"implemented", cross-link `docs/ai/AI_INVENTORY.md`).
