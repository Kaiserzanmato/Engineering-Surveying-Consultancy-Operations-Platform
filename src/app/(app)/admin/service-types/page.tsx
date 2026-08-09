import { notFound } from "next/navigation";
import { authorize, AuthorizationError } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { serviceTypes } from "@/db/schema";
import { createServiceType } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export default async function ServiceTypesPage() {
  try {
    await authorize("service_types:manage");
  } catch (err) {
    if (err instanceof AuthorizationError) notFound();
    throw err;
  }

  const db = getDb();
  const allServiceTypes = await db.select().from(serviceTypes);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Service Types</h1>
      <p className="mt-1 text-sm text-black/60">
        Point View&apos;s service catalog, used to classify leads. Nothing is pre-seeded here —
        add your actual services below.
      </p>

      <ul className="mt-6 divide-y divide-black/5 text-sm">
        {allServiceTypes.length === 0 && (
          <li className="py-2 text-black/40">No service types yet.</li>
        )}
        {allServiceTypes.map((s) => (
          <li key={s.id} className="py-2">
            <span className="font-medium">{s.name}</span>
            {s.description && <span className="ml-2 text-black/60">— {s.description}</span>}
            {!s.active && <span className="ml-2 text-black/40">(inactive)</span>}
          </li>
        ))}
      </ul>

      <form action={createServiceType} className="mt-6 flex items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">
          Name *
          <input name="name" required className="rounded border border-black/20 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          Description
          <input name="description" className="rounded border border-black/20 px-2 py-1" />
        </label>
        <SubmitButton className="rounded bg-black px-3 py-1.5 text-white hover:bg-black/80 disabled:opacity-50">
          Add
        </SubmitButton>
      </form>
    </div>
  );
}
