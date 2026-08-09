import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { authorize, AuthorizationError, getCurrentUser } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { clients, contacts, leads } from "@/db/schema";
import { updateClient, createContact, updateContact } from "../actions";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await authorize("clients:read");
  } catch (err) {
    if (err instanceof AuthorizationError) notFound();
    throw err;
  }

  const actor = await getCurrentUser();
  if (!actor) notFound();
  const canManage = actor.permissions.has("clients:manage");

  const db = getDb();
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) notFound();

  const [clientContacts, sourceLead] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.clientId, id)),
    client.sourceLeadId
      ? db.select().from(leads).where(eq(leads.id, client.sourceLeadId))
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl">
      <Link href="/crm/clients" className="text-sm text-black/50 hover:underline">
        ← Clients
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{client.name}</h1>
      <p className="text-sm text-black/60">
        {client.clientType} · <span className="capitalize">{client.status}</span>
        {sourceLead[0] && (
          <>
            {" "}
            · Converted from{" "}
            <Link href={`/crm/leads/${sourceLead[0].id}`} className="underline">
              lead
            </Link>
          </>
        )}
      </p>

      {canManage && (
        <form action={updateClient} className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <input type="hidden" name="clientId" value={client.id} />
          <label className="flex flex-col gap-1">
            Name *
            <input
              name="name"
              required
              defaultValue={client.name}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Status
            <select
              name="status"
              defaultValue={client.status}
              className="rounded border border-black/20 px-2 py-1"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Billing address
            <input
              name="billingAddress"
              defaultValue={client.billingAddress ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <button
            type="submit"
            className="col-span-2 mt-2 w-fit rounded bg-black px-3 py-1.5 text-white hover:bg-black/80"
          >
            Save changes
          </button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium">Contacts</h2>
        <ul className="mt-2 divide-y divide-black/5 text-sm">
          {clientContacts.length === 0 && <li className="py-2 text-black/40">No contacts yet.</li>}
          {clientContacts.map((contact) => (
            <li key={contact.id} className="py-3">
              {canManage ? (
                <form action={updateContact} className="grid grid-cols-2 gap-2">
                  <input type="hidden" name="contactId" value={contact.id} />
                  <input type="hidden" name="clientId" value={client.id} />
                  <input
                    name="firstName"
                    required
                    defaultValue={contact.firstName}
                    placeholder="First name"
                    className="rounded border border-black/20 px-2 py-1"
                  />
                  <input
                    name="lastName"
                    defaultValue={contact.lastName ?? ""}
                    placeholder="Last name"
                    className="rounded border border-black/20 px-2 py-1"
                  />
                  <input
                    name="email"
                    type="email"
                    defaultValue={contact.email ?? ""}
                    placeholder="Email"
                    className="rounded border border-black/20 px-2 py-1"
                  />
                  <input
                    name="phone"
                    defaultValue={contact.phone ?? ""}
                    placeholder="Phone"
                    className="rounded border border-black/20 px-2 py-1"
                  />
                  <input
                    name="title"
                    defaultValue={contact.title ?? ""}
                    placeholder="Title"
                    className="rounded border border-black/20 px-2 py-1"
                  />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isPrimary" defaultChecked={contact.isPrimary} />
                    Primary contact
                  </label>
                  <button
                    type="submit"
                    className="col-span-2 w-fit rounded border border-black/20 px-2 py-1 hover:bg-black/5"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <div>
                  <span className="font-medium">
                    {contact.firstName} {contact.lastName}
                  </span>
                  {contact.isPrimary && <span className="ml-2 text-black/40">(primary)</span>}
                  <div className="text-black/60">
                    {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {canManage && (
          <details className="mt-4 rounded-md border border-black/10 p-4">
            <summary className="cursor-pointer text-sm font-medium">Add contact</summary>
            <form action={createContact} className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <input type="hidden" name="clientId" value={client.id} />
              <input
                name="firstName"
                required
                placeholder="First name *"
                className="rounded border border-black/20 px-2 py-1"
              />
              <input
                name="lastName"
                placeholder="Last name"
                className="rounded border border-black/20 px-2 py-1"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="rounded border border-black/20 px-2 py-1"
              />
              <input
                name="phone"
                placeholder="Phone"
                className="rounded border border-black/20 px-2 py-1"
              />
              <input
                name="title"
                placeholder="Title"
                className="rounded border border-black/20 px-2 py-1"
              />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isPrimary" />
                Primary contact
              </label>
              <button
                type="submit"
                className="col-span-2 w-fit rounded bg-black px-3 py-1.5 text-white hover:bg-black/80"
              >
                Add contact
              </button>
            </form>
          </details>
        )}
      </section>
    </div>
  );
}
