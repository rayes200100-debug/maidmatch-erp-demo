# MaidMatch ERP — Internal Dependency Register

**Purpose:** the *internal* working map of everything the prototype fakes, what real
system it actually depends on, and what **you** need to give me before that part can
become real. This is the "checklist of items to provide" you asked for — it stays in
our repo, unlike `external-dependencies-request.md`, which is the outward-facing
request to the maids.cc team.

**How to read it**

- **Mock (in prototype)** — what the prototype currently invents.
- **Real dependency** — the register ID in `external-dependencies-request.md` (§3)
  that covers it, and which system provides it.
- **What you provide me** — the concrete thing I need to turn the mock into production
  code. **This is your checklist.**

**Three dependency owners**

| Owner | Who | Supplies |
|---|---|---|
| **maids.cc ERP team** | external | APIs, schemas, business rules, data (RD/WR/EV/XC/BR items) |
| **Platforms** | external | Publish/delist/status APIs (PB items) — may be maids.cc or 3rd party |
| **Us / DevOps** | internal | Hosting, DB, CI/CD, secrets, media storage (MD items, infra) |

---

## 1. Business rules & definitions (no API — just decisions)

These are hard-coded into the prototype as guesses. Each needs a signed-off answer
before the production build, and they drive routing/queue behaviour.

| Prototype guess | Register ID | What you provide me |
|---|---|---|
| Golden profile = Filipino, 25–40, visa 3–24mo, MV (`data.ts` `defaultConfig.goldenProfile`) | BR-1 | The exact golden-profile rule (nationalities, age, visa window, types; computed live vs stored flag; who owns changes). |
| Retraction priority = FIFO (also LIFO / Filipina-first / Golden-first options) (`lib/priority.ts`) | BR-2 | The correct priority algorithm (or composite weighting), and whether the queue is strictly one-at-a-time. |
| MaidMatch owns the maid once retracted; no conflict rules | BR-3 | System-of-record decision: which fields MaidMatch is authoritative on vs read-only mirrors of maids.cc. |
| `maidsCcId` is a free string, mostly empty in seed | BR-4 | Confirmed canonical housemaid identifier across both systems; does CC→MV keep one ID? |
| "Moved to Offboarding" only flips a local stage | BR-5 | What offboarding actually means operationally; is it reversible; what maids.cc expects. |

## 2. Housemaid data (read path)

| Prototype field | Register ID | What you provide me |
|---|---|---|
| Search by name/mobile/WhatsApp/maids.cc id/nationality/type (`Reception.tsx`, `Directory.tsx`) | RD-1 | Search API + pagination + sort order (or confirmation a static list is fine to start). |
| Full profile: name, nationality, age/DOB, type (MV/CC/CC-to-MV), mobile, WhatsApp, visa/passport expiry, salary, employer, status | RD-2 | Full profile response schema (with nullability). |
| `complaints: {summary, erpLink}` — hard-coded strings like `erp://complaints/c-5021` | RD-3 | Complaints API + real deep-link URL format. |
| WPS salary history — **not in prototype** | RD-4 | WPS history API (months/amounts + meaning of a missing month). |
| `employmentHistory: string[]` free-text | RD-5 | Structured employment history schema (employer, dates, duration, family size, end reason, disputed flag). |
| `NATIONALITY_OPTIONS`, `HOUSEMAID_TYPE_OPTIONS` hard-coded | RD-6 | Canonical enumerations (nationalities, types, complaint types/statuses, teams) — endpoint or signed static list. |
| `employerName` is free-text at "Under trial" | RD-7 | Employer/client lookup API (search + retrieve) for a real employer record. |
| No document handling in prototype | RD-8 | Passport/visa copy + photo retrieval, or confirmation MaidMatch must not hold these (PII). |
| `passportNumber` (new — search + display) | RD-2 | Passport **number** field in the full profile (currently only expiry is modelled). |
| `visaStartDate` (new — visa status pill) | RD-2 | Visa start date field in the full profile. |
| `arrivalDate` (new — unpaid-leave-due rule) | RD-2 | The "arrival" date the unpaid-leave-due rule is computed from; confirm what this maps to in maids.cc. |
| Structured `wpsHistory` (month/amount/status) | RD-4 | WPS salary history with Paid/Pending/Not-sent status per month. |
| Structured `employmentHistory` (employer/start/end/salary/reason) | RD-5 | Employment history as structured records, not free text. |
| Structured `complaints` (title/summary/date/status/assignedTo) | RD-3 | Complaints with status + assigned team, so "open to the retractor" can be filtered. |
| MV sub-type values (`MV to MV`/`CC to MV`/`Travel Assist`/`Normal MV`) | RD-6 | Canonical MV sub-type enumeration. |
| Termination → create complaint (offboarding team/type, assembled description) | WR-2/WR-4 | Create-complaint API + switch-to-offboarding. |
| Retract to CC → payroll complaint + switch-to-CC | WR-1/WR-2 | Create-complaint API (payroll type) + trigger switch-to-CC. |
| `photoUrl` (new — "name and photo") | RD-8 | Profile photo source (or confirmation to hold photos in MaidMatch). |
| `subType` (new — MV sub-types, CC live-in/live-out) | RD-6 | Canonical MV sub-type list + confirm CC live-in/live-out labels. |
| `room` (new — CC live-in accommodation location) | RD-9 | Accommodation/room field in the CC live-in due-today payload. |
| CC live-in "due today" list (hourly) — not in prototype's walk-in search | **RD-9 (new)** | Hourly API returning CC live-in maids due to go to the retractor today, incl. room, visa expiry, and **why due today**. |
| Documents collected in person, checked by 30-min poll | **RD-10 (new)** | Read back the documents on file (type, upload date, file link) — drives the Collect Documents auto-flag. |

## 3. Writes back to maids.cc

| Prototype action | Register ID | What you provide me |
|---|---|---|
| "Retract to CC" only flips a local stage | WR-1 | Trigger switch-to-CC API + how we learn success (sync/async). |
| No complaint creation in prototype | WR-2 | Create-complaint API + idempotency key + deep-link return. |
| MaidMatch profile captured locally (marital status, kids, salary ask…) | WR-3 + XC-6 | Whether maids.cc stores these fields too — **decision pending: do we write them back at all?** |
| "Move to Offboarding" is a dead end | WR-4 | Trigger-offboarding API. |
| No pipeline-status signal back to maids.cc | WR-5 | Status-sync mechanism (push or pull) so two systems don't act on the same maid. |
| Hired/Cancelled notify nobody | WR-6 | Notify-on-hired/cancelled API (contract generation, release-to-pool, cancellation reason). |
| Publishing success is not reported back | **WR-7 (new)** | API to inform maids.cc ERP that publishing completed (the weekly audit reads this instead of screenshots). Endpoint: `POST /api/maids/{maidCode}/site-posts/{site}/reuploads` — **available**, confirm base URL deployed. |
| Unpaid-leave-due date only stored in MaidMatch | **WR-8 (new)** | Commit the unpaid-leave-due date to the ERP on confirmed retraction. |
| Collect Documents posts papers locally | **WR-9 (new)** | Post a document to the maid's ERP record (type + file). |
| Unpaid-leave expiry date entered in MaidMatch | **WR-10 (new)** | Store the unpaid-leave expiry date against her ERP record. |

## 4. Publishing (three platforms)

| Prototype | Register ID | What you provide me |
|---|---|---|
| `publishState: {maidmatch, peekaboo, yaya}` local booleans, auto-toggled on a timer | PB-1/PB-2/PB-3 | Per platform: publish, update, **unpublish/delist**, and **read-listing-status** APIs + required field schema + media specs + sync-vs-queued semantics + who owns each platform relationship. |

## 5. Intake & events

| Prototype | Register ID | What you provide me |
|---|---|---|
| Maids appear in Reception via seed data only; no intake | EV-1 | **How a maid enters Reception** (webhook / poll / manual entry / scan). Highest priority. |
| No change detection; data is static | EV-2 | Change-notification mechanism (webhook/event/poll + frequency) for profiles that change mid-pipeline. |
| `erp://…` and `https://maids.cc/profile/…` links are invented | EV-3 | Canonical deep-link URL patterns + confirmed signed-in user lands on the record. |

## 6. Media

| Prototype | Register ID | What you provide me |
|---|---|---|
| Stock/final media are URL strings | MD-1 | Where media lives (DAM / S3 / MaidMatch storage), upload mechanism, size limits, retention. |
| Final media never leaves MaidMatch | MD-2 | Whether final photo/video must flow back to the maids.cc profile (write path). |

## 7. Cross-cutting (block everything)

| Register ID | What you provide me |
|---|---|
| XC-1 | Service-to-service auth method + how to request credentials + rotation (separate from user SSO). |
| XC-2 | Sandbox env + working credentials + realistic test fixtures. |
| XC-3 | Rate limits + expected throughput (maids/day through retraction). |
| XC-4 | Idempotency/retry semantics for all writes. |
| XC-5 | PII / retention / residency: what MaidMatch may store vs must fetch-live. |
| XC-7 | Escalation path + support hours. |

---

## Status summary (for quick triage)

*(This table is filled in as the maids.cc team replies — see
`external-dependencies-request.md` §7 for the response format they'll return.)*

| Register ID | Status | Owner | Blocked tier |
|---|---|---|---|
| RD-1 | Available | maids.cc | 1 |
| RD-2 | Available (2 endpoints) | maids.cc | 1 |
| WR-7 | Available (confirm base URL deployed) | maids.cc | 3 |
| EV-1 | *awaiting* | maids.cc | 1 |
| XC-1 | *awaiting* (service account) | maids.cc | 1 |
| XC-2 | *awaiting* | maids.cc | 1 |
| BR-3 | *awaiting* | maids.cc | 1 |
| BR-4 | *awaiting* | maids.cc | 1 |
| RD-9, RD-10, WR-1, WR-2, WR-3, WR-4, WR-5, WR-6, WR-8, WR-9, WR-10, RD-3, RD-4, RD-5, RD-6, RD-7, RD-8, PB-1, PB-2, PB-3, EV-2, EV-3, MD-2 | *to be provided* | maids.cc / platforms | 2–4 |
| MD-1 | internal to MaidMatch (no ERP call) | Us | — |

---

## API catalogue (as shared, 2026-09-04)

**Base host for ERP calls:** `erpbackendpro.maids.cc`. *"To be provided" = endpoint does not
exist yet and is mocked in the prototype; they land as soon as they're available.*

| # | API | Register ID | Endpoint | Availability |
|---|---|---|---|---|
| 1 | Search housemaid profiles (fuzzy: name / ERP ID / mobile / WhatsApp / passport) | RD-1 | — | Available (in codebase) |
| 2 | Retrieve profile details incl. maid type + sub-type | RD-2 | `GET /staffmgmt/housemaid/getHousemaidInfo/{maidId}` | Available |
| 3 | Retrieve phone + WhatsApp numbers (unmasked) | RD-2 | `GET /staffmgmt/housemaid/getHousemaidNumbers/{maidId}` | Available |
| 4 | CC live-in maids pending the retractor (hourly) | RD-9 | — | To be provided |
| 5 | Historical complaints (summary/type/status/team/link) | RD-3 | — | To be provided |
| 6 | Create complaint (type, description, assigned team) | WR-2 | — | To be provided |
| 7 | WPS salaries — last three months | RD-4 | — | To be provided |
| 8 | Employment history incl. cancellation reason per row | RD-5 | — | To be provided |
| 9 | Trigger switch-to-CC for a specific MV maid | WR-1 | — | To be provided |
| 10 | Commit the unpaid-leave-due date on confirmed retraction | **WR-8 (new)** | — | To be provided |
| 11 | Write back fields the ERP also holds (marital status, kids…) | WR-3 | — | To be provided — **decide whether we want it at all** |
| 12 | Post a document to the maid's ERP record (type + file) | **WR-9 (new)** | — | To be provided |
| 13 | Read back documents on file (type, upload date, file link) | **RD-10 (new)** | — | To be provided |
| 14 | Store the unpaid-leave expiry date against her record | **WR-10 (new)** | — | To be provided |
| 15 | Store raw + final photo/video | MD-1 | — | Internal to MaidMatch, no ERP call |
| 16 | Post profile to maidmatch.ae | PB-1 | — | To be provided |
| 17 | Post profile to Peekaboo | PB-2 | — | To be provided |
| 18 | Post profile to Yaya Middle East | PB-3 | — | To be provided |
| 19 | Log successful post back to ERP | WR-7 | `POST /api/maids/{maidCode}/site-posts/{site}/reuploads` | Available — confirm the base URL is deployed |

### Notes from the shared list

- **#2 and #3 are both required**: the numbers come back **masked** on the profile call, and
  WhatsApp must be used rather than phone (they differ; the contact flow depends on WhatsApp).
- The profile call (#2) returns roughly **120 fields** — extract only what this document names
  and discard the rest; nothing extra reaches a MaidMatch screen.
- All of the above run on a **service account with its own credential** (XC-1), never a
  person's login token.
- **Nothing is needed for the golden-profile pill or the queue order** — both are computed
  inside MaidMatch from data it already holds (BR-1 / BR-2 confirmed internal).

### Still open (not in the shared list — I flagged these)

| ID | What | Why it matters |
|---|---|---|
| EV-1 | How a maid **enters Reception** (webhook / poll / manual entry / scan) | The search API finds an existing maid; the intake trigger is still undefined |
| EV-2 | Change notifications for profiles that change mid-pipeline | Avoid acting on stale data |
| EV-3 | Deep-link URL patterns (profile + complaint) | We surface ERP links today with invented formats |
| RD-6 | Canonical enumerations (nationalities, types, complaint types/statuses, teams) | Dropdowns must match character-for-character |
| RD-7 | Employer / client lookup (Under Trial) | Replaces free-text employer names |
| RD-8 | Passport / visa copy + profile photo retrieval (or confirm MaidMatch holds none) | Media step + PII |
| MD-2 | Whether final photo/video flows back to the maids.cc profile | #15 says media is internal, but "does the maids.cc profile need the final photo" is still worth confirming |

---

## What *you* need to provide me (your checklist, condensed)

1. **Signed-off business rules** — BR-1 → BR-5 (golden profile, priority algorithm,
   system-of-record, canonical ID, offboarding definition).
2. **maids.cc API access** — sandbox creds + docs for RD-1…RD-10 and WR-1…WR-10 (or the
   filled-in response table from `external-dependencies-request.md` §7).
3. **Canonical enumerations** — nationalities, housemaid types, complaint types/statuses,
   teams (RD-6).
4. **Deep-link URL formats** (EV-3) for profile + complaints.
5. **Intake mechanism** (EV-1) — how maids arrive in Reception.
6. **Platform ownership + APIs** — who owns Peekaboo/Yaya/MaidMatch integrations and
   their publish/update/delist/status endpoints (PB-*).
7. **Media storage target** (MD-1) and whether finals flow back (MD-2).
8. **PII / retention policy** (XC-5) — what we may store.
9. **Service-to-service credentials** (XC-1) — separate from the SSO login we already have.
10. **Decide WR-3** — whether to write back retractor-captured fields (marital status,
    kids, etc.) that the ERP also holds.
