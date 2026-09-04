# MaidMatch ERP — Production Spec

**Status:** Living document — seeded from the approved prototype, expanded in batches
as the prototype is finalized. This is the single source of truth that converts the
prototype into the production system.

**Companion docs**

- Prototype design spec: `docs/superpowers/specs/2026-09-02-maidmatch-erp-design.md`
- External dependency request (outward): `docs/external-dependencies-request.md`
- Internal dependency register (what you provide): `docs/DEPENDENCY-REGISTER.md`
- Comments tracker (batches): `docs/COMMENTS-TRACKER.md`
- Go-live checklist: `docs/GO-LIVE-CHECKLIST.md`

**Methodology (fixed):** Test-Driven Development + Cascade approach. Every cascade in
the pipeline is specified → tested → implemented → verified, in order, one stage at a
time. Prototype changes are verified with Playwright before team handoff.

---

## 1. Overview

MaidMatch ERP is a dedicated operations system for the **retraction → media production →
publishing → trial** pipeline of housemaids, replacing the current content of the
`mmr-production` Next.js application. It is **not** standalone: it reads from and writes
back to the maids.cc ERP, and publishes to three platforms (MaidMatch, Peekaboo, Yaya).

Lifecycle: **Reception → Pending Retraction → Pending Shooting → Pending Editing →
Available Pending Publishing → Available & Published → Under Trial → Hired**, with the
terminal/archive branches **Retracted to CC**, **Moved to Offboarding**, **Cancelled**.

> **RESOLVED (D-0):** MaidMatch replaces the existing MMR app's content **in-place** —
> same repo, same SSO login, same production domain `https://mmr-web.fly.dev/`.

## 2. Architecture & stack

- **Runtime:** the existing `mmr-production` Next.js app (App Router, React 19, Tailwind
  v4, Prisma over MySQL) — the Vite prototype is *not* deployed; it is ported in.
- **API:** same-origin route handlers under `app/mmr/api/**`, replacing the prototype's
  client-side reducer with server-side logic against Prisma.
- **Auth:** unchanged — maids.cc Google SSO via `@maids/erp-login-widget`, `mmr_session`
  httpOnly cookie (`SameSite=Strict`), `Authorization: Bearer` still accepted.
- **State:** the prototype's pure reducer (`src/store.ts`) is the *reference* for the
  server-side state machine; its transitions become transactional service operations.
- **External I/O:** every external call goes through an adapter layer with a mock/real
  toggle (same convention as the existing Ziwo/Reception mock pattern in this repo), so
  the app is fully exercisable before the real APIs land.

## 3. Domain model

### 3.1 Housemaid

| Field | Type | Notes / dependency |
|---|---|---|
| id | uuid (internal) | MaidMatch-internal key |
| maidsCcId | string | canonical maids.cc identifier — **BR-4** |
| name | string | |
| nationality | enum | **RD-6** canonical list |
| age / dob | number / date | confirm which maids.cc provides (**RD-2**) |
| housemaidType | enum `MV \| CC \| CC-to-MV` | **RD-6** |
| mobile / whatsapp | string | |
| visaExpiry / passportExpiry | date | |
| salary | number | AED/month |
| employmentHistory | structured (not free-text) | **RD-5** |
| complaints | ref to complaint records | **RD-3** |
| isGoldenProfile | boolean | computed per **BR-1** |
| preferences | string[] | **XC-6** canonical vocabulary |
| employerName / employerId | string / ref | **RD-7** real employer record |
| maidsCcProfileLink | url | **EV-3** deep-link pattern |
| currentStage | enum (pipeline stage) | |

### 3.2 Task / Outcome / User / SystemConfig

Ported verbatim from the prototype (`data.ts`) — see design spec §3. Production deltas:

- **Task** gains `assigneeUserId` (real user) in addition to `assignedRole`.
- **Outcome** is the audit trail; every write maps to a maids.cc write (**WR-***) where applicable.
- **User** becomes the `app_user` rows already in the schema; roles map to the existing
  module-grant pattern (rule 60).
- **SystemConfig** moves to persisted rows (per-tenant config), not in-memory seed.

## 4. Pipeline state machine

Transitions are specified in the design spec §4 and implemented in `src/store.ts`.
Production work is to port each transition as a transactional cascade with:

- **Guard** (stage check, as today),
- **Effect** (close task / record outcome / create next task),
- **Side effect** (external write: WR-*, PB-*), with **idempotency** (XC-4),
- **Rollback** semantics on external failure (what stays vs reverts).

The one-at-a-time lock on `PendingRetraction` carries over. Auto-publish (staggered
MaidMatch → Peekaboo → Yaya) becomes a real queued/callback flow (PB-* sync semantics).

## 5. Roles & permissions

Roles: **System Admin, Super Admin, Retractor, Media Team, Sales, Receptionist**
(exact casing). Visibility matrix (final, supersedes the prototype design spec §5):

| Screen | SysAdmin | SuperAdmin | Retractor | Media | Sales | Receptionist |
|---|---|---|---|---|---|---|
| Dashboard / My Team's Work | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reception | ✓ | ✓ | — | — | — | ✓ |
| Directory | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Retraction (incl. Collect Documents + archives) | ✓ | ✓ | ✓ | — | — | — |
| Media & Production | ✓ | ✓ | — | ✓ | ✓ | — |
| Publishing | ✓ | ✓ | ✓ | — | ✓ | — |
| Users / Roles / System Config | ✓ | ✓ | — | — | — | — |

Production deltas:

- Admin capability is gated on the `admin` **module grant**, not a bare `is_admin`
  flag (rule 60).
- Role→screen visibility is enforced **server-side** (route guards), not only by hidden
  nav (the prototype already backs this client-side; production must not rely on it).
- Reception is owned by the **Receptionist**; the Retractor no longer sees it. Sales now
  sees Media & Production too.

## 6. Screens & API surface

Screens (from prototype, ported to App Router): Dashboard, My Team's Work, Reception,
Directory, Retraction (4), Media & Production (3), Publishing (5), Users & Roles
(merged permissions screen), System Configuration.

Each screen maps to one or more route handlers under `app/mmr/api/**`. **The full
endpoint inventory will be enumerated in a later batch** and documented
`api-as-built.md`-style.

## 7. External integrations

See `DEPENDENCY-REGISTER.md` and `external-dependencies-request.md`. All external calls
are behind mock/real adapters; nothing ships hard-wired to a live API before the real
one is available and documented. **Field mapping (which ERP field feeds which label) lives
in `docs/FIELD-MAPPING.md`.**

## 8. Auth (unchanged, load-bearing)

- SSO exchange maps Google-verified email → `app_user.email` → opaque `app_session`
  token; transport is the `mmr_session` cookie (Bearer still honored).
- A Google account with no matching `app_user` row is **refused, never auto-provisioned**.
- Framework collision (rule 90): real identity travels as a request attribute, never the
  Authentication principal. **Do not regress this.**

## 9. Testing (TDD + cascade)

- **Unit:** `lib/*` and the state machine (ported from prototype tests).
- **Integration:** each cascade end-to-end against a test DB.
- **Playwright E2E:** full pipeline journeys (reception → hired, retraction lock,
  staggered publish, role gating) — extended from the prototype's `e2e/smoke.spec.ts`.
- **Cascade order:** Reception → Retraction → Shooting → Editing → Publishing → Trial,
  each fully green before the next is started.

## 10. Deployment & infrastructure

- Docker + `docker-compose` at repo root; `nginx.conf` for the container.
- Prisma migrations as the schema source of truth; `docs/schema-v3.sql` + notes kept in
  agreement by hand.
- CI/CD + environments + secrets per `GO-LIVE-CHECKLIST.md` (owned by DevOps).

## 11. Measurements (what the Dashboard must calculate)

Collected from the timestamps this phase produces; the data model already records all of
these (see §3). Each is computed inside MaidMatch — no ERP field.

| Metric | Source data |
|---|---|
| Maids entering retraction flow per day + outcome split (CC / MaidMatch / offboarded) | `Outcome` records + task `createdAt` |
| Average time in Pending Retraction (active hours) | `avgTimeByStage` (task `createdAt`→`closedAt`) |
| Average handling time inside the task screen (active hours) | `avgHandlingTime` (task `openedAt`→`closedAt`) |
| Priority adherence per retractor — share opened from position 1 + average position opened | `adherence` events (`openedPosition`) |
| CC live-in collection — due today / collected / carried over / average carry-over age | `ccLiveIn.items` (`addedAt`, `collected`) |
| Document collection — maids waiting, average wait, which paper blocks more often, unpaid-leave expiries approaching in-pipeline | `Task.metadata.documents` + `MaidMatchProfile.unpaidLeaveDueDate` |
| Media — waiting to shoot / edit, average time each, send-back rate, time from documents-complete to all-green | tasks + `SentBackToShooting` outcomes + publish `erpNotifiedAt` |
| Posting failures per platform | `Task.metadata.publish.platforms[*].failureReason` |

## 12. Open decisions (folded in as batches arrive)

| # | Decision | Owner | Status |
|---|---|---|---|
| D-0 | In-place replacement vs new module | Us | **resolved** — in-place, same domain `https://mmr-web.fly.dev/` |
| D-1 | Maid type model: `HousemaidType = MV \| CC \| CC to MV \| Cleaner` + `subType` (CC: `Live-in`/`Live-out`; MV sub-types TBD via RD-6). `isCcLiveIn` = `CC` + `Live-in` | Us | **resolved** (reversible) |
| D-2 | Documents Collection default owning role = **Retractor** (role not yet specified by client) | Us | **resolved** (reversible) |
| D-3 | "N/A" status = maid at `Reception` (not yet in pipeline); active screen always prioritized via single-valued `currentStage` | Us | **resolved** |
| D-4 | CC live-in "hourly" refresh simulated on a short interval in the prototype (observable without waiting); production cadence = 1h | Us | **resolved** (prototype-only) |
| D-5 | CC live-in list is a separate entity (`ccLiveIn`) keyed by maids.cc ID; "Send to Retraction" ingests the maid into `Housemaid` if not already present | Us | **resolved** |
| D-7 | Maid type model: `HousemaidType = MV \| CC live-in \| CC live-out \| Cleaner`; MV sub-types `MV to MV / CC to MV / Travel Assist / Normal MV` (RD-6). `Retract to CC` shown only for MV maids | Us | **resolved** (values matched to real enumeration later) |
| D-8 | Unpaid-leave-due "arrival" reference = new `arrivalDate` field (confirm what this maps to in maids.cc — RD-2) | Us | **resolved** (reversible) |
| D-9 | Retraction adherence is tracked by role in the prototype (no per-user identity yet); production keys by user | Us | **resolved** (prototype-only) |
| D-10 | Terminate → creates a mocked maids.cc termination complaint (WR-2/WR-4); Retract-to-CC → mocked payroll complaint + mocked switch-to-CC (WR-1/WR-2) | Us | **resolved** (mock, real API later) |
| D-11 | Documents (Collect Documents): ERP doc types `Unpaid_Leave` + `MMR_cancelation_consent` (trailing space, one L); 30-min poll auto-flags upload; manual upload is plan B; expiry is always user-entered. Document state lives on the per-flow task; a maid may have multiple historical flows but only one active | Us | **resolved** (single-flow in prototype; production needs a `flow` entity) |
| D-12 | Media screens renamed to the craft names: **Videographers** (was Pending Shooting) and **Editors** (was Pending Editing); archive is **Media & Production Done**. Raw/final media accept a link or an upload (link used when the file is large); send-backs record a `SentBackToShooting` outcome as a training signal | Us | **resolved** |
| D-13 | Golden-profile flag is computed live from the editable config rule (`lib/golden.ts`); current working definition = Filipina, under 45 (visa/type set wide until the real rule is confirmed). Editing the rule in System Config recomputes every flag | Us | **resolved** |
| D-14 | Termination reasons are retired (soft), not deleted, so historical outcomes keep their label | Us | **resolved** |
| D-15 | "Current salary" ERP field: pick one of `basicSalary` / `primarySalary` / `accommodationSalary` | Us | **open** — needs the real call |
| D-16 | Visa status pill rule: no single ERP field; candidates `visaAnsariStatus` / `visaRenewingStatus` / `rVisaExpiryDate` / `status` — the rule must be agreed before the pill is built | Us + maids.cc | **open** |
| D-17 | Receptionist role added; Reception is receptionist-owned (retractor no longer sees it); Sales gains Media & Production | Us | **resolved** |
| D-18 | Hash-based URL routing: `#/{screen}` for screens, `#/task/{id}` for tasks, `#/maid/{id}` for the profile page — every view is deep-linkable | Us | **resolved** (hash routing chosen for the static prototype; production uses real routes) |
| D-19 | Housemaid profile page: Overview / Details / Documents / Media / History tabs; only MaidMatch-owned fields are editable (ERP fields read-only); profile edits record a `ProfileEdited` outcome for the History tab | Us | **resolved** |
| D-6… | *(filled from later batch comments)* | | |
