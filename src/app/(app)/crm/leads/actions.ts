"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { authorize } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { leads, clients, leadStatusEnum } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import {
  leadInScope,
  hasUnscopedLeadAccess,
  canTransitionLeadStatus,
  parseLeadSource,
  type LeadStatus,
} from "@/lib/crm/leads";

async function getLeadOrThrow(id: string) {
  const db = getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) throw new Error("Lead not found");
  return lead;
}

export async function createLead(formData: FormData) {
  const actor = await authorize("leads:manage");
  const db = getDb();

  const contactName = String(formData.get("contactName") ?? "").trim();
  if (!contactName) throw new Error("Contact name is required");

  const serviceTypeId = String(formData.get("serviceTypeId") ?? "") || null;

  const [lead] = await db
    .insert(leads)
    .values({
      companyName: String(formData.get("companyName") ?? "").trim() || null,
      contactName,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      contactPhone: String(formData.get("contactPhone") ?? "").trim() || null,
      serviceTypeId,
      serviceRequestNotes: String(formData.get("serviceRequestNotes") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      source: parseLeadSource(formData.get("source")),
      // Scoped roles (administrative_staff) self-assign on create — see
      // src/lib/crm/leads.ts. Unscoped roles leave it unassigned until
      // someone claims/is assigned it.
      assignedTo: hasUnscopedLeadAccess(actor) ? null : actor.id,
      createdBy: actor.id,
    })
    .returning();

  await logAuditEvent({
    actorUserId: actor.id,
    action: "lead.created",
    targetType: "lead",
    targetId: lead.id,
    after: lead,
  });

  revalidatePath("/crm/leads");
  redirect(`/crm/leads/${lead.id}`);
}

export async function updateLeadDetails(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const before = await getLeadOrThrow(leadId);
  const actor = await authorize("leads:manage", {
    resourceInScope: (user) => leadInScope(before, user),
  });

  const db = getDb();
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "") || null;
  const after = {
    companyName: String(formData.get("companyName") ?? "").trim() || null,
    contactName: String(formData.get("contactName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
    contactPhone: String(formData.get("contactPhone") ?? "").trim() || null,
    serviceTypeId,
    serviceRequestNotes: String(formData.get("serviceRequestNotes") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    source: parseLeadSource(formData.get("source")),
    qualificationNotes: String(formData.get("qualificationNotes") ?? "").trim() || null,
    updatedAt: new Date(),
  };
  if (!after.contactName) throw new Error("Contact name is required");

  await db.update(leads).set(after).where(eq(leads.id, leadId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "lead.updated",
    targetType: "lead",
    targetId: leadId,
    before,
    after,
  });

  revalidatePath(`/crm/leads/${leadId}`);
}

export async function changeLeadStatus(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const nextStatus = String(formData.get("status")) as LeadStatus;
  if (!(leadStatusEnum.enumValues as string[]).includes(nextStatus)) {
    throw new Error(`Invalid status: ${nextStatus}`);
  }

  const before = await getLeadOrThrow(leadId);
  const actor = await authorize("leads:manage", {
    resourceInScope: (user) => leadInScope(before, user),
  });

  // A double-click (or a slow first request the user retried) can submit
  // the same target status twice — the end state the user wanted is
  // already true, so treat it as a successful no-op rather than an error.
  // canTransitionLeadStatus() still rejects genuinely invalid transitions
  // (e.g. new -> converted directly).
  if (before.status === nextStatus) return;

  if (!canTransitionLeadStatus(before.status, nextStatus)) {
    throw new Error(`Cannot move a lead from "${before.status}" to "${nextStatus}"`);
  }

  // Deliberately does not touch qualificationNotes — that's edited via
  // updateLeadDetails's form. A quick one-click status button must not
  // silently wipe previously entered notes by submitting an empty field.
  const db = getDb();
  await db.update(leads).set({ status: nextStatus, updatedAt: new Date() }).where(eq(leads.id, leadId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "lead.status_changed",
    targetType: "lead",
    targetId: leadId,
    before: { status: before.status },
    after: { status: nextStatus },
  });

  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/leads");
}

export async function claimLead(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const actor = await authorize("leads:manage");
  const before = await getLeadOrThrow(leadId);

  // Claiming is how a scoped (administrative_staff) user picks up an
  // unassigned lead — not gated by leadInScope since an unassigned lead is
  // by definition not yet in anyone's scope.
  if (before.assignedTo === actor.id) return; // double-click: already claimed by this user, no-op
  if (before.assignedTo) throw new Error("This lead is already assigned to someone else");

  const db = getDb();
  await db.update(leads).set({ assignedTo: actor.id, updatedAt: new Date() }).where(eq(leads.id, leadId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "lead.claimed",
    targetType: "lead",
    targetId: leadId,
    after: { assignedTo: actor.id },
  });

  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/leads");
}

export async function assignLead(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const assignTo = String(formData.get("assignedTo") ?? "") || null;

  const actor = await authorize("leads:manage");
  // Reassigning to someone else requires unscoped access — a scoped user
  // can only claim (see claimLead), not hand leads to other people.
  if (!hasUnscopedLeadAccess(actor)) throw new Error("Not authorized to reassign leads");

  const before = await getLeadOrThrow(leadId);
  const db = getDb();
  await db.update(leads).set({ assignedTo: assignTo, updatedAt: new Date() }).where(eq(leads.id, leadId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "lead.reassigned",
    targetType: "lead",
    targetId: leadId,
    before: { assignedTo: before.assignedTo },
    after: { assignedTo: assignTo },
  });

  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/leads");
}

export async function convertLeadToClient(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const clientType = String(formData.get("clientType")) as "individual" | "company";
  if (clientType !== "individual" && clientType !== "company") {
    throw new Error(`Invalid client type: ${clientType}`);
  }

  const before = await getLeadOrThrow(leadId);

  // Converting creates a Client, so both permissions are required — a
  // sales rep with leads:manage but no clients:manage (not a case in the
  // current seed, but the check should hold regardless of today's grants)
  // must not be able to create clients through this side door.
  const actor = await authorize("leads:manage", {
    resourceInScope: (user) => leadInScope(before, user),
  });
  await authorize("clients:manage");

  // Double-click: already converted (by this same click racing itself, or
  // a retried request after a slow-but-successful first one) — redirect to
  // the client that was already created instead of erroring.
  if (before.status === "converted" && before.convertedClientId) {
    redirect(`/crm/clients/${before.convertedClientId}`);
  }

  if (before.status !== "qualified") {
    throw new Error('Only a "qualified" lead can be converted to a client');
  }

  const db = getDb();
  const clientName = before.companyName || before.contactName;

  const [client] = await db
    .insert(clients)
    .values({
      name: clientName,
      clientType,
      sourceLeadId: before.id,
      createdBy: actor.id,
    })
    .returning();

  await db
    .update(leads)
    .set({ status: "converted", convertedClientId: client.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "lead.converted_to_client",
    targetType: "lead",
    targetId: leadId,
    after: { clientId: client.id },
  });
  await logAuditEvent({
    actorUserId: actor.id,
    action: "client.created_from_lead",
    targetType: "client",
    targetId: client.id,
    metadata: { sourceLeadId: before.id },
  });

  revalidatePath("/crm/leads");
  revalidatePath("/crm/clients");
  redirect(`/crm/clients/${client.id}`);
}
