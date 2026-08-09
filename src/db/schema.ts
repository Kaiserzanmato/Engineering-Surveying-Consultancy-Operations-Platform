import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  jsonb,
  uuid,
  pgEnum,
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
