import Link from "next/link";
import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { authorize, AuthorizationError, getCurrentUser } from "@/lib/auth/authorize";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { createClient } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { AddressFields } from "@/components/address-fields";

export default async function ClientsPage() {
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
  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Clients</h1>

      {canManage && (
        <details className="mt-4 rounded-md border border-black/10 p-4">
          <summary className="cursor-pointer text-sm font-medium">New client</summary>
          <form action={createClient} className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              Name *
              <input name="name" required className="rounded border border-black/20 px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              Type
              <select name="clientType" className="rounded border border-black/20 px-2 py-1">
                <option value="company">Company</option>
                <option value="individual">Individual</option>
              </select>
            </label>
            <AddressFields />
            <SubmitButton className="col-span-2 mt-2 w-fit rounded bg-black px-3 py-1.5 text-white hover:bg-black/80 disabled:opacity-50">
              Create client
            </SubmitButton>
          </form>
        </details>
      )}

      <table className="mt-6 w-full border-collapse text-sm">
        <caption className="sr-only">Clients list</caption>
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th scope="col" className="py-2 pr-4">
              Name
            </th>
            <th scope="col" className="py-2 pr-4">
              Type
            </th>
            <th scope="col" className="py-2 pr-4">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {allClients.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-black/40">
                No clients yet.
              </td>
            </tr>
          )}
          {allClients.map((c) => (
            <tr key={c.id} className="border-b border-black/5">
              <td className="py-2 pr-4">
                <Link href={`/crm/clients/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="py-2 pr-4 capitalize">{c.clientType}</td>
              <td className="py-2 pr-4 capitalize">{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
