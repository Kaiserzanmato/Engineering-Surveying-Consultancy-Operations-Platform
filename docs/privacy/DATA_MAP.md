# Data Map — Point View V1

**Status:** Initial draft, 2026-08-09, written before schema finalization per `AGENTS.md` Phase B ordering. This is an inventory of data the system is *designed* to hold, derived from `PRD.md` §7 and §18 and `TECHNICAL_ARCHITECTURE.md` §6.1/§13 — not a scan of live data, since no schema exists yet. Update this file the moment the schema is implemented, and again whenever a field is added.

This document feeds `docs/privacy/PIA.md` (not yet drafted — do not proceed to production without it, per `TECHNICAL_ARCHITECTURE.md` §6.5) and `docs/privacy/RETENTION_MATRIX.md` (not yet drafted).

**Retention periods below are marked TBD — these are business/legal decisions for Point View to make, not an engineering default this document should invent.** Do not implement retention jobs against a guessed number; get the actual period per data category from the client first.

---

## Data inventory by category

| Category | Source entities (PRD §18) | Personal/sensitive? | Purpose | Basis | Roles with access (see PRD §12 RBAC matrix) | Storage | Region | Retention | Deletion method |
|---|---|---|---|---|---|---|---|---|---|
| User/employee identity | `User`, `Role`, `Team` | Personal (employee) | Authentication, authorization, accountability | Employment/operational necessity | SysAdmin (full), Owner/GM (limited) | Clerk (identity) + Postgres (app-side profile/role mapping) | TBD — Clerk region + Neon region both need residency confirmation | TBD | Account deactivation + data subject deletion request process (PRD §7) |
| Lead/inquiry data | `Lead` | Personal (prospective client contact info) | Sales intake, qualification | Legitimate business interest (pre-contract) | Sales, Owner/GM (full); Admin (assigned); Finance (limited) | Postgres | TBD | TBD | Retention rule + business hold check before deletion |
| Client & contact data | `Client`, `Contact` | Personal (client-side individuals) | Service delivery, relationship management | Contract/legitimate interest | Full: SysAdmin, Owner/GM; Assigned: Admin/Field/CAD/Reviewer/Sales; Limited: Finance | Postgres | TBD | TBD | Same as above |
| Project/service data | `Project`, `ProjectMember`, `ServiceType`, `Requirement` | Mixed — project metadata generally non-personal, but linked to client identity | Operational tracking | Contract | Per RBAC matrix (project-scoped) | Postgres | TBD | TBD | Cascades with client/project closure rules — needs definition |
| Workflow/task state | `WorkflowTemplate`, `WorkflowStage`, `WorkflowInstance`, `Task`, `Dependency`, `ChecklistItem` | Non-personal (operational state) | Deterministic workflow engine | Contract | Per RBAC matrix | Postgres | TBD | TBD | Follows project retention |
| Field data | `FieldAssignment`, `FieldSubmission` | Potentially personal/sensitive (site photos may capture people, private property, precise location) | Field operations coordination and evidence | Contract | Full: SysAdmin; View: Owner/GM; Assigned: Admin/Field; Approved-only: CAD; View: Reviewer | Vercel Blob (private) for photos/files, Postgres for metadata | TBD | TBD | File deletion + metadata tombstone, audit-evidenced |
| Central repository files | `Asset`, `DocumentVersion` | Potentially personal/sensitive depending on content | Versioned document/photo storage | Contract | Full Admin: SysAdmin; Controlled: Admin/Owner/CAD/Reviewer; Upload: Field | Vercel Blob (private, signed short-lived access) | TBD | TBD | Signed-URL revocation + storage delete + audit event |
| Technical/CAD tracking | `Asset` (technical output category), review status fields | Non-personal (engineering data) but client-confidential | Track CAD assignment/status without executing AutoCAD | Contract | Full: SysAdmin; View: Owner/GM; Limited: Admin; Assigned: CAD/Reviewer | Postgres (status) + Vercel Blob (files) | TBD | TBD | Same as central repository |
| Review/approval records | `Review`, `Approval` | Non-personal (decision records), but tied to individual reviewers | Accountability, quality gate | Contract | Per RBAC matrix | Postgres | TBD | TBD | Retained with project unless legal/business hold requires longer |
| Billing status | `BillingRecord`, `PaymentRecord` | Personal (client billing contact) + financial-adjacent (status only, not formal accounting per PRD §17) | Operational billing visibility | Contract | Full: SysAdmin/Finance; Full: Owner/GM; Limited: Admin/Sales | Postgres | TBD | TBD — likely longer than operational data for financial-record reasons; confirm with client/finance | Business-hold-aware deletion |
| Scheduling | `CalendarEvent` | Mixed (may reference client/site details) | Field/office scheduling | Contract | Per RBAC matrix | Postgres | TBD | TBD | Follows project retention |
| Notifications | `Notification` | Non-personal (system-generated), but content may reference personal data indirectly | Deterministic alerting | Contract | Recipient-scoped | Postgres | TBD | Short — notifications are transient; propose short default once confirmed | Auto-expire/delete after read + TTL |
| Audit events | `AuditEvent` | Personal (actor identity) + sensitive (records who accessed what) | Accountability, incident investigation, compliance evidence | Legal/security obligation | Full: SysAdmin; High-level: Owner/GM; Limited/Own: others per matrix | Postgres, access-controlled separately from operational data | TBD | Likely longer than operational data (audit/compliance value); confirm with client | Access-controlled deletion, likely subject to longer minimum retention than other categories |
| AI jobs/results | `AIJob`, `AIResult` | Depends on feature — must be minimized before any AI feature ships | Optional bounded AI assistance (OFF by default) | Consent/legitimate interest, feature-flagged | Human-reviewer-gated per PRD §11 | Not yet provisioned — AI provider not selected | TBD | TBD | **Not applicable yet — no AI feature is enabled; this row exists as a placeholder to remind Phase N to fill it in, not as an active data flow** |
| Privacy/retention metadata | `PrivacyProcessingRecord`, `DataRetentionRule` | Non-personal (governance metadata) | Operationalize retention/deletion, support data-subject requests | Legal obligation | SysAdmin, designated privacy owner (TBD — see open questions) | Postgres | TBD | Governance record — likely retained for the life of the system | N/A |
| Security incidents / risk register | `SecurityIncident`, `RiskRegisterItem` | May reference personal data of affected individuals during an incident | Incident response, risk governance | Legal/security obligation | SysAdmin, designated security owner (TBD) | Postgres, access-controlled | TBD | Likely longer retention for legal/compliance reasons | Access-controlled, subject to legal hold |

---

## External processors (subprocessors)

| Processor | Data category processed | Purpose | Status |
|---|---|---|---|
| Vercel | All application traffic/compute | Hosting | Confirmed direction, see `docs/integrations/DEPENDENCY_REGISTRY.md` |
| Neon (via Vercel Marketplace) | Structured data — see table above | Database | Confirmed direction, provisioning pending user terms acceptance |
| Vercel Blob | Field photos, documents, technical files | Private object storage | **Provisioned** — private store `point-view-storage` created in `iad1` region; region not yet confirmed against residency requirement, see open questions |
| Clerk (or equivalent, via Vercel Marketplace) | User credentials, session data, MFA enrollment | Authentication | Confirmed direction, provisioning pending user terms acceptance |
| AI provider (unselected) | N/A — not enabled | Optional bounded AI | Not in scope until Phase N |

## Open questions blocking a complete data map (need client/user input, not engineering judgment)

1. **Data residency** — does Point View's data need to stay within the Philippines or a specific region under the DPA? The Blob store was provisioned in `iad1` (US East) by default since this wasn't yet answered — **this may need to be reprovisioned once residency is confirmed**, and the same applies to the still-unprovisioned Neon database and Clerk auth region.
2. **Retention periods per category** — every "TBD" in the table above needs an actual number (or a rule like "life of client relationship + N years") from Point View's business/legal side, not an invented default.
3. **Designated privacy owner / DPO-equivalent** — needed to own the PIA sign-off and data-subject request handling.
4. **Designated security/incident owner** — needed for the incident response doc and audit escalation paths.
5. **GDPR applicability** — has anyone assessed whether any Point View data subjects are EU-based? Per PRD §6, do not assume either way.

## Next steps

- Draft `docs/privacy/PIA.md` once the data map above has fewer open TBDs, or explicitly note residual-risk TBDs in the PIA if the client wants to proceed before every question is answered.
- Draft `docs/privacy/RETENTION_MATRIX.md` once retention periods are confirmed per category.
- Re-derive this document from the actual Drizzle/SQL schema once the identity/RBAC and CRM slices are implemented — a hand-written data map drifts from reality fast; treat the schema as the source of truth going forward and this file as the human-readable index into it.
