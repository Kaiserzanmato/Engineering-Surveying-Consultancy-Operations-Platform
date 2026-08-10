/**
 * Database-level negative-authorization tests for the Leads/CRM slice,
 * extending the pattern from src/app/(app)/projects/actions.integration.test.ts
 * to this slice per NEXT_TASK_EXTEND_DATABASE_LEVEL_RBAC_INTEGRATION_COVERAGE.
 * Same harness: real PGlite Postgres, real migrations, real seed data, only
 * @clerk/nextjs/server's auth() and @/db's getDb() mocked. See that file's
 * header comment for the full rationale (not repeated here).
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

const { createLead, updateLeadDetails, changeLeadStatus, claimLead, assignLead, convertLeadToClient } =
  await import("./actions");

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

async function insertLead(overrides: Partial<typeof schema.leads.$inferInsert> & { createdBy: string }) {
  const [lead] = await db
    .insert(schema.leads)
    .values({
      contactName: "Test Contact",
      status: "new",
      ...overrides,
    })
    .returning();
  return lead;
}

function leadFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("contactName", overrides.contactName ?? "New Contact");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

describe("Leads RBAC — System Administrator / Owner-GM (unscoped)", () => {
  it.each([["system_administrator"], ["owner_gm"]] as const)(
    "%s can read/manage any lead and reassign it, unblocked by assignment",
    async (role) => {
      const actor = await createTestUser(db, { label: `${role}_leads1`, role });
      const someoneElse = await createTestUser(db, { label: `${role}_other`, role: "administrative_staff" });
      const lead = await insertLead({ createdBy: actor, assignedTo: someoneElse });

      asUser(actor);
      const fd = new FormData();
      fd.set("leadId", lead.id);
      fd.set("contactName", "Updated Name");
      await expect(updateLeadDetails(fd)).resolves.toBeUndefined();

      const reassignFd = new FormData();
      reassignFd.set("leadId", lead.id);
      reassignFd.set("assignedTo", actor);
      await expect(assignLead(reassignFd)).resolves.toBeUndefined();
    },
  );
});

describe("Leads RBAC — Administrative Staff (assigned-scope)", () => {
  it("can read/edit an assigned lead but not another staff member's assigned lead", async () => {
    const admin = await createTestUser(db, { label: "admin_leads1", role: "administrative_staff" });
    const otherAdmin = await createTestUser(db, { label: "admin_leads1_other", role: "administrative_staff" });
    const ownLead = await insertLead({ createdBy: admin, assignedTo: admin });
    const othersLead = await insertLead({ createdBy: otherAdmin, assignedTo: otherAdmin });

    asUser(admin);
    const ownFd = new FormData();
    ownFd.set("leadId", ownLead.id);
    ownFd.set("contactName", "Edited by owner");
    await expect(updateLeadDetails(ownFd)).resolves.toBeUndefined();

    const othersFd = new FormData();
    othersFd.set("leadId", othersLead.id);
    othersFd.set("contactName", "Attempted edit");
    await expect(updateLeadDetails(othersFd)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("self-assigns on create", async () => {
    const admin = await createTestUser(db, { label: "admin_leads2", role: "administrative_staff" });
    asUser(admin);
    let leadId: string | null = null;
    try {
      await createLead(leadFormData());
      throw new Error("expected redirect");
    } catch (err) {
      if (!isRedirect(err)) throw err;
      leadId = getDigest(err)!.split(";")[2].split("/").pop()!;
    }
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId!));
    expect(lead.assignedTo).toBe(admin);
  });

  it("can claim an unassigned lead but cannot reassign it to someone else", async () => {
    const admin = await createTestUser(db, { label: "admin_leads3", role: "administrative_staff" });
    const creator = await createTestUser(db, { label: "admin_leads3_creator", role: "owner_gm" });
    const unassignedLead = await insertLead({ createdBy: creator, assignedTo: null });

    asUser(admin);
    const claimFd = new FormData();
    claimFd.set("leadId", unassignedLead.id);
    await expect(claimLead(claimFd)).resolves.toBeUndefined();

    const [claimed] = await db.select().from(schema.leads).where(eq(schema.leads.id, unassignedLead.id));
    expect(claimed.assignedTo).toBe(admin);

    const reassignFd = new FormData();
    reassignFd.set("leadId", unassignedLead.id);
    reassignFd.set("assignedTo", creator);
    await expect(assignLead(reassignFd)).rejects.toThrow(/Not authorized to reassign/);
  });

  it("cannot claim a lead already assigned to someone else", async () => {
    const admin = await createTestUser(db, { label: "admin_leads4", role: "administrative_staff" });
    const otherAdmin = await createTestUser(db, { label: "admin_leads4_other", role: "administrative_staff" });
    const lead = await insertLead({ createdBy: otherAdmin, assignedTo: otherAdmin });

    asUser(admin);
    const claimFd = new FormData();
    claimFd.set("leadId", lead.id);
    await expect(claimLead(claimFd)).rejects.toThrow(/already assigned/);
  });

  it("cannot bypass scope by manipulating assignedTo directly — changeLeadStatus on an unowned lead is denied", async () => {
    const admin = await createTestUser(db, { label: "admin_leads5", role: "administrative_staff" });
    const otherAdmin = await createTestUser(db, { label: "admin_leads5_other", role: "administrative_staff" });
    const lead = await insertLead({ createdBy: otherAdmin, assignedTo: otherAdmin, status: "new" });

    asUser(admin);
    const fd = new FormData();
    fd.set("leadId", lead.id);
    fd.set("status", "contacted");
    await expect(changeLeadStatus(fd)).rejects.toBeInstanceOf(AuthorizationError);

    const [row] = await db.select().from(schema.leads).where(eq(schema.leads.id, lead.id));
    expect(row.status).toBe("new"); // denial didn't partially apply
  });
});

describe("Leads RBAC — Sales / Client Intake (unscoped, full manage)", () => {
  it("can read/manage/reassign leads", async () => {
    const sales = await createTestUser(db, { label: "sales_leads1", role: "sales_client_intake" });
    const someone = await createTestUser(db, { label: "sales_leads1_other", role: "administrative_staff" });
    const lead = await insertLead({ createdBy: sales, assignedTo: someone });

    asUser(sales);
    const fd = new FormData();
    fd.set("leadId", lead.id);
    fd.set("contactName", "Edited by sales");
    await expect(updateLeadDetails(fd)).resolves.toBeUndefined();

    const reassignFd = new FormData();
    reassignFd.set("leadId", lead.id);
    reassignFd.set("assignedTo", sales);
    await expect(assignLead(reassignFd)).resolves.toBeUndefined();
  });

  it("cannot perform an unrelated privileged action (role assignment)", async () => {
    const sales = await createTestUser(db, { label: "sales_leads2", role: "sales_client_intake" });
    const { assignRole } = await import("../../admin/users/actions");
    asUser(sales);
    const fd = new FormData();
    fd.set("userId", sales);
    fd.set("roleSlug", "system_administrator");
    await expect(assignRole(fd)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Leads RBAC — Finance / Billing (read-only)", () => {
  it("cannot manage, qualify, convert, assign, or reassign leads", async () => {
    const finance = await createTestUser(db, { label: "finance_leads1", role: "finance_billing" });
    const owner = await createTestUser(db, { label: "finance_leads1_owner", role: "owner_gm" });
    const lead = await insertLead({ createdBy: owner, status: "qualified" });

    asUser(finance);
    const editFd = new FormData();
    editFd.set("leadId", lead.id);
    editFd.set("contactName", "Attempted");
    await expect(updateLeadDetails(editFd)).rejects.toBeInstanceOf(AuthorizationError);

    const statusFd = new FormData();
    statusFd.set("leadId", lead.id);
    statusFd.set("status", "disqualified");
    await expect(changeLeadStatus(statusFd)).rejects.toBeInstanceOf(AuthorizationError);

    const claimFd = new FormData();
    claimFd.set("leadId", lead.id);
    await expect(claimLead(claimFd)).rejects.toBeInstanceOf(AuthorizationError);

    const convertFd = new FormData();
    convertFd.set("leadId", lead.id);
    convertFd.set("clientType", "company");
    await expect(convertLeadToClient(convertFd)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Leads RBAC — Field/CAD/Reviewer roles (no access)", () => {
  it.each([
    ["field_team_leader"],
    ["survey_field_personnel"],
    ["cad_technical_operator"],
    ["technical_reviewer_approver"],
  ] as const)("%s has no Lead access at all", async (role) => {
    const user = await createTestUser(db, { label: `${role}_leads1`, role });
    const owner = await createTestUser(db, { label: `${role}_leads1_owner`, role: "owner_gm" });
    const lead = await insertLead({ createdBy: owner });

    asUser(user);
    const fd = new FormData();
    fd.set("leadId", lead.id);
    fd.set("contactName", "Attempted");
    await expect(updateLeadDetails(fd)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(createLead(leadFormData())).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Leads RBAC — negative/security scenarios", () => {
  it("qualified->converted requires both leads:manage (in scope) and clients:manage — denied for a scoped admin who lacks clients:manage on someone else's lead", async () => {
    const admin = await createTestUser(db, { label: "admin_leads_convert1", role: "administrative_staff" });
    const otherAdmin = await createTestUser(db, { label: "admin_leads_convert1_other", role: "administrative_staff" });
    const lead = await insertLead({ createdBy: otherAdmin, assignedTo: otherAdmin, status: "qualified" });

    asUser(admin);
    const fd = new FormData();
    fd.set("leadId", lead.id);
    fd.set("clientType", "company");
    await expect(convertLeadToClient(fd)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("a guessed lead id for an assigned-scope role is denied, not a 500 or silent no-op success", async () => {
    const admin = await createTestUser(db, { label: "admin_leads_guess1", role: "administrative_staff" });
    const owner = await createTestUser(db, { label: "admin_leads_guess1_owner", role: "owner_gm" });
    const lead = await insertLead({ createdBy: owner, assignedTo: owner });

    asUser(admin);
    const fd = new FormData();
    fd.set("leadId", lead.id);
    fd.set("status", "contacted");
    await expect(changeLeadStatus(fd)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("a suspended user is denied lead access even with an otherwise-valid unscoped role", async () => {
    const owner = await createTestUser(db, { label: "owner_leads_suspend1", role: "owner_gm" });
    const lead = await insertLead({ createdBy: owner });
    await db.update(schema.users).set({ status: "suspended" }).where(eq(schema.users.id, owner));

    asUser(owner);
    const fd = new FormData();
    fd.set("leadId", lead.id);
    fd.set("contactName", "Attempted while suspended");
    await expect(updateLeadDetails(fd)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("an unknown/never-synced session is denied", async () => {
    asUser(fakeClerkId("never_synced_leads"));
    await expect(createLead(leadFormData())).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("assignment changed between read and write: reassigning a lead away mid-flow revokes the original assignee's access on their next action", async () => {
    const admin = await createTestUser(db, { label: "admin_leads_race1", role: "administrative_staff" });
    const owner = await createTestUser(db, { label: "admin_leads_race1_owner", role: "owner_gm" });
    const lead = await insertLead({ createdBy: owner, assignedTo: admin });

    asUser(admin);
    const editBefore = new FormData();
    editBefore.set("leadId", lead.id);
    editBefore.set("contactName", "Edit while still assigned");
    await expect(updateLeadDetails(editBefore)).resolves.toBeUndefined();

    asUser(owner);
    const reassignAway = new FormData();
    reassignAway.set("leadId", lead.id);
    reassignAway.set("assignedTo", owner);
    await assignLead(reassignAway);

    asUser(admin);
    const editAfter = new FormData();
    editAfter.set("leadId", lead.id);
    editAfter.set("contactName", "Edit after reassignment away");
    await expect(updateLeadDetails(editAfter)).rejects.toBeInstanceOf(AuthorizationError);
  });
});
