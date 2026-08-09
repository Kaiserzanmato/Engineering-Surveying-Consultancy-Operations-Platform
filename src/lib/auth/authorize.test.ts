import { describe, it, expect } from "vitest";
import { evaluateAllow, type AuthorizedUser } from "./authorize";

function makeUser(overrides: Partial<AuthorizedUser> = {}): AuthorizedUser {
  return {
    id: "user_1",
    email: "test@example.com",
    fullName: "Test User",
    roles: ["survey_field_personnel"],
    permissions: new Set(["field_data:read"]),
    ...overrides,
  };
}

describe("evaluateAllow — ALLOW rule from TECHNICAL_ARCHITECTURE.md §5.3", () => {
  it("denies when there is no active user (no session, unsynced, or suspended)", async () => {
    await expect(evaluateAllow(null, "field_data:read")).resolves.toBe(false);
  });

  it("denies when the user lacks the required permission", async () => {
    const user = makeUser({ permissions: new Set(["field_data:read"]) });
    await expect(evaluateAllow(user, "users:manage_roles")).resolves.toBe(false);
  });

  it("denies an active user with zero roles/permissions (new account, no role assigned yet)", async () => {
    const user = makeUser({ roles: [], permissions: new Set() });
    await expect(evaluateAllow(user, "field_data:read")).resolves.toBe(false);
  });

  it("allows when the user has the exact required permission", async () => {
    const user = makeUser({ permissions: new Set(["field_data:read"]) });
    await expect(evaluateAllow(user, "field_data:read")).resolves.toBe(true);
  });

  it("allows when the user has the permission among several", async () => {
    const user = makeUser({
      permissions: new Set(["field_data:read", "users:read", "users:manage_roles"]),
    });
    await expect(evaluateAllow(user, "users:manage_roles")).resolves.toBe(true);
  });

  it("denies when permission is granted but the resource is out of scope", async () => {
    const user = makeUser({ permissions: new Set(["projects:read"]) });
    await expect(evaluateAllow(user, "projects:read", () => false)).resolves.toBe(false);
  });

  it("allows when permission is granted and the resource is in scope", async () => {
    const user = makeUser({ permissions: new Set(["projects:read"]) });
    await expect(evaluateAllow(user, "projects:read", () => true)).resolves.toBe(true);
  });

  it("supports an async resourceInScope check", async () => {
    const user = makeUser({ permissions: new Set(["projects:read"]) });
    const asyncScopeCheck = async () => {
      await new Promise((r) => setTimeout(r, 1));
      return true;
    };
    await expect(evaluateAllow(user, "projects:read", asyncScopeCheck)).resolves.toBe(true);
  });

  it("never evaluates resourceInScope when permission_granted already fails (short-circuits)", async () => {
    const user = makeUser({ permissions: new Set() });
    let called = false;
    await evaluateAllow(user, "projects:read", () => {
      called = true;
      return true;
    });
    expect(called).toBe(false);
  });
});
