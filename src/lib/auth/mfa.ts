import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const MFA_REQUIRED_ROLES = new Set(["system_administrator"]);

/**
 * PRD §8: "MFA mandatory for System Administrators where technically
 * supported." The Marketplace-provisioned Clerk instance doesn't expose a
 * per-role MFA enforcement policy at this plan tier, so it's enforced at
 * the application layer instead: a System Administrator without a second
 * factor enrolled is redirected to set one up before reaching any route
 * that has already resolved their privileged role, rather than merely
 * being nagged in the UI while still getting access.
 */
export async function requireMfaIfPrivileged(roles: string[]) {
  const needsMfa = roles.some((r) => MFA_REQUIRED_ROLES.has(r));
  if (!needsMfa) return;

  const user = await currentUser();
  if (!user?.twoFactorEnabled) {
    redirect("/account/security?mfaRequired=1");
  }
}
