import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const MFA_REQUIRED_ROLES = new Set(["system_administrator"]);

// PRD §8 says MFA is mandatory for System Administrator before production.
// Clerk's provisioned instance is on the Hobby plan, which doesn't offer
// ANY MFA strategy (Authenticator app / SMS are both Pro-only) — confirmed
// 2026-08-09 in the Clerk dashboard (Configure → Multi-factor). Enforcing
// the redirect below with no MFA method available would permanently lock
// every System Administrator out of the app, so enforcement is disabled
// here until Clerk is upgraded to Pro (or another MFA path is chosen).
//
// This is a deliberate, tracked pre-production gap — see
// docs/security/THREAT_MODEL.md and docs/integrations/DEPENDENCY_REGISTRY.md.
// Flip this to `true` once an MFA strategy is actually enabled in Clerk;
// the enforcement logic below is unchanged and doesn't need touching.
const MFA_ENFORCEMENT_ENABLED = false;

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
  if (!MFA_ENFORCEMENT_ENABLED) return;

  const needsMfa = roles.some((r) => MFA_REQUIRED_ROLES.has(r));
  if (!needsMfa) return;

  const user = await currentUser();
  if (!user?.twoFactorEnabled) {
    redirect("/account/security?mfaRequired=1");
  }
}
