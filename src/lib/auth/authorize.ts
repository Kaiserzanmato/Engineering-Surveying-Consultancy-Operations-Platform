import "server-only";
import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { users, userRoles, rolePermissions } from "@/db/schema";

export type AuthorizedUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  permissions: Set<string>;
};

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Loads the current session's local user row plus effective roles/permissions.
 * Returns null for: no session, local user row not yet synced (webhook lag),
 * or a suspended account — callers must treat all three as "not
 * authenticated," not distinguish between them, so a suspended user can't
 * probe their own account state through error messages.
 */
export async function getCurrentUser(): Promise<AuthorizedUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const [userRow] = await db.select().from(users).where(eq(users.id, userId));
  if (!userRow || userRow.status !== "active") return null;

  const roleRows = await db
    .select({ roleSlug: userRoles.roleSlug })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  const roleSlugs = roleRows.map((r) => r.roleSlug);

  if (roleSlugs.length === 0) {
    return {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.fullName,
      roles: [],
      permissions: new Set(),
    };
  }

  const permRows = await db
    .select({ permissionKey: rolePermissions.permissionKey })
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleSlug, roleSlugs));

  return {
    id: userRow.id,
    email: userRow.email,
    fullName: userRow.fullName,
    roles: roleSlugs,
    permissions: new Set(permRows.map((p) => p.permissionKey)),
  };
}

type AuthorizeOptions = {
  /**
   * Resource-scope check (e.g. "is this project in the user's assigned
   * set"). No scoped resources exist in the identity/RBAC slice yet, but
   * the ALLOW rule in TECHNICAL_ARCHITECTURE.md §5.3 names
   * resource_in_scope as a first-class check, so the hook exists now
   * rather than being bolted onto every caller once Projects ship.
   */
  resourceInScope?: (user: AuthorizedUser) => boolean | Promise<boolean>;
};

/**
 * Pure decision logic for the ALLOW rule in TECHNICAL_ARCHITECTURE.md §5.3:
 *   ALLOW = active_user AND permission_granted AND resource_in_scope AND action_allowed
 * Split out from authorize() so the deny-by-default logic itself can be
 * unit-tested (see authorize.test.ts) without mocking Clerk or the DB —
 * `user` is null exactly when active_user is false (getCurrentUser()
 * already collapses "no session" / "not synced yet" / "suspended" to null).
 * `action_allowed` is not evaluated here — it's the caller's own
 * business-rule check performed after authorize() resolves.
 */
export async function evaluateAllow(
  user: AuthorizedUser | null,
  permissionKey: string,
  resourceInScope?: AuthorizeOptions["resourceInScope"],
): Promise<boolean> {
  if (!user) return false; // active_user
  if (!user.permissions.has(permissionKey)) return false; // permission_granted
  if (resourceInScope && !(await resourceInScope(user))) return false; // resource_in_scope
  return true;
}

/**
 * The single server-side authorization function. Every mutating server
 * action / API route must call this — do not hand-roll per-route role
 * checks. Deny by default: throws AuthorizationError unless evaluateAllow()
 * returns true.
 */
export async function authorize(
  permissionKey: string,
  options: AuthorizeOptions = {},
): Promise<AuthorizedUser> {
  const user = await getCurrentUser();
  const allowed = await evaluateAllow(user, permissionKey, options.resourceInScope);
  if (!allowed || !user) throw new AuthorizationError();
  return user;
}

/**
 * Non-throwing variant for UI-level conditional rendering (e.g. hiding a
 * button). Never use this as the actual server-side gate for a mutation —
 * always call authorize() (and let it throw) immediately before performing
 * the action itself, even if the UI already used `can()` to decide what to
 * render.
 */
export async function can(permissionKey: string, options: AuthorizeOptions = {}): Promise<boolean> {
  try {
    await authorize(permissionKey, options);
    return true;
  } catch {
    return false;
  }
}
