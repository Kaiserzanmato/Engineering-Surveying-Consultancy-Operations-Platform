import { describe, it, expect } from "vitest";
import {
  hasUnscopedProjectManage,
  hasUnscopedProjectRead,
  hasUnscopedProjectManageMembers,
  projectInScope,
  projectMembersInScope,
  parseProjectStatus,
} from "./projects";
import type { AuthorizedUser } from "@/lib/auth/authorize";

function makeUser(overrides: Partial<AuthorizedUser> = {}): AuthorizedUser {
  return {
    id: "user_1",
    email: "test@example.com",
    fullName: "Test User",
    roles: ["administrative_staff"],
    permissions: new Set(["projects:read", "projects:manage"]),
    ...overrides,
  };
}

describe("hasUnscopedProjectManage", () => {
  it("is true for system_administrator and owner_gm", () => {
    expect(hasUnscopedProjectManage(makeUser({ roles: ["system_administrator"] }))).toBe(true);
    expect(hasUnscopedProjectManage(makeUser({ roles: ["owner_gm"] }))).toBe(true);
  });

  it("is false for administrative_staff and other roles", () => {
    expect(hasUnscopedProjectManage(makeUser({ roles: ["administrative_staff"] }))).toBe(false);
    expect(hasUnscopedProjectManage(makeUser({ roles: ["finance_billing"] }))).toBe(false);
  });
});

describe("hasUnscopedProjectRead", () => {
  it("is true for system_administrator, owner_gm, and finance_billing", () => {
    expect(hasUnscopedProjectRead(makeUser({ roles: ["system_administrator"] }))).toBe(true);
    expect(hasUnscopedProjectRead(makeUser({ roles: ["owner_gm"] }))).toBe(true);
    expect(hasUnscopedProjectRead(makeUser({ roles: ["finance_billing"] }))).toBe(true);
  });

  it("is false for membership-scoped roles", () => {
    expect(hasUnscopedProjectRead(makeUser({ roles: ["administrative_staff"] }))).toBe(false);
    expect(hasUnscopedProjectRead(makeUser({ roles: ["field_team_leader"] }))).toBe(false);
  });
});

describe("projectInScope", () => {
  it("allows system_administrator/owner_gm regardless of membership", () => {
    const user = makeUser({ roles: ["system_administrator"] });
    expect(projectInScope([], user)).toBe(true);
    expect(projectInScope(["someone_else"], user)).toBe(true);
  });

  it("allows finance_billing unscoped read even without membership", () => {
    const user = makeUser({ roles: ["finance_billing"] });
    expect(projectInScope([], user)).toBe(true);
    expect(projectInScope(["someone_else"], user)).toBe(true);
  });

  it("allows a scoped user (administrative_staff) only when they're a project member", () => {
    const user = makeUser({ roles: ["administrative_staff"] });
    expect(projectInScope(["user_1"], user)).toBe(true);
    expect(projectInScope(["user_1", "someone_else"], user)).toBe(true);
  });

  it("denies a scoped user who is not a project member", () => {
    const user = makeUser({ roles: ["administrative_staff"] });
    expect(projectInScope([], user)).toBe(false);
    expect(projectInScope(["someone_else"], user)).toBe(false);
  });

  it("denies a field/CAD/reviewer role not on the project's member list", () => {
    const user = makeUser({ roles: ["field_team_leader"] });
    expect(projectInScope(["someone_else"], user)).toBe(false);
    expect(projectInScope(["user_1"], user)).toBe(true);
  });
});

describe("hasUnscopedProjectManageMembers", () => {
  it("is true only for system_administrator and owner_gm", () => {
    expect(hasUnscopedProjectManageMembers(makeUser({ roles: ["system_administrator"] }))).toBe(true);
    expect(hasUnscopedProjectManageMembers(makeUser({ roles: ["owner_gm"] }))).toBe(true);
  });

  it("is false for administrative_staff, even though they hold projects:manage", () => {
    expect(
      hasUnscopedProjectManageMembers(
        makeUser({ roles: ["administrative_staff"], permissions: new Set(["projects:read", "projects:manage"]) }),
      ),
    ).toBe(false);
  });

  it("is false for field/CAD/reviewer roles", () => {
    expect(hasUnscopedProjectManageMembers(makeUser({ roles: ["field_team_leader"] }))).toBe(false);
    expect(hasUnscopedProjectManageMembers(makeUser({ roles: ["cad_technical_operator"] }))).toBe(false);
  });
});

describe("projectMembersInScope", () => {
  it("allows system_administrator/owner_gm regardless of membership", () => {
    const user = makeUser({ roles: ["system_administrator"] });
    expect(projectMembersInScope([], user)).toBe(true);
    expect(projectMembersInScope(["someone_else"], user)).toBe(true);
  });

  it("denies administrative_staff even when they ARE a project member — membership alone isn't enough without the manage_members permission/scope", () => {
    const user = makeUser({ roles: ["administrative_staff"] });
    expect(projectMembersInScope(["user_1"], user)).toBe(false);
  });

  it("denies finance_billing, which has unscoped READ but no membership-admin role", () => {
    const user = makeUser({ roles: ["finance_billing"] });
    expect(projectMembersInScope(["user_1"], user)).toBe(false);
    expect(projectMembersInScope([], user)).toBe(false);
  });
});

describe("parseProjectStatus", () => {
  it("accepts every documented status value", () => {
    for (const status of ["not_started", "pending", "active", "delayed", "completed"]) {
      expect(parseProjectStatus(status)).toBe(status);
    }
  });

  it("rejects an unknown status", () => {
    expect(() => parseProjectStatus("archived")).toThrow(/Invalid project status/);
  });

  it("rejects empty/null input", () => {
    expect(() => parseProjectStatus(null)).toThrow(/Invalid project status/);
    expect(() => parseProjectStatus("")).toThrow(/Invalid project status/);
  });
});
