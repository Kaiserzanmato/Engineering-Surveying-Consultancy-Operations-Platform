import Link from "next/link";
import { notFound } from "next/navigation";
import { authorize, AuthorizationError, getCurrentUser } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { leads, users, serviceTypes, leadSourceEnum } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { hasUnscopedLeadAccess, LEAD_SOURCE_LABELS } from "@/lib/crm/leads";
import { createLead } from "./actions";

export default async function LeadsPage() {
  try {
    await authorize("leads:read");
  } catch (err) {
    if (err instanceof AuthorizationError) notFound();
    throw err;
  }

  const actor = await getCurrentUser();
  if (!actor) notFound();

  const canManage = actor.permissions.has("leads:manage");
  const unscoped = hasUnscopedLeadAccess(actor);

  const db = getDb();
  const [allLeads, allServiceTypes] = await Promise.all([
    unscoped
      ? db.select().from(leads).orderBy(desc(leads.createdAt))
      : db.select().from(leads).where(eq(leads.assignedTo, actor.id)).orderBy(desc(leads.createdAt)),
    db.select().from(serviceTypes).where(eq(serviceTypes.active, true)),
  ]);

  // The user table is small (no pagination need yet at this stage), so a
  // full fetch + in-memory lookup is simpler than an IN(...) query here.
  const allUsers = await db.select().from(users);
  const userName = new Map(allUsers.map((u) => [u.id, u.fullName ?? u.email]));
  const serviceTypeName = new Map(allServiceTypes.map((s) => [s.id, s.name]));

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        {!unscoped && (
          <span className="text-sm text-black/50">Showing leads assigned to you</span>
        )}
      </div>

      {canManage && (
        <details className="mt-4 rounded-md border border-black/10 p-4">
          <summary className="cursor-pointer text-sm font-medium">New lead</summary>
          <form action={createLead} className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              Company name
              <input name="companyName" className="rounded border border-black/20 px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              Contact name *
              <input
                name="contactName"
                required
                className="rounded border border-black/20 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              Contact email
              <input
                name="contactEmail"
                type="email"
                className="rounded border border-black/20 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              Contact phone
              <input name="contactPhone" className="rounded border border-black/20 px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              Service type
              <select name="serviceTypeId" className="rounded border border-black/20 px-2 py-1">
                <option value="">— none —</option>
                {allServiceTypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Source
              <select name="source" className="rounded border border-black/20 px-2 py-1">
                <option value="">— none —</option>
                {leadSourceEnum.enumValues.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              Location
              <input name="location" className="rounded border border-black/20 px-2 py-1" />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              Service request notes
              <textarea
                name="serviceRequestNotes"
                rows={2}
                className="rounded border border-black/20 px-2 py-1"
              />
            </label>
            <button
              type="submit"
              className="col-span-2 mt-2 w-fit rounded bg-black px-3 py-1.5 text-white hover:bg-black/80"
            >
              Create lead
            </button>
          </form>
        </details>
      )}

      <table className="mt-6 w-full border-collapse text-sm">
        <caption className="sr-only">Leads list</caption>
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th scope="col" className="py-2 pr-4">
              Contact
            </th>
            <th scope="col" className="py-2 pr-4">
              Service
            </th>
            <th scope="col" className="py-2 pr-4">
              Status
            </th>
            <th scope="col" className="py-2 pr-4">
              Assigned to
            </th>
          </tr>
        </thead>
        <tbody>
          {allLeads.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-black/40">
                No leads yet.
              </td>
            </tr>
          )}
          {allLeads.map((lead) => (
            <tr key={lead.id} className="border-b border-black/5">
              <td className="py-2 pr-4">
                <Link href={`/crm/leads/${lead.id}`} className="font-medium hover:underline">
                  {lead.companyName ?? lead.contactName}
                </Link>
                {lead.companyName && (
                  <div className="text-black/50">{lead.contactName}</div>
                )}
              </td>
              <td className="py-2 pr-4">
                {lead.serviceTypeId ? (serviceTypeName.get(lead.serviceTypeId) ?? "—") : "—"}
              </td>
              <td className="py-2 pr-4 capitalize">{lead.status}</td>
              <td className="py-2 pr-4">
                {lead.assignedTo ? (userName.get(lead.assignedTo) ?? "—") : "Unassigned"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
