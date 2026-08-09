# RBAC Matrix — Current Implementation State

**Status:** 2026-08-09, after the identity/RBAC vertical slice. This tracks what's *actually enforced in code* — for the full target matrix Point View needs to validate before production, see `PRD.md` §12 (that table covers areas — Leads, Clients, Projects, Field Data, etc. — that don't exist as features yet).

Source of truth for roles: `src/db/schema.ts` `roleSlugEnum`. Source of truth for permissions and grants: `scripts/seed.ts` (re-run `bun run db:seed` after editing — it's idempotent, uses `onConflictDoNothing`).

## Roles (PRD §12 — pending client validation before production)

| Slug | Name |
|---|---|
| `system_administrator` | System Administrator |
| `owner_gm` | Owner / General Manager |
| `administrative_staff` | Administrative Staff |
| `field_team_leader` | Field Team Leader |
| `survey_field_personnel` | Survey / Field Personnel |
| `cad_technical_operator` | CAD / Technical Operator |
| `technical_reviewer_approver` | Technical Reviewer / Approver |
| `finance_billing` | Finance / Billing |
| `sales_client_intake` | Sales / Client Intake |

## Permissions currently enforced

Only the identity/RBAC slice's own area — every other PRD §12 area (Leads, Clients, Projects, Field Data, Master Repository, Technical Files, Billing, Audit, System Settings) has **no permission keys yet** and therefore **no enforcement**, because those features don't exist. Do not read their absence here as "no access controls needed" — read it as "not built yet."

| Permission key | Description | Granted to |
|---|---|---|
| `users:read` | View the user list and their assigned roles | `system_administrator`, `owner_gm` |
| `users:manage_roles` | Assign or revoke roles for a user | `system_administrator` only |
| `users:suspend` | Suspend or reactivate a user account (also revokes Clerk sessions) | `system_administrator` only |

## Interpretation notes (judgment calls made during this slice, flagged for client review)

- PRD §12's "Users/Roles" row says `Owner/GM = Limited`. "Limited" isn't defined further in the PRD, so this was read conservatively as **view-only** — Owner/GM can see the user list but cannot assign roles or suspend accounts. Role/account changes are called out as high-risk actions in PRD §8, and broadening this is a one-line change to `scripts/seed.ts` if the client wants Owner/GM to have more power here.
- The last System Administrator cannot have that role revoked via `/admin/users` (enforced in `src/app/admin/users/actions.ts`'s `revokeRole`) — a deliberate guard against an unrecoverable zero-admin state, not a PRD requirement, just an operational safety rail.
- No public self-service sign-up exists. Accounts are created by a System Administrator inviting a user (currently: via Clerk's own dashboard — no in-app invite flow yet, see Known limitations below) or by running `bun run db:bootstrap-admin -- <email>` for the very first admin.

## Known limitations / near-term follow-ups

- No in-app "invite user" flow — inviting a new user currently requires the Clerk dashboard. Building this (calling Clerk's Backend API to send an invitation, itself gated by `users:manage_roles` or a new `users:invite` permission) is a reasonable next addition to this slice.
- `resourceInScope` (project-level authorization from `TECHNICAL_ARCHITECTURE.md` §5.3) has no real caller yet — there are no project-scoped resources until the Projects slice ships. The hook exists in `src/lib/auth/authorize.ts` but is unexercised.
- MFA enforcement (`src/lib/auth/mfa.ts`) only gates System Administrator. PRD §8 "strongly recommends" MFA for other privileged roles too, but doesn't mandate it — left as a nudge-only (UI encouragement, not yet built) for non-SysAdmin roles rather than a hard gate.
