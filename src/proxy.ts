import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// NOTE: @clerk/nextjs 7.7.1 logs a deprecation warning for
// createRouteMatcher, recommending resource-based auth checks (in each
// page/layout/route) instead of middleware path-matching, since matcher
// patterns can diverge from actual Next.js routing. That's already how
// this app is built: src/lib/auth/authorize.ts is the real enforcement
// point, called directly in every protected layout/page/action (deny by
// default, per TECHNICAL_ARCHITECTURE.md §5.3). This middleware layer is
// intentionally kept as defense-in-depth on top of that, not the sole
// gate — but if Clerk removes createRouteMatcher in a future major
// version, this file will need migrating off it. Tracked in
// docs/security/THREAT_MODEL.md.

// Deny-by-default per TECHNICAL_ARCHITECTURE.md §5.3 — everything requires
// an authenticated session except the explicit public routes below. The
// Clerk webhook route authenticates via svix signature verification
// instead of a session (see src/app/api/webhooks/clerk/route.ts), so it
// stays public here but is not actually unauthenticated.
//
// No public /sign-up route: this is an internal operations platform (PRD
// §1), not a self-service product. Accounts are provisioned by a System
// Administrator (Clerk invitation), and a new user has zero roles/local
// permissions until explicitly assigned one via /admin/users — so even if
// self-serve sign-up is ever re-enabled at the Clerk instance level, a
// self-registered account is inert by default, not merely unauthenticated.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/api/webhooks/clerk"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
