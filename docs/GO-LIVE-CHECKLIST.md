# MaidMatch ERP — Go-Live Checklist

**Purpose:** the complete list of what must be true before MaidMatch ERP runs in
production, split by **who owns it**. This is the checklist we walk once the prototype
is approved and the build starts. It is a living document — items are added as batches
reveal new requirements.

**Ownership buckets**

| Bucket | Owner | Scope |
|---|---|---|
| **Us** | MaidMatch project (you + me) | Code, tests, data model, domain logic, documentation |
| **DevOps** | DevOps team | Git repo, environments, CI/CD, secrets, media storage, deploy |
| **maids.cc ERP** | external team | APIs, schemas, business rules, sandbox, credentials |

**Legend:** `[ ]` not started · `[x]` done · `[~]` in progress

---

## 1. Owned by Us (application build)

- [ ] Prototype finalized + team approval.
- [ ] Prototype Playwright test pass (before handoff).
- [ ] SPEC.md complete (all batches folded in).
- [ ] Port prototype → production code in `mmr-production` (Next.js App Router).
- [ ] Data model mapped to Prisma schema (with migrations).
- [ ] Full state machine ported (reducer semantics → server-side).
- [ ] Role/permission model ported (admin module grant, per rules 40/60).
- [ ] Auth kept as-is: maids.cc Google SSO via `@maids/erp-login-widget` + `mmr_session` cookie.
- [ ] External integration layer built against the agreed APIs (with mocks until real).
- [ ] TDD test suite (unit + integration) for every cascade in the pipeline.
- [ ] Playwright E2E suite for the production app.
- [ ] API endpoints documented (`api-as-built.md`-style).
- [ ] `docs/schema-v3.sql` + notes updated for the new schema.

## 2. Owned by DevOps

- [ ] Git repo / branching model + PR review + rulesets (per `make-repo-contribution`).
- [ ] CI/CD pipeline: lint → typecheck → test → build → deploy.
- [ ] Environments: dev / staging / prod (+ sandbox wiring to maids.cc sandbox).
- [ ] Database provisioning (MySQL) + migration run strategy.
- [ ] Secrets management (DB creds, service-to-service creds, `ADMIN_SEED_PASSWORD`).
- [ ] Docker images for the new code (build contexts, nginx config).
- [ ] `docker-compose` / deployment manifests updated for the new app.
- [ ] Media storage bucket/credentials (if MD-1 lands on us).
- [ ] Observability: logs, monitoring, alerting (incl. escalation path XC-7).
- [ ] Backup + retention policy aligned to PII policy (XC-5).

## 3. Owned by maids.cc ERP team

- [ ] Business rules signed off (BR-1…BR-5).
- [ ] Read APIs + docs (RD-1…RD-8).
- [ ] Write APIs + docs (WR-1…WR-6).
- [ ] Canonical enumerations (RD-6).
- [ ] Intake mechanism (EV-1) + change notifications (EV-2) + deep-link patterns (EV-3).
- [ ] Sandbox environment + test fixtures (XC-2).
- [ ] Service-to-service credentials per environment (XC-1).
- [ ] Rate limits / volumes / SLA (XC-3).
- [ ] Idempotency/retry semantics (XC-4).
- [ ] PII / retention / residency policy (XC-5).
- [ ] Publishing platform APIs + ownership (PB-*) — or handoff to platform owners.
- [ ] Media storage target + write-back decision (MD-1, MD-2).

## 4. Joint / sequencing (blocks that gate others)

- [ ] Tier 1 dependencies resolved first (EV-1, XC-1, XC-2, BR-3, BR-4) — see `external-dependencies-request.md` §5.
- [ ] Joint walkthrough of the prototype with the maids.cc team (recommended before scoping).
- [ ] Cutover plan: prototype-approved → code-frozen → deploy (who flips what, when).

---

*(This file grows as each batch of prototype changes surfaces a new go-live requirement.)*
