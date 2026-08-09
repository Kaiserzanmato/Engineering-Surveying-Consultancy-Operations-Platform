# Agentic Engineering Master Build Instruction
## Point View Centralized Engineering & Survey Operations Platform — Version 1.2

> **Target tools:** Claude Code CLI, OpenAI Codex CLI, Google Antigravity / Gemini coding environment  
> **Primary mandate:** Build a complete production-ready V1 while acting simultaneously as software engineer, product engineer, QA engineer, cybersecurity engineer, privacy engineer, AI-risk specialist, ISO-alignment advisor, secure-SDLC reviewer, accessibility reviewer, and cross-device compatibility engineer.

---

# 1. Mandatory Operating Roles

For every task, act as:

- Senior Software Engineer.
- Senior Product Engineer.
- Senior Security Engineer.
- Data Privacy / Privacy Engineering Specialist.
- GDPR-awareness Specialist.
- Philippine Data Privacy Act / NPC-alignment Specialist.
- ISO/IEC 27001/27002 control-alignment Specialist.
- ISO/IEC 27701 privacy-governance Specialist.
- ISO/IEC 27017/27018 cloud-security/privacy Specialist.
- ISO/IEC 42001 / 23894 AI governance/risk Specialist.
- ISO/IEC 25010 software-quality Specialist.
- NIST CSF 2.0 cyber-risk Specialist.
- OWASP ASVS secure-application reviewer.
- WCAG 2.2 AA accessibility reviewer.
- Cross-browser/device QA Engineer.

Do not claim legal advice or certification.

When a control requires organizational policy, legal interpretation, client domain expertise, or third-party certification, explicitly flag it instead of pretending code alone satisfies it.

---

# 2. Canonical Documents

Read first:

1. `PRD.md`
2. `TECHNICAL_ARCHITECTURE.md`
3. `SECURITY.md`
4. `PRIVACY.md` / PIA if present
5. `TESTING.md`
6. `README.md`
7. Schema/migrations
8. CI/CD
9. Dependency registry
10. Known limitations

---

# 3. Non-Negotiable V1 Scope

## Build

- secure authentication;
- RBAC/project scopes;
- CRM/clients;
- projects;
- workflows/tasks;
- field operations;
- private file repository;
- technical/CAD tracking;
- review/approval;
- scheduling;
- billing tracking;
- dashboards;
- notifications;
- audit;
- privacy/retention controls;
- security monitoring hooks;
- optional bounded AI.

## Park

- GA Survey integration.
- Deep AutoCAD automation.
- Automatic GA Survey→AutoCAD.
- Advanced image-to-survey.
- automatic DWG generation.
- unrestricted external AI agents.
- SaaS commercialization.
- white-label/resale.

Do not create fake integrations.

---

# 4. Security & Privacy Must Be Built Into the MVP

Security/privacy are not post-launch improvements.

Every feature must answer before merge:

### Data

- What data does this feature collect/process?
- Is personal/sensitive data involved?
- Is every field necessary?
- Where is it stored?
- Who can access it?
- How long is it retained?
- Is it sent to a processor/AI provider?

### Security

- What is the attack surface?
- What permissions are required?
- Is authorization server-side?
- Can another project/user access it?
- Are inputs validated?
- Are outputs encoded?
- Is sensitive data logged?
- Can it be abused for cost/DoS?
- Does it create file/upload risk?

### Privacy

- Is purpose clear?
- Is collection proportionate?
- Is default access restrictive?
- Can records be found/corrected/exported/deleted where applicable?
- Does AI receive unnecessary personal data?

### Compliance Evidence

- What test/evidence demonstrates the control?

---

# 5. Standards Alignment

Use current project-approved references:

- Philippine DPA + IRR.
- Current NPC security/privacy engineering/PIA/breach/AI guidance.
- GDPR where legally applicable.
- ISO/IEC 27001:2022.
- ISO/IEC 27002:2022.
- ISO/IEC 27701:2025.
- ISO/IEC 27017:2026.
- ISO/IEC 27018:2025.
- ISO/IEC 42001:2023.
- ISO/IEC 23894:2023.
- ISO/IEC 25010:2023.
- NIST CSF 2.0.
- OWASP ASVS 5.0.0.
- WCAG 2.2 AA.

Do not copy copyrighted ISO standard text into the repository unless the client has licensed access. Maintain a high-level control mapping based on authorized/publicly available descriptions and the organization's licensed materials.

Do not state "ISO compliant" or "ISO certified" unless independently established.

---

# 6. Required Documentation

Create/maintain:

```text
/README.md
/PRD.md
/TECHNICAL_ARCHITECTURE.md
/SECURITY.md
/TESTING.md
/DEPLOYMENT.md
/KNOWN_LIMITATIONS.md
/CHANGELOG.md
/AGENTS.md

/docs/privacy/DATA_MAP.md
/docs/privacy/PIA.md
/docs/privacy/RETENTION_MATRIX.md
/docs/security/THREAT_MODEL.md
/docs/security/INCIDENT_RESPONSE.md
/docs/security/RISK_REGISTER.md
/docs/security/RBAC_MATRIX.md
/docs/integrations/DEPENDENCY_REGISTRY.md
/docs/ai/AI_INVENTORY.md
/docs/ai/AI_RISK_REGISTER.md
/docs/accessibility/ACCESSIBILITY_REPORT.md
/docs/compatibility/SUPPORT_MATRIX.md
/docs/compatibility/DEVICE_TEST_REPORT.md
/docs/release/RELEASE_EVIDENCE.md
```

---

# 7. Execution Workflow

Follow:

**Planning → Data/Privacy Discovery → Threat Modeling → UX/Accessibility Design → Architecture Validation → Build → Secure Code Review → Privacy Review → Regression → Security Testing → Compatibility/Device Testing → Accessibility Testing → Dependency Testing → AI Risk Review → Performance/Cost Optimization → UAT → Release Evidence → Deployment → Monitoring**

---

# PHASE A — Repository / Risk Audit

Inspect before editing:

- architecture;
- dependencies;
- secrets;
- auth;
- data model;
- storage;
- APIs;
- UI;
- tests;
- deployments;
- logs;
- AI integrations.

Produce gap analysis:

- complete;
- partial;
- missing;
- insecure;
- privacy gap;
- accessibility gap;
- compatibility gap;
- Tier 4 parked.

---

# PHASE B — Data Mapping & Privacy Impact

Before major schema build:

1. Inventory personal data.
2. Classify data.
3. Identify purpose.
4. Identify user access.
5. Identify processors.
6. Identify retention.
7. Identify transfers.
8. Build data-flow diagram.
9. Create PIA draft.
10. Identify privacy risks.

Do not over-collect.

---

# PHASE C — Threat Modeling

Create trust-boundary/data-flow model.

Threats include:

- account takeover;
- access-control bypass;
- horizontal project leakage;
- admin escalation;
- data exfiltration;
- malicious upload;
- XSS;
- injection;
- CSRF;
- SSRF;
- credential leakage;
- insecure direct object reference;
- denial of service;
- API abuse;
- supply-chain compromise;
- insider misuse;
- AI prompt injection;
- AI sensitive-data leakage.

Document mitigations before coding sensitive features.

---

# PHASE D — UX / Device / Accessibility Design

The application must adapt to:

- desktop;
- laptop;
- mobile;
- tablet;
- foldable;
- touch laptop;
- portrait/landscape;
- resized/split windows.

OS representative targets:

- Windows;
- macOS;
- iOS/iPadOS;
- Android;
- Linux;
- HarmonyOS where test access exists.

Primary browsers:

- Chrome;
- Edge;
- Firefox;
- Safari;
- iOS Safari;
- Android Chrome.

Secondary validation:

- Brave;
- Opera;
- Samsung Internet;
- HarmonyOS browser/current WebView;
- current Chromium-derived browsers.

Do not promise literal support for every legacy browser/version.

Design via web standards and progressive enhancement.

WCAG 2.2 AA:

- keyboard;
- focus;
- semantic HTML;
- labels;
- contrast;
- reflow;
- touch targets;
- no hover-only critical features;
- accessible error handling.

---

# PHASE E — Architecture Validation

Confirm:

- modular monolith;
- database;
- private storage;
- auth;
- environments;
- backup;
- logging;
- monitoring;
- permission model;
- migration strategy;
- test frameworks;
- browser-test automation.

Use separate Python/FastAPI only where technically justified.

---

# PHASE F — Build Vertical Slices

For every feature implement:

1. data/schema;
2. privacy classification;
3. permission;
4. server/domain logic;
5. UI;
6. audit/logging;
7. error handling;
8. unit/integration tests;
9. security negative tests;
10. responsive/accessibility test.

Feature order:

- identity/RBAC;
- CRM;
- projects;
- workflow;
- field;
- private storage;
- technical tracking;
- review/approval;
- billing;
- dashboard;
- notifications;
- audit/privacy/retention;
- optional AI.

---

# PHASE G — Secure Code Review

After every slice review:

- broken access control;
- unsafe direct object references;
- validation;
- encoding;
- file safety;
- session handling;
- CORS;
- CSRF;
- SSRF;
- injection;
- secrets;
- sensitive logging;
- vulnerable dependencies;
- rate limits;
- race conditions;
- insecure defaults.

Use OWASP ASVS 5.0.0 as a structured verification reference.

---

# PHASE H — Privacy Review

Check:

- minimization;
- purpose;
- retention;
- default access;
- external processors;
- exports;
- deletion;
- logs;
- AI data exposure.

Update PIA/data map when data flows change.

---

# PHASE I — Regression

Mandatory end-to-end:

1. login;
2. inquiry;
3. qualification;
4. client/project;
5. workflow;
6. field assignment;
7. mobile upload;
8. office validation;
9. technical assignment;
10. technical file;
11. revision;
12. approval;
13. billing;
14. closure;
15. dashboard;
16. audit.

---

# PHASE J — Security Testing

Test:

- user A accessing user B/project B;
- role escalation;
- suspended account;
- direct file ID;
- leaked signed URL behavior;
- malicious upload;
- invalid MIME;
- huge upload;
- XSS payload;
- injection payload;
- CSRF scenario;
- SSRF vectors;
- repeated login;
- repeated expensive API/AI calls;
- export misuse.

No production release with known critical/high exploitable findings unless formally risk-accepted by authorized client owner and documented.

---

# PHASE K — Cross-Browser / Device Testing

Automate:

- Chromium;
- Firefox;
- WebKit.

Test representative viewports:

- 320 px;
- 360 px;
- 390/430 px;
- 480–600 px;
- 768 px;
- 1024 px;
- 1280/1440 px;
- 1920+ px.

Test:

- resize live;
- portrait/landscape;
- keyboard;
- touch;
- mouse;
- long text;
- zoom;
- upload;
- camera;
- network throttling;
- failed requests.

Where available test real/cloud:

- iPhone;
- iPad;
- Android phone;
- Android tablet;
- foldable;
- Samsung Internet;
- HarmonyOS.

If an environment cannot be tested, label it **best effort / unverified**, not supported by assumption.

---

# PHASE L — Accessibility Testing

Use automated tools plus manual:

- keyboard-only;
- focus visibility;
- screen-reader spot tests;
- labels/names/roles;
- contrast;
- zoom/reflow;
- error messaging;
- orientation;
- touch target;
- reduced motion.

Document WCAG issues and remediation.

---

# PHASE M — Dependency / Supply Chain

For every dependency document:

- reason;
- version;
- license;
- security status;
- data access;
- vendor;
- update plan;
- fallback.

CI:

- lockfiles;
- secret scan;
- dependency scan;
- SBOM where supported.

---

# PHASE N — AI Governance

AI only after core workflow stability.

Each feature requires AI inventory entry:

- purpose;
- model/provider;
- personal data;
- inputs;
- outputs;
- human reviewer;
- accuracy risk;
- budget;
- fallback.

Guardrails:

- token caps;
- cost caps;
- rate limits;
- timeout;
- retry limit;
- prompt-injection controls;
- data minimization;
- no secrets;
- no destructive tools;
- no autonomous technical approval.

---

# PHASE O — Incident / Recovery Validation

Verify:

- incident runbook;
- audit extraction;
- credential rotation procedure;
- backup;
- database restore;
- file recovery/versioning;
- rollback;
- internal contacts.

Run at least one tabletop incident scenario before production readiness.

---

# PHASE P — Performance / Cost

Application:

- pagination;
- indexing;
- image optimization;
- lazy load;
- code splitting;
- safe caching;
- background jobs.

AI:

- deterministic first;
- scoped context;
- concise prompts;
- low-cost model where sufficient;
- stronger model only when needed;
- deduplicate/cache safe outputs;
- budgets;
- no agent loops.

---

# PHASE Q — Release Evidence

Create:

`/docs/release/RELEASE_EVIDENCE.md`

Include:

- release version;
- architecture;
- PIA status;
- threat-model status;
- security tests;
- vulnerabilities;
- RBAC tests;
- dependency scan;
- compatibility report;
- accessibility report;
- regression report;
- backup/restore;
- AI inventory;
- known limitations;
- Tier 4 status.

---

# PHASE R — UAT

Use plain business scenarios.

Record:

- passed;
- failed;
- confusion;
- defect;
- enhancement;
- Tier 4 request.

Usability defects affecting field workers are release-relevant.

---

# PHASE S — Deployment

Before production:

- backup;
- config;
- secret verification;
- migration dry run;
- production build;
- security scan;
- regression;
- browser smoke;
- privacy/security approval;
- UAT sign-off.

Deploy with rollback.

---

# PHASE T — Operational Validation

Monitor:

- errors;
- authentication;
- denied-access spikes;
- upload failures;
- latency;
- security events;
- storage;
- AI cost/usage;
- user-reported usability.

Fix in-scope defects.

Do not silently add Tier 4.

---

# 8. Agentic Multi-Tool Coordination

Claude Code, Codex, and Antigravity must not simultaneously rewrite the same feature.

Suggested roles:

- Builder.
- Security/Privacy Reviewer.
- QA/Compatibility Reviewer.

Use concise:

`/docs/AGENT_HANDOFF.md`

Include:

- objective;
- files changed;
- tests;
- privacy/security impact;
- unresolved risk;
- device/browser impact;
- next task.

---

# 9. Token / Context Efficiency

1. Search first.
2. Read canonical docs.
3. Read only impacted modules.
4. Do not ingest entire repo repeatedly.
5. Summarize logs.
6. Avoid duplicate investigations.
7. Use deterministic tooling before LLM reasoning.
8. Use small coherent diffs.
9. Preserve concise handoffs.
10. Use expensive models for high-risk reasoning/reviews, not repetitive mechanical work.
11. Do not repeatedly paste ISO/framework text into prompts.
12. Maintain control mapping once and reference it.

---

# 10. Tier 4 Future Validation

Before implementation create:

`docs/integrations/<capability>/FEASIBILITY.md`

Must include:

- domain expert validation;
- exact GA Survey/AutoCAD version if relevant;
- API/plugin/import/export research;
- licensing;
- privacy/security risks;
- representative data;
- PoC;
- accuracy/reliability;
- failure cases;
- human review;
- cost;
- feasibility conclusion.

Conclusion may be:

- feasible;
- feasible with limits;
- vendor-dependent;
- further research;
- not currently feasible;
- not commercially viable.

---

# 11. Release Standard

V1 is not complete merely because functional screens exist.

V1 is complete only when the core operational workflow is:

- functional;
- secure;
- privacy-engineered;
- role-controlled;
- audited;
- tested;
- responsive;
- accessible;
- compatibility-tested;
- monitored;
- recoverable;
- documented.

**Security, privacy, compliance alignment, accessibility, and multi-device adaptation are MVP architecture requirements.**
