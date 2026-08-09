import { currentUser } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/auth/authorize";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // Layout already redirects when getCurrentUser() is null; this is just a
  // type-narrowing guard for this page's render, not a second auth check.
  if (!user) return null;

  const isSystemAdministrator = user.roles.includes("system_administrator");
  const clerkUser = isSystemAdministrator ? await currentUser() : null;
  const showMfaNudge = isSystemAdministrator && !clerkUser?.twoFactorEnabled;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Welcome, {user.fullName ?? user.email}</h1>
      <p className="mt-2 text-sm text-black/70">
        {user.roles.length === 0
          ? "No role assigned yet — contact a System Administrator to get access to the rest of the platform."
          : `Role${user.roles.length > 1 ? "s" : ""}: ${user.roles.join(", ")}`}
      </p>
      {showMfaNudge && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Your role should have multi-factor authentication enabled (PRD §8),
          but it isn&apos;t enforced right now — Clerk&apos;s current plan
          doesn&apos;t offer an MFA method. This is a known pre-production
          gap, not an oversight; see{" "}
          <code className="font-mono">docs/security/THREAT_MODEL.md</code>.
        </p>
      )}
      <p className="mt-6 text-sm text-black/50">
        This is the identity/RBAC foundation slice — CRM, projects, field
        operations, and the rest of the platform (PRD §4) are not built yet.
      </p>
    </div>
  );
}
