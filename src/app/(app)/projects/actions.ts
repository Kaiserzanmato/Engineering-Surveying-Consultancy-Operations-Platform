"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { authorize } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { hasUnscopedProjectManage, projectInScope, parseProjectStatus } from "@/lib/projects";

async function getProjectOrThrow(id: string) {
  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) throw new Error("Project not found");
  return project;
}

async function getMemberUserIds(projectId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
  return rows.map((r) => r.userId);
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const str = String(value ?? "").trim();
  return str ? new Date(str) : null;
}

export async function createProject(formData: FormData) {
  // No project exists yet to scope against — permission possession alone
  // gates creation, same as leads/clients createX actions. A scoped
  // manager (administrative_staff) is auto-added as a member immediately
  // below so they aren't locked out of the record they just created.
  const actor = await authorize("projects:manage");
  const db = getDb();

  const projectNumber = String(formData.get("projectNumber") ?? "").trim();
  if (!projectNumber) throw new Error("Project number is required");
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) throw new Error("Client is required");
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "") || null;

  const [project] = await db
    .insert(projects)
    .values({
      projectNumber,
      clientId,
      serviceTypeId,
      location: String(formData.get("location") ?? "").trim() || null,
      status: parseProjectStatus(formData.get("status")),
      startDate: parseOptionalDate(formData.get("startDate")),
      targetEndDate: parseOptionalDate(formData.get("targetEndDate")),
      createdBy: actor.id,
    })
    .returning();

  await logAuditEvent({
    actorUserId: actor.id,
    action: "project.created",
    targetType: "project",
    targetId: project.id,
    after: project,
  });

  if (!hasUnscopedProjectManage(actor)) {
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: actor.id,
      addedBy: actor.id,
    });
    await logAuditEvent({
      actorUserId: actor.id,
      action: "project.member_added",
      targetType: "project",
      targetId: project.id,
      after: { userId: actor.id },
      metadata: { reason: "auto-added: creator of a scoped-manage project" },
    });
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const before = await getProjectOrThrow(projectId);
  const memberUserIds = await getMemberUserIds(projectId);
  const actor = await authorize("projects:manage", {
    resourceInScope: (user) => projectInScope(memberUserIds, user),
  });

  const db = getDb();
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) throw new Error("Client is required");
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "") || null;

  const after = {
    clientId,
    serviceTypeId,
    location: String(formData.get("location") ?? "").trim() || null,
    status: parseProjectStatus(formData.get("status")),
    currentStage: String(formData.get("currentStage") ?? "").trim() || null,
    blocker: String(formData.get("blocker") ?? "").trim() || null,
    startDate: parseOptionalDate(formData.get("startDate")),
    targetEndDate: parseOptionalDate(formData.get("targetEndDate")),
    actualEndDate: parseOptionalDate(formData.get("actualEndDate")),
    billingStatus: String(formData.get("billingStatus") ?? "").trim() || null,
    updatedAt: new Date(),
  };
  await db.update(projects).set(after).where(eq(projects.id, projectId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "project.updated",
    targetType: "project",
    targetId: projectId,
    before,
    after,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function addProjectMember(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Select a user to add");

  const memberUserIds = await getMemberUserIds(projectId);
  const actor = await authorize("projects:manage", {
    resourceInScope: (user) => projectInScope(memberUserIds, user),
  });

  if (memberUserIds.includes(userId)) return; // already a member, no-op

  const db = getDb();
  await db.insert(projectMembers).values({ projectId, userId, addedBy: actor.id });

  await logAuditEvent({
    actorUserId: actor.id,
    action: "project.member_added",
    targetType: "project",
    targetId: projectId,
    after: { userId },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectMember(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const userId = String(formData.get("userId") ?? "").trim();

  const memberUserIds = await getMemberUserIds(projectId);
  const actor = await authorize("projects:manage", {
    resourceInScope: (user) => projectInScope(memberUserIds, user),
  });

  if (!memberUserIds.includes(userId)) return; // already removed, no-op

  const db = getDb();
  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "project.member_removed",
    targetType: "project",
    targetId: projectId,
    before: { userId },
  });

  revalidatePath(`/projects/${projectId}`);
}
