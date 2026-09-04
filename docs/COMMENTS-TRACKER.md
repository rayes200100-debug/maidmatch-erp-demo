# MaidMatch Prototype — Comments Tracker

**Purpose:** single source of truth for every design/change comment the team shares
while finalizing the prototype. One comment = one row = one stable ID, so nothing is
lost, duplicated, or misapplied. Each batch is confirmed back before the next begins.

**How it works**

1. A batch of comments arrives → it is logged here under a new `## Batch NNN` section,
   each comment getting a stable `C-NNN` ID.
2. Each comment is applied to the prototype (TDD where it touches logic).
3. The apply result is replayed back to you and the status flips `applied` → `verified`
   once you confirm.
4. Anything that reveals a **new external dependency** or **spec decision** is linked to
   `DEPENDENCY-REGISTER.md` / `SPEC.md` so it doesn't stay buried in a UI comment.

**Status legend**

| Status | Meaning |
|---|---|
| `pending` | Logged, not yet started |
| `in-progress` | Being implemented now |
| `applied` | Implemented + typecheck/tests green, awaiting your confirmation |
| `verified` | You confirmed the applied change |
| `deferred` | Agreed to postpone (with reason + owner) |
| `blocked` | Waiting on something external (a decision, an API, an asset) |

**Linkage keys**

- `Screen` — which prototype screen/component the comment touches.
- `File` — primary file(s) changed.
- `Dependency` — register ID (BR/RD/WR/PB/EV/MD/XC) if the comment depends on an
  external system or business rule.
- `Spec` — SPEC.md section updated by this comment, if any.

---

<!-- BATCHES ARE APPENDED BELOW THIS LINE. Do not edit existing rows; add new ones. -->

| ID | Comment | Screen | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-001 | New stage "Documents Collection" after Retraction, before Media & Production | Nav / pipeline | `lib/stages.ts`, `store.ts`, `screens/Retraction.tsx` | — | §4 | applied |
| C-002 | Directory: "Open Profile" CTA per housemaid (profile design later) | Directory | `screens/Directory.tsx` | — | §6 | applied |
| C-003 | Four maid kinds (MV sub-types, CC live-in, CC live-out, cleaners) + "type and sub-type" field | Data model | `data.ts` | RD-6 | §3.1 | applied |
| C-004 | Reception: single fuzzy search bar (no filters), across name/ERP ID/mobile/WhatsApp/passport | Reception | `lib/search.ts`, `screens/Reception.tsx` | RD-1 | §6 | applied |
| C-005 | Reception results: photo, nationality, age, type+sub-type, mobile, WhatsApp, ERP ID, visa, current status | Reception | `screens/Reception.tsx` | RD-2/RD-6 | §6 | applied |
| C-006 | "Send to Retraction" CTA with queue position; disabled when already queued/later stage | Reception | `store.ts`, `screens/Reception.tsx` | EV-1 | §4 | applied |
| C-007 | "Housemaid Current Step/Status" field; active screen prioritized over archive | Data model | `store.ts` | — | §3.1 | applied |
| C-008 | Reception: CC live-in second panel (hourly API, last-refreshed indicator) | Reception | `lib/ccLiveIn.ts`, `store.ts`, `screens/Reception.tsx` | RD-9 (new) | §6 | applied |
| C-009 | CC live-in: progress header "X total, Y collected, Z remaining" | Reception | `screens/Reception.tsx` | RD-9 | §6 | applied |
| C-010 | CC live-in: row fields (photo, nationality, room, ERP ID, visa, due reason) + collected state persists | Reception | `screens/Reception.tsx` | RD-9 | §6 | applied |
| C-011 | CC live-in: carry-over next day marked with age in days | Reception | `lib/ccLiveIn.ts`, `screens/Reception.tsx` | RD-9 | §6 | applied |
| C-012 | CC live-in: failure state "Could not refresh, showing list as of HH:00" + manual retry; never empty-looking | Reception | `store.ts`, `screens/Reception.tsx` | RD-9 | §6 | applied |
| C-013 | CC live-in: filters Today/Yesterday/Last 7 days/Custom; store added-at date/time | Reception | `lib/ccLiveIn.ts`, `screens/Reception.tsx` | RD-9 | §6 | applied |
| C-014 | CC live-in: dedup by maids.cc ERP ID across API calls | Reception | `store.ts` | RD-9 | §6 | applied |

## Batch 002 — Retraction queue, retraction task screen, terminate/CC/MaidMatch outcomes

| ID | Comment | Screen | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-015 | Priority Queue + type tabs (MV / CC live-in / CC live-out / Cleaner) with live counts | Pending Retraction | `screens/Retraction.tsx` | — | §4 | applied |
| C-016 | Ordering: base = reception order; priority rules in System Config; live-in priority (CC live-in jumps ahead) | Pending Retraction / Config | `lib/priority.ts`, `store.ts`, `screens/SystemConfig.tsx` | — | §4 | applied |
| C-017 | Rows not locked; "Next up" cue on top row | Pending Retraction | `screens/Retraction.tsx` | — | §4 | applied |
| C-018 | Adherence tracking on OPEN TASK (position opened) + dashboard adherence rate | Pending Retraction / Dashboard | `store.ts`, `screens/Dashboard.tsx` | — | §4 | applied |
| C-019 | Queue columns: position, name+photo, type+subtype, nationality, age, visa, golden, time-in-queue (working hrs), who sent, Open Task | Pending Retraction | `screens/Retraction.tsx` | — | §6 | applied |
| C-020 | Archive subscreens searchable/filterable/date-ranged + who decided | Retraction archives | `screens/Retraction.tsx` | — | §6 | applied |
| C-021 | Left half full profile (photo, ERP id, visa status pill, golden, type pill, unpaid leave preview, salary, WPS, employment, termination summary, filtered complaints) | Task workspace | `components/ProfilePanel.tsx` | RD-2/3/4/5 | §6 | applied |
| C-022 | Visa status pill: Active / Expiring (≤1mo) / Expired | Task workspace | `components/ProfilePanel.tsx` | RD-2 | §6 | applied |
| C-023 | Unpaid leave due preview (day-of-month rule, recalculated each load, nothing stored until confirm) | Task workspace | `lib/unpaidLeave.ts` | BR (new) | §3.1 | applied |
| C-024 | WPS: last 3 salaries, newest first, Paid/Pending/Not sent | Task workspace | `components/ProfilePanel.tsx` | RD-4 | §6 | applied |
| C-025 | Structured employment history + termination summary (own line) | Task workspace | `components/ProfilePanel.tsx` | RD-5 | §6 | applied |
| C-026 | Complaints filtered to open-to-retractor + "View all" + "No complaints open to you" | Task workspace | `components/ProfilePanel.tsx` | RD-3 | §6 | applied |
| C-027 | Outcome 1 Terminate: 9 reasons + hand note + mocked maids.cc termination complaint | Task workspace | `components/OutcomePanel.tsx`, `store.ts` | WR-4/WR-2 | §4 | applied |
| C-028 | Outcome 2 Retract to CC: optional granted amount + mocked payroll complaint + mocked switch-to-CC | Task workspace | `components/OutcomePanel.tsx`, `store.ts` | WR-1/WR-2 | §4 | applied |
| C-029 | Outcome 3 Retract to MaidMatch: 4-block form, Joined date, stored unpaid-leave date, → Collect Documents | Task workspace | `components/OutcomePanel.tsx`, `store.ts` | WR-3/XC-6 | §4 | applied |
| C-030 | Remove old matching-preference questions | Task workspace | `data.ts`, `components/OutcomePanel.tsx` | — | §3.1 | applied |
| C-031 | Data model: MV sub-types, WPS/employment/complaint structure, MaidMatchProfile storage | Data model | `data.ts` | RD-2/3/4/5/6 | §3.1 | applied |
| C-032 | System Config: live-in priority toggle + termination reasons management | System Configuration | `screens/SystemConfig.tsx`, `store.ts` | — | §5 | applied |

## Batch 003 — Collect Documents (documents collection, ERP-check + upload)

| ID | Comment | Screen | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-033 | Two documents collected in person, posted to maids.cc ERP: unpaid-leave paper (type `Unpaid_Leave`, has expiry) + MMR consent (`MMR_cancelation_consent` — trailing space, one L) | Collect Documents | `data.ts`, `store.ts` | WR (new doc API) | §4 | applied |
| C-034 | 30-min auto-check of ERP doc status; auto-flag "Complete" on upload; both → collected | Collect Documents | `lib/documentsApi.ts`, `store.ts` | RD/WR (doc status API) | §4 | applied |
| C-035 | Grid: name+photo, nationality, type, retracted on, time waiting (active hrs), unpaid-leave collected, MMR consent collected; not locked | Collect Documents | `screens/Retraction.tsx` | — | §6 | applied |
| C-036 | Grid: "last checked date/time" + manual Refresh | Collect Documents | `screens/Retraction.tsx` | — | §6 | applied |
| C-037 | Task: upload each doc + unpaid-leave expiry date (mandatory, user-entered; no upload-date typed — ERP stamps) | Collect Documents | `components/DocumentsPanel.tsx` | — | §6 | applied |
| C-038 | View uploaded documents | Collect Documents | `components/DocumentsPanel.tsx` | RD-8 | §6 | applied |
| C-039 | Auto-complete when both uploaded + expiry set (no "done" button); hands to media | Collect Documents | `store.ts` | — | §4 | applied |
| C-040 | Upload/check failure → doc not marked collected + failure shown | Collect Documents | `store.ts`, `components/DocumentsPanel.tsx` | — | §4 | applied |
| C-041 | Re-collect on cycle; only one currently-active MaidMatch flow (multi-flow note) | Data model | `store.ts`, `docs/SPEC.md` | — | §3.1 | applied |

## Batch 005 — Publishing (Available Pending Publishing)

| ID | Comment | Screen | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-042 | Payload = final photo+video + retraction data; system posts to maidmatch.ae / Peekaboo / Yaya (no hand re-entry) | Publishing | `store.ts`, `lib/publishApi.ts` | PB-1/2/3 | §4 | applied |
| C-043 | Per-platform state pending/posted/failed; all-green = fully published; failure doesn't block others or roll back, stays failed + retried | Publishing | `store.ts` | PB-* | §4 | applied |
| C-044 | Screen shows "last time system tried and failed" + hyperlink to run the job now | Publishing | `screens/Publishing.tsx` | — | §6 | applied |
| C-045 | Manual "mark posted" escape hatch (system does the work; manual flag is fallback) | Publishing | `components/OutcomePanel.tsx` | — | §4 | applied |
| C-046 | Held profiles (missing required field/asset) with a fixed reason list, worked as a queue | Publishing | `lib/publishApi.ts`, `store.ts` | — | §4 | applied |
| C-047 | Successful post logged back to maids.cc ERP (weekly audit reads it) | Publishing | `store.ts` | WR-7 (new) | §4 | applied |
| C-048 | Failure reason logged + shown ("Failure reason"); missing must-have info clearly communicated | Publishing | `components/OutcomePanel.tsx` | — | §4 | applied |
| C-049 | Row highlight: red = issue (failed/held), yellow = waiting for job, green tick per posted platform | Publishing | `screens/Publishing.tsx`, `globals.css` | — | §6 | applied |

## Batch 006 — System Configuration (phase parameters)

| ID | Comment | Screen | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-050 | Golden definition now "Filipina, under 45"; computed live from config so edits apply without a release | System Config | `lib/golden.ts`, `store.ts`, `data.ts` | — | §5 | applied |
| C-051 | Termination reasons: add, rename, retire (not delete) without a release | System Config | `screens/SystemConfig.tsx`, `data.ts` | — | §5 | applied |
| C-052 | ERP integration settings: complaint type + handling team per outcome (offboarding, payroll) | System Config | `screens/SystemConfig.tsx`, `data.ts`, `store.ts` | WR-2 | §5 | applied |

## Batch 007 — Field mapping, dashboard measurements, roles & permissions

| ID | Comment | Area | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-053 | Field mapping: which ERP field feeds each on-screen label (incl. confirmed `rVisaExpiryDate`, `phoneNumber`, `whatsAppPhoneNumber`, `firstName`/`lastName`, `nationality.name`, `id`/`maid_id`) | Docs | `docs/FIELD-MAPPING.md` | RD-1/2 | §7 | applied |
| C-054 | Dashboard measurements + data collection: added `Task.openedAt` (first open) + `avgHandlingTime` selector so "handling time inside the task screen" is measurable | Data model | `data.ts`, `store.ts`, screens | — | §11 | applied |
| C-055 | Roles: added **Receptionist** (owns Reception + Directory); Retractor loses Reception; Sales gains Media & Production | Roles | `lib/roles.ts`, `data.ts`, `store.ts`, `screens/UsersScreen.tsx` | — | §5 | applied |

## Batch 008 — Deep links, housemaid profile page (final)

| ID | Comment | Area | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-056 | Every screen / task / profile has a copy-pasteable URL in the address bar (hash routing) | Routing | `MaidMatchApp.tsx`, `components/TaskWorkspace.tsx`, screens | — | §6 | applied |
| C-057 | Housemaid profile page with 5 tabs — Overview / Details / Documents / Media / History | Profile | `screens/MaidProfilePage.tsx` | — | §6 | applied |
| C-058 | Directory "Open Profile" → profile page; task left panel "Open Full Profile" (new tab) | Profile | `screens/Directory.tsx`, `components/ProfilePanel.tsx` | — | §6 | applied |
| C-059 | Details tab: edit non-system fields only (ERP fields read-only) + `EDIT_PROFILE` audit | Profile | `screens/MaidProfilePage.tsx`, `store.ts` | — | §3.1 | applied |
| C-060 | Fixed publish auto-complete bug (only one task completed per job) | Publishing | `store.ts` | — | §4 | applied |

## Batch 009 — Review fixes (tables, search, documents stage, media UI, profile)

| ID | Comment | Area | File(s) | Dependency | Spec | Status |
|---|---|---|---|---|---|---|
| C-061 | Table column titles now align with values everywhere (shared subgrid tracks; per-table col fixes incl. Directory 6→7, TeamWork wrapper) + controlled horizontal scroll | All tables | `primitives.tsx`, `globals.css`, screens | — | §6 | applied |
| C-062 | Reception search: explicit Search CTA (no live search), 8 results/page + pagination | Reception | `screens/Reception.tsx` | RD-1 | §6 | applied |
| C-063 | Document Collection is its own stage: nav group "Document Collection" with subscreen "Pending Documents Collection"; owner stays Retractor | Nav / stages | `stages.ts`, `roles.ts`, `MaidMatchApp.tsx`, `Retraction.tsx` | — | §4/§6 | applied |
| C-064 | Pending Documents Collection: new "Expiry Date" column ("Pending" when both docs collected but no expiry) | Document Collection | `Retraction.tsx`, `globals.css` | — | §6 | applied |
| C-065 | Videographers/Editors media fields: one full-width row per field (option + input), no more crushed side-by-side layout | Task workspace | `OutcomePanel.tsx`, `globals.css` | — | §6 | applied |
| C-066 | Reshoot note labeled "Note from Editors:" shown above outcomes (right side) | Task workspace | `OutcomePanel.tsx` | — | §6 | applied |
| C-067 | Publishing platform cells: proper tick / x icons (lucide) instead of empty circles | Publishing | `Publishing.tsx`, `globals.css` | — | §6 | applied |
| C-068 | Profile page redesigned (design-system panels + field grids); removed stray "Open in new tab" CTA | Profile | `MaidProfilePage.tsx`, `globals.css` | — | §6 | applied |
