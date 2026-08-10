import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  jsonb,
  uuid,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// PRD §12 — fixed role set for V1. Kept as a Postgres enum (not a freeform
// table) because the role list is a product decision reviewed with the
// client (PRD §12 "Final permissions require client validation before
// production"), not something end users create ad hoc.
export const roleSlugEnum = pgEnum("role_slug", [
  "system_administrator",
  "owner_gm",
  "administrative_staff",
  "field_team_leader",
  "survey_field_personnel",
  "cad_technical_operator",
  "technical_reviewer_approver",
  "finance_billing",
  "sales_client_intake",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);

// Primary key mirrors the Clerk user id (e.g. "user_xxx") — this table is a
// local projection of Clerk identity, kept in sync via webhook
// (see src/app/api/webhooks/clerk/route.ts), not a second source of truth
// for credentials.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  slug: roleSlugEnum("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

// Permission keys use a "<resource>:<action>" convention, e.g. "users:manage".
// This is a starter set for the identity/RBAC slice — later feature slices
// (CRM, projects, etc.) add their own permission rows as they ship, per
// AGENTS.md Phase F step 3 ("permission" is part of every slice).
export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleSlug: roleSlugEnum("role_slug")
      .notNull()
      .references(() => roles.slug, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleSlug, t.permissionKey] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleSlug: roleSlugEnum("role_slug")
      .notNull()
      .references(() => roles.slug, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assignedBy: text("assigned_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleSlug] })],
);

// Audit log per PRD §8 Auditability / TECHNICAL_ARCHITECTURE.md §8. Append-only
// from the application's perspective — no UPDATE/DELETE code path is provided
// for this table. actorUserId is nullable to allow system-initiated events
// (e.g. Clerk webhook sync) to still be recorded.
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(userRoles),
  permissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleSlug], references: [roles.slug] }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleSlug], references: [roles.slug] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionKey],
    references: [permissions.key],
  }),
}));

// ---------------------------------------------------------------------------
// CRM / Intake — PRD §17 CRM/Client Management, §18 data model, §13 workflow
// (Inquiry -> Qualification -> Client -> Project). Project itself is a later
// slice; clients.sourceLeadId / leads.convertedClientId are the seam that
// slice will build on ("Related projects" from PRD §17 attaches to Client).
// ---------------------------------------------------------------------------

// Point View's actual service catalog is real business data this repo has
// no source for (not enumerated anywhere in PRD/TECHNICAL_ARCHITECTURE) —
// this table exists so a System Administrator/Owner can populate it
// themselves via /admin/service-types, not pre-seeded with invented names.
export const serviceTypes = pgTable("service_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
]);

// Fixed, standard CRM lead-source categories — unlike serviceTypes, this
// isn't Point-View-specific business data, so a small closed enum (rather
// than another admin-managed lookup table) is proportionate here.
export const leadSourceEnum = pgEnum("lead_source", [
  "referral",
  "website",
  "phone",
  "walk_in",
  "social_media",
  "email",
  "event",
  "other",
]);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  serviceTypeId: uuid("service_type_id").references(() => serviceTypes.id, {
    onDelete: "set null",
  }),
  serviceRequestNotes: text("service_request_notes"),
  location: text("location"),
  source: leadSourceEnum("source"),
  status: leadStatusEnum("status").notNull().default("new"),
  qualificationNotes: text("qualification_notes"),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  // Informational only, no FK constraint — clients.sourceLeadId (below) is
  // the authoritative direction of this relationship, avoiding a circular
  // FK between leads and clients.
  convertedClientId: uuid("converted_client_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientTypeEnum = pgEnum("client_type", ["individual", "company"]);
export const clientStatusEnum = pgEnum("client_status", ["active", "inactive"]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  clientType: clientTypeEnum("client_type").notNull(),
  // Structured, country-adaptive billing address — see src/lib/address.ts
  // for the per-country label logic. billingCountry is an ISO 3166-1
  // alpha-2 code (src/lib/countries.ts), not a free-text country name.
  // billingSubLocality covers fields like PH's "barangay" that only some
  // countries' addresses use.
  billingLine1: text("billing_line1"),
  billingLine2: text("billing_line2"),
  billingSubLocality: text("billing_sub_locality"),
  billingCity: text("billing_city"),
  billingStateProvince: text("billing_state_province"),
  billingPostalCode: text("billing_postal_code"),
  billingCountry: text("billing_country"),
  status: clientStatusEnum("status").notNull().default("active"),
  sourceLeadId: uuid("source_lead_id").references(() => leads.id, { onDelete: "set null" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadsRelations = relations(leads, ({ one }) => ({
  serviceType: one(serviceTypes, {
    fields: [leads.serviceTypeId],
    references: [serviceTypes.id],
  }),
  assignedUser: one(users, { fields: [leads.assignedTo], references: [users.id] }),
  createdByUser: one(users, { fields: [leads.createdBy], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  sourceLead: one(leads, { fields: [clients.sourceLeadId], references: [leads.id] }),
  createdByUser: one(users, { fields: [clients.createdBy], references: [users.id] }),
  contacts: many(contacts),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, { fields: [contacts.clientId], references: [clients.id] }),
}));

// ---------------------------------------------------------------------------
// Projects — PRD §17 Project Management, §18 data model (Project,
// ProjectMember), §13 workflow (Client -> Project -> Service Workflow).
// P1 item 3 per docs/IMPLEMENTATION_PLAN.md. Deliberately scoped to the
// project record itself only — Workflow Engine (templates/stages/
// dependencies/checklists), Field Operations, Technical Processing,
// Review/Approval, and Billing are later slices (P1 items 4-9) that will
// attach to this table, not rebuild it. "Current stage" and "Blocker" are
// therefore plain fields here, not driven by a workflow-stage FK yet.
// ---------------------------------------------------------------------------

// Matches the exact 5 states named for the Dashboard in the Core MVP
// baseline ("Active, completed, delayed, pending, and not-started
// projects") — not invented. No fixed transition graph is enforced (unlike
// leadStatusEnum's canTransitionLeadStatus): nothing in PRD/TECHNICAL_
// ARCHITECTURE specifies project-status transition rules, and the real
// stage-gated progression belongs to the Workflow Engine slice, not this one.
export const projectStatusEnum = pgEnum("project_status", [
  "not_started",
  "pending",
  "active",
  "delayed",
  "completed",
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Point View's real project-numbering convention isn't specified anywhere
  // in the project docs (same situation as serviceTypes — see that table's
  // comment). Ships as a required, unique, free-text field a project
  // creator enters manually rather than an invented auto-numbering scheme
  // (e.g. "PV-2026-001") that could conflict with their actual convention.
  projectNumber: text("project_number").notNull().unique(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  serviceTypeId: uuid("service_type_id").references(() => serviceTypes.id, {
    onDelete: "set null",
  }),
  // Free text, same precedent as leads.location — PRD §17 lists "Locations"
  // under CRM but it isn't a separate §18 data-model entity, and no formal
  // Location entity exists yet (see docs/security/RBAC_MATRIX.md's CRM notes).
  location: text("location"),
  status: projectStatusEnum("status").notNull().default("not_started"),
  // Plain text, not a workflow-stage FK — see file-level comment above.
  currentStage: text("current_stage"),
  blocker: text("blocker"),
  startDate: timestamp("start_date", { withTimezone: true }),
  targetEndDate: timestamp("target_end_date", { withTimezone: true }),
  actualEndDate: timestamp("actual_end_date", { withTimezone: true }),
  // Plain text status label, not a FK into a BillingRecord table — Billing
  // (P1 item 9) is a later slice; this is a placeholder operational field
  // only, matching PRD §17 Project Management's "Billing status" line item.
  billingStatus: text("billing_status"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// PRD §18 "ProjectMember" — the assigned-team roster. Composite PK mirrors
// userRoles' pattern (no separate id needed for a pure membership row).
export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    addedBy: text("added_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  serviceType: one(serviceTypes, {
    fields: [projects.serviceTypeId],
    references: [serviceTypes.id],
  }),
  createdByUser: one(users, { fields: [projects.createdBy], references: [users.id] }),
  members: many(projectMembers),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
  addedByUser: one(users, { fields: [projectMembers.addedBy], references: [users.id] }),
}));
