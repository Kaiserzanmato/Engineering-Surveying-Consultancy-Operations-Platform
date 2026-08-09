"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { authorize } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { users, userRoles, roleSlugEnum } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";

type RoleSlug = (typeof roleSlugEnum.enumValues)[number];

function parseRoleSlug(value: FormDataEntryValue | null): RoleSlug {
  const slug = String(value);
  if (!(roleSlugEnum.enumValues as string[]).includes(slug)) {
    throw new Error(`Invalid role slug: ${slug}`);
  }
  return slug as RoleSlug;
}

export async function assignRole(formData: FormData) {
  const targetUserId = String(formData.get("userId"));
  const roleSlug = parseRoleSlug(formData.get("roleSlug"));

  const actor = await authorize("users:manage_roles"); // PRD §8: role changes are a high-risk action

  const db = getDb();
  await db.insert(userRoles).values({ userId: targetUserId, roleSlug, assignedBy: actor.id }).onConflictDoNothing();

  await logAuditEvent({
    actorUserId: actor.id,
    action: "user.role_assigned",
    targetType: "user",
    targetId: targetUserId,
    after: { roleSlug },
  });

  revalidatePath("/admin/users");
}

export async function revokeRole(formData: FormData) {
  const targetUserId = String(formData.get("userId"));
  const roleSlug = parseRoleSlug(formData.get("roleSlug"));

  const actor = await authorize("users:manage_roles");
  const db = getDb();

  if (roleSlug === "system_administrator") {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRoles)
      .where(eq(userRoles.roleSlug, "system_administrator"));
    if (count <= 1) {
      throw new Error(
        "Cannot remove the last System Administrator — this would lock everyone out of user/role management.",
      );
    }
  }

  await db.delete(userRoles).where(and(eq(userRoles.userId, targetUserId), eq(userRoles.roleSlug, roleSlug)));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "user.role_revoked",
    targetType: "user",
    targetId: targetUserId,
    before: { roleSlug },
  });

  revalidatePath("/admin/users");
}

export async function setUserStatus(formData: FormData) {
  const targetUserId = String(formData.get("userId"));
  const status = String(formData.get("status")) as "active" | "suspended";
  if (status !== "active" && status !== "suspended") {
    throw new Error(`Invalid status: ${status}`);
  }

  const actor = await authorize("users:suspend");

  if (targetUserId === actor.id && status === "suspended") {
    throw new Error("You cannot suspend your own account.");
  }

  const db = getDb();
  const [before] = await db.select().from(users).where(eq(users.id, targetUserId));
  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, targetUserId));

  // PRD §8 "Suspended account session revocation" — banUser revokes all of
  // the user's active Clerk sessions and blocks future sign-in, not just
  // our local DB flag. unbanUser reverses it on reactivation.
  const clerk = await clerkClient();
  if (status === "suspended") {
    await clerk.users.banUser(targetUserId);
  } else {
    await clerk.users.unbanUser(targetUserId);
  }

  await logAuditEvent({
    actorUserId: actor.id,
    action: status === "suspended" ? "user.suspended" : "user.reactivated",
    targetType: "user",
    targetId: targetUserId,
    before,
    after: { status },
  });

  revalidatePath("/admin/users");
}
