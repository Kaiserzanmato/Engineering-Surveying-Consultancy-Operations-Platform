import { describe, it, expect } from "vitest";
import { roleSlugEnum } from "./schema";

describe("roleSlugEnum — PRD §12 role catalog", () => {
  it("matches the 9 roles defined in PRD §12 exactly (order-independent)", () => {
    const expected = [
      "system_administrator",
      "owner_gm",
      "administrative_staff",
      "field_team_leader",
      "survey_field_personnel",
      "cad_technical_operator",
      "technical_reviewer_approver",
      "finance_billing",
      "sales_client_intake",
    ];
    expect(new Set(roleSlugEnum.enumValues)).toEqual(new Set(expected));
    expect(roleSlugEnum.enumValues).toHaveLength(9);
  });

  it("rejects a value that isn't in the fixed role catalog", () => {
    // Same check used by src/app/admin/users/actions.ts's parseRoleSlug —
    // duplicated here as a plain assertion since actions.ts is a "use
    // server" module with Next.js runtime dependencies not worth mocking
    // just to re-exercise this one-line guard.
    const isValidRoleSlug = (value: string) => (roleSlugEnum.enumValues as string[]).includes(value);
    expect(isValidRoleSlug("system_administrator")).toBe(true);
    expect(isValidRoleSlug("super_admin")).toBe(false);
    expect(isValidRoleSlug("")).toBe(false);
    expect(isValidRoleSlug("system_administrator; DROP TABLE users;")).toBe(false);
  });
});
