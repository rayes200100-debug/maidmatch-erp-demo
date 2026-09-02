# MaidMatch ERP — UI/UX Review

**Date:** 2 September 2026
**Reviewed build:** https://rayes200100-debug.github.io/maidmatch-erp-demo/ (commit `f323f2c`)
**Benchmark:** Better Life Abroad ERP — https://rayes200100-debug.github.io/gulf-maids-erp-demo/ (`~/Projects/GulfMaids/gulf-maids-operations`)
**Lens:** Apple Human Interface Guidelines (Clarity · Deference · Depth) + direct parity comparison with Better Life Abroad

---

## How to read this

Every item has an ID, a location, the problem, and the fix. Work top-down: **P0** items are visibly broken, **P1** items are the ones the client called out, **P2** items are the polish that closes the gap with Better Life Abroad. 64 findings in total.

MaidMatch's `src/globals.css` is a fork of Better Life Abroad's `app/globals.css` — same class names, same 270px sidebar, same primitives. But it kept **63 of the 169 classes**. Most items below are about restoring the parts that were dropped, not inventing new ones. Where Better Life Abroad already solved something, the file and line are cited so it can be ported rather than re-designed.

| Priority | Count | Theme |
|---|---|---|
| P0 | 7 | Broken behaviour or unreadable output |
| P1 | 29 | Task workspace, Roles screen, design system |
| P2 | 28 | Screen-by-screen density, mobile, accessibility |

---

## P0 — Broken, fix first

### P0-1 · Pending Publishing was impossible to see — **already fixed**
**Where:** `src/MaidMatchApp.tsx:63-83`, `src/store.ts` `makeSeedState`

The demo's staggered auto-publish timer flagged MaidMatch at 3s, Peekaboo at 6s and Yaya at 9s after a publishing task's `createdAt`. Seed tasks are created with `createdAt = now - i*1000`, so **every seeded row auto-published within nine seconds of page load** and the queue was permanently empty. Anyone opening the screen saw "Nothing pending publishing".

**Fixed in this pass:** `AppState` now carries `seededAt`; the timer skips any task created at or before it, and two seed maids ship with a realistic partial state (Christine Bautista 2 of 3, Deepa Rai 1 of 3). The staggered auto-publish still runs for maids that move into publishing during a session, so the smoke test is unaffected.

**Still to do —** the screen itself needs the treatment in [P1-24](#p1-24--publishing-grid-needs-a-progress-column-and-an-undo).

---

### P0-2 · Queue table columns don't line up
**Where:** `src/globals.css` `.table-row`; visible on Pending Retraction

`.table-row` ends in an `auto` column: `grid-template-columns: 1.6fr .8fr .7fr .7fr auto`. Each row is its own independent grid, so the `auto` column is measured **per row**. The unlocked row holds one button; the locked rows hold a lock glyph + button + "LOCKED" pill. The `auto` column therefore resolves to a different width on every row, which shifts all four `fr` columns — so "Filipino" on row 1 sits ~50px right of "Sri Lankan" on row 2, and none of the data aligns to the header.

**Fix:** give the action column a fixed width. Better Life Abroad uses `26px` (a chevron) — `app/globals.css:284`. Either adopt the chevron pattern, or set an explicit `minmax(180px, 200px)` and right-align the contents. Never leave `auto` as the trailing column of a row-grid table.

---

### P0-3 · Mobile: locked rows show one letter instead of a name
**Where:** `src/globals.css` mobile block `@media (max-width: 640px)` → `.table-row { grid-template-columns: 1fr auto !important; }`

On a 375px viewport, Pending Retraction renders the locked maids as **"N", "L.", "J."** — the action cell holds three elements (lock + button + pill), consumes the row, and crushes the name cell to a single glyph. The first (unlocked) row shows the full name because it only holds one button. Names are unreadable on phone.

**Fix:** on mobile, collapse the action cell to a single control (or a chevron), and give the name cell `min-width: 0` plus a guaranteed minimum. Add a secondary line under the name (`nationality · type`) so a mobile row still carries context — the desktop columns are all `display: none` there and nothing replaces them.

---

### P0-4 · Two dead controls in the shell
**Where:** `src/components/Shell.tsx:156` (`.sidebar-user`), `src/components/Shell.tsx:200` (notifications bell)

Both are `<button>` elements with no `onClick`. They look interactive, they have hover states, and they do nothing. HIG: a control that cannot act should not look like a control.

**Fix:** wire them or remove them. Better Life Abroad's bell opens a real notification centre (`app/NotificationCenter.tsx`) with an unread badge and a `.pulse-dot`; its sidebar user row opens an overflow menu with sign-out. At minimum, give the bell a panel with the open-task counts already available from `openTasks(state)`.

---

### P0-5 · Dashboard "Time in step" reads 0.0h for every stage
**Where:** `src/screens/Dashboard.tsx:66-92`, `src/store.ts` `avgTimeByStage`

`avgTimeByStage` only measures **closed** tasks, and `makeSeedState` creates no closed tasks at all. So the panel renders six rows of `0.0h` on first load. It reads as a broken widget, and it's the first analytical panel on the page.

**Fix:** seed a short history of closed tasks with realistic `createdAt`/`closedAt` spreads so the averages are non-zero. Until there's data, render an explicit empty state ("No completed tasks yet — averages appear once the first task closes") rather than a column of zeros.

---

### P0-6 · Task age is frozen at "<1h"
**Where:** `src/screens/TeamWork.tsx:47-52` uses `state.now`; `src/store.ts` sets `now` once in `makeSeedState` and no reducer case ever updates it

Every task in My Team's Work shows `<1h` forever, because "now" is the seed timestamp, not the current time.

**Fix:** use `Date.now()` at render (or a ticking `now` in state). Once it moves, add the SLA treatment from [P2-9](#p2-9--my-teams-work-has-no-filters-search-or-sla).

---

### P0-7 · Publishing to a platform is irreversible
**Where:** `src/store.ts` `FLAG_PLATFORM`, `src/screens/Publishing.tsx:170-200`

`FLAG_PLATFORM` only ever sets a platform to `true`. A single mis-click on the grid publishes a maid's profile to a live external channel with **no undo and no confirmation**, and once the third one is clicked the maid is moved to Available & Published and the row disappears entirely.

**Fix:** make the cell a toggle while the task is open, and add an undo affordance on the success toast ("Published to Peekaboo · Undo"). If publishing genuinely is one-way in the real system, the cell must ask for confirmation before firing — HIG requires confirmation for actions that cannot be reversed.

---

## P1 — The task workspace

This is the client's headline complaint and the largest single quality gap. Better Life Abroad solved the same problem; the pattern is in `app/GulfMaidsApp.tsx:7756-7900` and `app/globals.css:305-361`.

### P1-1 · Housemaid preferences must appear inline, below the chosen outcome
**Where:** `src/components/OutcomePanel.tsx:288-315`

"Retract to MaidMatch" opens a modal (`prefsOpen`). Every other outcome in the same panel renders its inputs inline via `dynamicFields()`. So the panel teaches one interaction model and then breaks it for a single outcome. Worse, the modal **covers the profile pane** — the retractor cannot see the maid's details, complaints or employment history while recording her preferences, which is exactly when that context matters.

**Fix:** delete the modal. Render the preference picker as the step-2 field group, below the outcome grid, like every other outcome.

---

### P1-2 · "Retract to MaidMatch" never enters the selected state
**Where:** `src/components/OutcomePanel.tsx:335` — `onClick={() => (outcome.key === "retractToMaidMatch" ? openPrefs() : select(outcome.key))}`

Because it calls `openPrefs()` instead of `select()`, the button never gets `.selected`. Dismiss the modal and the panel looks as if nothing was ever clicked — the choice isn't remembered and there is no visual trace of it. Once P1-1 lands this disappears, but the branch must be removed, not just hidden.

---

### P1-3 · Adopt the numbered step structure
**Where:** `src/components/OutcomePanel.tsx` render; port `.task-step-block` / `.task-step-title` from `app/globals.css:307-315`

Right now the right pane is a heading, a loose grid of buttons, and — sometimes — some fields. There is no structure telling the user what to do or in what order. Better Life Abroad breaks it into two labelled steps:

> **① Choose the result** — *The fields below adapt to this choice.*
> **② Complete required details** — *Only fields required for this result are shown.*

The step marker is a small numbered chip, the title is bold, the subtitle is muted, and each block has a bottom hairline. It makes the panel read as a guided form instead of a scatter of controls, and it makes the "inputs live under the outcome" rule structurally obvious rather than incidental.

**Fix:** wrap the outcome grid in step 1 and the dynamic fields in step 2. Step 2 mounts only once an outcome is selected.

---

### P1-4 · Add a "what happens next" callout
**Where:** new; port `.outcome-effect` from `app/globals.css:316-322`

After selecting an outcome, Better Life Abroad shows a tinted callout: *"What happens next — Updates Company Visit and regenerates time-based work."* Tones are `positive` / `warning` / `negative` / neutral.

MaidMatch has nothing. The user cannot tell that "Retract to MaidMatch" silently creates a shooting task, or that flagging the third platform moves the maid to a different queue and closes the task. These are consequential state transitions being made blind.

**Fix:** add one line of copy per outcome, e.g.

| Outcome | What happens next |
|---|---|
| Retract to CC | Closes the retraction task. Maid moves to Retracted to CC (terminal). |
| Move to Offboarding | Closes the retraction task. Maid moves to Offboarding (terminal). |
| Retract to MaidMatch | Saves preferences and opens a shooting task for the Media Team. |
| Done shooting | Opens an editing task for the Media Team. |
| Editing done | Records Production Done and opens a publishing task for Sales. |
| Send back to shooting | Reopens a shooting task. Editing work is discarded. |
| Under trial | Opens a trial task for Sales. |
| Hired | Closes the trial (terminal). |
| Proceed to cancellation | Closes the trial as Cancelled (terminal). Requires a reason. |

---

### P1-5 · Outcomes that need no input show a blank panel
**Where:** `src/components/OutcomePanel.tsx:236-283` — `dynamicFields()` returns `null` for `retractToCC`, `moveToOffboard`, `hired`, `sendBackPublished`, `sendBackPendingPublishing`

Selecting "Retract to CC" produces a highlighted button, then nothing, then a footer floating at the bottom of a mostly-empty pane. It looks unfinished or broken.

**Fix:** port `.no-fields-note` (`app/globals.css:350-352`) — a green confirmation block reading *"No extra data needed — review the result and save when ready."* Step 2 always renders; it just says different things.

---

### P1-6 · Outcome buttons have no selection indicator
**Where:** `src/globals.css` `.outcome-grid button.selected`

Selection is signalled only by a border colour and a faint pink fill. On a cream background at 12px that is a weak, easily-missed signal — and it's the single most important piece of state in the panel.

**Fix:** put a radio circle inside each button, as Better Life Abroad does (`app/globals.css:361`) — `button > span` is a 20px circle that fills with the accent colour and shows a check when selected. Unmistakable at a glance, and it reads as a single-choice control, which is what it is.

---

### P1-7 · Destructive outcomes look identical to positive ones
**Where:** `src/components/OutcomePanel.tsx` OUTCOMES; `.danger-button` is defined in `src/globals.css` and **never used anywhere in the app**

On Under Trial, "Hired" and "Proceed to cancellation" are the same pill in the same colour at the same weight. One is a successful placement; the other terminates the engagement. Same for "Move to Offboarding" against "Retract to CC".

**Fix:** add a `tone` to each outcome definition and render `negative` outcomes in red (`app/globals.css:361` — `.outcome-grid button.negative:not(.selected) { color: var(--red); }`). Use the existing `--danger` token. The confirm button for a destructive outcome should use `.danger-button.solid`, not the standard brown primary.

---

### P1-8 · Confirm button is always enabled and always says "Confirm"
**Where:** `src/components/OutcomePanel.tsx:363-368`

Click Confirm on "Proceed to cancellation" with an empty reason and you get an error *after* the fact. The button gives no indication of what it will do.

**Fix (both, they go together):**
- Disable the primary until an outcome is selected **and** required fields are filled.
- Label it with the outcome: `Confirm · Proceed to cancellation`. Better Life Abroad uses `Save result · {outcome}`, and `Choose a result to continue` in the disabled state (`app/GulfMaidsApp.tsx:7885-7893`).

---

### P1-9 · Validation is one string, shown too late
**Where:** `src/components/OutcomePanel.tsx` `validation` state; `.validation-summary` in `src/globals.css`

A single `setValidation("A final photo is required.")` — one message, first error only, and only after a failed submit.

**Fix:** port the richer summary from `app/globals.css:353-354` and `app/GulfMaidsApp.tsx:7828-7845`: a heading (*"Complete 2 required fields"*) plus a `<ul>` naming every missing field, with `role="alert"`. Keep it suppressed until the first submit attempt, then live-update as fields are filled.

---

### P1-10 · Required/optional is buried in the label text
**Where:** `src/components/OutcomePanel.tsx` — `<span>Final photo (required)</span>`, `<span>Stock photo URL (optional)</span>`

Requirement status is prose inside the label, at the same weight as the label itself.

**Fix:** port `app/globals.css:326-327` — `.task-input-field > span` becomes a flex row with the label on the left and a small red uppercase `REQUIRED` badge on the right. Drop "(optional)" entirely; absence of the badge means optional.

---

### P1-11 · Outcome grid is ragged
**Where:** `src/globals.css` `.outcome-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }`

- Retraction has 3 outcomes → one orphan on the second row.
- Under Trial's "Send back to Available & Pending Publishing" wraps to two lines, so its row is taller than the others and the grid looks broken.

**Fix:** give every button a fixed `min-height` (Better Life Abroad uses 46px, `app/globals.css:314`) so wrapping doesn't change row height, and use `grid-auto-rows: 1fr`. For odd counts, either let the last button span both columns or accept the gap — but not while heights are also uneven.

---

### P1-12 · "Cancel" and "cancellation" collide
**Where:** Under Trial workspace

The form's abort button says **Cancel**; the outcome directly above says **Proceed to cancellation**. Two different meanings of the same word, 40px apart.

**Fix:** rename the form's abort control to **Discard** or **Back to outcomes**.

---

### P1-13 · The preferences list needs restructuring
**Where:** `src/data.ts:78-88` `PREFERENCE_OPTIONS`

Nine full-sentence checkboxes in a flat list, all starting "She doesn't prefer for the employer to…". Slow to scan, awkward to read, and **"She prefers to be a Live in maid" and "She prefers to be a Live out maid" are mutually exclusive but both are checkboxes** — nothing stops selecting both.

**Fix:**
- Group into sections: **Household** (babies < 2 yrs, more than 2 kids, cat, dog), **Living arrangement** (private maid's room, live-in / live-out), **Schedule & location** (Sunday day off, Abu Dhabi home).
- Make live-in/live-out a two-option radio group, not two checkboxes.
- Shorten labels to chips — "No babies under 2", "No cats", "Private room", "Sunday off". Keep the long sentence as the accessible description.
- Show a live count ("3 selected") and disable Confirm at zero rather than erroring after the click.

---

### P1-14 · Dead space between the last field and the footer
**Where:** `src/globals.css` `.task-action-footer { margin-top: auto; }` inside `.workspace-task` (a flex column with `min-height: calc(100vh - 170px)`)

On Under Trial with a reason box open, there is roughly 90px of empty white between the textarea and the buttons.

**Fix:** cap the pane's minimum height, or let the footer sit directly after the content with a fixed `padding-top`. On mobile, make it sticky — Better Life Abroad pins it to the bottom with a blurred backdrop and a full-width 52px primary (`app/globals.css:475`).

---

### P1-15 · The maid's name appears three times on one screen
**Where:** topbar `<h1>` ("Pending Retraction"), `ProfilePanel` `<h2>`, `OutcomePanel` `<h1>`

Both panes lead with "Angel Dela Cruz" in large type, and the task pane repeats it directly opposite the profile pane. HIG deference: chrome should recede, content should lead.

**Fix:** the profile pane owns the identity. The task pane's heading becomes the **task**, not the person — "Pending Retraction", with a row of metadata chips beneath it. See [P1-16](#p1-16--the-task-pane-has-no-context-chips).

---

### P1-16 · The task pane has no context chips
**Where:** `src/components/OutcomePanel.tsx:294-305`; port `.task-meta` and `.task-due-banner` from `app/globals.css:305`

Better Life Abroad's task header carries a stage pill, an ETA chip and a task code, plus a due banner showing the deadline and the owning team. MaidMatch shows a single letter in a pink square (`R`, `S`, `E`, `T`) and a sentence.

**Fix:** replace the cryptic letter with a real icon and add a chip row: stage pill · assigned role · time in queue · task ID. The data is already in `Task` (`assignedRole`, `createdAt`, `id`).

---

### P1-17 · No journey / progress indicator anywhere
**Where:** missing entirely; Better Life Abroad's is `.journey-mini` + "Journey position" in the profile pane

Better Life Abroad shows a horizontal stepper — completed stages checked, the current one highlighted, plus "2/14 documents". MaidMatch never tells you **where the maid is in the pipeline**. The nav tree shows queues, but from inside a task you cannot see that Reception → Retraction → Shooting → Editing → Publishing → Trial is an eleven-stage journey and this maid is at step 3.

**Fix:** add a compact stage stepper to the profile pane, driven by `STAGE_TO_TASK` in `src/lib/stages.ts` — the data model already knows the full ordering.

---

### P1-18 · No handover context
**Where:** missing; Better Life Abroad's `.context-note` — *"Bot history and saved applicant details are already available. Confirm only what this task asks for; do not make the applicant repeat information."*

MaidMatch is explicitly a multi-team relay (Reception → Retractor → Media → Sales). Nothing tells the next person what the previous one already did. The `Task.metadata.comment` from "Send back to shooting" is captured and then **never displayed anywhere** — the media person who receives the reshoot cannot read why it came back.

**Fix:** render a handover block at the top of the task pane whenever the incoming task carries metadata (comment, preferences, stock media, employer). At minimum, surface the send-back comment — it's currently written to state and dropped on the floor.

---

## P1 — The Roles screen

### P1-19 · Cards sit flush against the panel border
**Where:** `src/screens/RolesScreen.tsx:44-46`

`.panel` has border, radius and background but **no padding**. Every other screen compensates with an inline `style={{ padding: "20px 22px" }}`; Roles doesn't. So the role cards' borders touch the panel's border — a visible double-line seam on all four edges.

**Fix:** see [P1-27](#p1-27--panel-has-no-padding-and-every-screen-reinvents-it).

---

### P1-20 · An orphan fifth card
**Where:** `.roles-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }`

Five roles at desktop width = four across, one alone with three empty cells beside it. It reads as a layout error rather than a deliberate grid.

---

### P1-21 · The screen shows no permissions
This is the substantive failure. The Roles screen currently displays a title, a one-line description and a member count. That's it. A user cannot find out what any role can actually do.

**And the data already exists** — `src/lib/roles.ts` defines `ROLE_ACCESS`, a full role → screen matrix, and `defaultConfig.defaultRolePerTask` maps every task type to an owning role. None of it is rendered.

**Fix:** rebuild as a master–detail screen, matching Better Life Abroad's Users & permissions (`app/UsersPermissionsScreen.tsx`):

- **Left rail:** the five roles, each with its member count and a "preset" tag.
- **Right detail:** role name, description, a `12 screens / 30 tasks` stat pair, then:
  - **Screen access** — every nav key from `NAV_TREE` as a card with a one-line description of what it grants and a checked/unchecked state, driven by `ROLE_ACCESS`.
  - **Task ownership** — which task types default to this role, from `defaultRolePerTask`.
  - **Members** — the users holding the role, with avatars.

---

### P1-22 · Users and Roles should be one screen
**Where:** `src/screens/UsersScreen.tsx` + `src/screens/RolesScreen.tsx`, two separate nav entries

They describe the same subject from two angles. Better Life Abroad merges them into **Users & permissions** with two tabs — *Users (5)* / *Roles & permissions (5)* — so you can move between "who has access" and "what that access means" without losing your place.

**Fix:** merge into one route with a tab row. Collapses two thin screens into one substantial one and frees a nav slot.

---

### P1-23 · Users table is missing everything an admin needs
**Where:** `src/screens/UsersScreen.tsx`

Three columns — Name, Email, Roles. No search, no role filter, no status (active/deactivated), no last-login, no row actions. You can invite a user but never edit or deactivate one.

**Fix:** add search + role filter + status filter, a result count, an Active/Inactive pill, and per-row **Edit** / **Deactivate** actions. Protect the last remaining admin from deactivation, and say so inline the way Better Life Abroad does ("Protected administrator account").

---

### P1-24 · Publishing grid needs a progress column and an undo
**Where:** `src/screens/Publishing.tsx:170-207`

Now that the screen is reachable, it shows three checkbox columns and nothing else. At a glance a 2-of-3 row and a 0-of-3 row look the same — you have to read three cells to work out where a maid stands.

**Fix:**
- Add a **Progress** column: `2 / 3` plus a thin bar, or a status pill (`2 of 3 live`).
- Drop the per-cell text label — the column header already says "MaidMatch", so repeating it in every cell doubles the text and wastes width.
- Add hover/focus affordance on the cell so it's obvious it's clickable, and a tooltip ("Publish to Peekaboo").
- Add the undo from [P0-7](#p0-7--publishing-to-a-platform-is-irreversible).
- Consider a "Publish to all" bulk action per row.

---

## P1 — Design system

### P1-25 · The app has no icons at all
**Where:** everywhere. `package.json` has no icon dependency; Better Life Abroad imports `lucide-react` in 14 files.

MaidMatch's entire icon vocabulary is: `&#9776;` (hamburger), `&#128276;` (🔔 bell emoji), `&#10003;` (check), `&#128274;` (🔒 lock emoji), `&times;`, `&larr;`, `&rsaquo;`. Emoji render differently on every OS, can't be recoloured, don't scale with the type, and are announced badly by screen readers.

This single gap accounts for much of the "looks unfinished" impression. Better Life Abroad's nav items, KPI cards, field labels, callouts and empty states all carry consistent line icons at consistent weight.

**Fix:** add `lucide-react` and use it for nav items, KPI cards, callouts, buttons, empty states, and the outcome/step markers. It's the same library the benchmark uses, so the visual language will match.

---

### P1-26 · There is effectively no type scale
**Where:** `src/globals.css`

`font-size: 12px` appears **36 times**. Table cells, table sub-text, labels, help text, buttons, pills, panel descriptions, form inputs, empty states and metric sub-labels are all 12px. The only real jumps are `h1` (25–34px) and `.metric-card strong` (22px). Between 12px and 22px there is nothing.

Everything therefore reads at the same importance, which is why dense screens feel flat and sparse screens feel empty.

**Fix:** define a scale as tokens and use it — e.g. 11 (micro/pill) · 12 (secondary) · 13 (body) · 15 (emphasis) · 16 (panel title) · 20 (section) · 25–34 (page). Move table cell text and form inputs to 13px, and keep 12px for genuinely secondary content only.

---

### P1-27 · `.panel` has no padding and every screen reinvents it
**Where:** `src/globals.css` `.panel`; callers in Dashboard, Reception, SystemConfig, Roles

`.panel` has no padding at all, so callers add their own:
- Dashboard: `padding: "20px 22px"`
- Reception: `padding: "16px 18px"`
- Roles: none — hence [P1-19](#p1-19--cards-sit-flush-against-the-panel-border)
- Empty states: `padding: 20`

Four different values for one component.

**Fix:** give `.panel` a default padding and add a `.panel.flush` modifier for the tables that genuinely need edge-to-edge rows.

---

### P1-28 · Ten inline `<style>` blocks across six screens
**Where:** `Reception.tsx:91`, `Retraction.tsx:119`, `Retraction.tsx:223`, `MediaProduction.tsx:104`, `MediaProduction.tsx:196`, `Publishing.tsx:135`, `Publishing.tsx:205`, `Publishing.tsx:295`, `UsersScreen.tsx:80`, `RolesScreen.tsx:23`

Every screen injects a `<style>` tag to set its own `grid-template-columns`. These re-inject on every render, can't be shared, and are invisible to anyone reading the stylesheet.

**Fix:** move the column templates into `globals.css` as named table variants (`.table--reception`, `.table--retraction-queue`, …), or pass the template through a CSS custom property on `DataTable`: `style={{ "--cols": "1.6fr .8fr .7fr .7fr 26px" }}`.

---

### P1-29 · Missing primitives that the benchmark already has
Port these from `app/globals.css` — they're small and they're the difference between "prototype" and "product":

| Class | What it does | Where |
|---|---|---|
| `.metric-icon` (+ mint/blue/amber/rose) | Tinted icon chip on KPI cards | `:215-219` |
| `.attention-strip` | Amber triage banner on the dashboard | `:208-212` |
| `.pipeline-bars` / `.pipeline-row` | Label + progress bar + count | `:227-232` |
| `.global-search` (+ results) | ⌘K global search | `:147-166` |
| `.table-tools` / `.inline-search` | Search + filter row above a table | — |
| `.tabs-row` / `.task-type-tabs` | Tab and chip filter rows | — |
| `.avatar-md` (42px) | The missing middle avatar size | `:254` |
| `.primary-button.large` (44px) | Meets the 44pt HIG touch target | `:187` |
| `.empty-state.compact` | 120px empty state for small panels | `:292` |
| `.status-pill { width: max-content }` | Stops pills stretching in grid cells | `:202` |
| `.completion-panel` | Post-task success screen with next actions | `:522-532` |
| `.back-button` | Proper back control | `:195` |

---

## P2 — Screen by screen

### P2-1 · Dashboard: KPI cards are bare
Eight cards, each a grey label and a number. Only one ("Entered Retraction") has a sub-label, so that card is taller and the row is ragged — the others show a number floating above dead space.

**Fix:** every card gets an icon chip (`.metric-icon`), a consistent sub-label, and where meaningful a delta or context value (Better Life Abroad's `.metric-card b`, e.g. "25 / 15 deployed"). Equal heights.

### P2-2 · Dashboard: "Pipeline" should be a chart, not a list
Six rows of `label ......... number` separated by hairlines. Better Life Abroad renders the same data as a horizontal bar chart with colour-coded stages — instantly legible, same vertical space.

**Fix:** port `.pipeline-bars`.

### P2-3 · Dashboard: no attention strip, no greeting, no primary action
Better Life Abroad opens with the date, "Good morning, Angela Cruz", a *"21 open cases need ownership · 1 overdue · 4 urgent"* banner with a **Review now** link, and an **Open team work** CTA. MaidMatch opens with "Dashboard / Live KPIs across…" and no way to act on anything.

**Fix:** add the greeting, an attention strip driven by `openTasks(state)`, and a primary CTA into My Team's Work.

### P2-4 · Dashboard: "Hiring funnel" is two bare numbers
Hired and Success ratio, in a panel, with no visual. It's a funnel — draw it, or fold these two figures into the KPI row and drop the panel.

### P2-5 · No housemaid directory
There is no screen that lists all housemaids. Reception only shows `currentStage === "Reception"`; every other screen is a stage queue. There is no way to find one maid by name, or to look at a maid who isn't currently sitting in a queue you can see.

**Fix:** add a Housemaids directory equivalent to Better Life Abroad's Applicants screen — search, country filter, current-stage column, document/media progress, status. It is the single biggest missing screen.

### P2-6 · No global search
Better Life Abroad has a ⌘K search across applicants, tasks and documents in the topbar. MaidMatch has one search box, on Reception only, built from inline styles (`Reception.tsx:130-145`).

**Fix:** promote search into the topbar across housemaids and tasks; move the Reception input onto the shared `.inline-search` primitive.

### P2-7 · Reception: the search input is inline-styled
`Reception.tsx:130-145` sets width, height, padding, border, radius, colour, background and font-size inline — duplicating `.task-input-field input` and drifting from it.

**Fix:** use the shared class; add a result count ("6 of 12 maids") and a clear button.

### P2-8 · Reception: eight columns, no filters, long CTA
Eight columns at 12px is cramped, and mobile hides seven of them. "Send to Retraction Team" is a wide button repeated on every row.

**Fix:** pair Mobile/WhatsApp into one cell (they're identical in every seed record), pair Visa/Passport expiry, and shorten the action to "Send to Retraction" with the full label as the accessible name.

### P2-9 · My Team's Work has no filters, search or SLA
Better Life Abroad's equivalent has: status tabs (All open / Due today / Overdue / Snoozed) with counts, task-type chips with counts, a queue search, a stage dropdown, and a Due/SLA column showing "Overdue · 1h 18m" in red. MaidMatch has Maid / Task / Assigned / Age / button.

**Fix:** add the status tabs and task-type chips at minimum — the counts come straight from `myTeamWork(state)`. Add descriptions under the task name, and a stage pill.

### P2-10 · Retraction queue: three redundant lock signals
Locked rows carry a 🔒 emoji, a disabled "Open Task" button *and* a "LOCKED — FINISH FIRST" pill. Three signals for one state, and the disabled button still renders in solid brand brown at 45% opacity, so it still reads as the primary action.

**Fix:** one signal. Grey the row, show a lock icon with the tooltip, and drop the button entirely for locked rows.

### P2-11 · "MV" / "CC" / "CC to MV" are never explained
The Type column shows unexpanded internal abbreviations with no legend or tooltip.

**Fix:** tooltip or a short legend under the table.

### P2-12 · The "FIFO" pill is unlabelled
Top-right of Pending Retraction sits a pill reading `FIFO` with no context. It's the active priority algorithm, but nothing says so.

**Fix:** "Priority: FIFO", and make it a link to System Configuration.

### P2-13 · Under Trial hides the employer
`Housemaid` carries `employerName` and `maidsCcProfileLink`, both captured at "Under trial". `employerName` surfaces only afterwards, in the Hired/Cancelled archives (`Publishing.tsx:119`) — it is absent from the Under Trial queue and from the profile pane, i.e. from every screen where the trial is still live. `maidsCcProfileLink` is captured and **never displayed anywhere at all**.

The Under Trial screen shows Name / Nationality / Age — nothing about the trial itself.

**Fix:** add Employer and Days in trial columns to the queue, and surface both fields in the profile pane while the maid is under trial (the maids.cc link as an outbound link, matching the complaints rows).

### P2-14 · Media & Production: no thumbnails
Production Done shows "View photo" / "View video" as text links. A media screen should show the media.

**Fix:** render thumbnails; keep the link as the click target. Same in the profile pane's Stock media section.

### P2-15 · System Configuration is one long undifferentiated column
Six full-width panels stacked vertically with no section navigation, and changes apply on `onChange` with no save affordance and no confirmation that anything happened.

**Fix:** add a sticky section nav (or tabs), and a toast on change. "Reset demo data" is destructive and sits next to normal controls with no confirmation — give it a confirm step.

### P2-16 · Empty states are large and bare
`.empty-state` is a 180px block with two lines of grey text at 2.9:1 contrast. Six screens can hit one.

**Fix:** add an icon, keep the copy, and where an action would help ("Send a maid from Reception") add a button.

---

## P2 — Mobile

### P2-17 · "Viewing as" wraps and eats the topbar
At 375px the role switcher wraps to two lines and takes roughly a third of the bar, squeezing the page title. Better Life Abroad hides `.role-preview` below 900px (`app/globals.css:454`).

**Fix:** hide it on mobile and move it into the sidebar, or collapse it to the role name alone.

### P2-18 · Profile/Task tabs sit outside the card
The tab bar renders above `.workspace-split`, with its grey track visible against the card's rounded top corners — a seam. The inactive tab is `--muted` on `--line`, which is low-contrast.

**Fix:** move the tabs inside the card, above the pane content, and raise the inactive tab's contrast.

### P2-19 · No sticky action footer on mobile
The task footer scrolls away with the content. Better Life Abroad pins it (`app/globals.css:475`): sticky, blurred backdrop, full-width 52px primary, secondary actions above.

### P2-20 · Inputs at 12px trigger iOS auto-zoom
`.task-input-field input/select` is `font-size: 12px`. iOS Safari zooms the page whenever a focused input is under 16px, which then leaves the layout scrolled sideways.

**Fix:** 16px on inputs at mobile breakpoints (visual size can be held with padding).

### P2-21 · The mobile dock's third slot is unstable
`Shell.tsx` `primaryFlow()` picks the third dock item from the current role, so it reads "Retraction" for one user and "Media & Production" for another. Two of three slots are fixed and the third moves.

**Fix:** either make all three fixed (Dashboard / My Team's Work / More) or label the third generically and open a sheet.

---

## P2 — Accessibility

### P2-22 · The modal is not a dialog
**Where:** `src/components/primitives.tsx:44-72`

No `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, no focus trap, **no Escape key handler**, and focus is not restored to the trigger on close. Keyboard users can tab straight out of the modal into the page behind it; screen readers announce nothing about a dialog opening.

**Fix:** if P1-1 removes the preferences modal, the Invite User modal still needs all of this. Use a native `<dialog>` or add the full set.

### P2-23 · Toasts are invisible to screen readers
**Where:** `src/components/primitives.tsx:74-86`

`Toast` renders a plain `<div>`. "Retracted to CC", "Editing done", "User invited" — every confirmation in the app — is announced to nobody.

**Fix:** `role="status"` and `aria-live="polite"`. Also give it a dismiss control and pause the auto-hide on hover.

### P2-24 · Checkboxes have no visible focus ring
**Where:** `src/globals.css` `.check-row input { opacity: 0; width: 0; height: 0; }`

The real input is 0×0, so the global `:focus-visible` outline paints on a zero-size box — invisible. Tabbing through the nine preference checkboxes or the five role checkboxes gives no indication of position.

**Fix:** `.check-row input:focus-visible + span { outline: 3px solid …; outline-offset: 2px; }`.

### P2-25 · Table rows are not interactive elements
**Where:** all ten call sites use `<div className="table-row">`; `button.table-row` is styled in `src/globals.css` and never used

Rows can't be clicked, can't be focused, and can't be reached by keyboard — only the nested "Open Task" button can. Better Life Abroad makes the whole row a `<button>` with a trailing chevron (`app/globals.css:284-285`).

**Fix:** convert queue rows to `<button className="table-row">` with a chevron, which also fixes [P0-2](#p0-2--queue-table-columns-dont-line-up) by giving the last column a fixed 26px.

### P2-26 · Tables carry no table semantics
`DataTable` renders divs and spans. No `role="table"` / `role="row"` / `role="columnheader"`, so a screen reader hears an undifferentiated run of text with no column context.

**Fix:** add the ARIA roles, or use real `<table>` markup with `display: grid` on the rows.

### P2-27 · Contrast failures in the palette
Measured against WCAG 2.1 AA (4.5:1 for text under 18.66px):

| Token / usage | Ratio | Verdict |
|---|---|---|
| `#b09185` — table headers, metric sub-labels, empty-state text | **2.80–2.90** | ✗ Fail |
| `--gold #b8860b` on `--gold-soft` — the **GOLDEN** profile pill | **2.87** | ✗ Fail |
| `--warning #b7781e` on `--warning-soft` | 3.37 | ✗ Fail at 11px |
| `--success #2f8f6b` on `--success-soft` | 3.52 | ✗ Fail at 11px |
| `--danger #c0463a` on `--danger-soft` | 4.40 | ✗ Marginal fail |
| `--muted #9a7b70` — all page descriptions, table sub-text | **3.62** | ✗ Fail |
| `--ink-soft #6b4f47` on white | 7.41 | ✓ Pass |
| `--ink #3c2a26` on `--paper` | 12.69 | ✓ Pass |

The Golden Profile pill is the worst case — it's a status marker that drives queue priority, rendered at 11px uppercase at 2.87:1.

**Fix:** darken `--muted` to roughly `#7d6058` (≈5.1:1), replace `#b09185` with `--muted`, and darken every status pill foreground until the 11px uppercase text clears 4.5:1. The palette stays warm; only the text tones move.

### P2-28 · Emoji used as functional icons
🔒 on locked rows and 🔔 in the topbar are read aloud as "locked padlock" / "bell" and render as full-colour emoji inconsistent with the rest of the UI.

**Fix:** covered by [P1-25](#p1-25--the-app-has-no-icons-at-all). Any decorative glyph that survives needs `aria-hidden`.

---

## What's already right

Worth keeping through the rework:

- **The information architecture is sound.** The nav tree (queues nested under stage groups, archives alongside them) maps cleanly onto the workflow, and the live counts on queue items are genuinely useful.
- **Role-gated navigation works** — `ROLE_ACCESS` correctly hides screens per role, and route-level gating in `MaidMatchApp.tsx` backs it up rather than relying on hidden nav alone.
- **`prefers-reduced-motion` and `prefers-reduced-transparency` are both honoured** (`src/globals.css`, bottom). That's more than most production apps do and it should survive the redesign.
- **The state machine is disciplined.** Every transition guards on `currentStage`, so illegal moves are impossible — the UI can be rebuilt freely on top of it.
- **The one-at-a-time retraction lock** is a good product decision; it just needs a lighter visual treatment ([P2-10](#p2-10--retraction-queue-three-redundant-lock-signals)).
- **Warm palette and 15px radii** give the app a distinct identity against the benchmark's green. Keep the hues; fix only the text contrast.

---

## Suggested sequence

1. **P0 batch** — the six remaining broken items. Roughly a day; removes every "this is broken" reaction.
2. **Task workspace** (P1-1 → P1-18) — inline preferences, step blocks, effect callouts, tone-aware outcomes, validation. This is the client's headline issue and the biggest perceived-quality win.
3. **Design system** (P1-25 → P1-29) — icons, type scale, panel padding, ported primitives. Everything after this gets cheaper.
4. **Roles + Users merge** (P1-19 → P1-23).
5. **Dashboard and queues** (P2-1 → P2-16).
6. **Mobile and accessibility** (P2-17 → P2-28) — run alongside the rest rather than last.

---

## Change already applied in this pass

Only one code change was made, to make the Pending Publishing screen viewable:

- `src/store.ts` — `AppState` gains `seededAt`; seed publishing tasks get realistic partial publish states (Christine Bautista 2 of 3, Deepa Rai 1 of 3).
- `src/MaidMatchApp.tsx` — the auto-publish timer skips tasks created at or before `seededAt`, so seeded rows keep their fixture state. Tasks created during a session still auto-publish on the 3s/6s/9s stagger.
- `tests/store.test.ts` — updated the publish-state assertion and added coverage for the 2-of-3 fixture.

Typecheck and all 43 unit tests pass. Everything else in this document is left for the development team.
