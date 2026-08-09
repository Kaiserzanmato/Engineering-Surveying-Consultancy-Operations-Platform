"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { serviceTypes } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";

export async function createServiceType(formData: FormData) {
  const actor = await authorize("service_types:manage");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const db = getDb();
  const [serviceType] = await db
    .insert(serviceTypes)
    .values({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
    })
    .returning();

  await logAuditEvent({
    actorUserId: actor.id,
    action: "service_type.created",
    targetType: "service_type",
    targetId: serviceType.id,
    after: serviceType,
  });

  revalidatePath("/admin/service-types");
  revalidatePath("/crm/leads");
}
