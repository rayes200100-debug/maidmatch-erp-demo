# MaidMatch ERP — Prototype Design Spec

**Date:** 2026-09-02
**Status:** Draft for review
**Scope:** Interactive static prototype (no backend, no auth, no DB)

---

## 1. Purpose

Build an interactive browser prototype of the MaidMatch operations ERP — a maid
recruitment pipeline that takes housemaids from "Reception" through a Retraction
flow, a Media & Production flow, and a Publishing flow. The prototype is a
static, self-contained web app (mirroring the Better Life Abroad demo at
`rayes200100-debug.github.io/gulf-maids-erp-demo/`) but re-themed to the
MaidMatch brand (https://maidmatch.ae/).

**Benchmark:** Better Life Abroad ERP demo (structure, split workspace, mobile
experience, profile/task design).

**Polish reference:** Apple UI/UX design guidelines (fluid interfaces, springs,
translucent materials, optical typography, reduced-motion support).

---

## 2. Architecture & Stack

- **React 19 + Vite + Tailwind CSS 4**, single-page app with in-memory mock data.
- Built with `base: "./"` so the `dist` output deploys to GitHub Pages unchanged.
- Fresh project at `/Users/rayes/Projects/MaidMatchInternal`.
- No backend, no auth, no database. All state lives in an in-memory store seeded
  from mock data; a "Reset demo data" action restores the seed.
- Google SSO is mocked (users are invited by email; no passwords).

### Directory layout

```
MaidMatchInternal/
  index.html
  package.json
  vite.config.ts
  src/
    main.tsx                 # React root
    globals.css              # design tokens + component styles
    data.ts                  # types + seed data
    store.ts                 # state + actions (state machine)
    lib/
      stages.ts              # stage/outcome/task-type constants + nav tree
      hours.ts               # active-working-hours + AVG-time helpers
    components/
      Shell.tsx              # sidebar + topbar + mobile dock
      primitives.tsx         # Panel, StatusPill, MetricCard, Table, Modal, Toast, EmptyState
      WorkspaceSplit.tsx     # split "profile | outcomes" task view
      ProfilePanel.tsx       # left-half housemaid profile
      OutcomePanel.tsx       # right-half outcomes + dynamic fields
    screens/
      Dashboard.tsx
      TeamWork.tsx
      Reception.tsx
      Retraction.tsx         # renders Pending Retraction + 3 archive subscreens
      MediaProduction.tsx    # Pending Shooting / Pending Editing / Production Done
      Publishing.tsx         # 5 subscreens
      UsersScreen.tsx
      RolesScreen.tsx
      SystemConfig.tsx
```

Split-by-concern is deliberate (the benchmark's `GulfMaidsApp.tsx` grew to
11k lines); files stay focused and independently testable.

---

## 3. Data Model

Three cleanly separated entities. This is the important structural decision:

1. **Housemaid** — the person, with a single `currentStage` (lifecycle position).
2. **Task** — an active unit of work (what appears in queues and "My Team's Work").
3. **Outcome** — a historical record (what appears on archive screens).

### 3.1 Housemaid

```ts
type HousemaidType = "MV" | "CC" | "CC to MV";

interface Complaint { summary: string; erpLink: string; }

interface Housemaid {
  id: string;
  name: string;
  nationality: string;
  age: number;
  housemaidType: HousemaidType;
  mobile: string;
  whatsapp: string;
  visaExpiry: string;        // ISO date
  passportExpiry: string;    // ISO date
  salary: number;            // AED/month
  employmentHistory: string[];
  complaints: Complaint[];
  isGoldenProfile: boolean;  // derived from golden-profile config at seed/entry
  preferences: string[];     // matching preferences set at "Retract to MaidMatch"
  maidsCcId: string;         // original maids.cc ERP id
  employerName?: string;     // set at "Under trial"
  maidsCcProfileLink?: string;
  currentStage: Stage;       // single source of truth for lifecycle position
}
```

### 3.2 Stage (lifecycle)

```ts
type Stage =
  | "Reception"                    // before entering any flow
  | "PendingRetraction"            // active
  | "PendingShooting"              // active
  | "PendingEditing"               // active
  | "AvailablePendingPublishing"   // active
  | "AvailablePublished"           // active
  | "UnderTrial"                   // active
  | "RetractedToCC"                // terminal (archive)
  | "MovedToOffboard"              // terminal (archive)
  | "Hired"                        // terminal (archive)
  | "Cancelled";                   // terminal (archive)
```

Note: **"Retracted to MaidMatch" and "Production Done" are NOT stages.** They are
outcome types. A maid who is "Retracted to MaidMatch" continues her lifecycle in
`PendingShooting`; the outcome is a historical record only.

### 3.3 Task (workflow record)

```ts
type TaskType =
  | "retraction"   // → Pending Retraction queue
  | "shooting"     // → Pending Shooting queue
  | "editing"      // → Pending Editing queue
  | "publishing"   // → Available Pending Publishing queue
  | "available"    // → Available & Published queue
  | "trial";       // → Under Trial queue

interface Task {
  id: string;
  housemaidId: string;
  type: TaskType;
  status: "open" | "closed";
  assignedRole: RoleId | "None";
  createdAt: number;   // ms epoch
  closedAt?: number;
  metadata?: {
    stockPhotoUrl?: string;
    stockVideoUrl?: string;
    finalPhoto?: string;
    finalVideo?: string;
    comment?: string;                       // "send back" reasons
    publishState?: { maidmatch: boolean; peekaboo: boolean; yaya: boolean };
    preferences?: string[];
    employerName?: string;                  // "Under trial"
    maidsCcProfileLink?: string;            // "Under trial"
  };
}
```

### 3.4 Outcome (historical / archive)

```ts
type OutcomeType =
  | "RetractedToCC"
  | "MovedToOffboard"
  | "RetractedToMaidMatch"
  | "ProductionDone"
  | "Hired"
  | "Cancelled";

interface Outcome {
  id: string;
  housemaidId: string;
  type: OutcomeType;
  timestamp: number;
  actorRole: RoleId;
  note?: string;          // e.g. cancellation reason
  metadata?: {
    preferences?: string[];
    finalPhoto?: string;
    finalVideo?: string;
    employerName?: string;
    maidsCcProfileLink?: string;
  };
}
```

### 3.5 Mapping: queues and archive screens

| Sidebar screen | Driven by |
|---|---|
| Pending Retraction | open `Task(type=retraction)`, priority-ordered |
| Pending Shooting | open `Task(type=shooting)` |
| Pending Editing | open `Task(type=editing)` |
| Available Pending Publishing | open `Task(type=publishing)` |
| Available & Published | open `Task(type=available)` |
| Under Trial | open `Task(type=trial)` |
| Moved to Offboard | `Outcome(type=MovedToOffboard)` |
| Retracted to CC | `Outcome(type=RetractedToCC)` |
| Retracted to MaidMatch | `Outcome(type=RetractedToMaidMatch)` |
| Production Done | `Outcome(type=ProductionDone)` |
| Hired | `Outcome(type=Hired)` |
| Cancelled | `Outcome(type=Cancelled)` |

---

## 4. State Machine

Every transition closes the current task, records an outcome (where applicable),
and creates the next task. `Housemaid.currentStage` updates once, to the new
active stage or a terminal state.

```
Reception
 └─ "Send to Retraction Team"
     → stage=PendingRetraction; create Task(retraction, assigned=defaultRole)

PendingRetraction
 ├─ "Retract to CC"
 │    → Outcome(RetractedToCC); close task; stage=RetractedToCC (terminal)
 ├─ "Move to Offboarding"
 │    → Outcome(MovedToOffboard); close task; stage=MovedToOffboard (terminal)
 └─ "Retract to MaidMatch" (preferences required)
      → Outcome(RetractedToMaidMatch, preferences); close retraction task
      → stage=PendingShooting; create Task(shooting, assigned=defaultRole)

PendingShooting
 └─ "Done shooting" (stockPhotoUrl, stockVideoUrl optional)
      → close shooting task
      → stage=PendingEditing; create Task(editing, metadata=stockUrls, assigned=defaultRole)

PendingEditing
 ├─ "Editing done" (finalPhoto required; finalVideo = file OR link)
 │    → Outcome(ProductionDone, finalPhoto/finalVideo); close editing task
 │    → stage=AvailablePendingPublishing; create Task(publishing, assigned=defaultRole)
 └─ "Send back to shooting" (comment optional)
      → close editing task; stage=PendingShooting
      → create Task(shooting, metadata=comment, assigned=defaultRole)

AvailablePendingPublishing
 └─ auto-advance when publishState.{maidmatch,peekaboo,yaya} are all true
      → close publishing task; stage=AvailablePublished
      → create Task(available, assigned=defaultRole)
    (system auto-publishes on a simulated timer, independently STAGGERED —
     MaidMatch → green, then Peekaboo → green, then Yaya → green — so the
     per-platform status and the auto-transition are both visible. Users may
     also manually flag each platform green inside the task.)

AvailablePublished
 └─ "Under trial" (employerName optional, maidsCcProfileLink optional)
      → close available task; stage=UnderTrial
      → create Task(trial, metadata=employer/link, assigned=defaultRole)

UnderTrial
 ├─ "Hired"
 │    → Outcome(Hired); close trial task; stage=Hired (terminal)
 ├─ "Send back to Available & Published"
 │    → close trial task; stage=AvailablePublished; create Task(available)
 ├─ "Send back to Available & Pending Publishing"
 │    → close trial task; stage=AvailablePendingPublishing; create Task(publishing)
 └─ "Proceed to cancellation" (reason required)
      → Outcome(Cancelled, note=reason); close trial task; stage=Cancelled (terminal)
```

**Locking rule:** `PendingRetraction` is the only sequentially-locked queue — only
the first-priority task is actionable; lower rows are visible but locked. All
other queues (Shooting, Editing, Publishing, Available, Trial) are free-select.

---

## 5. Roles & Visibility

Roles: **System Admin, Super Admin, Retractor, Media Team, Sales.**

The topbar has a **"View as [role]"** switcher that drives sidebar navigation,
"My Team's Work", task lists, and default task ownership.

### 5.1 Visibility matrix

| Screen / flow | SysAdmin | SuperAdmin | Retractor | Media | Sales |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| My Team's Work | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reception | ✓ | ✓ | ✓ | — | — |
| Retraction (all 4) | ✓ | ✓ | ✓ | — | — |
| Media & Production (all 3) | ✓ | ✓ | — | ✓ | — |
| Publishing (all 5) | ✓ | ✓ | ✓ | — | ✓ |
| Users | ✓ | ✓ | — | — | — |
| Roles | ✓ | ✓ | — | — | — |
| System Configuration | ✓ | ✓ | — | — | — |

System Admin and Super Admin are functionally identical in the prototype (both
see everything).

### 5.2 Default assigned role per task (System Configuration)

| Task type | Default role |
|---|---|
| retraction | Retractor |
| shooting | Media Team |
| editing | Media Team |
| publishing | Sales |
| available | Sales |
| trial | Sales |

"None" is allowed for archive contexts. These defaults are editable in System
Configuration and determine which role receives each newly created task (and
therefore whose "My Team's Work" it appears in).

### 5.3 Ownership semantics

- A Task carries `assignedRole`. "My Team's Work" = open tasks where
  `assignedRole === currentRole` (admins see all).
- Shared flows (Publishing: Retractor + Sales) — both roles see the screens; a
  task's owner is set from the config default when it is created.
- In shared queues the current role can act on any task it can see.

---

## 6. Navigation Tree

```
WORKSPACE
  Dashboard
  My Team's Work
  Reception
RETRACTION
  Pending Retraction
  Moved to Offboard
  Retracted to CC
  Retracted to MaidMatch
MEDIA & PRODUCTION
  Pending Shooting
  Pending Editing
  Production Done
PUBLISHING
  Available Pending Publishing
  Available & Published
  Under Trial
  Hired
  Cancelled
CONFIGURATION
  Users
  Roles
  System Configuration
```

Stages are collapsible groups. Each node shows a live count badge. Nodes hidden
based on the selected role's visibility.

---

## 7. Screens

### 7.1 Dashboard
- KPI cards: maids entered Retraction flow; breakdown of outcomes (→ CC, → MaidMatch, → Offboard).
- KPIs: Available & Pending Publishing count; Available & Published count;
  Pending Shooting; Pending Editing.
- AVG time-in-step per stage (Pending Retraction, Pending Shooting, Pending
  Editing, Pending Publishing, Available & Published) — computed over **active
  working hours** only (see §9 System Configuration).
- Hired count + success ratio (Hired / total that reached Publishing).
- A compact pipeline readout (counts per stage).

### 7.2 My Team's Work
- Open tasks assigned to the current role (admins see all).
- Each row: maid name, task type, age/due indicator; CTA opens the task.
- **"On Break"** CTA (per user/role) — suppresses delay/SLA highlighting for that
  role while on break.

### 7.3 Reception
- Search bar: name / mobile / whatsapp / maids.cc ERP id.
- Results table: name, mobile, whatsapp, nationality, maids.cc id, age, visa expiry.
- Each row: **"Send to Retraction Team"** CTA (creates the retraction task).

### 7.4 Retraction
- **Pending Retraction**: priority-ordered table (config-driven algorithm —
  FIFO / LIFO / Filipina-first / Golden-first). Only the first row is actionable
  ("Open Task"); remaining rows locked with a visual lock + explanation.
- Task opens the split workspace (§8). Outcomes: Retract to CC / Move to
  Offboarding / Retract to MaidMatch (preferences modal).
- **Moved to Offboard / Retracted to CC / Retracted to MaidMatch**: read-only
  archive tables over outcome records.

### 7.5 Media & Production
- **Pending Shooting**: free-select grid; each row "Open Task". Left = profile,
  right = outcome "Done shooting" with optional stock photo URL + stock video URL.
- **Pending Editing**: same layout; left also shows stock image/video URLs.
  Outcomes: "Editing done" (final photo required; final video = file OR link) and
  "Send back to shooting" (optional comment).
- **Production Done**: archive table over outcome records.

### 7.6 Publishing
- **Available Pending Publishing**: grid with columns Name / Nationality / Age /
  MaidMatch Site / Peekaboo / Yaya. Each platform cell shows a green tick when
  published. Auto-publishing is simulated with an independently staggered timer
  (MaidMatch → Peekaboo → Yaya); when the third platform goes green the maid
  auto-advances to Available & Published. Users may open the task and manually
  flag each platform.
- **Available & Published**: grid; "Open Task" with single outcome "Under trial"
  (optional employer name + maids.cc profile link).
- **Under Trial**: outcomes Hired / Send back to Available & Published / Send back
  to Available & Pending Publishing / Proceed to cancellation (reason required).
- **Hired / Cancelled**: archive tables over outcome records.

### 7.7 Users
- Mirror Better Life Abroad: invite by email (Google SSO mock, no password),
  visible name, assign multiple roles. Table of users with roles.

### 7.8 Roles
- List the 5 roles with member counts. (Permission details stay lightweight in the
  prototype; visibility is driven by §5.1.)

### 7.9 System Configuration
- Break duration; max breaks per day.
- Retraction Profile Priority Algorithm: FIFO / LIFO / Filipina-first / Golden-first.
- Golden Profile Definition: nationality (multi-select), age (range), visa-expiry
  (range in months), housemaid type (multi-select).
- Working hours per day: 8 AM – 8 PM; days off (multi-select). Used to compute
  active working hours for AVG time-in-step.
- Default Assigned Role per Task (table from §5.2).

---

## 8. Task Workspace (split view)

The split workspace (profile left / outcomes right) is the core task experience,
carried over from Better Life Abroad.

- **Left — housemaid profile:** name, nationality, mobile, housemaid type
  (MV/CC/CC to MV), whatsapp, visa expiry, passport expiry, age, salary,
  employment history, previous complaints (summary + CTA to open the original
  maids.cc ERP complaints screen). A prominent **Golden Profile** flag when
  `isGoldenProfile`.
- **Right — outcomes:** the outcome buttons for the current task type, with their
  dynamic fields (preferences checklist, stock/final media inputs, cancellation
  reason, comments). Inline validation; destructive actions get a short confirm.

---

## 9. Design Language

### 9.1 MaidMatch brand tokens (from maidmatch.ae)

```css
:root {
  --brand: #fbd9e8;                 /* pink */
  --brand-medium: #fae6d4;          /* peach */
  --brand-light: #fff5ee;           /* cream */
  --brand-dark: #8c5044;            /* terracotta (primary text/actions) */
  --accent-terracotta: #d48878;
  --accent-terracotta-dark: #8c5044;
  --accent-terracotta-light: #f4b8cc;
  --paper: #fff6f0;                 /* warm cream background */
  --radius: 0.625rem;
  --font-sans: "Plus Jakarta Sans", -apple-system, system-ui, sans-serif;
}
```

Semantic tokens preserved from the benchmark: success / warning / danger
(tinted to sit on the warm palette), plus neutral ink/muted/line/surface.

### 9.2 Apple polish

- **Translucent chrome:** sidebar/topbar use `backdrop-filter: blur()` with a
  semi-transparent background; content scrolls underneath.
- **Springs:** default critically-damped (damping 1.0, response ~0.3–0.4); slight
  bounce (damping ~0.8) only for momentum gestures (sheet drag-release).
- **Feedback on pointer-down** (instant press state), not only on release.
- **Optical typography:** negative tracking on large headings, size-specific
  leading, weight for hierarchy, `font-optical-sizing: auto`.
- **Wayfinding:** every screen shows a clear title + section; nav state is obvious.
- **Materials:** bottom-sheet modals on mobile, sheet slides from/to bottom
  (symmetric path); reduced-motion / reduced-transparency / contrast support.

### 9.3 Mobile experience

- Hamburger sidebar + scrim (same as benchmark).
- Bottom ERP dock (3 primary actions) with active state + badges.
- Tables collapse to card rows; the workspace becomes a profile/task tab split.
- Modals become bottom sheets; larger touch targets (min 44px).
- Safe-area insets respected.

---

## 10. Assumptions & Open Items

1. **Reception ownership** is assigned to Retractor (+ System Admin, Super Admin).
   Retractor is the default operational owner. No separate Reception role for now.
2. System Admin vs Super Admin are identical in capability for now.
3. Google SSO is mocked (email invite only, no password).
4. Auto-publishing (Available Pending Publishing) is simulated with an
   independently staggered timer (MaidMatch → Peekaboo → Yaya); manual
   per-platform flagging is also available. Auto-transition fires when the third
   platform turns green.
5. AVG time-in-step counts active working hours (8–20, excluding days off); the
   "On Break" state suppresses delay for the affected role.
6. Priority algorithm (FIFO/LIFO/Filipina/Golden) is applied at queue render time
   from config; details of a mixed/composite algorithm can be refined later.

## 11. Non-Goals (prototype scope)

- No real backend, auth, database, or email.
- No real maids.cc integration (complaints link is a placeholder URL).
- No real Google SSO.
- No persistence beyond the in-memory seed (reset restores demo data).
