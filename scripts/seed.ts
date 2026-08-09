import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

// Seeds the fixed role catalog (PRD §12 — pending client validation before
// production) and the permission set this identity/RBAC slice actually
// enforces. Deliberately does NOT seed permissions for unbuilt features
// (leads, clients, projects, billing, etc.) — per AGENTS.md Phase F, every
// future slice adds its own permission rows and role grants when it ships,
// rather than this script guessing at a shape for resources that don't
// exist yet.
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
  const grants: (typeof schema.rolePermissions.$inferInsert)[] = [
    { roleSlug: "system_administrator", permissionKey: "users:read" },
    { roleSlug: "system_administrator", permissionKey: "users:manage_roles" },
    { roleSlug: "system_administrator", permissionKey: "users:suspend" },
    { roleSlug: "owner_gm", permissionKey: "users:read" },
  ];

  await db.insert(schema.rolePermissions).values(grants).onConflictDoNothing();

  console.log(`Seeded ${roles.length} roles, ${permissions.length} permissions, ${grants.length} grants.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
