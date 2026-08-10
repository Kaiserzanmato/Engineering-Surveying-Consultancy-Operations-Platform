/**
 * Database-level negative-authorization tests for the Projects vertical
 * slice (RBAC review 2026-08-11, docs/AGENT_HANDOFF.md Entry 15/16). Unlike
 * the rest of this repo's tests (100% pure-unit, no test hits a database —
 * see docs/security/RBAC_MATRIX.md's Known limitations before this file
 * existed), these call the real, unmodified server actions from ./actions
 * against a real Postgres instance (PGlite, in-memory, ephemeral — not a
 * mock/fake — see test/db-test-utils.ts) with only two things swapped out:
 * - @clerk/nextjs/server's auth(), so the test controls who's "signed in"
 * - @/db's getDb(), so actions hit the test database instead of the real one
 * next/navigation's redirect()/notFound() are NOT mocked — they're plain
 * functions that throw a digest-tagged Error with no request-context
 * dependency, so real behavior is exercised and asserted on directly.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { AuthorizationError } from "@/lib/auth/authorize";
import { createTestDb, createTestUser, fakeClerkId, type TestDb } from "../../../../test/db-test-utils";

const hoisted = vi.hoisted(() => ({
  currentUserId: { value: null as string | null },
  dbRef: { current: null as unknown },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: hoisted.currentUserId.value })),
}));

vi.mock("@/db", () => ({
  getDb: () => hoisted.dbRef.current,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Imported AFTER the mocks above (vi.mock calls are hoisted by vitest
// regardless of position, but the import itself must still come after in
// source order for readability/lint, and to be safe against any future
// change to that hoisting guarantee).
const { createProject, updateProject, addProjectMember, removeProjectMember } = await import("./actions");

function asUser(userId: string) {
  hoisted.currentUserId.value = userId;
}

function getDigest(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const digest = (err as Error & { digest?: unknown }).digest;
  return typeof digest === "string" ? digest : null;
}

function isRedirect(err: unknown): boolean {
  return getDigest(err)?.startsWith("NEXT_REDIRECT") ?? false;
}

let db: TestDb;
let clientId: string;

beforeAll(async () => {
  const { db: testDb } = await createTestDb();
  db = testDb;
  hoisted.dbRef.current = testDb;

  // A single shared Client row every test project references — Client
  // scoping isn't what this file is testing (Projects is).
  const bootstrapUser = await createTestUser(db, { label: "bootstrap", role: "system_administrator" });
  const [client] = await db
    .insert(schema.clients)
    .values({ name: "Acme Surveying Client", clientType: "company", createdBy: bootstrapUser })
    .returning();
  clientId = client.id;
});

afterAll(() => {
  hoisted.currentUserId.value = null;
  hoisted.dbRef.current = null;
});

function projectFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("projectNumber", overrides.projectNumber ?? `PN-${Math.random().toString(36).slice(2)}`);
  fd.set("clientId", overrides.clientId ?? clientId);
  fd.set("status", overrides.status ?? "not_started");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

async function createProjectAs(userId: string, overrides: Record<string, string> = {}): Promise<string> {
  asUser(userId);
  try {
    await createProject(projectFormData(overrides));
    throw new Error("expected createProject to redirect");
  } catch (err) {
    if (!isRedirect(err)) throw err;
    const digest = getDigest(err)!; // "NEXT_REDIRECT;push;/projects/<id>;..." — non-null: isRedirect() just confirmed it
    const url = digest.split(";")[2];
    const id = url.split("/").pop();
    if (!id) throw new Error(`could not parse project id from redirect digest: ${digest}`);
    return id;
  }
}

describe("Projects RBAC — System Administrator", () => {
  it("reads/edits any project and manages members, unblocked by lack of membership", async () => {
    const sysadmin = await createTestUser(db, { label: "sysadmin1", role: "system_administrator" });
    const otherOwner = await createTestUser(db, { label: "owner_for_sysadmin_test", role: "owner_gm" });
    const projectId = await createProjectAs(otherOwner); // sysadmin is NOT a member of this project

    asUser(sysadmin);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "active" })),
    ).resolves.toBeUndefined();

    const target = await createTestUser(db, { label: "target_for_sysadmin_test", role: "field_team_leader" });
    const addFd = new FormData();
    addFd.set("projectId", projectId);
    addFd.set("userId", target);
    await expect(addProjectMember(addFd)).resolves.toBeUndefined();

    const removeFd = new FormData();
    removeFd.set("projectId", projectId);
    removeFd.set("userId", target);
    await expect(removeProjectMember(removeFd)).resolves.toBeUndefined();
  });
});

describe("Projects RBAC — Owner / GM", () => {
  it("reads/edits any project and manages members, unblocked by lack of membership", async () => {
    const owner = await createTestUser(db, { label: "owner1", role: "owner_gm" });
    const otherAdmin = await createTestUser(db, { label: "sysadmin_for_owner_test", role: "system_administrator" });
    const projectId = await createProjectAs(otherAdmin);

    asUser(owner);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "active" })),
    ).resolves.toBeUndefined();

    const target = await createTestUser(db, { label: "target_for_owner_test", role: "cad_technical_operator" });
    const addFd = new FormData();
    addFd.set("projectId", projectId);
    addFd.set("userId", target);
    await expect(addProjectMember(addFd)).resolves.toBeUndefined();
  });
});

describe("Projects RBAC — Administrative Staff", () => {
  it("creates a project and becomes a member of it automatically", async () => {
    const admin = await createTestUser(db, { label: "admin1", role: "administrative_staff" });
    const projectId = await createProjectAs(admin);

    const membership = await db
      .select()
      .from(schema.projectMembers)
      .where(eq(schema.projectMembers.projectId, projectId));
    expect(membership.map((m) => m.userId)).toContain(admin);
  });

  it("edits a project it's a member of, but cannot edit one it's not a member of", async () => {
    const admin = await createTestUser(db, { label: "admin2", role: "administrative_staff" });
    const ownProjectId = await createProjectAs(admin);
    const otherOwner = await createTestUser(db, { label: "owner_for_admin_test2", role: "owner_gm" });
    const unrelatedProjectId = await createProjectAs(otherOwner);

    asUser(admin);
    await expect(
      updateProject(projectFormData({ projectId: ownProjectId, clientId, status: "active" })),
    ).resolves.toBeUndefined();

    await expect(
      updateProject(projectFormData({ projectId: unrelatedProjectId, clientId, status: "active" })),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("cannot manage membership even on a project it's a member of, and cannot add itself to an unrelated project", async () => {
    const admin = await createTestUser(db, { label: "admin3", role: "administrative_staff" });
    const ownProjectId = await createProjectAs(admin);
    const other = await createTestUser(db, { label: "target_for_admin_test3", role: "administrative_staff" });

    asUser(admin);
    const addFd = new FormData();
    addFd.set("projectId", ownProjectId);
    addFd.set("userId", other);
    await expect(addProjectMember(addFd)).rejects.toBeInstanceOf(AuthorizationError);

    const otherOwner = await createTestUser(db, { label: "owner_for_admin_test3b", role: "owner_gm" });
    const unrelatedProjectId = await createProjectAs(otherOwner);
    const selfAddFd = new FormData();
    selfAddFd.set("projectId", unrelatedProjectId);
    selfAddFd.set("userId", admin); // attempting to add themselves
    asUser(admin); // createProjectAs(otherOwner) left the mocked session as otherOwner — switch back
    await expect(addProjectMember(selfAddFd)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Projects RBAC — scoped read-only roles (Field/Survey/CAD/Reviewer)", () => {
  it.each([
    ["field_team_leader"],
    ["survey_field_personnel"],
    ["cad_technical_operator"],
    ["technical_reviewer_approver"],
  ] as const)("%s can never edit a project or manage members, member or not", async (role) => {
    const user = await createTestUser(db, { label: `${role}_1`, role });
    const owner = await createTestUser(db, { label: `owner_for_${role}`, role: "owner_gm" });
    const projectId = await createProjectAs(owner);
    // Make them a member — read scope would allow visibility, but manage should still be denied.
    const addFd = new FormData();
    addFd.set("projectId", projectId);
    addFd.set("userId", user);
    asUser(owner);
    await addProjectMember(addFd);

    asUser(user);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "active" })),
    ).rejects.toBeInstanceOf(AuthorizationError);

    const memberAddFd = new FormData();
    memberAddFd.set("projectId", projectId);
    memberAddFd.set("userId", user);
    await expect(addProjectMember(memberAddFd)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Projects RBAC — Finance / Billing", () => {
  it("cannot edit a project or manage members", async () => {
    const finance = await createTestUser(db, { label: "finance1", role: "finance_billing" });
    const owner = await createTestUser(db, { label: "owner_for_finance_test", role: "owner_gm" });
    const projectId = await createProjectAs(owner);

    asUser(finance);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "active" })),
    ).rejects.toBeInstanceOf(AuthorizationError);

    const addFd = new FormData();
    addFd.set("projectId", projectId);
    addFd.set("userId", finance);
    await expect(addProjectMember(addFd)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Projects RBAC — Sales / Client Intake", () => {
  it("has no ordinary Projects module access at all", async () => {
    const sales = await createTestUser(db, { label: "sales1", role: "sales_client_intake" });
    const owner = await createTestUser(db, { label: "owner_for_sales_test", role: "owner_gm" });
    const projectId = await createProjectAs(owner);

    asUser(sales);
    await expect(createProject(projectFormData())).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "active" })),
    ).rejects.toBeInstanceOf(AuthorizationError);
    const addFd = new FormData();
    addFd.set("projectId", projectId);
    addFd.set("userId", sales);
    await expect(addProjectMember(addFd)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Projects RBAC — negative/security scenarios", () => {
  it("removing membership immediately revokes access — no stale cached authorization", async () => {
    const admin = await createTestUser(db, { label: "admin_revoke_test", role: "administrative_staff" });
    const owner = await createTestUser(db, { label: "owner_for_revoke_test", role: "owner_gm" });
    const projectId = await createProjectAs(owner);

    asUser(owner);
    const addFd = new FormData();
    addFd.set("projectId", projectId);
    addFd.set("userId", admin);
    await addProjectMember(addFd);

    asUser(admin);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "active" })),
    ).resolves.toBeUndefined();

    asUser(owner);
    const removeFd = new FormData();
    removeFd.set("projectId", projectId);
    removeFd.set("userId", admin);
    await removeProjectMember(removeFd);

    asUser(admin);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "delayed" })),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("a suspended user is denied everything, even a former System Administrator", async () => {
    const sysadmin = await createTestUser(db, { label: "sysadmin_suspend_test", role: "system_administrator" });
    const owner = await createTestUser(db, { label: "owner_for_suspend_test", role: "owner_gm" });
    const projectId = await createProjectAs(owner);

    await db.update(schema.users).set({ status: "suspended" }).where(eq(schema.users.id, sysadmin));

    asUser(sysadmin);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "active" })),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(createProject(projectFormData())).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("an unknown/nonexistent Clerk session user id is denied (not synced, or never existed)", async () => {
    asUser(fakeClerkId("never_synced"));
    await expect(createProject(projectFormData())).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("a guessed/cross-project id is denied for a scoped role even with an otherwise well-formed request", async () => {
    const admin = await createTestUser(db, { label: "admin_guess_test", role: "administrative_staff" });
    // A project this admin has never seen and is not a member of.
    const owner = await createTestUser(db, { label: "owner_for_guess_test", role: "owner_gm" });
    const projectId = await createProjectAs(owner);

    asUser(admin);
    await expect(
      updateProject(projectFormData({ projectId, clientId, status: "completed" })),
    ).rejects.toBeInstanceOf(AuthorizationError);

    // Confirm the denial didn't leak through as a partial write.
    const [row] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    expect(row.status).not.toBe("completed");
  });

  it("project actions never write to user_roles — no role-escalation side channel", async () => {
    const admin = await createTestUser(db, { label: "admin_role_escalation_test", role: "administrative_staff" });
    const before = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, admin));

    await createProjectAs(admin);

    const after = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, admin));
    expect(after).toEqual(before);
  });
});
