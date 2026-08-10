/**
 * Page/route-level (React Server Component) authorization tests — the
 * layer flagged as having weaker coverage than server actions (only unit
 * tests of the underlying scoping functions, never the page's own
 * authorize()+notFound() control flow, and never the actual data query a
 * page runs). Same PGlite/mock harness as the actions.integration.test.ts
 * files. Pages are plain async functions returning a React element tree
 * (a plain object graph when not rendered to a DOM) — calling them
 * directly and either awaiting resolution or catching notFound()'s thrown
 * digest error IS testing the real server-side data access path, not a
 * simulation of it.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { createTestDb, createTestUser, type TestDb } from "../../../test/db-test-utils";

const hoisted = vi.hoisted(() => ({
  currentUserId: { value: null as string | null },
  dbRef: { current: null as unknown },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: hoisted.currentUserId.value })),
  clerkClient: vi.fn(async () => ({ users: { banUser: vi.fn(), unbanUser: vi.fn() } })),
}));

vi.mock("@/db", () => ({
  getDb: () => hoisted.dbRef.current,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { default: ProjectDetailPage } = await import("./projects/[id]/page");
const { default: LeadsPage } = await import("./crm/leads/page");
const { default: LeadDetailPage } = await import("./crm/leads/[id]/page");
const { default: ClientsPage } = await import("./crm/clients/page");
const { default: ClientDetailPage } = await import("./crm/clients/[id]/page");
const { default: AdminUsersPage } = await import("./admin/users/page");
const { setUserStatus } = await import("./admin/users/actions");

function asUser(userId: string) {
  hoisted.currentUserId.value = userId;
}

function is404(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const digest = (err as Error & { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes(";404");
}

// React elements are plain objects `{ type, key, props }` when not
// rendered — walk the tree collecting elements matching a predicate.
// This is a real assertion about what the page WOULD render, not a DOM
// snapshot, so it's resilient to styling/markup changes but still catches
// "the wrong rows/controls are present."
type Query = (el: { type: unknown; key: string | null; props: Record<string, unknown> }) => boolean;
function findAll(node: unknown, predicate: Query, acc: unknown[] = []): unknown[] {
  if (node == null || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    for (const n of node) findAll(n, predicate, acc);
    return acc;
  }
  const el = node as { type?: unknown; key?: string | null; props?: Record<string, unknown> };
  if (el.type !== undefined && el.props) {
    if (predicate({ type: el.type, key: el.key ?? null, props: el.props })) acc.push(el);
    if ("children" in el.props) findAll(el.props.children, predicate, acc);
  }
  return acc;
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

describe("Page authorization — Projects", () => {
  it("a scoped member can render their assigned project; the same user cannot render an unassigned one", async () => {
    const admin = await createTestUser(db, { label: "page_admin_projects1", role: "administrative_staff" });
    const owner = await createTestUser(db, { label: "page_owner_projects1", role: "owner_gm" });
    const client = (
      await db.insert(schema.clients).values({ name: "PageTest Client", clientType: "company", createdBy: owner }).returning()
    )[0];
    const [ownedProject] = await db
      .insert(schema.projects)
      .values({ projectNumber: "PT-1", clientId: client.id, createdBy: owner })
      .returning();
    await db.insert(schema.projectMembers).values({ projectId: ownedProject.id, userId: admin, addedBy: owner });
    const [unrelatedProject] = await db
      .insert(schema.projects)
      .values({ projectNumber: "PT-2", clientId: client.id, createdBy: owner })
      .returning();

    asUser(admin);
    await expect(ProjectDetailPage({ params: Promise.resolve({ id: ownedProject.id }) })).resolves.toBeDefined();
    await expect(ProjectDetailPage({ params: Promise.resolve({ id: unrelatedProject.id }) })).rejects.toSatisfy(
      is404,
    );
  });
});

describe("Page authorization — Leads", () => {
  it("Administrative Staff's list page shows only their assigned leads", async () => {
    const admin = await createTestUser(db, { label: "page_admin_leads1", role: "administrative_staff" });
    const owner = await createTestUser(db, { label: "page_owner_leads1", role: "owner_gm" });
    const [ownLead] = await db
      .insert(schema.leads)
      .values({ contactName: "Own Lead", createdBy: admin, assignedTo: admin })
      .returning();
    await db.insert(schema.leads).values({ contactName: "Someone Else's Lead", createdBy: owner, assignedTo: owner });

    asUser(admin);
    const tree = await LeadsPage();
    const rows = findAll(tree, (el) => el.type === "tr" && el.key !== null);
    const rowKeys = rows.map((r) => (r as { key: string }).key);
    expect(rowKeys).toContain(ownLead.id);
    expect(rowKeys).toHaveLength(1); // the other admin's/owner's lead must not appear
  });

  it("a lead assigned to someone else cannot render for a scoped user, but an unassigned lead can (so it can be claimed)", async () => {
    const admin = await createTestUser(db, { label: "page_admin_leads2", role: "administrative_staff" });
    const otherAdmin = await createTestUser(db, { label: "page_admin_leads2_other", role: "administrative_staff" });
    const [othersLead] = await db
      .insert(schema.leads)
      .values({ contactName: "Others Lead", createdBy: otherAdmin, assignedTo: otherAdmin })
      .returning();
    const [unassignedLead] = await db
      .insert(schema.leads)
      .values({ contactName: "Unassigned Lead", createdBy: otherAdmin, assignedTo: null })
      .returning();

    asUser(admin);
    await expect(LeadDetailPage({ params: Promise.resolve({ id: othersLead.id }) })).rejects.toSatisfy(is404);
    await expect(LeadDetailPage({ params: Promise.resolve({ id: unassignedLead.id }) })).resolves.toBeDefined();
  });
});

describe("Page authorization — Clients", () => {
  it("a role without clients:read cannot render the list or detail page; a role with it can (current unscoped implementation)", async () => {
    const fieldLead = await createTestUser(db, { label: "page_field_clients1", role: "field_team_leader" });
    const admin = await createTestUser(db, { label: "page_admin_clients1", role: "administrative_staff" });
    const [client] = await db
      .insert(schema.clients)
      .values({ name: "PageTest Client 2", clientType: "company", createdBy: admin })
      .returning();

    asUser(fieldLead);
    await expect(ClientsPage()).rejects.toSatisfy(is404);
    await expect(ClientDetailPage({ params: Promise.resolve({ id: client.id }) })).rejects.toSatisfy(is404);

    asUser(admin);
    await expect(ClientsPage()).resolves.toBeDefined();
    await expect(ClientDetailPage({ params: Promise.resolve({ id: client.id }) })).resolves.toBeDefined();
  });
});

describe("Page authorization — Users / Admin", () => {
  it("only System Administrator/Owner-GM can render the admin users page; other roles are denied", async () => {
    const sysadmin = await createTestUser(db, { label: "page_sysadmin_users1", role: "system_administrator" });
    const owner = await createTestUser(db, { label: "page_owner_users1", role: "owner_gm" });
    const salesUser = await createTestUser(db, { label: "page_sales_users1", role: "sales_client_intake" });

    asUser(sysadmin);
    await expect(AdminUsersPage()).resolves.toBeDefined();
    asUser(owner);
    await expect(AdminUsersPage()).resolves.toBeDefined();
    asUser(salesUser);
    await expect(AdminUsersPage()).rejects.toSatisfy(is404);
  });

  it("Owner/GM gets the read-only experience — no role-assign or suspend controls render — while System Administrator gets both", async () => {
    const sysadmin = await createTestUser(db, { label: "page_sysadmin_users2", role: "system_administrator" });
    const owner = await createTestUser(db, { label: "page_owner_users2", role: "owner_gm" });

    asUser(sysadmin);
    const sysadminTree = await AdminUsersPage();
    const assignSelects = findAll(
      sysadminTree,
      (el) => el.type === "select" && typeof el.props.id === "string" && el.props.id.startsWith("assign-role-"),
    );
    expect(assignSelects.length).toBeGreaterThan(0);
    const suspendForms = findAll(
      sysadminTree,
      (el) => el.type === "form" && el.props.action === setUserStatus,
    );
    expect(suspendForms.length).toBeGreaterThan(0);

    asUser(owner);
    const ownerTree = await AdminUsersPage();
    const ownerAssignSelects = findAll(
      ownerTree,
      (el) => el.type === "select" && typeof el.props.id === "string" && el.props.id.startsWith("assign-role-"),
    );
    expect(ownerAssignSelects).toHaveLength(0);
    const ownerSuspendForms = findAll(ownerTree, (el) => el.type === "form" && el.props.action === setUserStatus);
    expect(ownerSuspendForms).toHaveLength(0);
  });

  it("a non-privileged user cannot access the admin route at all", async () => {
    const field = await createTestUser(db, { label: "page_field_users1", role: "field_team_leader" });
    asUser(field);
    await expect(AdminUsersPage()).rejects.toSatisfy(is404);
  });
});
