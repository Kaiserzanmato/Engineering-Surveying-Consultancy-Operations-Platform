/**
 * Database-level negative-authorization tests for the Clients/CRM slice.
 * Same harness as leads/actions.integration.test.ts and
 * projects/actions.integration.test.ts (see those for the full rationale).
 *
 * Clients is deliberately unscoped in the current implementation — there is
 * no ClientMember/assignment entity (see docs/security/RBAC_MATRIX.md's
 * Interpretation notes). These tests verify what the code ACTUALLY
 * enforces today (permission possession only, no per-record scoping), not
 * an invented scoping model — per this task's explicit instruction not to
 * invent a ClientMember/ClientAssignment model.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { AuthorizationError } from "@/lib/auth/authorize";
import { createTestDb, createTestUser, fakeClerkId, type TestDb } from "../../../../../test/db-test-utils";

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

const { createClient, updateClient, createContact, updateContact } = await import("./actions");

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

beforeAll(async () => {
  const { db: testDb } = await createTestDb();
  db = testDb;
  hoisted.dbRef.current = testDb;
});

afterAll(() => {
  hoisted.currentUserId.value = null;
  hoisted.dbRef.current = null;
});

async function insertClient(overrides: Partial<typeof schema.clients.$inferInsert> & { createdBy: string }) {
  const [client] = await db
    .insert(schema.clients)
    .values({ name: "Test Client", clientType: "company", ...overrides })
    .returning();
  return client;
}

function clientFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("name", overrides.name ?? "New Client");
  fd.set("clientType", overrides.clientType ?? "company");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

async function createClientAs(userId: string, overrides: Record<string, string> = {}): Promise<string> {
  asUser(userId);
  try {
    await createClient(clientFormData(overrides));
    throw new Error("expected createClient to redirect");
  } catch (err) {
    if (!isRedirect(err)) throw err;
    const digest = getDigest(err)!;
    const id = digest.split(";")[2].split("/").pop();
    if (!id) throw new Error(`could not parse client id from redirect digest: ${digest}`);
    return id;
  }
}

describe("Clients RBAC — System Administrator / Owner-GM", () => {
  it.each([["system_administrator"], ["owner_gm"]] as const)("%s can read/manage all clients", async (role) => {
    const actor = await createTestUser(db, { label: `${role}_clients1`, role });
    const someoneElse = await createTestUser(db, { label: `${role}_clients1_other`, role: "administrative_staff" });
    const client = await insertClient({ createdBy: someoneElse });

    asUser(actor);
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("name", "Renamed by " + role);
    fd.set("status", "active");
    await expect(updateClient(fd)).resolves.toBeUndefined();
  });
});

describe("Clients RBAC — Administrative Staff (currently unscoped — no assignment model exists)", () => {
  it("can read and manage a client it did not create — documents the current unscoped implementation", async () => {
    const admin = await createTestUser(db, { label: "admin_clients1", role: "administrative_staff" });
    const otherAdmin = await createTestUser(db, { label: "admin_clients1_other", role: "administrative_staff" });
    const client = await insertClient({ createdBy: otherAdmin });

    asUser(admin);
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("name", "Edited by a non-creator admin");
    fd.set("status", "active");
    // This currently SUCCEEDS — Administrative Staff has unscoped
    // clients:manage today (no ClientMember mechanism exists, unlike
    // Projects). This is the documented current state, not an endorsement
    // — see docs/security/RBAC_MATRIX.md's Interpretation notes and this
    // task's own instruction not to invent client-scoping during testing.
    await expect(updateClient(fd)).resolves.toBeUndefined();
  });

  it("can create clients and contacts", async () => {
    const admin = await createTestUser(db, { label: "admin_clients2", role: "administrative_staff" });
    const clientId = await createClientAs(admin);

    const contactFd = new FormData();
    contactFd.set("clientId", clientId);
    contactFd.set("firstName", "Jane");
    await expect(createContact(contactFd)).resolves.toBeUndefined();
  });
});

describe("Clients RBAC — Sales / Client Intake", () => {
  it("can read/manage clients (they're the role that converts leads into clients)", async () => {
    const sales = await createTestUser(db, { label: "sales_clients1", role: "sales_client_intake" });
    const clientId = await createClientAs(sales);
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("name", "Updated by sales");
    fd.set("status", "active");
    await expect(updateClient(fd)).resolves.toBeUndefined();
  });
});

describe("Clients RBAC — Finance / Billing (read-only)", () => {
  it("cannot create, update, or add contacts", async () => {
    const finance = await createTestUser(db, { label: "finance_clients1", role: "finance_billing" });
    const owner = await createTestUser(db, { label: "finance_clients1_owner", role: "owner_gm" });
    const client = await insertClient({ createdBy: owner });

    asUser(finance);
    await expect(createClient(clientFormData())).rejects.toBeInstanceOf(AuthorizationError);

    const updateFd = new FormData();
    updateFd.set("clientId", client.id);
    updateFd.set("name", "Attempted");
    updateFd.set("status", "active");
    await expect(updateClient(updateFd)).rejects.toBeInstanceOf(AuthorizationError);

    const contactFd = new FormData();
    contactFd.set("clientId", client.id);
    contactFd.set("firstName", "Attempted");
    await expect(createContact(contactFd)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Clients RBAC — Field/CAD/Reviewer roles (current implementation: no access)", () => {
  it.each([
    ["field_team_leader"],
    ["survey_field_personnel"],
    ["cad_technical_operator"],
    ["technical_reviewer_approver"],
  ] as const)(
    "%s has no clients:read/manage grant today — PRD's 'Assigned' has no mechanical scope to enforce yet, so access is denied rather than broadened",
    async (role) => {
      const user = await createTestUser(db, { label: `${role}_clients1`, role });
      const owner = await createTestUser(db, { label: `${role}_clients1_owner`, role: "owner_gm" });
      const client = await insertClient({ createdBy: owner });

      asUser(user);
      const fd = new FormData();
      fd.set("clientId", client.id);
      fd.set("name", "Attempted");
      fd.set("status", "active");
      await expect(updateClient(fd)).rejects.toBeInstanceOf(AuthorizationError);
      await expect(createClient(clientFormData())).rejects.toBeInstanceOf(AuthorizationError);
    },
  );
});

describe("Clients RBAC — negative/security scenarios", () => {
  it("a suspended user with clients:manage is denied", async () => {
    const admin = await createTestUser(db, { label: "admin_clients_suspend1", role: "administrative_staff" });
    const client = await insertClient({ createdBy: admin });
    await db.update(schema.users).set({ status: "suspended" }).where(eq(schema.users.id, admin));

    asUser(admin);
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("name", "Attempted while suspended");
    fd.set("status", "active");
    await expect(updateClient(fd)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("an unknown/never-synced session is denied", async () => {
    asUser(fakeClerkId("never_synced_clients"));
    await expect(createClient(clientFormData())).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("updateContact without clients:manage is denied — cross-role mutation via a sub-resource is not a side door", async () => {
    const owner = await createTestUser(db, { label: "owner_clients_contact1", role: "owner_gm" });
    const client = await insertClient({ createdBy: owner });
    const [contact] = await db
      .insert(schema.contacts)
      .values({ clientId: client.id, firstName: "Original" })
      .returning();

    const finance = await createTestUser(db, { label: "finance_clients_contact1", role: "finance_billing" });
    asUser(finance);
    const fd = new FormData();
    fd.set("contactId", contact.id);
    fd.set("clientId", client.id);
    fd.set("firstName", "Attempted");
    await expect(updateContact(fd)).rejects.toBeInstanceOf(AuthorizationError);

    const [row] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, contact.id));
    expect(row.firstName).toBe("Original");
  });

  it("direct client ID access via updateClient succeeds for any clients:manage holder — confirms no hidden scope check exists to bypass", async () => {
    const admin1 = await createTestUser(db, { label: "admin_clients_direct1", role: "administrative_staff" });
    const admin2 = await createTestUser(db, { label: "admin_clients_direct2", role: "administrative_staff" });
    const client = await insertClient({ createdBy: admin1 });

    asUser(admin2);
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("name", "Direct access by unrelated admin");
    fd.set("status", "active");
    await expect(updateClient(fd)).resolves.toBeUndefined();
  });
});
