import { notFound } from "next/navigation";
import { authorize, AuthorizationError, getCurrentUser } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { users, userRoles, roles } from "@/db/schema";
import { assignRole, revokeRole, setUserStatus } from "./actions";

export default async function AdminUsersPage() {
  try {
    await authorize("users:read");
  } catch (err) {
    if (err instanceof AuthorizationError) notFound(); // matches Clerk's own permission-gated-route convention
    throw err;
  }

  const currentUser = await getCurrentUser();
  const canManageRoles = currentUser?.permissions.has("users:manage_roles") ?? false;
  const canSuspend = currentUser?.permissions.has("users:suspend") ?? false;

  const db = getDb();
  const [allUsers, allUserRoles, allRoles] = await Promise.all([
    db.select().from(users).orderBy(users.email),
    db.select().from(userRoles),
    db.select().from(roles).orderBy(roles.name),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const ur of allUserRoles) {
    rolesByUser.set(ur.userId, [...(rolesByUser.get(ur.userId) ?? []), ur.roleSlug]);
  }
  const roleName = new Map<string, string>(allRoles.map((r) => [r.slug, r.name]));

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Users &amp; Roles</h1>
      <p className="mt-1 text-sm text-black/60">
        {allUsers.length} user{allUsers.length === 1 ? "" : "s"}. Users appear here once they
        sign in for the first time (synced from Clerk).
      </p>

      <table className="mt-6 w-full border-collapse text-sm">
        <caption className="sr-only">User accounts, their assigned roles, and status</caption>
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th scope="col" className="py-2 pr-4">
              User
            </th>
            <th scope="col" className="py-2 pr-4">
              Roles
            </th>
            <th scope="col" className="py-2 pr-4">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {allUsers.map((u) => {
            const userRoleSlugs = rolesByUser.get(u.id) ?? [];
            const availableRoles = allRoles.filter((r) => !userRoleSlugs.includes(r.slug));

            return (
              <tr key={u.id} className="border-b border-black/5 align-top">
                <td className="py-3 pr-4">
                  <div className="font-medium">{u.fullName ?? "(no name)"}</div>
                  <div className="text-black/60">{u.email}</div>
                </td>
                <td className="py-3 pr-4">
                  <ul className="flex flex-wrap gap-2">
                    {userRoleSlugs.length === 0 && (
                      <li className="text-black/40">No roles assigned</li>
                    )}
                    {userRoleSlugs.map((slug) => (
                      <li
                        key={slug}
                        className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-1"
                      >
                        <span>{roleName.get(slug) ?? slug}</span>
                        {canManageRoles && (
                          <form action={revokeRole}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="roleSlug" value={slug} />
                            <button
                              type="submit"
                              className="text-black/50 hover:text-black"
                              aria-label={`Remove ${roleName.get(slug) ?? slug} from ${u.email}`}
                            >
                              ×
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                  {canManageRoles && availableRoles.length > 0 && (
                    <form action={assignRole} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <label className="sr-only" htmlFor={`assign-role-${u.id}`}>
                        Assign role to {u.email}
                      </label>
                      <select
                        id={`assign-role-${u.id}`}
                        name="roleSlug"
                        className="rounded border border-black/20 px-2 py-1"
                      >
                        {availableRoles.map((r) => (
                          <option key={r.slug} value={r.slug}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-black px-2 py-1 text-white hover:bg-black/80"
                      >
                        Assign
                      </button>
                    </form>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="mb-2">{u.status === "active" ? "Active" : "Suspended"}</div>
                  {canSuspend && (
                    <form action={setUserStatus}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={u.status === "active" ? "suspended" : "active"}
                      />
                      <button
                        type="submit"
                        className="rounded border border-black/20 px-2 py-1 hover:bg-black/5"
                      >
                        {u.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
