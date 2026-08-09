import { clerkMiddleware } from "@clerk/nextjs/server";

// This used to also call auth.protect() here (gated by createRouteMatcher),
// but that caused a real production bug: on Clerk's development instance
// (no production domain configured yet — see
// docs/integrations/DEPENDENCY_REGISTRY.md), the "dev browser" cookie
// handshake that lets a signed-in user's *top-level navigations* pass
// auth.protect() does not reliably propagate to same-origin RSC prefetch/
// revalidation fetches (the requests Next.js's own router makes in the
// background after a Server Action, or when hovering a <Link>). Those
// fetches got rewritten to a static 404 page even for a fully signed-in
// user, so Server Action mutations succeeded server-side but the page
// never visibly refreshed to show it — clicks looked broken when they
// weren't.
//
// clerkMiddleware() alone (no protect() calls) still does what pages need
// from it: establishing request-scoped Clerk context so auth()/
// currentUser() work correctly in Server Components and Actions. The
// actual enforcement — deny by default, per TECHNICAL_ARCHITECTURE.md
// §5.3 — lives entirely in src/lib/auth/authorize.ts, called by every
// protected layout/page/action. This isn't a downgrade: it's exactly what
// Clerk's own deprecation notice on createRouteMatcher recommends
// (resource-based checks over middleware path-matching), and it was
// already true that authorize() was the real gate, not this file — see
// the removed comment's own note that this layer was "defense-in-depth,
// not the sole gate." The bug this caused (this file rewriting Next's own
// internal traffic to 404 for signed-in users) outweighs the marginal
// defense-in-depth value.
//
// Revisit once a production domain is configured (docs/security/
// THREAT_MODEL.md gap 5's sibling issue) — the dev-browser limitation
// goes away with a real production Clerk instance, at which point
// middleware-level protect() could be safely reintroduced if desired.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
