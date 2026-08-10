import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

// Seeds the fixed role catalog (PRD §12 — pending client validation before
// production) and the permission set each shipped slice actually enforces
// (identity/RBAC, CRM/Intake, Projects). Deliberately does NOT seed
// permissions for still-unbuilt features (billing, field ops, technical
// tracking, review/approval, etc.) — per AGENTS.md Phase F, every future
// slice adds its own permission rows and role grants when it ships, rather
// than this script guessing at a shape for resources that don't exist yet.
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const roles: (typeof schema.roles.$inferInsert)[] = [
    {
      slug: "system_administrator",
      name: "System Administrator",
      description: "Full system access, including user/role management and system settings.",
    },
    {
      slug: "owner_gm",
      name: "Owner / General Manager",
      description: "Broad operational visibility; limited administrative power (PRD §12).",
    },
    {
      slug: "administrative_staff",
      name: "Administrative Staff",
      description: "Handles intake, client/project administration for assigned work.",
    },
    {
      slug: "field_team_leader",
      name: "Field Team Leader",
      description: "Leads field operations and assigned field submissions.",
    },
    {
      slug: "survey_field_personnel",
      name: "Survey / Field Personnel",
      description: "Executes field work, submits photos/files/measurements.",
    },
    {
      slug: "cad_technical_operator",
      name: "CAD / Technical Operator",
      description: "Processes technical/CAD tracking for assigned projects.",
    },
    {
      slug: "technical_reviewer_approver",
      name: "Technical Reviewer / Approver",
      description: "Reviews and approves technical outputs and field data.",
    },
    {
      slug: "finance_billing",
      name: "Finance / Billing",
      description: "Tracks operational billing status (not formal accounting).",
    },
    {
      slug: "sales_client_intake",
      name: "Sales / Client Intake",
      description: "Manages leads and initial client intake.",
    },
  ];

  const permissions: (typeof schema.permissions.$inferInsert)[] = [
    { key: "users:read", description: "View the user list and their assigned roles." },
    { key: "users:manage_roles", description: "Assign or revoke roles for a user." },
    { key: "users:suspend", description: "Suspend or reactivate a user account." },
    { key: "leads:read", description: "View leads." },
    {
      key: "leads:manage",
      description:
        "Create/edit/qualify/convert leads. For administrative_staff this is enforced scoped to assigned leads only (resourceInScope check in src/app/crm/leads/actions.ts), per PRD §12's 'Assigned' access level — everyone else granted this key has unscoped access.",
    },
    { key: "clients:read", description: "View clients and their contacts." },
    { key: "clients:manage", description: "Create/edit clients and their contacts." },
    {
      key: "service_types:manage",
      description: "Manage the service catalog (used to classify leads/service requests).",
    },
    {
      key: "projects:read",
      description:
        "View project records. system_administrator/owner_gm/finance_billing are unscoped; administrative_staff and field_team_leader/survey_field_personnel/cad_technical_operator/technical_reviewer_approver are scoped to projects they're a ProjectMember of (resourceInScope check in src/app/projects/actions.ts and src/app/projects/[id]/page.tsx), per PRD §12's 'Assigned'/'Limited' access levels.",
    },
    {
      key: "projects:manage",
      description:
        "Create/edit project records (project number, client, service type, location, status, stage, blocker, dates, billing-status text). For administrative_staff this is enforced scoped to projects they're a ProjectMember of (same resourceInScope mechanism as projects:read) — everyone else granted this key (system_administrator, owner_gm) has unscoped access. Does NOT include adding/removing project team members — see projects:manage_members.",
    },
    {
      key: "projects:manage_members",
      description:
        "Add/remove ProjectMember rows (the assigned-team roster) — deliberately separate from projects:manage (RBAC review 2026-08-10): changing membership changes who is authorized to read/edit a project at all, so it's a narrower, independently-granted permission. Currently granted only to system_administrator/owner_gm (unscoped) — administrative_staff holds projects:manage but NOT this key, so a scoped project member can edit the project record but cannot alter who else is on it, per PRD §12's Projects row read literally now that ProjectMember gives a real mechanism to scope against (see src/lib/projects.ts's file-level comment).",
    },
  ];

  await db.insert(schema.roles).values(roles).onConflictDoNothing();
  await db.insert(schema.permissions).values(permissions).onConflictDoNothing();

  // PRD §12 Baseline Matrix: "Users/Roles: SysAdmin=Full, Owner/GM=Limited,
  // everyone else=No." "Limited" is not further specified by the PRD, so
  // this seed makes a conservative reading: Owner/GM can see the user list
  // (visibility) but cannot grant roles or suspend accounts (that stays
  // System-Administrator-only) — role/account changes are called out as
  // high-risk actions in PRD §8, and self-escalation risk argues for the
  // narrower reading until the client confirms otherwise (PRD §12: "Final
  // permissions require client validation before production").
  // PRD §12 CRM rows: "Leads: SysAdmin=Full, Owner/GM=Full, Admin=Assigned,
  // Field/CAD/Reviewer=No, Finance=Limited, Sales=Full." "Clients:
  // SysAdmin=Full, Owner/GM=Full, Admin=Full/Assigned, Field/CAD/Reviewer=
  // Assigned, Finance=Limited, Sales=Assigned." Judgment calls made here
  // (flag for client validation per PRD §12):
  // - "Limited" (Finance) read as leads:read/clients:read only, no manage —
  //   consistent with the Users/Roles "Limited" reading above.
  // - Field/CAD/Reviewer's "Assigned" on Clients has no assignment
  //   mechanism to scope against yet (no client-membership concept exists),
  //   so it's read as "No" for now rather than granting unscoped access —
  //   revisit once Projects/assignment exists and can properly scope this.
  // - Admin Staff's "Assigned" on Leads IS scoped (assignedTo check in the
  //   server action); Clients' "Full/Assigned" is granted as full manage
  //   since there's no client-assignment table to scope against either.
  // - Sales' "Assigned" on Clients is granted as full manage — they're the
  //   role that converts leads into clients, so needs real create/update power.
  const grants: (typeof schema.rolePermissions.$inferInsert)[] = [
    { roleSlug: "system_administrator", permissionKey: "users:read" },
    { roleSlug: "system_administrator", permissionKey: "users:manage_roles" },
    { roleSlug: "system_administrator", permissionKey: "users:suspend" },
    { roleSlug: "owner_gm", permissionKey: "users:read" },

    { roleSlug: "system_administrator", permissionKey: "leads:read" },
    { roleSlug: "system_administrator", permissionKey: "leads:manage" },
    { roleSlug: "system_administrator", permissionKey: "clients:read" },
    { roleSlug: "system_administrator", permissionKey: "clients:manage" },
    { roleSlug: "system_administrator", permissionKey: "service_types:manage" },
    { roleSlug: "system_administrator", permissionKey: "projects:read" },
    { roleSlug: "system_administrator", permissionKey: "projects:manage" },
    { roleSlug: "system_administrator", permissionKey: "projects:manage_members" },

    { roleSlug: "owner_gm", permissionKey: "leads:read" },
    { roleSlug: "owner_gm", permissionKey: "leads:manage" },
    { roleSlug: "owner_gm", permissionKey: "clients:read" },
    { roleSlug: "owner_gm", permissionKey: "clients:manage" },
    { roleSlug: "owner_gm", permissionKey: "service_types:manage" },
    { roleSlug: "owner_gm", permissionKey: "projects:read" },
    { roleSlug: "owner_gm", permissionKey: "projects:manage" },
    { roleSlug: "owner_gm", permissionKey: "projects:manage_members" },

    { roleSlug: "administrative_staff", permissionKey: "leads:read" },
    { roleSlug: "administrative_staff", permissionKey: "leads:manage" },
    { roleSlug: "administrative_staff", permissionKey: "clients:read" },
    { roleSlug: "administrative_staff", permissionKey: "clients:manage" },
    { roleSlug: "administrative_staff", permissionKey: "projects:read" },
    { roleSlug: "administrative_staff", permissionKey: "projects:manage" },
    // No projects:manage_members grant by default (RBAC review 2026-08-10)
    // — see the permission's own description above and
    // docs/security/RBAC_MATRIX.md. Flagged for Point View to confirm
    // whether Administrative Staff should eventually get this for their
    // assigned projects.

    { roleSlug: "finance_billing", permissionKey: "leads:read" },
    { roleSlug: "finance_billing", permissionKey: "clients:read" },
    { roleSlug: "finance_billing", permissionKey: "projects:read" },

    { roleSlug: "sales_client_intake", permissionKey: "leads:read" },
    { roleSlug: "sales_client_intake", permissionKey: "leads:manage" },
    { roleSlug: "sales_client_intake", permissionKey: "clients:read" },
    { roleSlug: "sales_client_intake", permissionKey: "clients:manage" },
    // No projects:* grant — "Pre-project" per PRD §12, see src/lib/projects.ts's judgment-call comment.

    { roleSlug: "field_team_leader", permissionKey: "projects:read" },
    { roleSlug: "survey_field_personnel", permissionKey: "projects:read" },
    { roleSlug: "cad_technical_operator", permissionKey: "projects:read" },
    { roleSlug: "technical_reviewer_approver", permissionKey: "projects:read" },
  ];

  await db.insert(schema.rolePermissions).values(grants).onConflictDoNothing();

  console.log(`Seeded ${roles.length} roles, ${permissions.length} permissions, ${grants.length} grants.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
