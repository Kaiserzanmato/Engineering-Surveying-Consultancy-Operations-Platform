import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc, inArray } from "drizzle-orm";
import { authorize, AuthorizationError, getCurrentUser } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { projects, projectMembers, clients, serviceTypes, projectStatusEnum } from "@/db/schema";
import { hasUnscopedProjectRead, PROJECT_STATUS_LABELS } from "@/lib/projects";
import { createProject } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export default async function ProjectsPage() {
  try {
    await authorize("projects:read");
  } catch (err) {
    if (err instanceof AuthorizationError) notFound();
    throw err;
  }

  const actor = await getCurrentUser();
  if (!actor) notFound();

  const canManage = actor.permissions.has("projects:manage");
  const unscoped = hasUnscopedProjectRead(actor);

  const db = getDb();
  const [allProjects, allClients, allServiceTypes] = await Promise.all([
    unscoped
      ? db.select().from(projects).orderBy(desc(projects.createdAt))
      : db
          .select()
          .from(projects)
          .where(
            inArray(
              projects.id,
              db
                .select({ projectId: projectMembers.projectId })
                .from(projectMembers)
                .where(eq(projectMembers.userId, actor.id)),
            ),
          )
          .orderBy(desc(projects.createdAt)),
    db.select().from(clients).where(eq(clients.status, "active")),
    db.select().from(serviceTypes).where(eq(serviceTypes.active, true)),
  ]);

  const clientName = new Map(allClients.map((c) => [c.id, c.name]));
  const serviceTypeName = new Map(allServiceTypes.map((s) => [s.id, s.name]));

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        {!unscoped && <span className="text-sm text-black/50">Showing projects you&apos;re assigned to</span>}
      </div>

      {canManage && (
        <details className="mt-4 rounded-md border border-black/10 p-4">
          <summary className="cursor-pointer text-sm font-medium">New project</summary>
          <form action={createProject} className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              Project number *
              <input name="projectNumber" required className="rounded border border-black/20 px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              Client *
              <select name="clientId" required className="rounded border border-black/20 px-2 py-1">
                <option value="">— select —</option>
                {allClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
              Status
              <select name="status" defaultValue="not_started" className="rounded border border-black/20 px-2 py-1">
                {projectStatusEnum.enumValues.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              Location
              <input name="location" className="rounded border border-black/20 px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              Start date
              <input name="startDate" type="date" className="rounded border border-black/20 px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              Target end date
              <input name="targetEndDate" type="date" className="rounded border border-black/20 px-2 py-1" />
            </label>
            <SubmitButton className="col-span-2 mt-2 w-fit rounded bg-black px-3 py-1.5 text-white hover:bg-black/80 disabled:opacity-50">
              Create project
            </SubmitButton>
          </form>
        </details>
      )}

      <table className="mt-6 w-full border-collapse text-sm">
        <caption className="sr-only">Projects list</caption>
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th scope="col" className="py-2 pr-4">
              Project #
            </th>
            <th scope="col" className="py-2 pr-4">
              Client
            </th>
            <th scope="col" className="py-2 pr-4">
              Service
            </th>
            <th scope="col" className="py-2 pr-4">
              Status
            </th>
            <th scope="col" className="py-2 pr-4">
              Stage
            </th>
            <th scope="col" className="py-2 pr-4">
              Blocker
            </th>
          </tr>
        </thead>
        <tbody>
          {allProjects.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-black/40">
                No projects yet.
              </td>
            </tr>
          )}
          {allProjects.map((p) => (
            <tr key={p.id} className="border-b border-black/5">
              <td className="py-2 pr-4">
                <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                  {p.projectNumber}
                </Link>
              </td>
              <td className="py-2 pr-4">{clientName.get(p.clientId) ?? "—"}</td>
              <td className="py-2 pr-4">
                {p.serviceTypeId ? (serviceTypeName.get(p.serviceTypeId) ?? "—") : "—"}
              </td>
              <td className="py-2 pr-4">{PROJECT_STATUS_LABELS[p.status]}</td>
              <td className="py-2 pr-4">{p.currentStage ?? "—"}</td>
              <td className="py-2 pr-4">
                {p.blocker ? <span className="text-red-700">{p.blocker}</span> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
