import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

// One-time bootstrap: grants system_administrator to a user by email. This
// exists because role assignment normally requires users:manage_roles,
// which only a System Administrator has — a fresh deployment has none, so
// someone has to be promoted outside the app. Deliberately a CLI script
// run by whoever holds DATABASE_URL, not a web-reachable "first user
// becomes admin" code path (that pattern is a standing privilege-escalation
// risk if it's ever left enabled after go-live).
//
// Usage: bun run db:bootstrap-admin -- someone@example.com
// The user must already exist locally (i.e. have signed in at least once,
// so the Clerk webhook has synced their row) before running this.
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: bun run db:bootstrap-admin -- <email>");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) {
    console.error(
      `No local user found for ${email}. They must sign in at least once first (this creates the local row via the Clerk webhook).`,
    );
    process.exit(1);
  }

  await db
    .insert(schema.userRoles)
    .values({ userId: user.id, roleSlug: "system_administrator", assignedBy: null })
    .onConflictDoNothing();

  await db.insert(schema.auditEvents).values({
    actorUserId: null,
    action: "user.bootstrapped_as_admin",
    targetType: "user",
    targetId: user.id,
    metadata: { via: "scripts/bootstrap-admin.ts", email },
  });

  console.log(`Granted system_administrator to ${email} (${user.id}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
