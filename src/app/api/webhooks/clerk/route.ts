import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit";

// Keeps the local `users` table (identity projection, not a credential
// store) in sync with Clerk. This route is deliberately excluded from
// proxy.ts's auth.protect() — it authenticates via svix signature
// verification instead of a session, which is the correct mechanism for a
// server-to-server webhook, not a gap in the deny-by-default policy.
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new NextResponse("Verification failed", { status: 400 });
  }

  const db = getDb();

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address ?? "";
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

    const [existing] = await db.select().from(users).where(eq(users.id, id));

    if (existing) {
      await db.update(users).set({ email, fullName, updatedAt: new Date() }).where(eq(users.id, id));
      await logAuditEvent({
        actorUserId: null,
        action: "user.synced_from_clerk",
        targetType: "user",
        targetId: id,
        before: existing,
        after: { email, fullName },
      });
    } else {
      await db.insert(users).values({ id, email, fullName });
      await logAuditEvent({
        actorUserId: null,
        action: "user.created_from_clerk",
        targetType: "user",
        targetId: id,
        after: { email, fullName },
      });
    }
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await db.delete(users).where(eq(users.id, id));
      await logAuditEvent({
        actorUserId: null,
        action: "user.deleted_from_clerk",
        targetType: "user",
        targetId: id,
      });
    }
  }

  return new NextResponse("OK", { status: 200 });
}
