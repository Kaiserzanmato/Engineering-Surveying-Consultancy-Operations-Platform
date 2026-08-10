# RBAC Matrix — Current Implementation State

**Status:** 2026-08-11, after the identity/RBAC, CRM/Intake, and Projects vertical slices, plus a same-day RBAC correction separating project membership administration from ordinary project editing (see below). This tracks what's *actually enforced in code* — for the full target matrix Point View needs to validate before production, see `PRD.md` §12 (that table also covers Field Data, Master Repository, Technical Files, Billing, Audit, and System Settings, which still don't exist as features).

> **Implemented vs. target.** Everything in this document describes what's *actually enforced in the current codebase today*. Field Data, Master Repository, Technical Files, Billing, Audit, System Settings, and the VTA operational role/profile introduced in Revision 2 are **target / pending future slices** — do not read any mention of them here as already built or enforced.

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

Identity/RBAC, CRM/Intake, and Projects areas only — Field Data, Master Repository, Technical Files, Billing, Audit, and System Settings have **no permission keys yet** and therefore **no enforcement**, because those features don't exist. Do not read their absence here as "no access controls needed" — read it as "not built yet."

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
| `projects:read` | View project records | `system_administrator`, `owner_gm`, `finance_billing` (all unscoped); `administrative_staff`, `field_team_leader`, `survey_field_personnel`, `cad_technical_operator`, `technical_reviewer_approver` (**scoped to projects they're a member of**, see below) |
| `projects:manage` | Create/edit project records (project number, client, service type, location, status, stage, blocker, dates, billing-status text). Does **not** include adding/removing team members — see `projects:manage_members` | `system_administrator`, `owner_gm` (unscoped); `administrative_staff` (**scoped to projects they're a member of**, see below) |
| `projects:manage_members` | Add/remove `ProjectMember` rows (the assigned-team roster) | `system_administrator`, `owner_gm` (unscoped) only — **`administrative_staff` does not hold this**, even though they hold `projects:manage` (see Project membership administration below) |

### Lead assignment scoping

`administrative_staff` holding `leads:manage` is restricted to leads assigned to them (`src/lib/crm/leads.ts`'s `leadInScope`, enforced via `authorize()`'s `resourceInScope` hook). Concretely:
- They see only their assigned leads in `/crm/leads` (list query filters by `assignedTo`).
- They can claim an unassigned lead (`claimLead`), but cannot reassign a lead to someone else — only unscoped roles (`system_administrator`, `owner_gm`, `sales_client_intake`) can reassign (`assignLead`).
- Attempting to view or edit a lead assigned to someone else returns a 404 (matches the convention set in the identity/RBAC slice — `notFound()` rather than a 403, consistent with Clerk's own default for permission-gated routes).

### Project membership scoping

Projects introduces `ProjectMember` (`src/db/schema.ts`), a real many-to-many assignment mechanism the Leads/Clients slices didn't have — this is the first real exercise of `authorize()`'s `resourceInScope` hook against a genuine "resource in scope" check rather than a single-owner `assignedTo` field. Enforced via `src/lib/projects.ts`'s `projectInScope`:
- `system_administrator`, `owner_gm`, `finance_billing` see/act on every project (`finance_billing` is read-only regardless — it never holds `projects:manage`).
- `administrative_staff` sees and can edit only projects they're a `ProjectMember` of. On creation they're auto-added as a member (mirrors Leads' self-assign-on-create pattern) so they aren't immediately locked out of a project they just made.
- `field_team_leader`, `survey_field_personnel`, `cad_technical_operator`, `technical_reviewer_approver` get **read-only** scoped access (membership-gated) — they do not hold `projects:manage` in this slice; editing the core project record isn't what PRD §17's per-role rows for Field Data/Technical Files/Review describe. Those roles will get real write actions through their own future permission areas (Field Operations, Technical Processing, Review/Approval slices), not through `projects:manage`.
- `sales_client_intake` has no `projects:*` grant at all — PRD §12's "Pre-project" is read as no access to the Projects module; their involvement ends at Client creation (PRD §13's workflow).
- Attempting to view or edit a project outside scope returns a 404, same convention as Leads.

> **Required clarification (per 2026-08-11 RBAC review).** For Projects, `Administrative Staff = Full/Assigned` is implemented as full permitted core project-management functionality (`projects:manage`: edit project number, client, service type, location, status, stage, blocker, dates, billing-status text) within projects where the user is an authorized project member. **It does not mean unrestricted organization-wide project access.**

### Project membership administration — a separate authorization boundary

> Project membership administration is a separate authorization boundary from ordinary project editing, because adding/removing project members changes who can access project resources at all.

Before 2026-08-11, `addProjectMember`/`removeProjectMember` were gated on the same `projects:manage` permission as editing the project record — meaning `administrative_staff`, once a member of a project, could also add or remove *other* members of that project. On review this was judged too broad: membership changes are an authorization-granting action in their own right (they determine who else can subsequently read/edit the project), not an ordinary edit to project data, so they warrant independent, narrower authorization. Corrected same-day, before this reached a real `administrative_staff` account in practice:

- `addProjectMember`/`removeProjectMember` (`src/app/(app)/projects/actions.ts`) now require `projects:manage_members`, checked via `src/lib/projects.ts`'s `projectMembersInScope` — a distinct function from `projectInScope`, not a reuse, so the two scopes can diverge independently if a future client decision changes one without the other.
- `administrative_staff` holds `projects:manage` (can still edit assigned projects) but **not** `projects:manage_members` (cannot add/remove teammates on any project, including ones they're a member of) — enforced at the `authorize()` permission-possession check, which runs before the resource-scope check, so a scoped member cannot reach the membership-mutation code path at all, regardless of which project ID they pass.
- The auto-add-creator-as-member behavior on project creation (`createProject`) is unchanged and intentionally does **not** route through `projects:manage_members` — it's a one-time bootstrap side effect of creating a project (so the creator isn't immediately locked out of what they made), not a grant of ongoing membership-management authority. A scoped creator becomes a member of the one project they created; they gain no ability to add/remove members on that project or any other.
- `projectMembersInScope`'s design note: an earlier draft had a membership-based fallback (`memberUserIds.includes(user.id)`) mirroring `projectInScope`'s pattern. A unit test calling the function directly (`src/lib/projects.test.ts`) proved that fallback wrong in isolation — it would treat any project member as "in scope" for membership administration regardless of permission. It was safe only by accident of composition (`authorize()` always checks permission first), which is exactly the kind of implicit-safety-through-caller-discipline the codebase avoids elsewhere. Fixed to have no membership-based fallback at all, since no role is currently granted `projects:manage_members` on a scoped basis — only `system_administrator`/`owner_gm`, both unscoped.
- Current answer to **"who can add/remove `ProjectMember` records?"**: only `system_administrator` and `owner_gm`, enforced by `projects:manage_members` (`scripts/seed.ts` grants; verified against the dev database 2026-08-11 — exactly those two roles hold the key, `administrative_staff` does not).
- **Pending Point View decision**: whether `administrative_staff` should eventually receive `projects:manage_members`, scoped to their assigned projects. Default is no, per the correction above, until a client decision says otherwise. If granted later: add it as its own row in `scripts/seed.ts` (do not fold it back into `projects:manage`), give `projectMembersInScope` a real membership-based rule at that time, and add tests for it — do not restore a generic "member implies in scope" fallback.

Team-roster changes cannot be used as a self-escalation path: `addProjectMember`/`removeProjectMember` cannot add a caller to a project they're not already authorized to manage membership on (permission-possession is checked before any project ID is examined), and there is no self-service "claim" for Projects the way `claimLead` exists for Leads — project membership is assigned by an authorized administrator, not pulled from an unowned queue.

## Interpretation notes (judgment calls made during this slice, flagged for client review)

- PRD §12's "Users/Roles" row says `Owner/GM = Limited`. "Limited" isn't defined further in the PRD, so this was read conservatively as **view-only** — Owner/GM can see the user list but cannot assign roles or suspend accounts. Role/account changes are called out as high-risk actions in PRD §8, and broadening this is a one-line change to `scripts/seed.ts` if the client wants Owner/GM to have more power here.
- The last System Administrator cannot have that role revoked via `/admin/users` (enforced in `src/app/admin/users/actions.ts`'s `revokeRole`) — a deliberate guard against an unrecoverable zero-admin state, not a PRD requirement, just an operational safety rail.
- No public self-service sign-up exists. Accounts are created by a System Administrator inviting a user (currently: via Clerk's own dashboard — no in-app invite flow yet, see Known limitations below) or by running `bun run db:bootstrap-admin -- <email>` for the very first admin.
- PRD §12's CRM rows have several "Assigned"/"Limited"/"Full/Assigned" entries that aren't fully mechanical to scope yet (no client-assignment concept exists). Judgment calls made — see the comment block above `grants` in `scripts/seed.ts` for the full reasoning per role; summary: Finance's "Limited" read as read-only (consistent with the Users/Roles reading), Field/CAD/Reviewer's "Assigned" on Clients read as "No" for now (no mechanism to scope it correctly yet — granting unscoped access would be broader than the PRD intends), Admin Staff's "Full/Assigned" on Clients granted as full manage (no client-assignment table to scope against).
- Point View's real service catalog (survey types, engineering services, etc.) isn't in any project document — `service_types` ships empty, populated via `/admin/service-types` by whoever has `service_types:manage`, not pre-seeded with invented names.
- Point View's real project-numbering convention isn't in any project document either — `projects.projectNumber` ships as a required, unique, free-text field entered manually by whoever creates the project, not an invented auto-numbering scheme, same reasoning as `service_types`.
- PRD §12's Projects row ("Admin=Full/Assigned", "Field/CAD/Reviewer=Assigned") is read differently than the identical-looking Clients row was: Clients had no assignment mechanism at slice-build time so "Full/Assigned" was granted as full unscoped manage; Projects introduces `ProjectMember`, so this slice reads it literally — Admin Staff genuinely scoped to assigned projects, Field/CAD/Reviewer genuinely scoped read-only. If the client's intent was actually unscoped for these roles too, that's a one-file change (`src/lib/projects.ts`'s role sets + `scripts/seed.ts`'s grants).
- PRD §12's "Pre-project" (Sales, Projects row) has no defined meaning elsewhere in the PRD — read as "no access to the Projects module," flagged for client confirmation like every other ambiguous matrix cell here.

## Known limitations / near-term follow-ups

- No in-app "invite user" flow — inviting a new user currently requires the Clerk dashboard. Building this (calling Clerk's Backend API to send an invitation, itself gated by `users:manage_roles` or a new `users:invite` permission) is a reasonable next addition to this slice.
- MFA enforcement (`src/lib/auth/mfa.ts`) is built to gate System Administrator specifically, but is currently **disabled** (`MFA_ENFORCEMENT_ENABLED = false`) because Clerk's Hobby plan doesn't offer any MFA strategy — confirmed 2026-08-09. A non-blocking banner on `/dashboard` nudges instead. This is a tracked pre-production gap (`docs/security/THREAT_MODEL.md` §5 gap 5), not a design decision to skip MFA. PRD §8 "strongly recommends" MFA for other privileged roles too (not mandatory) — no enforcement or nudge built for them yet either way.
- Projects has no in-app member picker beyond a plain `<select>` of every active user's name/email (`src/app/projects/[id]/page.tsx`) — fine at current scale, would need search/pagination if the user directory grows large.
- No project deletion/archival path exists yet — a project, once created, stays in the list indefinitely (status can be set to `completed`, but there's no soft-delete or archive concept). Not a PRD requirement either way; flagging as a plausible near-term ask.
- The **VTA (Virtual Technical Assistant)** operational role/profile introduced in Revision 2 has no permission model in this codebase yet — not mapped to `administrative_staff`, `cad_technical_operator`, or any existing role. Do not treat the current 9-role list as final; VTA is pending, to be defined in the appropriate future Workflow/Technical Processing slice.
- Whether `Clients` eventually needs its own `ClientMember`/assignment-level scoping mechanism (the way Projects now has `ProjectMember`) is an open follow-up, not attempted in this pass — Clients' `Full/Assigned` reading (full unscoped manage) is unchanged; see the Interpretation notes above.
- Sales/Client Intake's exact post-conversion relationship to Projects (project initiation capability? status-only visibility? none?) remains genuinely undefined by any current Point View document — "Pre-project" is read conservatively as no ordinary Projects access, deny-by-default, pending client confirmation.
