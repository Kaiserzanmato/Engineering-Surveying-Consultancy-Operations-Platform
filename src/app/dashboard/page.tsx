import { getCurrentUser } from "@/lib/auth/authorize";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // Layout already redirects when getCurrentUser() is null; this is just a
  // type-narrowing guard for this page's render, not a second auth check.
  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Welcome, {user.fullName ?? user.email}</h1>
      <p className="mt-2 text-sm text-black/70">
        {user.roles.length === 0
          ? "No role assigned yet — contact a System Administrator to get access to the rest of the platform."
          : `Role${user.roles.length > 1 ? "s" : ""}: ${user.roles.join(", ")}`}
      </p>
      <p className="mt-6 text-sm text-black/50">
        This is the identity/RBAC foundation slice — CRM, projects, field
        operations, and the rest of the platform (PRD §4) are not built yet.
      </p>
    </div>
  );
}
