import type { AuthorizedUser } from "@/lib/auth/authorize";
import type { leads, leadStatusEnum, leadSourceEnum } from "@/db/schema";

export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  referral: "Referral",
  website: "Website",
  phone: "Phone",
  walk_in: "Walk-in",
  social_media: "Social media",
  email: "Email",
  event: "Event",
  other: "Other",
};

const LEAD_SOURCE_VALUES = new Set<string>(Object.keys(LEAD_SOURCE_LABELS));

/** Parses a form field into a validated LeadSource, or null for "— none —". */
export function parseLeadSource(value: FormDataEntryValue | null): LeadSource | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  if (!LEAD_SOURCE_VALUES.has(str)) throw new Error(`Invalid lead source: ${str}`);
  return str as LeadSource;
}

// Pulled out of the "use server" actions file so it's a plain, unit-testable
// function — Next.js Server Action files may only export async functions,
// so this table can't live there directly.
const VALID_LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "disqualified"],
  contacted: ["qualified", "disqualified"],
  qualified: ["disqualified", "converted"],
  disqualified: ["contacted"], // allow reopening a disqualified lead
  converted: [], // terminal — only reachable via convertLeadToClient
};

export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  return VALID_LEAD_STATUS_TRANSITIONS[from].includes(to);
}

// PRD §12: "Leads: ... Admin=Assigned ..." — Administrative Staff only see
// and manage leads assigned to them; every other role granted leads:read/
// leads:manage has unscoped access. This is the one place that scoping
// distinction lives, so both the list query and the mutation actions stay
// consistent — don't duplicate this logic inline elsewhere.
const UNSCOPED_LEAD_ROLES = new Set(["system_administrator", "owner_gm", "sales_client_intake"]);

export function hasUnscopedLeadAccess(user: AuthorizedUser): boolean {
  return user.roles.some((r) => UNSCOPED_LEAD_ROLES.has(r));
}

export function leadInScope(lead: Pick<typeof leads.$inferSelect, "assignedTo">, user: AuthorizedUser): boolean {
  if (hasUnscopedLeadAccess(user)) return true;
  return lead.assignedTo === user.id;
}
