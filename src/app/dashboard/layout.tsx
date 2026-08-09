import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth/authorize";
import { requireMfaIfPrivileged } from "@/lib/auth/mfa";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // proxy.ts already requires a Clerk session for everything under
  // /dashboard, but getCurrentUser() can still return null if the local
  // user row hasn't synced yet (webhook lag on first sign-in) or the
  // account was just suspended — send them somewhere that explains that
  // rather than rendering a broken authenticated-looking shell with no data.
  if (!user) {
    redirect("/?unavailable=1");
  }

  await requireMfaIfPrivileged(user.roles);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-3">
        <nav className="flex items-center gap-4 text-sm" aria-label="Primary">
          <Link href="/dashboard" className="font-semibold">
            Point View
          </Link>
          {user.permissions.has("users:read") && (
            <Link href="/admin/users" className="text-black/70 hover:text-black">
              Users &amp; Roles
            </Link>
          )}
        </nav>
        <UserButton />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
