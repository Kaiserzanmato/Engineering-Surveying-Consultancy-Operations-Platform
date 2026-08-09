# Point View — Centralized Engineering & Survey Operations Platform

Secure internal operations platform for Point View Engineering and Surveying Consultancy. Centralizes CRM/intake, projects, field operations, technical/CAD tracking, review/approval, billing status, and audit history behind RBAC, private storage, and privacy-by-design controls.

**Status:** Early scaffold — P0 foundation in progress. No feature slices are built yet. See `docs/IMPLEMENTATION_PLAN.md` for the current gap backlog and priority order.

## Start here

- `PRD.md` — product requirements (V1.2, canonical).
- `TECHNICAL_ARCHITECTURE.md` — full technical/security/privacy architecture (V1.2, canonical).
- `AGENTS.md` — agentic engineering build protocol; every coding agent working in this repo should follow it.
- `docs/IMPLEMENTATION_PLAN.md` — current gap backlog, priorities, confirmed architecture decisions.
- `docs/AGENT_HANDOFF.md` — running handoff log between agent sessions/tools.
- `docs/integrations/DEPENDENCY_REGISTRY.md` — every third-party dependency, provisioned or proposed.

## Development

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · PostgreSQL (via Vercel Marketplace) · Vercel Blob (private storage) · managed auth provider (MFA for privileged roles) — see `docs/integrations/DEPENDENCY_REGISTRY.md` for provisioning status of each.

Tier 4 (GA Survey, deep AutoCAD automation, image-to-survey, external autonomous agents, commercialization) is explicitly parked — see `PRD.md` §4 and §21.
