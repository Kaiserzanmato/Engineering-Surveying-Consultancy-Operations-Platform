# RBAC Matrix — Current Implementation State

**Status:** 2026-08-09, after the identity/RBAC and CRM/Intake vertical slices. This tracks what's *actually enforced in code* — for the full target matrix Point View needs to validate before production, see `PRD.md` §12 (that table also covers Projects, Field Data, Master Repository, Technical Files, Billing, Audit, and System Settings, which still don't exist as features).

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

Identity/RBAC and CRM/Intake areas only — Projects, Field Data, Master Repository, Technical Files, Billing, Audit, and System Settings have **no permission keys yet** and therefore **no enforcement**, because those features don't exist. Do not read their absence here as "no access controls needed" — read it as "not built yet."

| Permission key | Description | Granted to |
|---|---|---|
| `users:read` | View the user list and their assigned roles | `system_administrator`, `owner_gm` |
| `users:manage_roles` | Assign or revoke roles for a user | `system_administrator` only |
| `users:suspend` | Suspend or reactivate a user account (also revokes Clerk sessions) | `system_administrator` only |
| `leads:read` | View leads | `system_administrator`, `owner_gm`, `administrative_staff`, `finance_billing`, `sales_client_intake` |
| `leads:manage` | Create/edit/qualify/convert leads | `system_administrator`, `owner_gm`, `administrative_staff` (**scoped to assigned leads only**, see below), `sales_client_intake` |
| `clients:read` | View clients and their contacts | `system_administrator`, `owner_gm`, `administrative_staff`, `finance_billing`, `sales_client_intake` |
| `clients:manage` | Create/edit clients and contacts | `system_administrator`, `owner_gm`, `administrative_staff`, `sales_client_intake` |
| `service_types:manage` | Manage the service catalog | `system_administrator`, `owner_gm` |

### Lead assignment scoping (the one resource-scoped permission so far)

`administrative_staff` holding `leads:manage` is restricted to leads assigned to them (`src/lib/crm/leads.ts`'s `leadInScope`, enforced via `authorize()`'s `resourceInScope` hook — the first real exercise of that mechanism, previously unused since Projects don't exist yet). Concretely:
- They see only their assigned leads in `/crm/leads` (list query filters by `assignedTo`).
- They can claim an unassigned lead (`claimLead`), but cannot reassign a lead to someone else — only unscoped roles (`system_administrator`, `owner_gm`, `sales_client_intake`) can reassign (`assignLead`).
- Attempting to view or edit a lead assigned to someone else returns a 404 (matches the convention set in the identity/RBAC slice — `notFound()` rather than a 403, consistent with Clerk's own default for permission-gated routes).

## Interpretation notes (judgment calls made during this slice, flagged for client review)

- PRD §12's "Users/Roles" row says `Owner/GM = Limited`. "Limited" isn't defined further in the PRD, so this was read conservatively as **view-only** — Owner/GM can see the user list but cannot assign roles or suspend accounts. Role/account changes are called out as high-risk actions in PRD §8, and broadening this is a one-line change to `scripts/seed.ts` if the client wants Owner/GM to have more power here.
- The last System Administrator cannot have that role revoked via `/admin/users` (enforced in `src/app/admin/users/actions.ts`'s `revokeRole`) — a deliberate guard against an unrecoverable zero-admin state, not a PRD requirement, just an operational safety rail.
- No public self-service sign-up exists. Accounts are created by a System Administrator inviting a user (currently: via Clerk's own dashboard — no in-app invite flow yet, see Known limitations below) or by running `bun run db:bootstrap-admin -- <email>` for the very first admin.
- PRD §12's CRM rows have several "Assigned"/"Limited"/"Full/Assigned" entries that aren't fully mechanical to scope yet (no client-assignment concept exists). Judgment calls made — see the comment block above `grants` in `scripts/seed.ts` for the full reasoning per role; summary: Finance's "Limited" read as read-only (consistent with the Users/Roles reading), Field/CAD/Reviewer's "Assigned" on Clients read as "No" for now (no mechanism to scope it correctly yet — granting unscoped access would be broader than the PRD intends), Admin Staff's "Full/Assigned" on Clients granted as full manage (no client-assignment table to scope against).
- Point View's real service catalog (survey types, engineering services, etc.) isn't in any project document — `service_types` ships empty, populated via `/admin/service-types` by whoever has `service_types:manage`, not pre-seeded with invented names.

## Known limitations / near-term follow-ups

- No in-app "invite user" flow — inviting a new user currently requires the Clerk dashboard. Building this (calling Clerk's Backend API to send an invitation, itself gated by `users:manage_roles` or a new `users:invite` permission) is a reasonable next addition to this slice.
- `resourceInScope` (project-level authorization from `TECHNICAL_ARCHITECTURE.md` §5.3) has no real caller yet — there are no project-scoped resources until the Projects slice ships. The hook exists in `src/lib/auth/authorize.ts` but is unexercised.
- MFA enforcement (`src/lib/auth/mfa.ts`) is built to gate System Administrator specifically, but is currently **disabled** (`MFA_ENFORCEMENT_ENABLED = false`) because Clerk's Hobby plan doesn't offer any MFA strategy — confirmed 2026-08-09. A non-blocking banner on `/dashboard` nudges instead. This is a tracked pre-production gap (`docs/security/THREAT_MODEL.md` §5 gap 5), not a design decision to skip MFA. PRD §8 "strongly recommends" MFA for other privileged roles too (not mandatory) — no enforcement or nudge built for them yet either way.
