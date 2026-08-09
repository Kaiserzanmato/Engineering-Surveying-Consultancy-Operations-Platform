"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { authorize } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { clients, contacts } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";

export async function createClient(formData: FormData) {
  const actor = await authorize("clients:manage");
  const db = getDb();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Client name is required");
  const clientType = String(formData.get("clientType"));
  if (clientType !== "individual" && clientType !== "company") {
    throw new Error(`Invalid client type: ${clientType}`);
  }

  const [client] = await db
    .insert(clients)
    .values({
      name,
      clientType,
      billingAddress: String(formData.get("billingAddress") ?? "").trim() || null,
      createdBy: actor.id,
    })
    .returning();

  await logAuditEvent({
    actorUserId: actor.id,
    action: "client.created",
    targetType: "client",
    targetId: client.id,
    after: client,
  });

  revalidatePath("/crm/clients");
  redirect(`/crm/clients/${client.id}`);
}

export async function updateClient(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  const actor = await authorize("clients:manage");
  const db = getDb();

  const [before] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!before) throw new Error("Client not found");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Client name is required");
  const statusInput = String(formData.get("status"));
  if (statusInput !== "active" && statusInput !== "inactive") {
    throw new Error(`Invalid status: ${statusInput}`);
  }
  const status: "active" | "inactive" = statusInput;

  const after = {
    name,
    billingAddress: String(formData.get("billingAddress") ?? "").trim() || null,
    status,
    updatedAt: new Date(),
  };
  await db.update(clients).set(after).where(eq(clients.id, clientId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "client.updated",
    targetType: "client",
    targetId: clientId,
    before,
    after,
  });

  revalidatePath(`/crm/clients/${clientId}`);
}

export async function createContact(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  const actor = await authorize("clients:manage");

  const firstName = String(formData.get("firstName") ?? "").trim();
  if (!firstName) throw new Error("First name is required");

  const db = getDb();
  const [contact] = await db
    .insert(contacts)
    .values({
      clientId,
      firstName,
      lastName: String(formData.get("lastName") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      title: String(formData.get("title") ?? "").trim() || null,
      isPrimary: formData.get("isPrimary") === "on",
    })
    .returning();

  await logAuditEvent({
    actorUserId: actor.id,
    action: "contact.created",
    targetType: "contact",
    targetId: contact.id,
    after: contact,
    metadata: { clientId },
  });

  revalidatePath(`/crm/clients/${clientId}`);
}

export async function updateContact(formData: FormData) {
  const contactId = String(formData.get("contactId"));
  const clientId = String(formData.get("clientId"));
  const actor = await authorize("clients:manage");

  const db = getDb();
  const [before] = await db.select().from(contacts).where(eq(contacts.id, contactId));
  if (!before) throw new Error("Contact not found");

  const firstName = String(formData.get("firstName") ?? "").trim();
  if (!firstName) throw new Error("First name is required");

  const after = {
    firstName,
    lastName: String(formData.get("lastName") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    title: String(formData.get("title") ?? "").trim() || null,
    isPrimary: formData.get("isPrimary") === "on",
    updatedAt: new Date(),
  };
  await db.update(contacts).set(after).where(eq(contacts.id, contactId));

  await logAuditEvent({
    actorUserId: actor.id,
    action: "contact.updated",
    targetType: "contact",
    targetId: contactId,
    before,
    after,
  });

  revalidatePath(`/crm/clients/${clientId}`);
}
