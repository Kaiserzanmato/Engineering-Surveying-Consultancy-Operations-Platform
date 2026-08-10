import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { authorize, AuthorizationError, getCurrentUser } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { projects, projectMembers, clients, serviceTypes, users, projectStatusEnum } from "@/db/schema";
import { projectInScope, hasUnscopedProjectManage, PROJECT_STATUS_LABELS } from "@/lib/projects";
import { updateProject, addProjectMember, removeProjectMember } from "../actions";
import { SubmitButton } from "@/components/submit-button";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await authorize("projects:read");
  } catch (err) {
    if (err instanceof AuthorizationError) notFound();
    throw err;
  }

  const actor = await getCurrentUser();
  if (!actor) notFound();

  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const memberRows = await db
    .select({ userId: projectMembers.userId, addedAt: projectMembers.addedAt })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));
  const memberUserIds = memberRows.map((m) => m.userId);

  // Scoped roles (administrative_staff, field/CAD/reviewer) only get here
  // via the member list above — a non-member with a scoped role must not
  // be able to view a project they're not on, same 404-not-403 convention
  // used across the app for permission-gated resources.
  if (!projectInScope(memberUserIds, actor)) notFound();
  const canManage =
    actor.permissions.has("projects:manage") &&
    (hasUnscopedProjectManage(actor) || memberUserIds.includes(actor.id));

  const [client, allClients, allServiceTypes, allUsers] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, project.clientId)).then((r) => r[0]),
    db.select().from(clients).where(eq(clients.status, "active")),
    db.select().from(serviceTypes).where(eq(serviceTypes.active, true)),
    db.select().from(users).where(eq(users.status, "active")),
  ]);

  const userName = new Map(allUsers.map((u) => [u.id, u.fullName ?? u.email]));
  const members = memberRows.map((m) => ({ ...m, name: userName.get(m.userId) ?? m.userId }));
  const nonMembers = allUsers.filter((u) => !memberUserIds.includes(u.id));

  return (
    <div className="max-w-2xl">
      <Link href="/projects" className="text-sm text-black/50 hover:underline">
        ← Projects
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{project.projectNumber}</h1>
      <p className="text-sm text-black/60">
        {client?.name ?? "Unknown client"} · {PROJECT_STATUS_LABELS[project.status]}
      </p>

      {canManage && (
        <form action={updateProject} className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="flex flex-col gap-1">
            Client *
            <select name="clientId" required defaultValue={project.clientId} className="rounded border border-black/20 px-2 py-1">
              {allClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Service type
            <select
              name="serviceTypeId"
              defaultValue={project.serviceTypeId ?? ""}
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
            Status
            <select name="status" defaultValue={project.status} className="rounded border border-black/20 px-2 py-1">
              {projectStatusEnum.enumValues.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Current stage
            <input
              name="currentStage"
              defaultValue={project.currentStage ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Blocker
            <input
              name="blocker"
              defaultValue={project.blocker ?? ""}
              placeholder="What's blocking progress, if anything"
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Location
            <input
              name="location"
              defaultValue={project.location ?? ""}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Start date
            <input
              name="startDate"
              type="date"
              defaultValue={toDateInputValue(project.startDate)}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Target end date
            <input
              name="targetEndDate"
              type="date"
              defaultValue={toDateInputValue(project.targetEndDate)}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Actual end date
            <input
              name="actualEndDate"
              type="date"
              defaultValue={toDateInputValue(project.actualEndDate)}
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Billing status
            <input
              name="billingStatus"
              defaultValue={project.billingStatus ?? ""}
              placeholder="e.g. Deposit paid, Invoiced, Fully paid"
              className="rounded border border-black/20 px-2 py-1"
            />
          </label>
          <SubmitButton className="col-span-2 mt-2 w-fit rounded bg-black px-3 py-1.5 text-white hover:bg-black/80 disabled:opacity-50">
            Save changes
          </SubmitButton>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium">Assigned team</h2>
        <ul className="mt-2 divide-y divide-black/5 text-sm">
          {members.length === 0 && <li className="py-2 text-black/40">No team members assigned yet.</li>}
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-2">
              <span>{m.name}</span>
              {canManage && (
                <form action={removeProjectMember}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <SubmitButton className="rounded border border-black/20 px-2 py-0.5 text-xs hover:bg-black/5 disabled:opacity-50">
                    Remove
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>

        {canManage && nonMembers.length > 0 && (
          <form action={addProjectMember} className="mt-4 flex items-end gap-2 text-sm">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="flex flex-col gap-1">
              Add team member
              <select name="userId" required className="rounded border border-black/20 px-2 py-1">
                <option value="">— select —</option>
                {nonMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName ?? u.email}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="rounded border border-black/20 px-3 py-1.5 hover:bg-black/5 disabled:opacity-50">
              Add
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
