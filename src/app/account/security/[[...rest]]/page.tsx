import { UserProfile } from "@clerk/nextjs";

export default function AccountSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ mfaRequired?: string }>;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center gap-4 p-6">
      <MfaRequiredBanner searchParams={searchParams} />
      <UserProfile />
    </div>
  );
}

async function MfaRequiredBanner({
  searchParams,
}: {
  searchParams: Promise<{ mfaRequired?: string }>;
}) {
  const { mfaRequired } = await searchParams;
  if (!mfaRequired) return null;

  return (
    <div className="w-full max-w-2xl rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      Your role requires multi-factor authentication before you can continue.
      Please add a second factor below (the &quot;Security&quot; tab), then
      return to the dashboard.
    </div>
  );
}
