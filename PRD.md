# Point View Centralized Engineering & Survey Operations Platform
## Product Requirements Document (PRD) — Version 1.2

**Prepared for:** Point View Engineering and Surveying Consultancy  
**Prepared by:** DocypherLabs  
**Document status:** Security-, Privacy-, Compliance-, and Cross-Device-Hardened MVP Product Baseline  
**Version:** 1.2  
**Primary objective:** Deliver a production-ready working MVP that solves Point View's core operational problems while embedding privacy engineering, cybersecurity, risk management, secure software-development guardrails, auditability, accessibility, and adaptive cross-device design from the beginning.

> **Important compliance statement:** This document defines an implementation target aligned with recognized privacy, security, AI-governance, application-security, accessibility, and software-quality frameworks. It does **not** claim ISO certification, GDPR compliance certification, legal compliance certification, or regulatory approval. Formal certification, legal interpretation, regulatory registration, and compliance sign-off require the appropriate qualified professionals, organizational controls, evidence, and independent assessment where applicable.

---

# 1. Executive Product Summary

Point View requires a secure, centralized internal operations platform that reduces dependence on email, PDFs, disconnected messaging, manual records, and employee-dependent handoffs.

The V1 platform shall support the operational lifecycle:

**Inquiry → Qualification → Client Record → Project Creation → Requirements → Assignment → Field Work → Field Submission → Office Processing → Technical Processing Tracking → Review / Revision / Approval → Billing Tracking → Client Delivery → Project Closure**

The V1 product must remain operational even if:

- AI is unavailable.
- Email notifications are delayed.
- GA Survey integration is unavailable.
- AutoCAD automation is unavailable.
- External AI agents do not exist.

The application shall be built as a **secure operational platform first**, with optional automation and AI assistance layered on top.

---

# 2. Client Problems V1 Must Solve

The MVP shall directly address:

- Fragmented records across email, PDF, messaging, and manual files.
- Unclear accountability between employees and departments.
- Weak visibility into project progress and blockers.
- Repetitive administrative tasks.
- Poor field-to-office workflow coordination.
- Disconnected technical/CAD processing.
- Inconsistent file, photo, revision, and approval management.
- Limited centralized billing visibility.
- Limited management reporting.
- Distributed staff requiring secure remote access.
- Unstructured operational data.
- Need for a system understandable by non-technical and semi-technical workers.

---

# 3. Product Vision

Build a **secure centralized digital operating system for Point View** that:

- centralizes clients, projects, tasks, documents, photos, schedules, approvals, and billing status;
- clarifies who is responsible for every stage;
- provides secure field and office access;
- supports structured handoffs;
- protects client and employee data;
- provides traceable audit history;
- remains usable on multiple device classes;
- supports optional human-reviewed AI assistance;
- remains extensible for future integrations.

The system shall not replace:

- engineering judgment;
- surveying judgment;
- surveying instruments;
- soil-testing/laboratory processes;
- AutoCAD drafting;
- GA Survey;
- formal accounting;
- government systems;
- physical fieldwork;
- human technical approval.

---

# 4. Product Architecture Tiers

## Tier 1 — Centralize

**Committed V1**

- Authentication.
- Users.
- Leads/inquiries.
- Clients.
- Projects.
- Service categories.
- Requirements.
- Scheduling.
- Field assignments.
- Photos/files.
- Technical-processing status.
- Reviews/approvals.
- Billing status.
- Notifications.
- Audit history.

## Tier 2 — Standardize, Secure & Control

**Committed V1**

- RBAC.
- Least privilege.
- Project-level authorization.
- Workflow templates.
- Stages.
- Tasks.
- Dependencies.
- Checklists.
- Handoffs.
- Approval gates.
- Document versioning.
- Private storage.
- Security logging.
- Auditability.
- Privacy-by-design controls.
- Data-retention controls.
- Security and privacy incident readiness.

## Tier 3 — Automate & Assist

**Build only where expressly approved**

### Deterministic automation

- Task routing.
- Workflow gating.
- Reminders.
- Overdue alerts.
- Review notifications.
- Escalations.
- Revision routing.
- Status updates.

### AI assistance

Potential:

- Summaries.
- Document classification.
- Missing-information checks.
- Controlled text/data extraction.
- Draft communications.
- Management summaries.

AI must not autonomously approve engineering/surveying information.

## Tier 4 — Specialized Future Technical Integrations

**Parked / future feasibility validation**

- GA Survey integration.
- Deeper AutoCAD automation.
- Automatic GA Survey → AutoCAD transfer.
- Advanced image-to-survey processing.
- CAD/DWG generation assistance.
- External autonomous AI agents.
- Additional advanced integrations.
- SaaS commercialization.
- White-labeling/resale.

Tier 4 is **not assumed feasible**. It requires future client-domain validation, technology research, controlled experimentation, professional-risk review, and separate commercial approval.

---

# 5. Full V1 Product Architecture

```text
USERS & DEVICE CLASSES
│
├── System Administrator
├── Owner / General Manager
├── Sales / Client Intake
├── Administrative Staff
├── Field Team
├── Survey Personnel
├── CAD / Technical Operator
├── Reviewer / Approver
└── Finance
│
├── Desktop / Laptop
├── Tablet
├── Smartphone
├── Foldable
└── Other standards-compliant web-capable devices
        │
        ▼
┌──────────────────────────────────────────────┐
│        RESPONSIVE POINT VIEW WEB APP         │
├──────────────────────────────────────────────┤
│ Dashboard                                    │
│ CRM / Client Intake                          │
│ Clients                                      │
│ Projects                                     │
│ Workflow / Tasks / Dependencies              │
│ Field Operations                             │
│ Documents / Photos / Technical Files         │
│ Technical Processing Tracking                │
│ Review / Revision / Approval                 │
│ Calendar / Scheduling                        │
│ Billing Tracking                             │
│ Notifications                                │
│ Analytics / Reports                          │
│ Administration                               │
└───────────────────────┬──────────────────────┘
                        ▼
┌──────────────────────────────────────────────┐
│ SECURITY, PRIVACY & GOVERNANCE FOUNDATION    │
├──────────────────────────────────────────────┤
│ Authentication / MFA for privileged users   │
│ RBAC / Least Privilege                       │
│ Project-Level Authorization                  │
│ Private File Access                          │
│ Secure Sessions                              │
│ Audit / Security Logging                     │
│ Data Minimization                            │
│ Purpose Limitation                           │
│ Retention / Disposal Controls                │
│ Encryption in Transit / At Rest              │
│ Rate Limiting / Abuse Prevention             │
│ Privacy Impact Assessment Support            │
│ Incident / Breach Response Readiness         │
└───────────────────────┬──────────────────────┘
                        ▼
┌──────────────────────────────────────────────┐
│                DATA FOUNDATION               │
├──────────────────────────────────────────────┤
│ PostgreSQL                                   │
│ Private Object Storage                       │
│ Structured Workflow State                    │
│ Document Metadata / Versions                 │
│ Security / Audit Evidence                    │
│ Privacy / Consent / Processing Metadata      │
└───────────────────────┬──────────────────────┘
                        ▼
┌──────────────────────────────────────────────┐
│ AUTOMATION & OPTIONAL AI ASSISTANCE          │
├──────────────────────────────────────────────┤
│ Deterministic Workflow Rules                 │
│ Notifications / Escalations                  │
│ AI Provider Abstraction                      │
│ AI Usage / Cost Controls                     │
│ Human Verification                           │
└───────────────────────┬──────────────────────┘
                        ▼
┌──────────────────────────────────────────────┐
│ FUTURE INTEGRATION PORT — TIER 4 / DISABLED │
├──────────────────────────────────────────────┤
│ GA Survey                                    │
│ AutoCAD                                      │
│ Advanced Vision                              │
│ External AI Agents                           │
│ Commercialization / SaaS                     │
└──────────────────────────────────────────────┘
```

---

# 6. Privacy, Security, Risk & Compliance Baseline

The MVP shall be engineered with controls mapped, where applicable, to:

## Philippine Privacy Framework

- Republic Act No. 10173 — Data Privacy Act of 2012.
- Implementing Rules and Regulations of the DPA.
- National Privacy Commission security requirements and current issuances.
- NPC Privacy Impact Assessment guidance.
- NPC privacy engineering guidance for systems life-cycle processes.
- NPC AI guidance when AI processes personal data.
- NPC personal-data-breach management requirements.

## International Privacy

- GDPR principles and security/privacy-by-design requirements **where GDPR is legally applicable** to Point View's processing activities.

GDPR must not be represented as automatically applicable to every Point View activity. Applicability requires legal assessment.

## ISO / IEC Alignment Targets

Engineering and governance should use the following as control references, where applicable:

- ISO/IEC 27001:2022 — Information Security Management Systems.
- ISO/IEC 27002:2022 — Information security controls.
- ISO/IEC 27701:2025 — Privacy Information Management Systems.
- ISO/IEC 27017:2026 — Cloud-service security controls.
- ISO/IEC 27018:2025 — Protection of PII in public cloud processing.
- ISO/IEC 42001:2023 — AI Management Systems.
- ISO/IEC 23894:2023 — AI risk-management guidance.
- ISO/IEC 25010:2023 — Systems/software product-quality model.

## Cybersecurity / Secure Application References

- NIST Cybersecurity Framework 2.0.
- OWASP ASVS 5.0.0, with V1 engineering targeting a practical **ASVS Level 2-oriented verification baseline** unless risk assessment requires stronger controls.

## Accessibility

- WCAG 2.2 AA target for the production user interface.

> These are **alignment and engineering targets**, not certification claims.

---

# 7. Privacy-by-Design Product Requirements

The system shall apply privacy engineering throughout the lifecycle.

## Data Inventory

Maintain a documented inventory of:

- data collected;
- source;
- purpose;
- legal/operational basis;
- user roles with access;
- storage location;
- retention period;
- external processors;
- deletion/disposal method.

## Data Minimization

Do not collect fields solely because they may be useful later.

Every personal-data field must have:

- defined purpose;
- business need;
- access scope.

## Purpose Limitation

Data should not be reused for unrelated AI training, profiling, marketing, or external processing without appropriate authorization and lawful basis.

## Retention

Support configurable retention policies.

Retention should cover:

- leads;
- clients;
- employee records;
- field photos;
- documents;
- technical files;
- audit records;
- AI inputs/results.

Deletion must consider legal, contractual, engineering, litigation-hold, and business-record requirements.

## Data Subject Support

Where applicable, administration tooling should support locating records for:

- access requests;
- correction requests;
- deletion/erasure requests where legally allowed;
- objection/restriction requests where applicable;
- data export/portability where applicable.

## Privacy Impact Assessment

Before production, prepare a PIA/DPIA-style assessment covering:

- data flows;
- repositories;
- user roles;
- external processors;
- risks;
- mitigations;
- retention;
- deletion;
- incident handling;
- AI processing.

---

# 8. Security Guardrails

## Authentication

- Secure managed authentication.
- MFA mandatory for System Administrators where technically supported.
- MFA strongly recommended for Owner/GM and other privileged roles.
- Secure account recovery.
- Suspended account session revocation.
- Session expiration.
- Reauthentication for sensitive settings where feasible.

## Authorization

- Server-side authorization.
- Deny by default.
- Least privilege.
- Project-level access.
- Resource-level file checks.
- No security based only on hidden UI elements.

## Encryption

- TLS for data in transit.
- Strong provider-supported encryption at rest.
- No plaintext secrets.
- Secure key-management practices.

## Secrets

- Environment/secret manager.
- No committed secrets.
- Secret scanning.
- Rotation process.
- Separate dev/staging/prod credentials.

## File Security

- Private buckets.
- Signed short-lived access.
- File-size limits.
- MIME validation.
- Extension validation.
- Sanitized filenames.
- Executable blocking.
- Malware scanning where practical.
- No unsafe inline execution.

## Application Security

- Input validation.
- Output encoding.
- CSRF protection where applicable.
- XSS mitigation.
- SQL injection prevention through safe data access.
- SSRF protection for server-side fetching.
- Secure headers.
- CORS restrictions.
- Dependency scanning.
- Rate limiting.
- Abuse detection.
- Secure error handling.
- No stack traces/secrets exposed to users.

## Auditability

Log:

- authentication events;
- privileged actions;
- permission changes;
- project changes;
- file access/upload changes as appropriate;
- approvals;
- billing changes;
- AI operations;
- exports/deletions;
- administrative overrides.

Audit data must itself be access-controlled.

---

# 9. Cybersecurity Risk Governance

Use NIST CSF 2.0-inspired lifecycle categories:

- **Govern** — ownership, policies, vendor risk, risk register.
- **Identify** — assets, data, dependencies, threats.
- **Protect** — IAM, encryption, secure configuration, training.
- **Detect** — logs, monitoring, alerting.
- **Respond** — incident plan, containment, communications.
- **Recover** — backups, restore, lessons learned.

Maintain:

- risk register;
- security owner;
- privacy owner/DPO where applicable;
- incident-response contacts;
- vendor/dependency register;
- backup/restore tests;
- vulnerability-remediation log.

---

# 10. Breach / Incident Readiness

V1 shall include technical and procedural support for:

- incident logging;
- containment;
- affected-system identification;
- affected-data identification;
- evidence preservation;
- credential/key rotation;
- backup restoration;
- audit extraction;
- internal escalation;
- notification decision support.

The system should support the organization in meeting applicable regulatory notification timelines, but the application itself must not automatically determine legal notification obligations.

---

# 11. AI Governance

AI is an optional subsystem.

## Mandatory Controls

- Human-in-the-loop for technical/professional outputs.
- Feature flags.
- Model/provider registry.
- Prompt/data minimization.
- No provider training opt-in without explicit approval.
- No unrestricted external tools.
- No autonomous deletion.
- No autonomous professional approval.
- Rate limits.
- Token caps.
- Budget caps.
- Audit trail.
- Input/output review.
- AI risk register.
- Prompt-injection defenses.
- Content/source grounding where applicable.

## AI Result States

- Not Processed
- Processing
- AI Extracted — Unverified
- Human Corrected
- Human Approved
- Rejected

Only Human Approved technical values may be treated as validated technical inputs.

---

# 12. User Groups & RBAC

## Roles

- System Administrator
- Owner / General Manager
- Administrative Staff
- Field Team Leader
- Survey / Field Personnel
- CAD / Technical Operator
- Technical Reviewer / Approver
- Finance / Billing
- Sales / Client Intake

## Baseline Matrix

| Area | SysAdmin | Owner/GM | Admin | Field | CAD | Reviewer | Finance | Sales |
|---|---|---|---|---|---|---|---|---|
| Users/Roles | Full | Limited | No | No | No | No | No | No |
| Leads | Full | Full | Assigned | No | No | No | Limited | Full |
| Clients | Full | Full | Full/Assigned | Assigned | Assigned | Assigned | Limited | Assigned |
| Projects | Full | Full | Full/Assigned | Assigned | Assigned | Assigned | Limited | Pre-project |
| Field Data | Full | View | Assigned | Create/Edit Assigned | Approved Inputs | View | No | No |
| Master Repository | Full Admin | Controlled | Controlled | Upload Assigned | Controlled | Controlled | No | No |
| Technical Files | Full | View | Limited | Upload | Assigned | Assigned | No | No |
| Billing | Full | Full | Limited | No | No | No | Full | Limited |
| Audit | Full | High-level | Limited | Own | Own/Assigned | Own/Assigned | Own | Own |
| System Settings | Full | Limited | No | No | No | No | No | No |

Final permissions require client validation before production.

---

# 13. End-to-End Workflow

```text
Inquiry
 ↓
Qualification
 ↓
Client
 ↓
Project
 ↓
Service Workflow
 ↓
Requirements
 ↓
Field Assignment
 ↓
Field Work
 ├─ Checklist
 ├─ Notes
 ├─ Photos
 ├─ Measurements
 └─ Files
 ↓
Field Submission
 ↓
Office Validation
 ├─ Incomplete → Revision
 └─ Accepted
 ↓
Technical Processing Tracking
 ↓
CAD/Technical Output Upload
 ↓
Review
 ├─ Revision → Operator
 └─ Approval
 ↓
Client Delivery
 ↓
Billing Tracking
 ↓
Project Closure
```

---

# 14. Adaptive Multi-Device & Cross-Platform UX Requirements

The application is web-based and should be **OS-agnostic at the application layer**.

The goal is not to promise literal compatibility with every device/browser/version ever released. The goal is to support standards-compliant modern environments with responsive design, progressive enhancement, representative testing, and graceful degradation.

## Device Classes

The UI must adapt to:

- Desktop monitors.
- Laptops.
- Tablets.
- Smartphones.
- Foldable phones/tablets.
- Large external displays.
- Touchscreen laptops.
- Portrait and landscape orientation.

## OS Targets

The web application should be usable on current supported versions of:

- Windows.
- macOS.
- iOS / iPadOS.
- Android.
- HarmonyOS where its browser supports required modern web standards.
- Linux desktop distributions through supported browsers.

No OS-specific native dependency should be required for core V1.

## Browser Compatibility Tiers

### Tier A — Officially tested

Test current supported versions, and where practical the immediately previous major version, of:

- Google Chrome.
- Microsoft Edge.
- Mozilla Firefox.
- Apple Safari.
- Mobile Safari.
- Android Chrome.

### Tier B — Chromium-compatible validation / best effort

- Brave.
- Opera.
- Samsung Internet.
- Current Chromium-derived browsers.
- HarmonyOS browser/current webview where testing access exists.

Because many of these use Chromium or standards-compatible engines, they should work through standards-based implementation, but they still require representative validation.

### Tier C — Graceful degradation / not guaranteed

- Obsolete browsers.
- Internet Explorer.
- Unsupported OS/browser versions.
- Highly restricted embedded WebViews.
- Browsers with critical JavaScript/storage/cookie capabilities disabled.
- Highly customized enterprise browsers outside the agreed test matrix.

## Responsive Design Requirements

Use:

- fluid layouts;
- CSS Grid/Flexbox;
- relative sizing;
- responsive typography;
- container/media queries;
- safe-area support;
- orientation adaptation;
- no fixed desktop-only widths;
- no hover-only critical actions.

## Foldable Requirements

Avoid assumptions about one continuous viewport.

Support:

- narrow folded state;
- wide unfolded state;
- dynamic resizing;
- orientation changes;
- safe reflow.

Do not hard-code device models.

## Input Modes

Support:

- mouse;
- touch;
- keyboard;
- trackpad;
- stylus-compatible pointer behavior where browser-standard.

Critical actions must not require hover, drag-only interaction, or precision pointing.

---

# 15. Accessibility

Target **WCAG 2.2 AA**.

Include:

- semantic HTML;
- keyboard navigation;
- visible focus;
- text labels;
- adequate contrast;
- non-color-only status;
- accessible dialogs/forms;
- descriptive validation errors;
- minimum usable touch-target spacing;
- no keyboard traps;
- orientation/reflow;
- reduced-motion support;
- screen-reader labels;
- accessible authentication flows where practical.

---

# 16. Field / Low-Bandwidth Optimization

- Mobile-first field workflows.
- Compressed previews.
- Original-file preservation where required.
- Upload progress.
- Retry.
- Timeout handling.
- Lazy-loaded media.
- Pagination.
- Avoid large initial bundles.
- Background/non-blocking processing.
- Network-loss messaging.

Full offline-first synchronization remains a separate feature unless explicitly approved because reliable offline conflict resolution materially increases complexity.

---

# 17. Functional Requirements

## Authentication / User Management

- Secure login.
- Password reset.
- Session management.
- Roles.
- Account suspend/reactivate.
- MFA for privileged accounts where possible.

## CRM / Client Management

- Leads.
- Qualification.
- Client profile.
- Contacts.
- Service request.
- Locations.
- Related projects.

## Project Management

- Project number.
- Client.
- Service.
- Location.
- Assigned team.
- Dates.
- Status.
- Current stage.
- Blocker.
- Billing status.

## Workflow Engine

- Templates.
- Ordered/parallel stages.
- Dependencies.
- Checklists.
- Approval gates.
- Assigned user/role.
- Blocking conditions.
- Reassignment.

## Field Operations

- Mobile assignment.
- Instructions.
- Checklist.
- Notes.
- Camera/photo upload.
- File upload.
- Submission.

## Central Repository

Private, versioned, metadata-driven storage.

## Technical Processing

Track:

- CAD assignment.
- approved inputs.
- status.
- output files.
- revision.
- reviewer.

Do not execute AutoCAD.

## Review / Approval

- Submit.
- Review.
- Comment.
- Return.
- Approve.
- Release.

## Billing

Track operational billing status; not formal accounting.

## Dashboard

Prioritize:

- blockers;
- pending approvals;
- overdue work;
- upcoming field activity;
- project status;
- workload;
- billing alerts.

## AI

Optional and bounded.

---

# 18. Data Model

Core entities:

- User
- Role
- Permission
- Team
- Lead
- Client
- Contact
- ServiceType
- Project
- ProjectMember
- Requirement
- WorkflowTemplate
- WorkflowStage
- WorkflowInstance
- Task
- Dependency
- ChecklistItem
- FieldAssignment
- FieldSubmission
- Asset
- DocumentVersion
- Review
- Approval
- BillingRecord
- PaymentRecord
- CalendarEvent
- Notification
- AuditEvent
- AIJob
- AIResult
- PrivacyProcessingRecord
- DataRetentionRule
- SecurityIncident
- RiskRegisterItem

---

# 19. Quality Attributes

Align product-quality engineering with ISO/IEC 25010 concepts.

Prioritize:

- functional suitability;
- performance efficiency;
- compatibility;
- usability;
- reliability;
- security;
- maintainability;
- portability/adaptability.

---

# 20. V1 Success Criteria

Point View must be able to:

1. Create an inquiry.
2. Convert it to client/project.
3. Select a workflow.
4. Track requirements.
5. Assign field work.
6. Submit field photos/files.
7. Hand off to office staff.
8. Track CAD/technical processing without AutoCAD integration.
9. Review/revise/approve outputs.
10. Track billing.
11. Identify owner, assignee, stage, blocker, next action.
12. Enforce role/project access.
13. Retrieve controlled project documents.
14. Review dashboards/audit history.
15. Use core workflows across agreed representative desktop, tablet, mobile, and foldable layouts.
16. Pass security/privacy release gates.

---

# 21. Tier 4 Validation

Before any future Tier 4 implementation:

1. Client domain workflow validation.
2. Actual software/version inventory.
3. API/plugin/import/export research.
4. Licensing review.
5. Privacy/security risk review.
6. Controlled PoC.
7. Accuracy/reliability evaluation.
8. Human-review design.
9. Cost/ROI review.
10. Written change request/SOW.

Possible decisions:

- Feasible.
- Feasible with limitations.
- Requires vendor support.
- Requires more research.
- Not currently feasible.
- Not commercially justified.

---

# 22. Product Release Gates

Production release requires:

- Auth passed.
- RBAC passed.
- Security test passed.
- Privacy review/PIA completed to agreed scope.
- Private storage passed.
- Migration tests passed.
- Backup/restore tested.
- Regression passed.
- Device/browser compatibility passed for agreed support matrix.
- WCAG checks completed.
- Dependency risks documented.
- AI controls passed where enabled.
- Monitoring/logging enabled.
- Incident-response procedure documented.
- Tier 4 remains inactive.
- No unsupported compliance/certification claims are displayed.

---

# 23. Delivery Workflow

**Planning → Privacy/Risk Requirements → UX Design → Architecture/Threat Modeling → Build → Secure Code Review → Privacy Review → Security Testing → Regression → Compatibility/Device Testing → Accessibility Testing → Integration/Dependency Testing → Performance/Cost Review → UAT → Release Review → Deployment → Operational Validation**

