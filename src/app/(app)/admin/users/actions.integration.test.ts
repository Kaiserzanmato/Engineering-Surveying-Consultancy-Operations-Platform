/**
 * Database-level negative-authorization tests for the Identity/RBAC
 * (Users & Roles admin) slice — same harness as the Projects/Leads/Clients
 * integration tests. One extra mock here: setUserStatus() calls Clerk's
 * *backend* API (clerkClient().users.banUser/unbanUser) to revoke
 * sessions on suspend — that's a real network call to Clerk in
 * production, so it must be mocked in tests the same way auth()/getDb()
 * are, never left to hit the real Clerk account.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { AuthorizationError } from "@/lib/auth/authorize";
import { createTestDb, createTestUser, fakeClerkId, type TestDb } from "../../../../../test/db-test-utils";

const hoisted = vi.hoisted(() => ({
  currentUserId: { value: null as string | null },
  dbRef: { current: null as unknown },
  banUser: vi.fn(async () => {}),
  unbanUser: vi.fn(async () => {}),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: hoisted.currentUserId.value })),
  clerkClient: vi.fn(async () => ({
    users: { banUser: hoisted.banUser, unbanUser: hoisted.unbanUser },
  })),
}));

vi.mock("@/db", () => ({
  getDb: () => hoisted.dbRef.current,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { assignRole, revokeRole, setUserStatus } = await import("./actions");

function asUser(userId: string) {
  hoisted.currentUserId.value = userId;
}

let db: TestDb;

beforeAll(async () => {
  const { db: testDb } = await createTestDb();
  db = testDb;
  hoisted.dbRef.current = testDb;
});

afterAll(() => {
  hoisted.currentUserId.value = null;
  hoisted.dbRef.current = null;
});

function roleFormData(userId: string, roleSlug: string): FormData {
  const fd = new FormData();
  fd.set("userId", userId);
  fd.set("roleSlug", roleSlug);
  return fd;
}

function statusFormData(userId: string, status: "active" | "suspended"): FormData {
  const fd = new FormData();
  fd.set("userId", userId);
  fd.set("status", status);
  return fd;
}

describe("Users/Roles RBAC — System Administrator", () => {
  it("can assign roles, revoke roles, and suspend/reactivate users", async () => {
    const sysadmin = await createTestUser(db, { label: "sysadmin_users1", role: "system_administrator" });
    const target = await createTestUser(db, { label: "target_users1", role: "sales_client_intake" });

    asUser(sysadmin);
    await expect(assignRole(roleFormData(target, "finance_billing"))).resolves.toBeUndefined();
    const rolesAfterAssign = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, target));
    expect(rolesAfterAssign.map((r) => r.roleSlug)).toContain("finance_billing");

    await expect(revokeRole(roleFormData(target, "finance_billing"))).resolves.toBeUndefined();
    const rolesAfterRevoke = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, target));
    expect(rolesAfterRevoke.map((r) => r.roleSlug)).not.toContain("finance_billing");

    await expect(setUserStatus(statusFormData(target, "suspended"))).resolves.toBeUndefined();
    expect(hoisted.banUser).toHaveBeenCalledWith(target);
    const [suspended] = await db.select().from(schema.users).where(eq(schema.users.id, target));
    expect(suspended.status).toBe("suspended");

    await expect(setUserStatus(statusFormData(target, "active"))).resolves.toBeUndefined();
    expect(hoisted.unbanUser).toHaveBeenCalledWith(target);
  });

  it("cannot suspend its own account", async () => {
    const sysadmin = await createTestUser(db, { label: "sysadmin_users2", role: "system_administrator" });
    asUser(sysadmin);
    await expect(setUserStatus(statusFormData(sysadmin, "suspended"))).rejects.toThrow(
      /cannot suspend your own account/i,
    );
  });
});

describe("Users/Roles RBAC — Owner / GM (conservative: read-only)", () => {
  it("cannot assign roles, revoke roles, or suspend/reactivate users", async () => {
    const owner = await createTestUser(db, { label: "owner_users1", role: "owner_gm" });
    const target = await createTestUser(db, { label: "target_users2", role: "sales_client_intake" });

    asUser(owner);
    await expect(assignRole(roleFormData(target, "finance_billing"))).rejects.toBeInstanceOf(AuthorizationError);
    await expect(revokeRole(roleFormData(target, "sales_client_intake"))).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await expect(setUserStatus(statusFormData(target, "suspended"))).rejects.toBeInstanceOf(AuthorizationError);
    expect(hoisted.banUser).not.toHaveBeenCalledWith(target);
  });
});

describe("Users/Roles RBAC — every other role", () => {
  it.each([
    ["administrative_staff"],
    ["field_team_leader"],
    ["survey_field_personnel"],
    ["cad_technical_operator"],
    ["technical_reviewer_approver"],
    ["finance_billing"],
    ["sales_client_intake"],
  ] as const)("%s cannot invoke role/suspension actions directly", async (role) => {
    const user = await createTestUser(db, { label: `${role}_users_priv1`, role });
    const target = await createTestUser(db, { label: `${role}_users_priv1_target`, role: "sales_client_intake" });

    asUser(user);
    await expect(assignRole(roleFormData(target, "finance_billing"))).rejects.toBeInstanceOf(AuthorizationError);
    await expect(setUserStatus(statusFormData(target, "suspended"))).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Users/Roles RBAC — critical safety cases", () => {
  it("the last System Administrator cannot have that role revoked", async () => {
    // createTestDb's own bootstrap user (system_administrator) plus one
    // more here would leave >1 — delete every other sysadmin role row
    // first so this test genuinely exercises the "last one" guard.
    await db.delete(schema.userRoles).where(eq(schema.userRoles.roleSlug, "system_administrator"));
    const onlyAdmin = await createTestUser(db, { label: "only_sysadmin1", role: "system_administrator" });

    asUser(onlyAdmin);
    await expect(revokeRole(roleFormData(onlyAdmin, "system_administrator"))).rejects.toThrow(
      /last System Administrator/,
    );

    const [row] = await db
      .select()
      .from(schema.userRoles)
      .where(and(eq(schema.userRoles.userId, onlyAdmin), eq(schema.userRoles.roleSlug, "system_administrator")));
    expect(row).toBeDefined(); // role was NOT removed
  });

  it("allows revoking system_administrator when a second one still exists", async () => {
    const admin1 = await createTestUser(db, { label: "two_sysadmins_1", role: "system_administrator" });
    const admin2 = await createTestUser(db, { label: "two_sysadmins_2", role: "system_administrator" });

    asUser(admin1);
    await expect(revokeRole(roleFormData(admin2, "system_administrator"))).resolves.toBeUndefined();
  });

  it("self-escalation: a non-admin cannot give themselves System Administrator via assignRole (no permission to call it at all)", async () => {
    const sales = await createTestUser(db, { label: "sales_selfescalate1", role: "sales_client_intake" });
    asUser(sales);
    await expect(assignRole(roleFormData(sales, "system_administrator"))).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    const roles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, sales));
    expect(roles.map((r) => r.roleSlug)).not.toContain("system_administrator");
  });

  it("rejects a malformed/manipulated roleSlug payload rather than silently accepting it", async () => {
    const sysadmin = await createTestUser(db, { label: "sysadmin_malformed1", role: "system_administrator" });
    const target = await createTestUser(db, { label: "target_malformed1", role: "sales_client_intake" });
    asUser(sysadmin);
    await expect(assignRole(roleFormData(target, "super_admin_backdoor"))).rejects.toThrow(/Invalid role slug/);
  });

  it("cross-user escalation: a non-admin cannot alter another user's role or status", async () => {
    const field = await createTestUser(db, { label: "field_crossuser1", role: "field_team_leader" });
    const victim = await createTestUser(db, { label: "victim_crossuser1", role: "administrative_staff" });

    asUser(field);
    await expect(assignRole(roleFormData(victim, "system_administrator"))).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await expect(setUserStatus(statusFormData(victim, "suspended"))).rejects.toBeInstanceOf(AuthorizationError);

    const [row] = await db.select().from(schema.users).where(eq(schema.users.id, victim));
    expect(row.status).toBe("active");
  });

  it("a suspended System Administrator is denied protected functionality — suspension isn't self-exempting", async () => {
    const sysadmin = await createTestUser(db, { label: "sysadmin_suspended_self1", role: "system_administrator" });
    const other = await createTestUser(db, { label: "sysadmin_suspended_self1_bystander", role: "system_administrator" });
    await db.update(schema.users).set({ status: "suspended" }).where(eq(schema.users.id, sysadmin));

    asUser(sysadmin);
    await expect(assignRole(roleFormData(other, "finance_billing"))).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("an unknown/never-synced session fails closed", async () => {
    asUser(fakeClerkId("never_synced_users"));
    const someTarget = await createTestUser(db, { label: "target_unknown_session1", role: "sales_client_intake" });
    await expect(assignRole(roleFormData(someTarget, "finance_billing"))).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});
