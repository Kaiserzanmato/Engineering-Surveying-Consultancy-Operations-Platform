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

export function hasUnscopedProjectManage(user: AuthorizedUser): boolean {
  return user.roles.some((r) => UNSCOPED_PROJECT_MANAGE_ROLES.has(r));
}

export function hasUnscopedProjectRead(user: AuthorizedUser): boolean {
  return user.roles.some((r) => UNSCOPED_PROJECT_READ_ROLES.has(r));
}

/**
 * Resource-scope check for both projects:read and projects:manage. Safe to
 * use for either because evaluateAllow() checks permission_granted first —
 * a role that never holds projects:manage (e.g. finance_billing) never
 * reaches this check under that permission key regardless of what this
 * function would return for them.
 */
export function projectInScope(memberUserIds: string[], user: AuthorizedUser): boolean {
  if (hasUnscopedProjectRead(user)) return true;
  return memberUserIds.includes(user.id);
}
