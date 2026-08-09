import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

type LogAuditEventInput = {
  /** Local users.id of the actor, or null for system-initiated events (e.g. webhook sync). */
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

// Per PRD §8 Auditability / TECHNICAL_ARCHITECTURE.md §8. This is the only
// write path into audit_events — no update/delete is exposed anywhere, so
// the table stays append-only from the application's perspective. Callers
// should not let an audit-write failure silently swallow the primary
// action's error, but should also not let it block the primary action from
// completing — log and continue.
export async function logAuditEvent(input: LogAuditEventInput) {
  const db = getDb();
  await db.insert(auditEvents).values({
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    metadata: input.metadata ?? null,
  });
}
