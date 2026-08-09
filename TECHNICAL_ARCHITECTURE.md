# Point View Centralized Engineering & Survey Operations Platform
## Full Technical Architecture, Security, Privacy & Compliance Documentation — Version 1.2

**Status:** Canonical V1 technical build specification  
**Engineering method:** Agentic engineering with human approval gates  
**Coding environments:** Claude Code CLI, OpenAI Codex CLI, Google Antigravity / Gemini coding environment  
**Primary principle:** Build the feasible secure core now; keep unvalidated specialized integrations outside the committed V1 architecture.

> **Compliance disclaimer:** The controls below are designed for alignment/readiness with recognized privacy, cybersecurity, AI-governance, cloud-security, application-security, accessibility, and software-quality frameworks. They do not constitute ISO certification, legal advice, GDPR certification, NPC approval, or a guarantee of compliance. Applicability and formal conformity must be validated by qualified legal/privacy/security professionals and, where relevant, accredited certification bodies.

---

# 1. Architecture Objectives

V1 must:

- solve Point View's operational workflow problems;
- protect client, employee, project, and technical data;
- be usable from field and office environments;
- support least-privilege remote access;
- work across modern device classes and standards-compliant browsers;
- provide privacy/security guardrails at MVP launch;
- support auditability and incident response;
- remain functional without AI;
- remain functional without Tier 4 integrations;
- remain extensible through adapter boundaries.

---

# 2. Standards & Governance Baseline

## 2.1 Philippine Data Privacy

Engineering shall account for:

- RA 10173 — Data Privacy Act of 2012.
- DPA Implementing Rules and Regulations.
- Current NPC security requirements for personal data.
- NPC Privacy Impact Assessment guidance.
- NPC Privacy Engineering in Systems Life Cycle guidance.
- NPC AI guidance where AI processes personal data.
- NPC breach-management requirements.

Required engineering themes:

- transparency;
- legitimate purpose;
- proportionality/data minimization;
- organizational, physical, and technical security;
- privacy by design/default;
- privacy impact assessment;
- retention/disposal;
- data-subject rights support;
- incident/breach readiness;
- accountability over processors/vendors.

## 2.2 GDPR

GDPR controls should be supported where legally applicable.

Architectural readiness should include:

- data protection by design/default;
- data minimization;
- purpose limitation;
- security of processing;
- data-subject request support;
- retention controls;
- processing records;
- processor/vendor governance;
- breach-response support.

Do not assume GDPR applies to all Point View activities without legal assessment.

## 2.3 ISO / IEC Control References

Current architecture references:

- ISO/IEC 27001:2022.
- ISO/IEC 27002:2022.
- ISO/IEC 27701:2025.
- ISO/IEC 27017:2026.
- ISO/IEC 27018:2025.
- ISO/IEC 42001:2023.
- ISO/IEC 23894:2023.
- ISO/IEC 25010:2023.

These guide the design but do not mean the organization/system is certified.

## 2.4 Additional Frameworks

- NIST Cybersecurity Framework 2.0 for cyber-risk governance.
- OWASP ASVS 5.0.0 as application-security verification reference.
- WCAG 2.2 AA as accessibility target.

For this internal business application, target an **ASVS Level 2-oriented baseline**, subject to threat/risk assessment.

---

# 3. Architecture Decision — Modular Monolith

Use a modular monolith for V1 unless concrete evidence requires decomposition.

Modules:

1. Identity & Access
2. CRM / Intake
3. Clients
4. Projects
5. Workflow / Tasks
6. Field Operations
7. Documents / Storage
8. Technical Processing Tracking
9. Review / Approval
10. Calendar / Scheduling
11. Billing
12. Notifications
13. Analytics
14. Audit / Security Events
15. Privacy / Retention
16. Risk / Incident Records
17. AI Assistance
18. Integration Ports

---

# 4. Full V1 Technical Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT DEVICES                                 │
├────────────────────────────────────────────────────────────────────────────┤
│ Desktop │ Laptop │ Tablet │ Mobile │ Foldable │ Touch Laptop              │
│ Windows │ macOS │ iOS/iPadOS │ Android │ HarmonyOS* │ Linux*              │
│ Chrome │ Edge │ Safari │ Firefox │ Brave │ Opera │ Samsung Internet*      │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ HTTPS / TLS
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        RESPONSIVE WEB / PWA SHELL                          │
├────────────────────────────────────────────────────────────────────────────┤
│ Next.js │ React │ TypeScript                                              │
│ Semantic HTML │ Responsive CSS │ Progressive Enhancement                  │
│ WCAG 2.2 AA target │ Keyboard/Touch/Mouse adaptive                        │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    EDGE / APPLICATION SECURITY GATE                       │
├────────────────────────────────────────────────────────────────────────────┤
│ TLS │ Secure Headers │ Rate Limits │ Request Size Limits                  │
│ CORS Policy │ CSRF Controls │ Input Validation │ Abuse Controls            │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION / AUTHORIZATION                         │
├────────────────────────────────────────────────────────────────────────────┤
│ Managed Auth │ MFA Privileged Roles │ Session Controls                    │
│ RBAC │ Project Scope │ Resource Authorization │ Deny by Default            │
│ Optional DB RLS │ Reauthentication for High-Risk Actions                  │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS DOMAIN LAYER                              │
├────────────────────────────────────────────────────────────────────────────┤
│ CRM │ Clients │ Projects │ Workflow │ Tasks │ Field Operations            │
│ Documents │ Technical Tracking │ Review/Approval │ Scheduling              │
│ Billing │ Notifications │ Analytics │ Audit │ Privacy/Retention            │
└───────────────────────┬────────────────────────────┬───────────────────────┘
                        │                            │
                        ▼                            ▼
┌───────────────────────────────┐   ┌────────────────────────────────────────┐
│          PostgreSQL           │   │          PRIVATE OBJECT STORAGE        │
├───────────────────────────────┤   ├────────────────────────────────────────┤
│ Structured records            │   │ Photos / Documents / Technical Files   │
│ Workflow state                │   │ Private-by-default                     │
│ RBAC metadata                 │   │ Signed temporary access                │
│ Audit/security events         │   │ Versioned assets                      │
│ Retention metadata            │   │ Access classification                 │
└───────────────┬───────────────┘   └────────────────┬───────────────────────┘
                │                                    │
                └────────────────┬───────────────────┘
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND PROCESSING                                 │
├────────────────────────────────────────────────────────────────────────────┤
│ Notifications │ Image Optimization │ Safe Document Processing             │
│ Retention Jobs │ Security/Monitoring Jobs │ Optional AI Jobs               │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        OPTIONAL AI SERVICE                                 │
├────────────────────────────────────────────────────────────────────────────┤
│ Provider Abstraction │ Feature Flags │ Data Minimization                   │
│ Prompt-Injection Controls │ Token/Cost Limits │ Human Review               │
│ Audit │ Model/Provider Registry │ No Autonomous Professional Approval      │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION PORT / ADAPTER BOUNDARY                    │
├────────────────────────────────────────────────────────────────────────────┤
│ Approved V1 adapters only                                                  │
│ Future GA Survey Adapter        [OFF / Tier 4]                             │
│ Future AutoCAD Adapter          [OFF / Tier 4]                             │
│ Future Advanced Vision          [OFF / Tier 4]                             │
│ Future External Agent Adapter   [OFF / Tier 4]                             │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       PLATFORM / OPERATIONS                                │
├────────────────────────────────────────────────────────────────────────────┤
│ Dev │ Staging/UAT │ Production                                             │
│ CI/CD │ Logs │ Error Tracking │ Backups │ Restore Tests                   │
│ Dependency/SBOM Scans │ Secret Scans │ Security Alerts                    │
└────────────────────────────────────────────────────────────────────────────┘
```

`*` = representative/best-effort validation where access to the device/browser environment exists.

---

# 5. Security Architecture

## 5.1 Threat Modeling

Before implementation and before major new integrations:

- identify assets;
- identify actors;
- identify trust boundaries;
- map data flows;
- identify attack surfaces;
- identify abuse cases;
- identify privacy harms;
- identify mitigations.

Maintain:

`/docs/security/THREAT_MODEL.md`

At minimum cover:

- account takeover;
- broken access control;
- horizontal/vertical privilege escalation;
- file ID enumeration;
- signed-link leakage;
- injection;
- XSS;
- CSRF;
- SSRF;
- malicious file upload;
- ransomware/data deletion;
- credential leakage;
- insider misuse;
- AI prompt injection;
- AI data exfiltration;
- denial-of-service/cost abuse.

## 5.2 Authentication

- Managed identity provider.
- MFA required for System Admin.
- MFA recommended for all privileged roles.
- Secure password/reset policies.
- Session expiration.
- Logout/revocation.
- Suspended users denied.
- Authentication rate limiting.
- Brute-force protection.

## 5.3 Authorization

Enforce:

- role permission;
- project scope;
- resource scope.

Pseudo-rule:

```text
ALLOW =
  active_user
  AND permission_granted
  AND resource_in_scope
  AND action_allowed
```

No client-side-only security.

## 5.4 High-Risk Actions

Require confirmation and, where feasible, reauthentication for:

- deleting users;
- changing privileged roles;
- exporting large datasets;
- deleting project data;
- changing retention policy;
- changing storage/security settings;
- destructive migrations.

## 5.5 Encryption

- TLS 1.2+ minimum where platform/provider permits; prefer modern TLS configuration.
- Provider-managed encryption at rest.
- Secrets encrypted in platform secret stores.
- No sensitive data in URLs/query strings where avoidable.
- Avoid logging sensitive field values.

## 5.6 Application Security

Use OWASP ASVS as verification checklist.

Controls include:

- safe parameterized database access;
- server-side validation;
- output encoding;
- CSP where feasible;
- secure cookies;
- SameSite;
- CSRF mitigation where needed;
- restrictive CORS;
- SSRF restrictions;
- redirect validation;
- secure file handling;
- security headers;
- dependency pinning/scanning;
- secure error messages;
- rate limits.

---

# 6. Privacy Engineering Architecture

## 6.1 Privacy Data Map

Maintain:

`/docs/privacy/DATA_MAP.md`

Document:

- data category;
- source;
- purpose;
- lawful/business basis;
- sensitive/non-sensitive classification;
- user access;
- processor/vendor;
- storage;
- geographic region;
- retention;
- deletion.

## 6.2 Privacy Processing Records

Where useful maintain application/admin records for:

- processing activity;
- purpose;
- categories of personal data;
- users/recipients;
- external processors;
- retention.

## 6.3 Minimization

Database schema reviews must ask:

- Is this field required?
- Is it proportionate?
- Is it being used?
- Could less sensitive data achieve the same purpose?

## 6.4 Privacy by Default

Defaults should:

- keep projects private;
- keep files private;
- avoid broad team access;
- disable advanced AI;
- disable future adapters;
- avoid unnecessary analytics/tracking;
- minimize exposed user data.

## 6.5 Privacy Impact Assessment

Before production:

`/docs/privacy/PIA.md`

Include:

- data-flow diagram;
- system boundary;
- repositories;
- external processors;
- threats/risks;
- affected data subjects;
- mitigations;
- residual risk;
- approval/sign-off.

## 6.6 Data Subject Operations

Build administrative capability to:

- search relevant person records;
- correct data;
- export data where approved;
- mark data for deletion/retention review;
- document request handling.

Do not automatically delete engineering/business records without retention/legal review.

---

# 7. Retention & Disposal

Create data-retention rules per data class.

Example categories:

- leads;
- clients;
- employee/user accounts;
- field photos;
- survey files;
- technical files;
- billing records;
- audit logs;
- AI prompts/results.

Retention must be configurable/documented.

Deletion process should support:

1. request/trigger;
2. authorization;
3. legal/business hold check;
4. deletion/anonymization;
5. storage deletion;
6. audit evidence.

Backups may require separate expiration schedules.

---

# 8. Logging, Monitoring & Audit

## Audit Logs

Immutable-from-normal-user perspective.

Record:

- actor;
- timestamp;
- action;
- target;
- relevant status before/after;
- request/security context where appropriate.

## Security Monitoring

Detect where practical:

- repeated login failures;
- abnormal export attempts;
- repeated authorization failures;
- high-rate API use;
- suspicious upload patterns;
- AI cost spikes;
- error spikes.

Avoid logging secrets or full personal-data payloads.

---

# 9. Incident & Breach Architecture

Maintain:

`/docs/security/INCIDENT_RESPONSE.md`

Process:

```text
Detect
 ↓
Triage
 ↓
Contain
 ↓
Preserve Evidence
 ↓
Assess Data / Systems
 ↓
Eradicate / Remediate
 ↓
Recover
 ↓
Privacy / Legal Notification Assessment
 ↓
Post-Incident Review
```

The application should support:

- incident record creation;
- affected systems;
- affected projects/data;
- audit export;
- evidence links;
- remediation actions;
- notification timeline fields.

Legal notification decisions remain with authorized privacy/legal personnel.

---

# 10. Backup / Recovery / Resilience

Define:

- database backup frequency;
- storage backup/version strategy;
- restore procedure;
- RPO/RTO targets during final requirements;
- restore testing;
- production rollback.

Do not claim business-continuity certification.

---

# 11. Supply-Chain & Third-Party Risk

Maintain:

`/docs/integrations/DEPENDENCY_REGISTRY.md`

For each dependency:

- vendor;
- service;
- purpose;
- data processed;
- region;
- authentication;
- permissions;
- SLA;
- rate limits;
- security/privacy documentation;
- subprocessors where relevant;
- cost;
- fallback;
- exit/migration plan.

CI must include:

- dependency vulnerability scanning;
- lockfile integrity;
- outdated critical dependency review;
- SBOM generation where tooling supports it.

---

# 12. AI Security, Privacy & Governance

Map AI controls to ISO/IEC 42001 / 23894 concepts and relevant NPC AI privacy guidance.

## AI Inventory

For each AI feature record:

- purpose;
- model/provider;
- data used;
- personal data involved;
- outputs;
- human reviewer;
- accuracy limits;
- prompt template/version;
- cost budget;
- fallback.

## AI Guardrails

- AI OFF by default for advanced technical extraction.
- Human-in-the-loop.
- No autonomous technical approval.
- No unrestricted agents.
- No automatic deletion.
- No automatic external send unless separately approved.
- Prompt-injection filtering/segmentation.
- Do not put secrets in prompts.
- Minimize PII.
- Control provider data-retention/training settings.
- Log AI operations without unnecessarily storing sensitive prompts.
- Set timeouts/retry caps.
- Token and cost limits.

---

# 13. Domain / Data Architecture

Core entities:

- users
- roles
- permissions
- user_roles
- role_permissions
- leads
- clients
- service_types
- projects
- project_members
- requirements
- workflow_templates
- workflow_stages
- workflow_instances
- tasks
- dependencies
- checklist_items
- field_assignments
- field_submissions
- assets
- document_versions
- reviews
- approvals
- billing_records
- payment_records
- calendar_events
- notifications
- audit_events
- ai_jobs
- ai_results
- privacy_processing_records
- retention_rules
- security_incidents
- risk_register_items

Use migrations for all schema changes.

---

# 14. Workflow Engine

Business workflow must be deterministic.

Examples:

```text
IF mandatory_requirements != COMPLETE
THEN deny stage_transition

IF field_submission == APPROVED
THEN unlock technical_stage

IF task.overdue
THEN notify assignee
AND optionally notify manager

IF review == FOR_REVISION
THEN reassign to responsible technical operator
```

AI must never decide authorization or mandatory workflow gating.

---

# 15. File / Evidence Architecture

Private object storage.

Object metadata:

- project;
- category;
- uploader;
- time;
- MIME;
- size;
- version;
- access classification;
- review status;
- retention class.

Suggested key:

```text
projects/{project_uuid}/{category}/{asset_uuid}/{filename}
```

File-security pipeline:

```text
Upload Request
 ↓
Authenticate
 ↓
Authorize Project
 ↓
Validate Size/Type
 ↓
Generate Safe Internal Key
 ↓
Optional Malware Scan
 ↓
Private Storage
 ↓
Metadata Record
 ↓
Audit Event
```

---

# 16. Cross-Device / Cross-Browser Architecture

The application must use web standards rather than device detection whenever possible.

## Principles

- responsive/adaptive layout;
- progressive enhancement;
- semantic HTML;
- CSS feature fallbacks;
- no browser-specific core business logic;
- no UA-sniffing except documented compatibility workaround;
- server validation independent of device;
- dynamic viewport support;
- safe-area support;
- orientation handling;
- touch/keyboard/mouse compatibility.

## Device Layout Breakpoints

Do not design only around conventional breakpoints.

Test representative widths such as:

- 320–359 px narrow mobile;
- 360–479 px mobile;
- 480–767 px large phone/folded/foldable;
- 768–1023 px tablet;
- 1024–1439 px laptop/desktop;
- 1440+ px wide desktop.

Use fluid design, not fixed rendering at these exact sizes.

## Foldables

Test:

- resize while app is open;
- portrait/landscape;
- narrow folded;
- wide unfolded;
- split-screen/multi-window where available.

Do not assume hinge APIs are available.

## Operating Systems

Because this is a web application, core behavior should not be tied to OS-specific code.

Representative validation:

- Windows;
- macOS;
- iOS/iPadOS;
- Android;
- Linux;
- HarmonyOS where a test environment is available.

## Browser Support Matrix

### Primary/Tested

- Chrome.
- Edge.
- Firefox.
- Safari.
- iOS Safari.
- Android Chrome.

### Secondary/Compatibility Validation

- Brave.
- Opera.
- Samsung Internet.
- HarmonyOS browser/webview where available.
- other current Chromium-based browsers.

### Explicitly Not Guaranteed

- Internet Explorer.
- obsolete browser releases;
- unsupported OS releases;
- proprietary embedded browsers outside test access;
- JavaScript-disabled operation.

## Test Automation

Use Playwright or equivalent for:

- Chromium;
- Firefox;
- WebKit.

Use real-device/cloud-device testing where budget allows for:

- iOS Safari;
- Android Chrome;
- Samsung Internet;
- foldables;
- HarmonyOS if available.

Automated browser-engine coverage does not replace representative real-device UAT.

---

# 17. Performance Engineering

Targets should be finalized after realistic data volumes.

Practices:

- server-side pagination;
- query indexing;
- selective fields;
- lazy loading;
- optimized image previews;
- background jobs;
- route/code splitting;
- caching where safe;
- compression;
- avoid unnecessary polling.

Field users should be prioritized for low-bandwidth usability.

---

# 18. Accessibility Engineering

Target WCAG 2.2 AA.

Automated checks plus manual verification for:

- keyboard;
- focus;
- labels;
- contrast;
- reflow;
- status messages;
- forms;
- touch targets;
- screen readers;
- orientation;
- error prevention.

---

# 19. Secure SDLC / Agentic Engineering Gates

Every feature passes:

```text
Requirement
 ↓
Privacy Classification
 ↓
Threat / Abuse Review
 ↓
Architecture
 ↓
Implementation
 ↓
Unit Tests
 ↓
Security Review
 ↓
Privacy Review
 ↓
Integration Tests
 ↓
Regression
 ↓
Accessibility / Compatibility
 ↓
UAT
 ↓
Release
```

---

# 20. Test Strategy

## Functional

- unit;
- API;
- domain;
- end-to-end.

## Security

- RBAC negative tests;
- authorization bypass;
- injection;
- XSS;
- CSRF;
- file upload;
- signed-link access;
- session handling;
- rate limits;
- secret scans;
- dependency scans.

## Privacy

- unauthorized field exposure;
- over-broad search;
- export permissions;
- deletion/retention workflow;
- logging redaction;
- AI data minimization.

## Browser / Device

- Playwright Chromium/Firefox/WebKit;
- representative physical/cloud devices;
- touch;
- keyboard;
- resize/orientation;
- foldable layout.

## Accessibility

- automated WCAG checks;
- manual keyboard/focus;
- screen-reader spot checks.

## Regression

Critical workflow:

1. Login.
2. Create inquiry.
3. Convert client/project.
4. Select workflow.
5. Requirements.
6. Assign field task.
7. Mobile field submission.
8. Office validation.
9. Technical assignment.
10. Technical upload.
11. Revision.
12. Approval.
13. Billing.
14. Closure.
15. Dashboard.
16. Audit.

---

# 21. CI/CD Security Pipeline

```text
Pull Request
 │
 ├─ Install / lockfile verification
 ├─ Lint
 ├─ Type check
 ├─ Unit tests
 ├─ Integration tests
 ├─ Security tests
 ├─ Secret scan
 ├─ Dependency vulnerability scan
 ├─ Build
 ├─ Accessibility checks
 ├─ Browser smoke tests
 └─ Preview
      ↓
 Human Code/Security Review
      ↓
 Merge
      ↓
 Staging
      ↓
 E2E / UAT / Security Smoke
      ↓
 Production Approval
      ↓
 Production
```

---

# 22. Release Compliance Evidence Pack

Generate/update for each major production release:

- architecture diagram;
- data-flow diagram;
- PIA;
- threat model;
- RBAC matrix;
- dependency registry;
- risk register;
- test results;
- accessibility report;
- security scan results;
- backup/restore evidence;
- change log;
- known limitations;
- AI inventory where AI enabled;
- incident contacts;
- retention matrix.

This is evidence for governance/readiness, not certification.

---

# 23. Tier 4 Technical Validation

For each future integration create:

`/docs/integrations/<capability>/FEASIBILITY.md`

Required:

- client domain expert;
- current manual workflow;
- exact software/version;
- required input/output;
- API/SDK/plugin;
- licensing;
- security/privacy;
- technical experiment;
- reliability/accuracy;
- human review;
- failure modes;
- cost;
- decision.

Possible decision:

- feasible;
- feasible with limitations;
- requires vendor support;
- further research;
- not currently feasible;
- not commercially justified.

---

# 24. V1 Definition of Done

A feature is not Done until:

- requirement works;
- role authorization works;
- negative authorization test passes;
- error handling exists;
- logs/audit added where required;
- privacy impact reviewed;
- security impact reviewed;
- responsive layout passes;
- browser engine smoke test passes;
- accessibility basics pass;
- tests pass;
- documentation updated;
- no Tier 4 dependency was introduced.

---

# 25. Technical North Star

**The V1 platform is a privacy-engineered, security-hardened, responsive operational system with optional human-reviewed AI assistance — not an autonomous engineering platform.**

Security, privacy, governance, accessibility, and cross-device usability are MVP requirements, not post-MVP enhancements.
