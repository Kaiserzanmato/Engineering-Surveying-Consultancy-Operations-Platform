import type { AuthorizedUser } from "@/lib/auth/authorize";
import type { projectStatusEnum } from "@/db/schema";

export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  active: "Active",
  delayed: "Delayed",
  completed: "Completed",
};

const PROJECT_STATUS_VALUES = new Set<string>(Object.keys(PROJECT_STATUS_LABELS));

/** Parses a form field into a validated ProjectStatus, throwing on garbage input. */
export function parseProjectStatus(value: FormDataEntryValue | null): ProjectStatus {
  const str = String(value ?? "").trim();
  if (!PROJECT_STATUS_VALUES.has(str)) throw new Error(`Invalid project status: ${str}`);
  return str as ProjectStatus;
}

// PRD §12 Baseline Matrix, Projects row: "SysAdmin=Full, Owner/GM=Full,
// Admin=Full/Assigned, Field/CAD/Reviewer=Assigned, Finance=Limited,
// Sales=Pre-project." Judgment calls made here (flag for client
// validation, same practice as docs/security/RBAC_MATRIX.md's existing
// notes on Leads/Clients):
// - Unlike Clients (where "Full/Assigned" had no assignment mechanism to
//   scope against and was granted as full manage), Projects now HAS one
//   (ProjectMember, this slice) — so Administrative Staff's
//   "Full/Assigned" is read literally: projects:manage, scoped to
//   projects they're a member of, mirroring the Lead assignment pattern.
//   Membership ADMINISTRATION (who is on the roster) is a separate,
//   narrower permission — see projects:manage_members below — because
//   changing ProjectMember rows changes who is authorized at all, not
//   just what an already-authorized person can edit.
// - Field Team Leader / Survey-Field Personnel / CAD Operator / Technical
//   Reviewer's "Assigned" is read as scoped READ access only (membership-
//   gated visibility) — projects:manage is not granted to them in this
//   slice, since editing the core project record isn't what PRD §17's
//   per-role rows for Field Data/Technical Files/Review describe; those
//   are separate future permission areas those roles will act through
//   once their own slices ship.
// - Finance's "Limited" is read the same way as the Clients/Users
//   precedent: read-only, but UNSCOPED (they need billing visibility
//   across all projects, not just ones they're a member of).
// - Sales' "Pre-project" is read as no access to the Projects module at
//   all — per PRD §13's workflow, their involvement ends at Client
//   creation; Project is the next stage, after their handoff.
const UNSCOPED_PROJECT_MANAGE_ROLES = new Set(["system_administrator", "owner_gm"]);
const UNSCOPED_PROJECT_READ_ROLES = new Set(["system_administrator", "owner_gm", "finance_billing"]);
// Membership administration (add/remove ProjectMember rows) happens to be
// granted to the identical role set as ordinary unscoped project editing
// today, but is tracked as its own constant/function — not an alias — so
// that if a future client decision grants a scoped role (e.g.
// administrative_staff) membership-management rights without also
// widening their edit rights (or vice versa), the two don't have to be
// re-derived from a shared set. Per PRD §12/docs/security/RBAC_MATRIX.md:
// administrative_staff does NOT get this by default (see file-level
// comment above) — only system_administrator and owner_gm do.
const UNSCOPED_PROJECT_MANAGE_MEMBERS_ROLES = new Set(["system_administrator", "owner_gm"]);

export function hasUnscopedProjectManage(user: AuthorizedUser): boolean {
  return user.roles.some((r) => UNSCOPED_PROJECT_MANAGE_ROLES.has(r));
}

export function hasUnscopedProjectRead(user: AuthorizedUser): boolean {
  return user.roles.some((r) => UNSCOPED_PROJECT_READ_ROLES.has(r));
}

export function hasUnscopedProjectManageMembers(user: AuthorizedUser): boolean {
  return user.roles.some((r) => UNSCOPED_PROJECT_MANAGE_MEMBERS_ROLES.has(r));
}

/**
 * Resource-scope check for projects:read and projects:manage. Safe to use
 * for either because evaluateAllow() checks permission_granted first — a
 * role that never holds projects:manage (e.g. finance_billing) never
 * reaches this check under that permission key regardless of what this
 * function would return for them.
 */
export function projectInScope(memberUserIds: string[], user: AuthorizedUser): boolean {
  if (hasUnscopedProjectRead(user)) return true;
  return memberUserIds.includes(user.id);
}

/**
 * Resource-scope check for projects:manage_members specifically. Kept
 * separate from projectInScope (rather than reusing it) because the two
 * permissions currently have different unscoped role sets in principle,
 * even though they're identical today (both system_administrator and
 * owner_gm) — collapsing them into one function would silently couple
 * membership-administration scope to read/edit scope if either set is
 * ever changed independently.
 *
 * Deliberately has NO membership-based fallback (unlike projectInScope):
 * an earlier draft fell back to `memberUserIds.includes(user.id)`, which
 * looked safe only because authorize() always checks permission_granted
 * before calling resourceInScope — but a unit test calling this function
 * directly (projects.test.ts) proved the function was wrong in isolation:
 * it would report ANY project member as "in scope" for membership
 * administration, permission aside. Since no role is currently granted
 * projects:manage_members on a scoped basis (only system_administrator
 * and owner_gm, both unscoped — see scripts/seed.ts), there is no correct
 * membership-based rule to encode yet. If a future client decision grants
 * a scoped role (e.g. administrative_staff) this permission, add its
 * specific scoping rule here deliberately, with its own test, rather than
 * reintroducing a generic "member implies in scope" fallback.
 */
export function projectMembersInScope(_memberUserIds: string[], user: AuthorizedUser): boolean {
  return hasUnscopedProjectManageMembers(user);
}
