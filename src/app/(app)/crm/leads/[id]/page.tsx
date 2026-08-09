import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { authorize, AuthorizationError, getCurrentUser } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { leads, users, serviceTypes, leadSourceEnum } from "@/db/schema";
import { leadInScope, hasUnscopedLeadAccess, LEAD_SOURCE_LABELS } from "@/lib/crm/leads";
import {
  updateLeadDetails,
  changeLeadStatus,
  claimLead,
  assignLead,
  convertLeadToClient,
} from "../actions";

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  new: [
    { value: "contacted", label: "Mark contacted" },
    { value: "disqualified", label: "Disqualify" },
  ],
  contacted: [
    { value: "qualified", label: "Mark qualified" },
    { value: "disqualified", label: "Disqualify" },
  ],
  qualified: [{ value: "disqualified", label: "Disqualify" }],
  disqualified: [{ value: "contacted", label: "Reopen (mark contacted)" }],
  converted: [],
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await authorize("leads:read");
  } catch (err) {
    if (err instanceof AuthorizationError) notFound();
    throw err;
  }

  const actor = await getCurrentUser();
  if (!actor) notFound();

  const db = getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) notFound();
  if (!leadInScope(lead, actor) && lead.assignedTo) notFound(); // assigned to someone else, out of scope

  const canManage = actor.permissions.has("leads:manage") && (leadInScope(lead, actor) || !lead.assignedTo);
  const canReassign = hasUnscopedLeadAccess(actor);
  const canConvert =
    canManage && actor.permissions.has("clients:manage") && lead.status === "qualified";

  const [allServiceTypes, allUsers] = await Promise.all([
    db.select().from(serviceTypes).where(eq(serviceTypes.active, true)),
    canReassign ? db.select().from(users) : Promise.resolve([]),
  ]);

  const assignedName = lead.assignedTo
    ? ((await db.select().from(users).where(eq(users.id, lead.assignedTo)))[0]?.fullName ??
      lead.assignedTo)
    : null;

  return (
    <div className="max-w-2xl">
      <Link href="/crm/leads" className="text-sm text-black/50 hover:underline">
        ← Leads
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{lead.companyName ?? lead.contactName}</h1>
      <p className="text-sm text-black/60">
        Status: <span className="capitalize">{lead.status}</span> · Assigned to:{" "}
        {assignedName ?? "Unassigned"}
      </p>

      {canManage && lead.status !== "converted" && (
        <section className="mt-4 flex flex-wrap gap-2">
          {NEXT_STATUS[lead.status]?.map((t) => (
            <form key={t.value} action={changeLeadStatus}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="status" value={t.value} />
              <button
                type="submit"
                className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5"
              >
                {t.label}
              </button>
            </form>
          ))}
          {!lead.assignedTo && (
            <form action={claimLead}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button
                type="submit"
                className="rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5"
              >
                Claim this lead
              </button>
            </form>
          )}
          {canConvert && (
            <form action={convertLeadToClient} className="flex items-center gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <select name="clientType" className="rounded border border-black/20 px-2 py-1 text-sm">
                <option value="company">Company</option>
                <option value="individual">Individual</option>
              </select>
              <button
                type="submit"
                className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-black/80"
              >
                Convert to client
              </button>
            </form>
          )}
        </section>
      )}

      {canReassign && (
        <form action={assignLead} className="mt-4 flex items-center gap-2 text-sm">
          <input type="hidden" name="leadId" value={lead.id} />
          <label htmlFor="assignedTo">Reassign to</label>
          <select id="assignedTo" name="assignedTo" className="rounded border border-black/20 px-2 py-1">
            <option value="">— unassign —</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id} selected={u.id === lead.assignedTo}>
                {u.fullName ?? u.email}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded border border-black/20 px-2 py-1 hover:bg-black/5">
            Save
          </button>
        </form>
      )}

      {canManage && (
        <form action={updateLeadDetails} className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <input type="hidden" name="leadId" value={lead.id} />
          <label className="flex flex-col gap-1">
            Company name
            <input
              name="companyName"
              defaultValue={lead.companyName ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Contact name *
            <input
              name="contactName"
              required
              defaultValue={lead.contactName}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Contact email
            <input
              name="contactEmail"
              type="email"
              defaultValue={lead.contactEmail ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Contact phone
            <input
              name="contactPhone"
              defaultValue={lead.contactPhone ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Service type
            <select
              name="serviceTypeId"
              defaultValue={lead.serviceTypeId ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            >
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
            <select
              name="source"
              defaultValue={lead.source ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            >
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
            <input
              name="location"
              defaultValue={lead.location ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Service request notes
            <textarea
              name="serviceRequestNotes"
              rows={2}
              defaultValue={lead.serviceRequestNotes ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Qualification notes
            <textarea
              name="qualificationNotes"
              rows={2}
              defaultValue={lead.qualificationNotes ?? ""}
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

      {!canManage && lead.qualificationNotes && (
        <div className="mt-6">
          <h2 className="text-sm font-medium">Qualification notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">{lead.qualificationNotes}</p>
        </div>
      )}
    </div>
  );
}
