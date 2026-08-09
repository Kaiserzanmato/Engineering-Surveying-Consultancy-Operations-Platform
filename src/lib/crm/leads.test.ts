import { describe, it, expect } from "vitest";
import { hasUnscopedLeadAccess, leadInScope, canTransitionLeadStatus } from "./leads";
import type { AuthorizedUser } from "@/lib/auth/authorize";

function makeUser(overrides: Partial<AuthorizedUser> = {}): AuthorizedUser {
  return {
    id: "user_1",
    email: "test@example.com",
    fullName: "Test User",
    roles: ["administrative_staff"],
    permissions: new Set(["leads:read", "leads:manage"]),
    ...overrides,
  };
}

describe("hasUnscopedLeadAccess", () => {
  it("is true for system_administrator, owner_gm, sales_client_intake", () => {
    expect(hasUnscopedLeadAccess(makeUser({ roles: ["system_administrator"] }))).toBe(true);
    expect(hasUnscopedLeadAccess(makeUser({ roles: ["owner_gm"] }))).toBe(true);
    expect(hasUnscopedLeadAccess(makeUser({ roles: ["sales_client_intake"] }))).toBe(true);
  });

  it("is false for administrative_staff and other roles", () => {
    expect(hasUnscopedLeadAccess(makeUser({ roles: ["administrative_staff"] }))).toBe(false);
    expect(hasUnscopedLeadAccess(makeUser({ roles: ["finance_billing"] }))).toBe(false);
  });

  it("is true if ANY of the user's roles is unscoped, even mixed with scoped ones", () => {
    expect(
      hasUnscopedLeadAccess(makeUser({ roles: ["administrative_staff", "owner_gm"] })),
    ).toBe(true);
  });
});

describe("leadInScope", () => {
  it("allows unscoped roles regardless of assignment", () => {
    const user = makeUser({ roles: ["system_administrator"] });
    expect(leadInScope({ assignedTo: "someone_else" }, user)).toBe(true);
    expect(leadInScope({ assignedTo: null }, user)).toBe(true);
  });

  it("allows a scoped user only when the lead is assigned to them", () => {
    const user = makeUser({ roles: ["administrative_staff"] });
    expect(leadInScope({ assignedTo: "user_1" }, user)).toBe(true);
  });

  it("denies a scoped user when the lead is assigned to someone else", () => {
    const user = makeUser({ roles: ["administrative_staff"] });
    expect(leadInScope({ assignedTo: "someone_else" }, user)).toBe(false);
  });

  it("denies a scoped user when the lead is unassigned (must claim it first)", () => {
    const user = makeUser({ roles: ["administrative_staff"] });
    expect(leadInScope({ assignedTo: null }, user)).toBe(false);
  });
});

describe("canTransitionLeadStatus", () => {
  it("allows the documented forward path: new -> contacted -> qualified -> converted", () => {
    expect(canTransitionLeadStatus("new", "contacted")).toBe(true);
    expect(canTransitionLeadStatus("contacted", "qualified")).toBe(true);
    expect(canTransitionLeadStatus("qualified", "converted")).toBe(true);
  });

  it("allows disqualifying from new, contacted, or qualified", () => {
    expect(canTransitionLeadStatus("new", "disqualified")).toBe(true);
    expect(canTransitionLeadStatus("contacted", "disqualified")).toBe(true);
    expect(canTransitionLeadStatus("qualified", "disqualified")).toBe(true);
  });

  it("allows reopening a disqualified lead back to contacted", () => {
    expect(canTransitionLeadStatus("disqualified", "contacted")).toBe(true);
  });

  it("denies skipping straight from new to qualified or converted", () => {
    expect(canTransitionLeadStatus("new", "qualified")).toBe(false);
    expect(canTransitionLeadStatus("new", "converted")).toBe(false);
  });

  it("denies converting a lead that isn't qualified", () => {
    expect(canTransitionLeadStatus("new", "converted")).toBe(false);
    expect(canTransitionLeadStatus("contacted", "converted")).toBe(false);
    expect(canTransitionLeadStatus("disqualified", "converted")).toBe(false);
  });

  it("treats converted as terminal — no transitions out of it", () => {
    expect(canTransitionLeadStatus("converted", "new")).toBe(false);
    expect(canTransitionLeadStatus("converted", "contacted")).toBe(false);
    expect(canTransitionLeadStatus("converted", "qualified")).toBe(false);
    expect(canTransitionLeadStatus("converted", "disqualified")).toBe(false);
  });

  it("denies a no-op transition to the same status", () => {
    expect(canTransitionLeadStatus("new", "new")).toBe(false);
    expect(canTransitionLeadStatus("qualified", "qualified")).toBe(false);
  });
});
