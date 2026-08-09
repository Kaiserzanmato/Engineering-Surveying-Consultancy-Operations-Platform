import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ unavailable?: string }>;
}) {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const { unavailable } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Point View</h1>
      <p className="max-w-md text-black/60">
        Centralized engineering &amp; survey operations platform.
      </p>
      {unavailable && (
        <p className="max-w-md rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Your account isn&apos;t set up yet, or has been suspended. Contact a
          System Administrator.
        </p>
      )}
      <Link
        href="/sign-in"
        className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/80"
      >
        Sign in
      </Link>
    </div>
  );
}
