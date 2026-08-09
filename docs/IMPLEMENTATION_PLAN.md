# Point View V1 — Implementation Plan

**Status date:** 2026-08-09
**Source of truth:** `/PRD.md`, `/TECHNICAL_ARCHITECTURE.md`, `/AGENTS.md` (Agentic Engineering Master Build Instruction), `/DOCUMENTATION_INDEX.md`. This file does not restate their content — it sequences work against them. Re-read the canonical docs directly; do not re-derive requirements from memory across sessions.

---

## 0. Repository state at audit time (Phase A finding)

The repository (`Kaiserzanmato/Engineering-Surveying-Consultancy-Operations-Platform`) was **empty at the start of this audit** — 0 commits, 0 files, no default branch. There is no prior implementation, so this is a **gap analysis against spec**, not a code review. Every category below is "missing" by definition; the value of this document is sequencing and prioritizing the build, not cataloguing bugs.

Consequence for Phase A step 4 (Tier 4 confirmation): trivially confirmed — nothing is built, so no Tier 4 capability (GA Survey, deep AutoCAD automation, image-to-survey, external autonomous agents) exists or is in progress. ✅

---

## 1. Architecture decision — CONFIRMED 2026-08-09

The Technical Architecture doc specifies Next.js/React/TypeScript + PostgreSQL + private object storage, leaving vendor selection open. User confirmed the Vercel-native default:

| Layer | Confirmed choice | Rationale |
|---|---|---|
| Hosting/compute | Vercel (Next.js App Router, Fluid Compute) | Matches specified stack; avoids custom infra |
| Database | PostgreSQL via Vercel Marketplace (e.g., Neon) | Matches "PostgreSQL" requirement; managed, avoids self-hosted ops burden |
| Private object storage | Vercel Blob (private access) | Matches "private object storage, signed temporary access" requirement |
| Auth | Managed auth provider (via Marketplace) supporting MFA for privileged roles | PRD requires "secure managed authentication" + MFA for SysAdmin |
| AI provider | Vercel AI Gateway, provider-abstracted, OFF by default | PRD Tier 3 says AI is optional/bounded; not enabled until core workflow (P1) is stable |

Still open — not blocking P0 scaffolding, but must be resolved before production release (PRD §22 release gates):
- Data residency requirement under the Philippine DPA — does client data need to stay in-region? Affects DB/storage region selection at provisioning time.
- Is GDPR applicability assessed yet (any EU data subjects)? Per PRD §6, do not assume.
- Who is the designated privacy owner/DPO-equivalent contact for PIA sign-off (Phase B/H gate)?
- Who is the designated security/incident-response contact (Phase O)?

---

## 2. Prioritized gap backlog

Priority scheme (per build prompt): P0 Critical/Security/Architecture blocker, P1 Core MVP, P2 Important, P3 Optimization, Tier 4 Future/Parked.

### P0 — Architecture & security foundation (blocks all feature work)
- [ ] Confirm architecture/vendor table in §1 with user.
- [ ] Scaffold Next.js (App Router) + TypeScript project; establish modular-monolith module boundaries per Technical Architecture §3 (18 modules).
- [ ] Provision managed Postgres + migration tooling.
- [ ] Provision private object storage with signed short-lived access.
- [ ] Provision managed auth with RBAC primitives; MFA path for System Administrator.
- [ ] Implement the authorization pseudo-rule from Technical Architecture §5.3 (`active_user AND permission_granted AND resource_in_scope AND action_allowed`) as a single server-side enforcement point — not per-route ad hoc checks.
- [ ] CI/CD skeleton: lockfile verification, lint, type check, secret scan, dependency vulnerability scan (Technical Architecture §21).
- [ ] Environment separation (dev/staging/prod) with separate credentials per PRD §8.

### P1 — Core MVP (Tier 1 + Tier 2, committed V1 per PRD §4)
Build in the feature order specified in the build prompt Phase F, each slice carrying its own privacy classification, permission model, tests, and audit logging:
1. Identity/RBAC (users, roles, permissions, teams, project-level scope)
2. CRM/Intake (leads, qualification, client profile, contacts)
3. Projects (project record, service type, location, assigned team, status/stage/blocker)
4. Workflow engine (templates, stages, dependencies, checklists, approval gates — deterministic only, no AI gating per Technical Architecture §14)
5. Field operations (mobile assignment, checklist, notes, camera/file upload, submission)
6. Private document/photo repository (versioned, metadata-driven, per File/Evidence Architecture §15 pipeline)
7. Technical processing tracking (CAD assignment/status/output/revision tracking — no AutoCAD execution)
8. Review/approval (submit/review/comment/return/approve/release)
9. Billing tracking (operational status only, not formal accounting)
10. Dashboard (blockers, pending approvals, overdue work, upcoming field activity, billing alerts)
11. Notifications (deterministic: reminders, overdue alerts, escalations, revision routing)
12. Audit/privacy/retention (immutable audit log, retention rules engine, data-subject request tooling per PRD §7)

Each slice must pass the Definition of Done in Technical Architecture §24 before being marked complete — this is a gate, not a checklist to retrofit later.

### P2 — Important, not launch-blocking on day one but required before production release gate (PRD §22)
- [ ] PIA/DPIA draft (`docs/privacy/PIA.md`) — must exist before production per Technical Architecture §6.5.
- [ ] Threat model (`docs/security/THREAT_MODEL.md`) — must exist before implementation of sensitive features per build prompt Phase C; start this in parallel with P0, not after.
- [ ] RBAC matrix finalized and client-validated (PRD §12 explicitly says "final permissions require client validation before production").
- [ ] Cross-browser/device automated testing (Playwright: Chromium/Firefox/WebKit) wired into CI.
- [ ] WCAG 2.2 AA automated + manual accessibility pass.
- [ ] Backup/restore tested, not just configured.
- [ ] Incident response runbook + one tabletop exercise (build prompt Phase O).

### P3 — Optimization
- [ ] Performance tuning (pagination, indexing, image optimization, code splitting) once real data volumes exist.
- [ ] Low-bandwidth field optimizations beyond baseline (compressed previews, retry/timeout polish).
- [ ] Optional bounded AI features (summaries, classification, extraction) — only after core workflow stability, per PRD §11 AI governance gate, with AI inventory + risk register entries created first.

### Tier 4 — Parked, confirmed not required for V1
- GA Survey integration
- Deep AutoCAD automation / auto GA Survey→AutoCAD transfer
- Advanced image-to-survey processing
- External autonomous AI agents
- SaaS commercialization / white-labeling

No work should touch these without a `docs/integrations/<capability>/FEASIBILITY.md` first, per build prompt §10.

---

## 3. Immediate next steps (in order)

1. ~~User confirms §1 architecture table~~ — **done, Vercel-native stack confirmed 2026-08-09.**
2. Scaffold repository skeleton (P0 items) — small, reviewable commits, not one giant initial commit. *(in progress)*
3. Open `docs/security/THREAT_MODEL.md` and `docs/privacy/DATA_MAP.md` / `PIA.md` drafts **before** the identity/RBAC schema is finalized (build prompt Phase B/C precede Phase E/F).
4. Begin P1 slice 1 (Identity/RBAC) only after P0 is in place and the threat model covers authentication/authorization threats.

## 4. Explicitly out of scope right now
Per the user's instruction: no broad feature development until this plan and the audit findings are reviewed. This document and its siblings (`AGENT_HANDOFF.md`, `docs/integrations/DEPENDENCY_REGISTRY.md`) are the Phase A deliverable, not a signal to proceed unattended into Phase E/F.
