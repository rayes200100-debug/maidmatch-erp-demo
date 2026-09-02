# MaidMatch ERP Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive static prototype of the MaidMatch operations ERP (Reception → Retraction → Media & Production → Publishing) as a self-contained React app, re-themed to the MaidMatch brand with Apple UI polish.

**Architecture:** A single-page React 19 + Vite + Tailwind CSS 4 app with in-memory state. The domain is split into three entities — `Housemaid` (lifecycle), `Task` (workflow), `Outcome` (history) — driven by a pure reducer in `store.ts` that is fully unit-tested. UI is a sidebar/topbar shell, a split "profile | outcomes" workspace, and per-screen modules.

**Tech Stack:** React 19, TypeScript 5, Vite 6, Tailwind CSS 4 (`@tailwindcss/vite`), Vitest (unit), Playwright (smoke), no backend.

**Spec:** `docs/superpowers/specs/2026-09-02-maidmatch-erp-design.md`

## Global Constraints

- Node >= 22; package manager npm. `"type": "module"`.
- React `19.x`, TypeScript `5.x`, Vite `6.x`, Tailwind CSS `4.x`, Vitest `2.x`, `@tailwindcss/vite` `4.x`, `@vitejs/plugin-react` `6.x`, Playwright `^1.62`.
- Copy/labels: roles are **System Admin, Super Admin, Retractor, Media Team, Sales** (exact casing).
- Brand tokens (verbatim from spec §9.1): `--brand #fbd9e8`, `--brand-medium #fae6d4`, `--brand-light #fff5ee`, `--brand-dark #8c5044`, `--accent-terracotta #d48878`, `--accent-terracotta-dark #8c5044`, `--accent-terracotta-light #f4b8cc`, `--paper #fff6f0`, `--radius 0.625rem`, font `"Plus Jakarta Sans", -apple-system, system-ui, sans-serif`.
- Working hours: 8 AM – 8 PM. Days off configurable (multi-select). AVG time-in-step counts active working hours only.
- Auto-publish is staggered: **MaidMatch → Peekaboo → Yaya**; auto-transition to "Available & Published" fires only when the third platform turns green.
- `PendingRetraction` is the **only** sequentially-locked queue (first-priority task actionable, rest locked). All other queues are free-select.
- Mobile: hamburger sidebar + scrim, bottom ERP dock, tables collapse to cards, split workspace becomes profile/task tabs, modals become bottom sheets, min 44px touch targets, safe-area insets, `prefers-reduced-motion` support.
- Role visibility (spec §5.1): SysAdmin/SuperAdmin = everything; Retractor = Reception + Retraction + Publishing; Media = Media & Production only; Sales = Publishing only. Dashboard + My Team's Work always visible. Users/Roles/System Config = admin-only.
- Default assigned role per task (spec §5.2): retraction→Retractor, shooting→Media Team, editing→Media Team, publishing→Sales, available→Sales, trial→Sales.

---

## File Structure

```
MaidMatchInternal/
  index.html                     # HTML shell, loads /src/main.tsx
  package.json
  vite.config.ts                 # @vitejs/plugin-react + @tailwindcss/vite, base "./"
  tsconfig.json / tsconfig.node.json
  vitest.config.ts               # (or test config in vite.config.ts)
  playwright.config.ts
  src/
    main.tsx                     # createRoot -> <MaidMatchApp/>
    MaidMatchApp.tsx             # root: store provider, route switch, role switcher, publish timer
    globals.css                  # design tokens + all component classes
    data.ts                      # types (Housemaid/Task/Outcome/SystemConfig) + seed data
    store.ts                     # pure reducer + selectors + action creators (unit-tested)
    lib/
      stages.ts                  # Stage/TaskType/OutcomeType/Platform consts + nav tree + queue/archive maps
      roles.ts                   # RoleId + visibility matrix + canAccess/visibleNav
      priority.ts                # retraction queue sort (FIFO/LIFO/Filipina/Golden)
      hours.ts                   # active-working-hours + AVG time helpers
    components/
      Shell.tsx                  # Sidebar + Topbar + MobileDock
      primitives.tsx             # Panel, StatusPill, MetricCard, DataTable, Modal, Toast, EmptyState
      WorkspaceSplit.tsx         # profile | outcomes split (with mobile tabs)
      ProfilePanel.tsx           # left-half housemaid profile + golden flag
      OutcomePanel.tsx           # right-half outcomes + dynamic fields
    screens/
      Dashboard.tsx
      TeamWork.tsx
      Reception.tsx
      Retraction.tsx             # Pending Retraction + 3 archive subscreens
      MediaProduction.tsx        # Shooting / Editing / Production Done
      Publishing.tsx             # 5 subscreens
      UsersScreen.tsx
      RolesScreen.tsx
      SystemConfig.tsx
  tests/
    roles.test.ts
    stages.test.ts
    priority.test.ts
    hours.test.ts
    store.test.ts
  e2e/
    smoke.spec.ts
```

**Responsibility boundaries:** `lib/*` and `store.ts` are pure and unit-tested. `components/*` are presentational (receive props + dispatch actions). `screens/*` wire selectors → components. `MaidMatchApp.tsx` owns routing and effects (publish timer).

---

### Task 1: Project scaffold + design tokens

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/globals.css`
- Create: `.gitignore` (`node_modules`, `dist`, `test-results`, `.playwright-mcp`)

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run test`, `npm run typecheck`, `npm run e2e` scripts; a themed page; the complete CSS class inventory consumed by every later task.

- [ ] **Step 1: Init git + scaffold package.json**

```bash
cd /Users/rayes/Projects/MaidMatchInternal && git init -b main
```

`package.json`:

```json
{
  "name": "maidmatch-erp-prototype",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.0",
    "@playwright/test": "^1.62.0",
    "tailwindcss": "^4.2.0",
    "typescript": "^5.9.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Vite + TS + Vitest config**

`vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

`index.html` (root, loads `/src/main.tsx`, `base "./"`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="MaidMatch operations ERP prototype." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>MaidMatch ERP Prototype</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MaidMatchApp from "./MaidMatchApp";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MaidMatchApp />
  </StrictMode>
);
```

- [ ] **Step 5: globals.css — tokens + full component class inventory**

Write `src/globals.css` beginning with `@import "tailwindcss";` then the token block and the class inventory below. Every later task references these class names **exactly** — do not rename.

```css
@import "tailwindcss";

:root {
  --brand: #fbd9e8;
  --brand-medium: #fae6d4;
  --brand-light: #fff5ee;
  --brand-dark: #8c5044;
  --accent-terracotta: #d48878;
  --accent-terracotta-dark: #8c5044;
  --accent-terracotta-light: #f4b8cc;
  --paper: #fff6f0;
  --surface: #ffffff;
  --surface-soft: #fffaf6;
  --ink: #3c2a26;
  --ink-soft: #6b4f47;
  --muted: #9a7b70;
  --line: #f0ded3;
  --line-strong: #e2c6b6;
  --success: #2f8f6b;
  --success-soft: #e6f4ee;
  --warning: #b7781e;
  --warning-soft: #fff4de;
  --danger: #c0463a;
  --danger-soft: #fdeceb;
  --info: #416a83;
  --info-soft: #eaf2f6;
  --gold: #b8860b;
  --gold-soft: #fbf0d6;
  --radius: 0.625rem;
  --shadow: 0 12px 36px rgba(92, 55, 42, 0.10);
  --sidebar: 270px;
  --font-sans: "Plus Jakarta Sans", -apple-system, system-ui, sans-serif;
}

* { box-sizing: border-box; }
html { max-width: 100%; overflow-x: clip; background: var(--paper); }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
button, input, select, textarea { font: inherit; }
button { color: inherit; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid rgba(212, 136, 120, 0.3); outline-offset: 2px; }
button:disabled { cursor: not-allowed; opacity: .5; }
button:active:not(:disabled) { transform: scale(.98); }

/* shell */
.app-shell { width: 100%; max-width: 100vw; min-height: 100vh; overflow-x: clip; }
.sidebar { position: fixed; inset: 0 auto 0 0; z-index: 30; width: var(--sidebar); display: flex; flex-direction: column; padding: 22px 16px 16px; background: rgba(60, 42, 38, .92); backdrop-filter: blur(20px) saturate(150%); color: #fff6f0; border-right: 1px solid rgba(255,255,255,.06); }
.brand-row { display: flex; align-items: center; gap: 11px; padding: 0 6px 22px; }
.brand-mark { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(145deg, #f4b8cc, #d48878); font-size: 17px; font-weight: 800; }
.brand-row strong { font-size: 15px; }
.brand-row span { color: #e7c8bc; font-size: 11px; letter-spacing: .09em; text-transform: uppercase; }
.primary-nav { display: flex; flex: 1; flex-direction: column; gap: 3px; min-height: 0; overflow-y: auto; padding-right: 2px; }
.nav-kicker { padding: 8px 12px 6px; color: #d9b3a6; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.primary-nav > button { display: flex; align-items: center; gap: 11px; min-height: 42px; padding: 0 12px; border: 0; border-radius: 10px; background: transparent; color: #f3dcd2; cursor: pointer; font-size: 13px; text-align: left; }
.primary-nav > button span { flex: 1; }
.primary-nav > button b { min-width: 24px; min-height: 24px; display: grid; place-items: center; padding: 2px 6px; border-radius: 8px; background: rgba(255,255,255,.08); color: #f9e9e2; font-size: 12px; line-height: 1.2; }
.primary-nav > button:hover { color: #fff; background: rgba(255,255,255,.06); }
.primary-nav > button.active { color: #fff; background: linear-gradient(90deg, rgba(212,136,120,.32), rgba(212,136,120,.08)); box-shadow: inset 2px 0 var(--accent-terracotta); }
.stage-nav { display: grid; gap: 2px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,.07); }
.stage-nav summary { display: flex; align-items: center; justify-content: space-between; min-height: 34px; padding: 0 9px 0 12px; border-radius: 8px; list-style: none; color: #e7c3b7; font-size: 12px; cursor: pointer; }
.stage-nav summary::-webkit-details-marker { display: none; }
.stage-nav summary > span { display: flex; align-items: center; gap: 7px; }
.stage-nav summary i { width: 5px; height: 5px; border-radius: 50%; background: #d48878; }
.stage-nav[open] summary { color: #fff; background: rgba(255,255,255,.04); }
.stage-nav > div { display: grid; gap: 2px; margin: 3px 0 5px 16px; padding-left: 10px; border-left: 1px solid rgba(255,255,255,.11); }
.stage-nav button { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 7px; min-height: 30px; padding: 4px 7px; border: 0; border-radius: 7px; color: #dbb7aa; background: transparent; cursor: pointer; font-size: 12px; text-align: left; }
.stage-nav button b { min-width: 22px; min-height: 22px; display: grid; place-items: center; border-radius: 6px; color: #dbb7aa; background: rgba(255,255,255,.045); font-size: 12px; }
.stage-nav button.active { color: #fff; background: rgba(212,136,120,.22); }
.stage-nav button.active b { color: #fff; background: rgba(212,136,120,.3); }
.sidebar-user { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 9px; width: 100%; padding: 9px 8px; border: 0; border-top: 1px solid rgba(255,255,255,.08); background: transparent; color: #fff; cursor: pointer; text-align: left; }
.sidebar-user strong { font-size: 12px; }
.sidebar-user small { color: #dbb7aa; font-size: 12px; }
.user-avatar { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: #8c5044; background: #fae6d4; font-size: 12px; font-weight: 800; }
.sidebar-close, .menu-button { display: none !important; }
.sidebar-scrim { display: none; }

.app-main { min-height: 100vh; margin-left: var(--sidebar); }
.topbar { position: sticky; top: 0; z-index: 20; height: 68px; display: flex; align-items: center; gap: 18px; padding: 0 30px; border-bottom: 1px solid var(--line); background: rgba(255,250,246,.82); backdrop-filter: blur(16px); }
.topbar h1 { margin: 0; font-size: 16px; }
.topbar-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.role-preview { display: flex; align-items: center; gap: 7px; padding-left: 10px; border-left: 1px solid var(--line); }
.role-preview span { color: var(--muted); font-size: 12px; }
.role-preview select { max-width: 140px; border: 0; outline: 0; color: var(--ink-soft); background: transparent; font-size: 12px; font-weight: 700; }
.icon-button { display: inline-grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); cursor: pointer; }

.content { width: 100%; padding: 30px clamp(22px, 3vw, 44px) 56px; }
.page-stack { display: grid; grid-template-columns: minmax(0,1fr); gap: 20px; min-width: 0; max-width: 1460px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; min-height: 58px; }
.eyebrow { display: block; margin-bottom: 6px; color: var(--brand-dark); font-size: 12px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
.page-header h1 { margin: 0; font-size: clamp(25px, 2.3vw, 34px); font-weight: 700; letter-spacing: -.03em; }
.page-header p { max-width: 700px; margin: 7px 0 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
.page-actions { display: flex; align-items: center; gap: 8px; }

/* buttons */
.primary-button, .secondary-button, .danger-button { min-height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 14px; border-radius: 9px; cursor: pointer; font-size: 12px; font-weight: 700; }
.primary-button { border: 1px solid var(--brand-dark); color: #fff; background: var(--brand-dark); box-shadow: 0 5px 12px rgba(140,80,68,.18); }
.primary-button:hover { background: #7a453a; }
.primary-button.small { min-height: 32px; padding: 0 11px; }
.secondary-button { border: 1px solid var(--line-strong); color: var(--ink-soft); background: #fff; }
.secondary-button:hover { background: var(--surface-soft); }
.danger-button { border: 1px solid #e6b9b5; color: var(--danger); background: #fffafa; }
.danger-button.solid { border-color: var(--danger); color: #fff; background: var(--danger); }
.text-button { display: inline-flex; align-items: center; gap: 6px; border: 0; color: var(--brand-dark); background: transparent; cursor: pointer; font-size: 12px; font-weight: 700; }

/* panels / cards */
.panel { min-width: 0; border: 1px solid var(--line); border-radius: 15px; background: var(--surface); box-shadow: 0 2px 3px rgba(92,55,42,.02); }
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.panel-header h2 { margin: 0; font-size: 16px; letter-spacing: -.015em; }
.panel-header p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
.status-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 26px; padding: 3px 8px; border-radius: 99px; color: #7a5f56; background: #f6ece7; font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.status-pill.success { color: var(--success); background: var(--success-soft); }
.status-pill.warning { color: var(--warning); background: var(--warning-soft); }
.status-pill.danger { color: var(--danger); background: var(--danger-soft); }
.status-pill.info { color: var(--info); background: var(--info-soft); }
.status-pill.gold { color: var(--gold); background: var(--gold-soft); }

.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 13px; }
.metric-card { padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: #fff; }
.metric-card > span { display: block; margin-bottom: 10px; color: var(--muted); font-size: 12px; }
.metric-card strong { font-size: 22px; letter-spacing: -.04em; }
.metric-card small { display: block; margin-top: 5px; color: #b09185; font-size: 11px; }

/* tables */
.data-table { overflow-x: auto; }
.table-row { min-width: 900px; display: grid; grid-template-columns: 1.15fr 1.5fr 1fr .7fr .8fr auto; align-items: center; gap: 14px; width: 100%; min-height: 68px; padding: 10px 15px; border: 0; border-bottom: 1px solid var(--line); background: #fff; text-align: left; }
button.table-row { cursor: pointer; }
.table-row:not(.table-head):hover { background: #fffaf6; }
.table-row > span { min-width: 0; }
.table-row strong { display: block; overflow: hidden; color: var(--ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.table-row small { display: block; margin-top: 4px; overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.table-head { min-height: 36px; color: #b09185; background: #fffaf6; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.person-cell { display: flex; align-items: center; gap: 9px; min-width: 0; }
.avatar { display: grid; place-items: center; flex: 0 0 auto; border-radius: 11px; color: #8c5044; background: linear-gradient(145deg, #fae6d4, #fbd9e8); font-weight: 800; }
.avatar-sm { width: 30px; height: 30px; font-size: 12px; }
.avatar-lg { width: 62px; height: 62px; border-radius: 18px; font-size: 17px; }
.empty-state { min-height: 180px; display: grid; place-items: center; align-content: center; gap: 6px; color: #b09185; }
.empty-state strong { color: var(--ink-soft); font-size: 12px; }
.empty-state span { font-size: 12px; }

/* workspace split */
.workspace-split { display: grid; grid-template-columns: minmax(340px, .88fr) minmax(480px, 1.12fr); min-height: calc(100vh - 170px); overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: var(--shadow); }
.workspace-profile, .workspace-task { min-width: 0; padding: 23px; }
.workspace-profile { border-right: 1px solid var(--line); background: #fffaf6; }
.workspace-task { display: flex; flex-direction: column; overflow-y: auto; }
.profile-mini-head { display: grid; grid-template-columns: 62px 1fr auto; align-items: center; gap: 13px; }
.profile-mini-head h2 { margin: 0; font-size: 20px; letter-spacing: -.03em; }
.profile-mini-head p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
.golden-flag { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 4px 10px; border-radius: 99px; color: var(--gold); background: var(--gold-soft); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.profile-quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; overflow: hidden; margin: 20px 0; border: 1px solid var(--line); border-radius: 11px; background: var(--line); }
.profile-quick-grid > div { display: grid; gap: 5px; padding: 11px; background: #fff; }
.profile-quick-grid span { color: var(--muted); font-size: 12px; }
.profile-quick-grid strong { font-size: 12px; }
.mini-section { margin-top: 22px; }
.mini-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.mini-section-head h3 { margin: 0; font-size: 12px; }
.mini-section-head button { border: 0; color: var(--brand-dark); background: transparent; font-size: 12px; font-weight: 700; cursor: pointer; }
.complaint-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
.complaint-row p { margin: 0; color: var(--ink-soft); font-size: 12px; line-height: 1.5; }
.complaint-row small { color: var(--muted); font-size: 12px; }

/* task / outcomes */
.task-heading { display: grid; grid-template-columns: 42px 1fr; gap: 13px; padding-bottom: 17px; }
.task-symbol { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px; color: var(--brand-dark); background: var(--brand); }
.task-heading h1 { margin: 7px 0 5px; font-size: 22px; letter-spacing: -.03em; }
.task-heading p { max-width: 680px; margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
.outcome-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.outcome-grid button { min-height: 46px; justify-content: flex-start; padding: 7px 11px; border: 1px solid var(--line); border-radius: 10px; background: #fff; cursor: pointer; font-size: 12px; font-weight: 700; text-align: left; }
.outcome-grid button:hover { border-color: var(--accent-terracotta); }
.outcome-grid button.selected { border-color: var(--brand-dark); color: var(--brand-dark); background: #fdf0f4; }
.task-dynamic-fields { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 11px; margin-top: 14px; }
.task-input-field { min-width: 0; display: grid; align-content: start; gap: 7px; }
.task-input-field.wide { grid-column: 1 / -1; }
.task-input-field > span { color: var(--ink-soft); font-size: 12px; font-weight: 800; }
.task-input-field input, .task-input-field select, .task-input-field textarea { width: 100%; min-height: 43px; padding: 0 11px; border: 1px solid var(--line-strong); border-radius: 10px; color: var(--ink); background: #fff; font-size: 12px; }
.task-input-field textarea { min-height: 90px; padding: 11px; resize: vertical; }
.task-input-field > small { color: var(--muted); font-size: 12px; }
.check-row { display: grid; grid-template-columns: 0 23px 1fr; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; }
.check-row input { opacity: 0; width: 0; height: 0; }
.check-row > span { width: 23px; height: 23px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line-strong); border-radius: 7px; color: transparent; background: #fff; }
.check-row input:checked + span { border-color: var(--brand-dark); color: #fff; background: var(--brand-dark); }
.task-action-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 20px; }
.validation-summary { display: flex; gap: 10px; margin-top: 14px; padding: 12px; border: 1px solid #efc6c2; border-radius: 11px; color: var(--danger); background: var(--danger-soft); font-size: 12px; }

/* platform cells */
.platform-cell { display: inline-flex; align-items: center; gap: 6px; }
.platform-cell i { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; color: transparent; border: 1px solid var(--line-strong); background: #fff; }
.platform-cell i.green { color: #fff; background: var(--success); border-color: var(--success); }

/* modal / toast */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(60,42,38,.5); backdrop-filter: blur(5px); }
.modal-card { position: relative; width: min(480px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 24px; border-radius: 16px; background: #fff; box-shadow: 0 24px 80px rgba(60,42,38,.3); }
.modal-close { position: absolute; top: 13px; right: 13px; }
.modal-card h2 { margin: 0; font-size: 21px; letter-spacing: -.03em; }
.modal-card > p { margin: 8px 0 18px; color: var(--muted); font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line); }
.toast { position: fixed; z-index: 110; left: 50%; bottom: 24px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 14px; border-radius: 10px; color: #fff; background: var(--brand-dark); box-shadow: 0 12px 40px rgba(60,42,38,.26); font-size: 12px; font-weight: 700; }

/* mobile */
.mobile-erp-dock { display: none; }
.mobile-workspace-tabs { display: none; }

@media (max-width: 1120px) {
  :root { --sidebar: 236px; }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .workspace-split { grid-template-columns: minmax(260px, .75fr) minmax(0, 1.25fr); }
}
@media (max-width: 900px) {
  .sidebar { transform: translateX(-102%); transition: transform .23s ease; }
  .sidebar.open { transform: translateX(0); }
  .sidebar-close, .menu-button { display: grid !important; }
  .sidebar-scrim { position: fixed; inset: 0; z-index: 25; display: block; border: 0; background: rgba(60,42,38,.45); }
  .app-main { margin-left: 0; }
  .topbar { padding: 0 18px; }
  .content { padding: 25px 18px 50px; }
}
@media (max-width: 768px) {
  .workspace-split { display: block; min-height: 0; }
}
@media (max-width: 640px) {
  .topbar { height: 61px; padding: 0 12px; }
  .content { padding: 19px 12px calc(104px + env(safe-area-inset-bottom)); }
  .page-header { align-items: flex-start; flex-direction: column; }
  .page-header h1 { font-size: 25px; }
  .page-actions { width: 100%; overflow-x: auto; }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .data-table { overflow: visible; }
  .table-row { min-width: 0; grid-template-columns: 1fr auto; gap: 8px; padding: 12px; }
  .table-head { display: none; }
  .table-row > span { display: none; }
  .table-row > .person-cell, .table-row > span:last-child { display: flex; }
  .workspace-profile, .workspace-task { padding: 16px; }
  .mobile-workspace-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-bottom: 8px; padding: 3px; border-radius: 10px; background: var(--line); }
  .mobile-workspace-tabs button { min-height: 44px; border: 0; border-radius: 8px; color: var(--muted); background: transparent; font-size: 12px; font-weight: 800; }
  .mobile-workspace-tabs button.active { color: var(--ink); background: #fff; }
  .workspace-profile.mobile-hidden, .workspace-task.mobile-hidden { display: none; }
  .outcome-grid { grid-template-columns: 1fr; }
  .task-dynamic-fields { grid-template-columns: 1fr; }
  .modal-backdrop { align-items: end; padding: 0; }
  .modal-card { width: 100%; max-height: 92vh; border-radius: 18px 18px 0 0; }
  .modal-actions button { flex: 1; min-height: 44px; }
  .mobile-erp-dock { position: fixed; z-index: 65; right: 10px; bottom: max(9px, env(safe-area-inset-bottom)); left: 10px; display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 5px; padding: 6px; border: 1px solid var(--line); border-radius: 16px; background: rgba(255,255,255,.97); box-shadow: 0 12px 35px rgba(92,55,42,.18); backdrop-filter: blur(12px); }
  .mobile-erp-dock button { min-width: 0; min-height: 53px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 3px; padding: 4px; border: 0; border-radius: 11px; color: var(--muted); background: transparent; font-size: 10px; font-weight: 800; }
  .mobile-erp-dock button.active { color: #fff; background: var(--brand-dark); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
@media (prefers-reduced-transparency: reduce) {
  .sidebar, .topbar, .mobile-erp-dock { backdrop-filter: none; }
  .sidebar { background: #3c2a26; }
  .topbar { background: #fff; }
}
```

- [ ] **Step 6: Verify build**

Run `npm run build` — expected: PASS (vite outputs `dist/`). Run `npm run typecheck` — expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold MaidMatch prototype + design tokens"
```

---

### Task 2: Roles + visibility (`lib/roles.ts`)

**Files:**
- Create: `src/lib/roles.ts`
- Test: `tests/roles.test.ts`

**Interfaces:**
- Produces: `RoleId`, `ROLES`, `NavKey`, `ROLE_ACCESS`, `canAccess(role, key)`, `visibleNav(role)`.

- [ ] **Step 1: Write the failing test**

`tests/roles.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canAccess, visibleNav, ROLE_ACCESS, type NavKey } from "../src/lib/roles";

const ALL: NavKey[] = ["dashboard", "teamwork", "reception", "retraction", "media", "publishing", "users", "roles", "config"];

describe("role visibility", () => {
  it("admins see everything", () => {
    for (const role of ["sysadmin", "superadmin"] as const) {
      expect(visibleNav(role)).toEqual(ALL);
    }
  });

  it("retractor sees reception, retraction and publishing (not media/config)", () => {
    expect(visibleNav("retractor")).toEqual(["dashboard", "teamwork", "reception", "retraction", "publishing"]);
    expect(canAccess("retractor", "media")).toBe(false);
    expect(canAccess("retractor", "config")).toBe(false);
  });

  it("media sees only media flow", () => {
    expect(visibleNav("media")).toEqual(["dashboard", "teamwork", "media"]);
    expect(canAccess("media", "publishing")).toBe(false);
  });

  it("sales sees publishing only", () => {
    expect(visibleNav("sales")).toEqual(["dashboard", "teamwork", "publishing"]);
    expect(canAccess("sales", "retraction")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm test` — expected: FAIL (cannot resolve `../src/lib/roles`).

- [ ] **Step 3: Implement**

```ts
export type RoleId = "sysadmin" | "superadmin" | "retractor" | "media" | "sales";

export const ROLES: { id: RoleId; label: string }[] = [
  { id: "sysadmin", label: "System Admin" },
  { id: "superadmin", label: "Super Admin" },
  { id: "retractor", label: "Retractor" },
  { id: "media", label: "Media Team" },
  { id: "sales", label: "Sales" },
];

export type NavKey =
  | "dashboard" | "teamwork" | "reception"
  | "retraction" | "media" | "publishing"
  | "users" | "roles" | "config";

export const ROLE_ACCESS: Record<RoleId, NavKey[]> = {
  sysadmin: ["dashboard","teamwork","reception","retraction","media","publishing","users","roles","config"],
  superadmin: ["dashboard","teamwork","reception","retraction","media","publishing","users","roles","config"],
  retractor: ["dashboard","teamwork","reception","retraction","publishing"],
  media: ["dashboard","teamwork","media"],
  sales: ["dashboard","teamwork","publishing"],
};

export const ADMIN_ROLES: RoleId[] = ["sysadmin", "superadmin"];

export function canAccess(role: RoleId, key: NavKey): boolean {
  return ROLE_ACCESS[role].includes(key);
}

export function visibleNav(role: RoleId): NavKey[] {
  return ROLE_ACCESS[role];
}
```

- [ ] **Step 4: Run to verify it passes**

Run `npm test` — expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roles.ts tests/roles.test.ts && git commit -m "feat: role visibility matrix"
```

---

### Task 3: Stages / nav tree (`lib/stages.ts`)

**Files:**
- Create: `src/lib/stages.ts`
- Test: `tests/stages.test.ts`

**Interfaces:**
- Produces: `Stage`, `TaskType`, `OutcomeType`, `Platform`, `TASK_TYPE_LABEL`, `OUTCOME_LABEL`, `PLATFORMS`, `NAV_TREE`, `queueTaskType(stage)`, `isTerminal(stage)`, `activeStages`.

- [ ] **Step 1: Write the failing test**

`tests/stages.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { queueTaskType, isTerminal, PLATFORMS, NAV_TREE } from "../src/lib/stages";

describe("stages", () => {
  it("maps active stages to task types", () => {
    expect(queueTaskType("PendingRetraction")).toBe("retraction");
    expect(queueTaskType("PendingShooting")).toBe("shooting");
    expect(queueTaskType("PendingEditing")).toBe("editing");
    expect(queueTaskType("AvailablePendingPublishing")).toBe("publishing");
    expect(queueTaskType("AvailablePublished")).toBe("available");
    expect(queueTaskType("UnderTrial")).toBe("trial");
  });

  it("archive/terminal stages have no task type", () => {
    for (const s of ["RetractedToCC", "MovedToOffboard", "Hired", "Cancelled", "Reception"] as const) {
      expect(queueTaskType(s)).toBeNull();
      if (s !== "Reception") expect(isTerminal(s)).toBe(true);
    }
    expect(isTerminal("Reception")).toBe(false);
  });

  it("publishing stage has 5 subscreens, media has 3, retraction has 4", () => {
    const pub = NAV_TREE.find((n) => n.key === "publishing");
    const media = NAV_TREE.find((n) => n.key === "media");
    const ret = NAV_TREE.find((n) => n.key === "retraction");
    expect(pub!.children?.length).toBe(5);
    expect(media!.children?.length).toBe(3);
    expect(ret!.children?.length).toBe(4);
  });

  it("publish platforms are ordered maidmatch, peekaboo, yaya", () => {
    expect(PLATFORMS).toEqual(["maidmatch", "peekaboo", "yaya"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm test` — expected: FAIL (cannot resolve `../src/lib/stages`).

- [ ] **Step 3: Implement**

```ts
export type Stage =
  | "Reception"
  | "PendingRetraction" | "PendingShooting" | "PendingEditing"
  | "AvailablePendingPublishing" | "AvailablePublished" | "UnderTrial"
  | "RetractedToCC" | "MovedToOffboard" | "Hired" | "Cancelled";

export type TaskType = "retraction" | "shooting" | "editing" | "publishing" | "available" | "trial";
export type OutcomeType = "RetractedToCC" | "MovedToOffboard" | "RetractedToMaidMatch" | "ProductionDone" | "Hired" | "Cancelled";
export type Platform = "maidmatch" | "peekaboo" | "yaya";

export const PLATFORMS: Platform[] = ["maidmatch", "peekaboo", "yaya"];

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  retraction: "Pending Retraction",
  shooting: "Pending Shooting",
  editing: "Pending Editing",
  publishing: "Available Pending Publishing",
  available: "Available & Published",
  trial: "Under Trial",
};

export const OUTCOME_LABEL: Record<OutcomeType, string> = {
  RetractedToCC: "Retracted to CC",
  MovedToOffboard: "Moved to Offboard",
  RetractedToMaidMatch: "Retracted to MaidMatch",
  ProductionDone: "Production Done",
  Hired: "Hired",
  Cancelled: "Cancelled",
};

const TERMINAL: Stage[] = ["RetractedToCC", "MovedToOffboard", "Hired", "Cancelled"];

export function isTerminal(stage: Stage): boolean {
  return TERMINAL.includes(stage);
}

export const STAGE_TO_TASK: Partial<Record<Stage, TaskType>> = {
  PendingRetraction: "retraction",
  PendingShooting: "shooting",
  PendingEditing: "editing",
  AvailablePendingPublishing: "publishing",
  AvailablePublished: "available",
  UnderTrial: "trial",
};

export function queueTaskType(stage: Stage): TaskType | null {
  return STAGE_TO_TASK[stage] ?? null;
}

export interface NavNode {
  key: string;
  label: string;
  kind: "link" | "group";
  children?: { key: string; label: string; kind: "queue" | "archive" }[];
}

export const NAV_TREE: NavNode[] = [
  { key: "dashboard", label: "Dashboard", kind: "link" },
  { key: "teamwork", label: "My Team's Work", kind: "link" },
  { key: "reception", label: "Reception", kind: "link" },
  { key: "retraction", label: "Retraction", kind: "group", children: [
    { key: "PendingRetraction", label: "Pending Retraction", kind: "queue" },
    { key: "MovedToOffboard", label: "Moved to Offboard", kind: "archive" },
    { key: "RetractedToCC", label: "Retracted to CC", kind: "archive" },
    { key: "RetractedToMaidMatch", label: "Retracted to MaidMatch", kind: "archive" },
  ]},
  { key: "media", label: "Media & Production", kind: "group", children: [
    { key: "PendingShooting", label: "Pending Shooting", kind: "queue" },
    { key: "PendingEditing", label: "Pending Editing", kind: "queue" },
    { key: "ProductionDone", label: "Production Done", kind: "archive" },
  ]},
  { key: "publishing", label: "Publishing", kind: "group", children: [
    { key: "AvailablePendingPublishing", label: "Available Pending Publishing", kind: "queue" },
    { key: "AvailablePublished", label: "Available & Published", kind: "queue" },
    { key: "UnderTrial", label: "Under Trial", kind: "queue" },
    { key: "Hired", label: "Hired", kind: "archive" },
    { key: "Cancelled", label: "Cancelled", kind: "archive" },
  ]},
  { key: "users", label: "Users", kind: "link" },
  { key: "roles", label: "Roles", kind: "link" },
  { key: "config", label: "System Configuration", kind: "link" },
];
```

- [ ] **Step 4: Run to verify it passes**

Run `npm test` — expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stages.ts tests/stages.test.ts && git commit -m "feat: stages, nav tree, queue/archive mapping"
```

---

### Task 4: Retraction priority (`lib/priority.ts`)

**Files:**
- Create: `src/lib/priority.ts`
- Test: `tests/priority.test.ts`

**Interfaces:**
- Consumes: `Task`, `Housemaid` types (defined in Task 6, but this module only needs structural types — declare a minimal local `SortableMaid` shape to avoid the dependency). Use `sortRetraction(tasks, byId, algorithm)` where `byId` is `Map<string, { createdAt: number; nationality: string; isGoldenProfile: boolean }>`.
- Produces: `PriorityAlgorithm`, `sortRetraction`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { sortRetraction, type SortableMaid } from "../src/lib/priority";

function m(createdAt: number, nationality: string, isGoldenProfile = false): SortableMaid {
  return { createdAt, nationality, isGoldenProfile };
}

describe("sortRetraction", () => {
  const order = (arr: SortableMaid[]) => arr.map((x) => x.createdAt);

  it("FIFO keeps created order", () => {
    const a = m(1, "Filipino"), b = m(2, "Ethiopian"), c = m(3, "Filipino");
    expect(order(sortRetraction([c, a, b], "FIFO"))).toEqual([1, 2, 3]);
  });

  it("LIFO reverses created order", () => {
    const a = m(1, "Filipino"), b = m(2, "Ethiopian"), c = m(3, "Filipino");
    expect(order(sortRetraction([a, b, c], "LIFO"))).toEqual([3, 2, 1]);
  });

  it("FILIPINA puts Filipina first (stable within group)", () => {
    const a = m(1, "Ethiopian"), b = m(2, "Filipino"), c = m(3, "Kenyan"), d = m(4, "Filipino");
    expect(sortRetraction([a, b, c, d], "FILIPINA").map((x) => x.nationality))
      .toEqual(["Filipino", "Filipino", "Ethiopian", "Kenyan"]);
  });

  it("GOLDEN puts golden profiles first", () => {
    const a = m(1, "Ethiopian"), b = m(2, "Filipino", true), c = m(3, "Kenyan");
    expect(sortRetraction([a, b, c], "GOLDEN").map((x) => x.isGoldenProfile))
      .toEqual([true, false, false]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm test` — expected: FAIL.

- [ ] **Step 3: Implement**

```ts
export type PriorityAlgorithm = "FIFO" | "LIFO" | "FILIPINA" | "GOLDEN";

export interface SortableMaid {
  createdAt: number;
  nationality: string;
  isGoldenProfile: boolean;
}

export function sortRetraction(tasks: SortableMaid[], algorithm: PriorityAlgorithm): SortableMaid[] {
  const copy = [...tasks];
  switch (algorithm) {
    case "FIFO": return copy.sort((a, b) => a.createdAt - b.createdAt);
    case "LIFO": return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "FILIPINA": {
      const isFil = (x: SortableMaid) => /filipin/i.test(x.nationality);
      return copy.sort((a, b) => Number(isFil(b)) - Number(isFil(a)) || a.createdAt - b.createdAt);
    }
    case "GOLDEN":
      return copy.sort((a, b) => Number(b.isGoldenProfile) - Number(a.isGoldenProfile) || a.createdAt - b.createdAt);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run `npm test` — expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/priority.ts tests/priority.test.ts && git commit -m "feat: retraction priority sort"
```

---

### Task 5: Active working hours + AVG time (`lib/hours.ts`)

**Files:**
- Create: `src/lib/hours.ts`
- Test: `tests/hours.test.ts`

**Interfaces:**
- Consumes: `WorkingHours = { startHour: number; endHour: number }`, `daysOff: number[]` (0=Sun … 6=Sat).
- Produces: `activeHoursBetween(startMs, endMs, workingHours, daysOff)`, `avgActiveHours(spans, workingHours, daysOff)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { activeHoursBetween, avgActiveHours } from "../src/lib/hours";

// 2026-09-07 is a Monday. 08:00–20:00 local, no days off.
const MON = new Date(2026, 8, 7, 8, 0, 0).getTime();   // Mon 08:00
const TUE = new Date(2026, 8, 8, 8, 0, 0).getTime();   // Tue 08:00
const WH = { startHour: 8, endHour: 20 };

describe("active hours", () => {
  it("counts only working hours within a single day", () => {
    // 08:00 → 14:00 = 6h
    expect(activeHoursBetween(MON, MON + 6 * 3600_000, WH, [])).toBeCloseTo(6, 2);
  });

  it("skips non-working hours (night)", () => {
    // 20:00 Mon → 08:00 Tue = 0 working hours (20:00–08:00 is outside 8–20)
    const start = new Date(2026, 8, 7, 20, 0, 0).getTime();
    const end = TUE;
    expect(activeHoursBetween(start, end, WH, [])).toBeCloseTo(0, 2);
  });

  it("skips days off", () => {
    // Mon 08:00 → Tue 08:00 with Tuesday (day index 2) off = 12h (Mon 8–20)
    expect(activeHoursBetween(MON, TUE, WH, [2])).toBeCloseTo(12, 2);
  });

  it("averages spans", () => {
    const s1 = [MON, MON + 2 * 3600_000];   // 2h
    const s2 = [MON, MON + 4 * 3600_000];   // 4h
    expect(avgActiveHours([s1, s2], WH, [])).toBeCloseTo(3, 2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm test` — expected: FAIL.

- [ ] **Step 3: Implement**

```ts
export interface WorkingHours { startHour: number; endHour: number; }

export function activeHoursBetween(startMs: number, endMs: number, wh: WorkingHours, daysOff: number[]): number {
  if (endMs <= startMs) return 0;
  let total = 0;
  const cur = new Date(startMs);
  // step through the span in hour increments (sufficient for prototype precision)
  let t = startMs;
  while (t < endMs) {
    const d = new Date(t);
    const hour = d.getHours();
    const day = d.getDay();
    const isWorkingDay = !daysOff.includes(day);
    if (isWorkingDay && hour >= wh.startHour && hour < wh.endHour) {
      const hourStart = t;
      const hourEnd = Math.min(hourStart + 3600_000, endMs);
      total += Math.max(0, hourEnd - hourStart) / 3600_000;
    }
    t += 3600_000;
  }
  return total;
}

export function avgActiveHours(spans: [number, number][], wh: WorkingHours, daysOff: number[]): number {
  if (spans.length === 0) return 0;
  const sum = spans.reduce((acc, [s, e]) => acc + activeHoursBetween(s, e, wh, daysOff), 0);
  return sum / spans.length;
}
```

- [ ] **Step 4: Run to verify it passes**

Run `npm test` — expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hours.ts tests/hours.test.ts && git commit -m "feat: active working hours + AVG time"
```

---

### Task 6: Types + seed data (`data.ts`)

**Files:**
- Create: `src/data.ts`

**Interfaces:**
- Consumes: `RoleId` (Task 2), `Stage/TaskType/OutcomeType/Platform` (Task 3), `PriorityAlgorithm` (Task 4), `WorkingHours` (Task 5).
- Produces: `Housemaid`, `Complaint`, `Task`, `Outcome`, `SystemConfig`, `User`, `Preferences`, `PREFERENCE_OPTIONS`, `HOUSEMAID_TYPE_OPTIONS`, `NATIONALITY_OPTIONS`, `seedHousemaids`, `seedUsers`, `defaultConfig`, `seedState`.

- [ ] **Step 1: Implement types + constants**

```ts
import type { RoleId } from "./lib/roles";
import type { Stage, TaskType, OutcomeType, Platform } from "./lib/stages";
import type { PriorityAlgorithm } from "./lib/priority";
import type { WorkingHours } from "./lib/hours";

export type HousemaidType = "MV" | "CC" | "CC to MV";
export interface Complaint { summary: string; erpLink: string; }

export interface Housemaid {
  id: string;
  name: string;
  nationality: string;
  age: number;
  housemaidType: HousemaidType;
  mobile: string;
  whatsapp: string;
  visaExpiry: string;
  passportExpiry: string;
  salary: number;
  employmentHistory: string[];
  complaints: Complaint[];
  isGoldenProfile: boolean;
  preferences: string[];
  maidsCcId: string;
  employerName?: string;
  maidsCcProfileLink?: string;
  currentStage: Stage;
}

export interface Task {
  id: string;
  housemaidId: string;
  type: TaskType;
  status: "open" | "closed";
  assignedRole: RoleId | "None";
  createdAt: number;
  closedAt?: number;
  metadata?: {
    stockPhotoUrl?: string;
    stockVideoUrl?: string;
    finalPhoto?: string;
    finalVideo?: string;
    comment?: string;
    publishState?: Record<Platform, boolean>;
    preferences?: string[];
    employerName?: string;
    maidsCcProfileLink?: string;
  };
}

export interface Outcome {
  id: string;
  housemaidId: string;
  type: OutcomeType;
  timestamp: number;
  actorRole: RoleId;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemConfig {
  breakDurationMinutes: number;
  maxBreaksPerDay: number;
  priorityAlgorithm: PriorityAlgorithm;
  goldenProfile: {
    nationalities: string[];
    ageMin: number;
    ageMax: number;
    visaExpiryMonthsMin: number;
    visaExpiryMonthsMax: number;
    housemaidTypes: HousemaidType[];
  };
  workingHours: WorkingHours;
  daysOff: number[];
  defaultRolePerTask: Record<TaskType, RoleId | "None">;
}

export interface User { id: string; name: string; email: string; roles: RoleId[]; }

export const PREFERENCE_OPTIONS = [
  "She doesn't prefer for the employer to have Babies < 2 yrs",
  "She doesn't prefer for the employer to have a Home in Abu Dhabi",
  "She doesn't prefer for the employer to have a cat",
  "She doesn't prefer for the employer to have a dog",
  "She prefers for the employer to have a private maids' room for her",
  "She doesn't prefer for the employer to have More than 2 kids",
  "She prefers for the employer to give her a Day-off on Sunday",
  "She prefers to be a Live in maid",
  "She prefers to be a Live out maid",
];

export const HOUSEMAID_TYPE_OPTIONS: HousemaidType[] = ["MV", "CC", "CC to MV"];

export const NATIONALITY_OPTIONS = ["Filipino", "Ethiopian", "Kenyan", "Sri Lankan", "Indian", "Nepali"];

export const defaultConfig: SystemConfig = {
  breakDurationMinutes: 15,
  maxBreaksPerDay: 3,
  priorityAlgorithm: "FIFO",
  goldenProfile: {
    nationalities: ["Filipino"],
    ageMin: 25,
    ageMax: 40,
    visaExpiryMonthsMin: 3,
    visaExpiryMonthsMax: 24,
    housemaidTypes: ["MV"],
  },
  workingHours: { startHour: 8, endHour: 20 },
  daysOff: [0, 6],
  defaultRolePerTask: {
    retraction: "retractor",
    shooting: "media",
    editing: "media",
    publishing: "sales",
    available: "sales",
    trial: "sales",
  },
};
```

- [ ] **Step 2: Implement seed data**

Write a helper `mk(id, overrides)` that builds a `Housemaid` with sensible defaults, then export `seedHousemaids: Housemaid[]` (~24 housemaids spread across stages: a few in `Reception`, several in each active stage, one or two in each terminal state) and `seedUsers: User[]` (~8 users, one per role plus admins). Do NOT export a seed-state object — full `AppState` assembly lives in `store.ts` (`makeSeedState`, Task 7), which imports these seeds.

- [ ] **Step 3: Verify build**

Run `npm run typecheck` — expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data.ts && git commit -m "feat: domain types + seed data"
```

---

### Task 7: State machine (`store.ts`)

**Files:**
- Create: `src/store.ts`
- Test: `tests/store.test.ts`

**Interfaces:**
- Consumes: all types from `data.ts`; `defaultRolePerTask` default via `defaultConfig`.
- Produces: `AppState`, `Action`, `reducer(state, action)`, selectors `openTasks`, `queueForStage`, `myTeamWork`, `archiveForOutcome`, `avgTimeByStage`, `maidById`, and action creators. Later tasks dispatch `Action` objects and read via selectors.

- [ ] **Step 1: Write failing tests for the core transitions**

```ts
import { describe, it, expect } from "vitest";
import { reducer, type AppState } from "../src/store";
import { defaultConfig, type Housemaid } from "../src/data";

function maid(stage: Housemaid["currentStage"] = "Reception"): Housemaid {
  return {
    id: "m1", name: "Maria Santos", nationality: "Filipino", age: 31,
    housemaidType: "MV", mobile: "+971501111111", whatsapp: "+971501111111",
    visaExpiry: "2027-05-01", passportExpiry: "2029-01-01", salary: 2200,
    employmentHistory: ["2 yrs, UAE"], complaints: [],
    isGoldenProfile: false, preferences: [], maidsCcId: "MM-1001", currentStage: stage,
  };
}

function base(h: Housemaid[]): AppState {
  return { housemaids: h, tasks: [], outcomes: [], currentRole: "sysadmin", onBreak: false, config: defaultConfig, now: 0 };
}

describe("reducer transitions", () => {
  it("send to retraction creates an open retraction task owned by default role", () => {
    const s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    expect(s.housemaids[0].currentStage).toBe("PendingRetraction");
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({ type: "retraction", status: "open", assignedRole: "retractor" });
  });

  it("retract to CC closes task, records outcome, terminal stage", () => {
    let s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "RETRACT_TO_CC", housemaidId: "m1", actor: "retractor", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("RetractedToCC");
    expect(s.tasks[0].status).toBe("closed");
    expect(s.outcomes).toHaveLength(1);
    expect(s.outcomes[0].type).toBe("RetractedToCC");
  });

  it("retract to maidmatch creates a PendingShooting task (not two stages)", () => {
    let s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "RETRACT_TO_MAIDMATCH", housemaidId: "m1", actor: "retractor", now: 2000, preferences: ["She prefers to be a Live in maid"] });
    expect(s.housemaids[0].currentStage).toBe("PendingShooting");
    expect(s.outcomes.some((o) => o.type === "RetractedToMaidMatch")).toBe(true);
    expect(s.tasks.filter((t) => t.type === "shooting" && t.status === "open")).toHaveLength(1);
    expect(s.tasks.find((t) => t.type === "retraction")!.status).toBe("closed");
  });

  it("editing done records ProductionDone + creates publishing task", () => {
    const s0 = { ...base([maid("PendingEditing")]), tasks: [{ id: "t1", housemaidId: "m1", type: "editing", status: "open" as const, assignedRole: "media" as const, createdAt: 900 }] };
    const s = reducer(s0, { type: "EDITING_DONE", housemaidId: "m1", actor: "media", now: 2000, finalPhoto: "url", finalVideo: "link" });
    expect(s.housemaids[0].currentStage).toBe("AvailablePendingPublishing");
    expect(s.outcomes.some((o) => o.type === "ProductionDone")).toBe(true);
    expect(s.tasks.filter((t) => t.type === "publishing" && t.status === "open")).toHaveLength(1);
  });

  it("cancel requires a reason (throws when missing)", () => {
    const s0 = { ...base([maid("UnderTrial")]), tasks: [{ id: "t1", housemaidId: "m1", type: "trial", status: "open" as const, assignedRole: "sales" as const, createdAt: 900 }] };
    expect(() => reducer(s0, { type: "CANCEL", housemaidId: "m1", actor: "sales", now: 2000, reason: "" })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm test` — expected: FAIL.

- [ ] **Step 3: Implement `reducer` + selectors**

```ts
import type { Housemaid, Outcome, SystemConfig, Task, User } from "./data";
import { defaultConfig, seedHousemaids, seedUsers } from "./data";
import type { RoleId } from "./lib/roles";
import type { OutcomeType, Platform, Stage, TaskType } from "./lib/stages";
import { STAGE_TO_TASK } from "./lib/stages";
import { avgActiveHours } from "./lib/hours";

export interface AppState {
  housemaids: Housemaid[];
  tasks: Task[];
  outcomes: Outcome[];
  users: User[];
  currentRole: RoleId;
  onBreak: boolean;
  config: SystemConfig;
  now: number;
}

export type Action =
  | { type: "SEND_TO_RETRACTION"; housemaidId: string; actor: RoleId; now: number }
  | { type: "RETRACT_TO_CC"; housemaidId: string; actor: RoleId; now: number }
  | { type: "MOVE_TO_OFFBOARD"; housemaidId: string; actor: RoleId; now: number }
  | { type: "RETRACT_TO_MAIDMATCH"; housemaidId: string; actor: RoleId; now: number; preferences: string[] }
  | { type: "DONE_SHOOTING"; housemaidId: string; actor: RoleId; now: number; stockPhotoUrl?: string; stockVideoUrl?: string }
  | { type: "EDITING_DONE"; housemaidId: string; actor: RoleId; now: number; finalPhoto: string; finalVideo?: string }
  | { type: "SEND_BACK_TO_SHOOTING"; housemaidId: string; actor: RoleId; now: number; comment?: string }
  | { type: "FLAG_PLATFORM"; housemaidId: string; platform: Platform; now: number }
  | { type: "UNDER_TRIAL"; housemaidId: string; actor: RoleId; now: number; employerName?: string; maidsCcProfileLink?: string }
  | { type: "HIRED"; housemaidId: string; actor: RoleId; now: number }
  | { type: "SEND_BACK_TO_PUBLISHED"; housemaidId: string; actor: RoleId; now: number }
  | { type: "SEND_BACK_TO_PENDING_PUBLISHING"; housemaidId: string; actor: RoleId; now: number }
  | { type: "CANCEL"; housemaidId: string; actor: RoleId; now: number; reason: string }
  | { type: "SET_ROLE"; role: RoleId }
  | { type: "TOGGLE_BREAK" }
  | { type: "SET_CONFIG"; patch: Partial<SystemConfig> }
  | { type: "RESET"; state: AppState };

let seq = 0;
const nextId = (p: string) => `${p}-${++seq}`;

function defaultRole(state: AppState, taskType: TaskType): RoleId | "None" {
  return state.config.defaultRolePerTask[taskType] ?? "None";
}

function openTaskFor(state: AppState, housemaidId: string, type: TaskType): Task | undefined {
  return state.tasks.find((t) => t.housemaidId === housemaidId && t.type === type && t.status === "open");
}

function closeTask(state: AppState, housemaidId: string, type: TaskType, now: number): Task[] {
  return state.tasks.map((t) =>
    t.housemaidId === housemaidId && t.type === type && t.status === "open"
      ? { ...t, status: "closed", closedAt: now }
      : t
  );
}

function setStage(state: AppState, housemaidId: string, stage: Stage): Housemaid[] {
  return state.housemaids.map((h) => (h.id === housemaidId ? { ...h, currentStage: stage } : h));
}

function newTask(state: AppState, housemaidId: string, type: TaskType, now: number, metadata?: Task["metadata"]): Task {
  return { id: nextId("task"), housemaidId, type, status: "open", assignedRole: defaultRole(state, type), createdAt: now, metadata };
}

function newOutcome(state: AppState, housemaidId: string, type: OutcomeType, actor: RoleId, now: number, note?: string, metadata?: Outcome["metadata"]): Outcome {
  return { id: nextId("outcome"), housemaidId, type, timestamp: now, actorRole: actor, note, metadata };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SEND_TO_RETRACTION": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "Reception") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingRetraction"),
        tasks: [...state.tasks, newTask(state, h.id, "retraction", action.now)],
      };
    }
    case "RETRACT_TO_CC": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "RetractedToCC"),
        tasks: closeTask(state, h.id, "retraction", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "RetractedToCC", action.actor, action.now)],
      };
    }
    case "MOVE_TO_OFFBOARD": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "MovedToOffboard"),
        tasks: closeTask(state, h.id, "retraction", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "MovedToOffboard", action.actor, action.now)],
      };
    }
    case "RETRACT_TO_MAIDMATCH": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingShooting").map((x) =>
          x.id === h.id ? { ...x, preferences: action.preferences } : x
        ),
        tasks: [...closeTask(state, h.id, "retraction", action.now), newTask(state, h.id, "shooting", action.now, { preferences: action.preferences })],
        outcomes: [...state.outcomes, newOutcome(state, h.id, "RetractedToMaidMatch", action.actor, action.now, undefined, { preferences: action.preferences })],
      };
    }
    case "DONE_SHOOTING": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingShooting") return state;
      const prev = openTaskFor(state, h.id, "shooting");
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingEditing"),
        tasks: [...closeTask(state, h.id, "shooting", action.now), newTask(state, h.id, "editing", action.now, { stockPhotoUrl: action.stockPhotoUrl, stockVideoUrl: action.stockVideoUrl, ...(prev?.metadata) })],
      };
    }
    case "EDITING_DONE": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingEditing") return state;
      const prev = openTaskFor(state, h.id, "editing");
      return {
        ...state,
        housemaids: setStage(state, h.id, "AvailablePendingPublishing"),
        tasks: [...closeTask(state, h.id, "editing", action.now), newTask(state, h.id, "publishing", action.now, { publishState: { maidmatch: false, peekaboo: false, yaya: false }, ...(prev?.metadata), finalPhoto: action.finalPhoto, finalVideo: action.finalVideo })],
        outcomes: [...state.outcomes, newOutcome(state, h.id, "ProductionDone", action.actor, action.now, undefined, { finalPhoto: action.finalPhoto, finalVideo: action.finalVideo })],
      };
    }
    case "SEND_BACK_TO_SHOOTING": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingEditing") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingShooting"),
        tasks: [...closeTask(state, h.id, "editing", action.now), newTask(state, h.id, "shooting", action.now, { comment: action.comment })],
      };
    }
    case "FLAG_PLATFORM": {
      const task = openTaskFor(state, action.housemaidId, "publishing");
      if (!task) return state;
      const publishState = { maidmatch: false, peekaboo: false, yaya: false, ...(task.metadata?.publishState), [action.platform]: true };
      const allGreen = Object.values(publishState).every(Boolean);
      const tasks = state.tasks.map((t) => t.id === task.id ? { ...t, metadata: { ...t.metadata, publishState } } : t);
      if (!allGreen) return { ...state, tasks };
      return {
        ...state,
        housemaids: setStage(state, action.housemaidId, "AvailablePublished"),
        tasks: [...tasks.map((t) => (t.id === task.id ? { ...t, status: "closed", closedAt: action.now } : t)), newTask(state, action.housemaidId, "available", action.now)],
      };
    }
    case "UNDER_TRIAL": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "AvailablePublished") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "UnderTrial").map((x) =>
          x.id === h.id ? { ...x, employerName: action.employerName, maidsCcProfileLink: action.maidsCcProfileLink } : x
        ),
        tasks: [...closeTask(state, h.id, "available", action.now), newTask(state, h.id, "trial", action.now, { employerName: action.employerName, maidsCcProfileLink: action.maidsCcProfileLink })],
      };
    }
    case "HIRED": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "Hired"),
        tasks: closeTask(state, h.id, "trial", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "Hired", action.actor, action.now)],
      };
    }
    case "SEND_BACK_TO_PUBLISHED": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      return { ...state, housemaids: setStage(state, h.id, "AvailablePublished"), tasks: [...closeTask(state, h.id, "trial", action.now), newTask(state, h.id, "available", action.now)] };
    }
    case "SEND_BACK_TO_PENDING_PUBLISHING": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      return { ...state, housemaids: setStage(state, h.id, "AvailablePendingPublishing"), tasks: [...closeTask(state, h.id, "trial", action.now), newTask(state, h.id, "publishing", action.now, { publishState: { maidmatch: false, peekaboo: false, yaya: false } })] };
    }
    case "CANCEL": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      if (!action.reason.trim()) throw new Error("Cancellation requires a reason");
      return {
        ...state,
        housemaids: setStage(state, h.id, "Cancelled"),
        tasks: closeTask(state, h.id, "trial", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "Cancelled", action.actor, action.now, action.reason)],
      };
    }
    case "SET_ROLE": return { ...state, currentRole: action.role };
    case "TOGGLE_BREAK": return { ...state, onBreak: !state.onBreak };
    case "SET_CONFIG": return { ...state, config: { ...state.config, ...action.patch } };
    case "RESET": return action.state;
    default: return state;
  }
}
```

Then add selectors (same file):

```ts
export function openTasks(state: AppState, type?: TaskType): Task[] {
  return state.tasks.filter((t) => t.status === "open" && (!type || t.type === type));
}

export function maidById(state: AppState, id: string): Housemaid | undefined {
  return state.housemaids.find((h) => h.id === id);
}

export function myTeamWork(state: AppState): Task[] {
  const open = openTasks(state);
  if (state.currentRole === "sysadmin" || state.currentRole === "superadmin") return open;
  return open.filter((t) => t.assignedRole === state.currentRole);
}

export function archiveForOutcome(state: AppState, type: OutcomeType): Outcome[] {
  return state.outcomes.filter((o) => o.type === type).sort((a, b) => b.timestamp - a.timestamp);
}

export function avgTimeByStage(state: AppState): Partial<Record<Stage, number>> {
  const wh = state.config.workingHours;
  const daysOff = state.config.daysOff;
  const result: Partial<Record<Stage, number>> = {};
  const byType: Record<TaskType, [number, number][]> = { retraction: [], shooting: [], editing: [], publishing: [], available: [], trial: [] };
  for (const t of state.tasks) {
    if (t.closedAt) byType[t.type].push([t.createdAt, t.closedAt]);
  }
  (Object.entries(STAGE_TO_TASK) as [Stage, TaskType][]).forEach(([stage, tt]) => {
    result[stage] = avgActiveHours(byType[tt], wh, daysOff);
  });
  return result;
}

export function makeSeedState(): AppState {
  return {
    housemaids: seedHousemaids,
    users: seedUsers,
    tasks: [],
    outcomes: [],
    currentRole: "sysadmin",
    onBreak: false,
    config: defaultConfig,
    now: Date.now(),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run `npm test` — expected: PASS (both the `EDITING_DONE` and `CANCEL` tests seed their task in the initial state directly, so no seed actions are needed).

- [ ] **Step 5: Commit**

```bash
git add src/store.ts tests/store.test.ts && git commit -m "feat: state machine reducer + selectors"
```

---

### Task 8: UI primitives + Shell

**Files:**
- Create: `src/components/primitives.tsx`, `src/components/Shell.tsx`

**Interfaces:**
- Consumes: `ROLES`, `visibleNav`, `RoleId` (roles.ts); `NAV_TREE` (stages.ts); `AppState` selectors from store; `canAccess`.
- Produces: `Panel`, `StatusPill`, `MetricCard`, `DataTable`, `Modal`, `Toast`, `EmptyState`, `Shell({ state, route, onNavigate, onDispatch })`.

- [ ] **Step 1: primitives.tsx**

Implement each primitive using the CSS classes from Task 1:

```tsx
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function StatusPill({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "info" | "gold"; children: React.ReactNode }) {
  return <span className={`status-pill ${tone !== "neutral" ? tone : ""}`}>{children}</span>;
}
export function MetricCard({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) { ... }
export function EmptyState({ title, hint }: { title: string; hint?: string }) { ... }
export function Modal({ open, title, subtitle, onClose, children, actions }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; actions?: React.ReactNode }) { ... }
export function Toast({ message, tone }: { message: string | null; tone?: "success" | "danger" }) { ... }
```

`DataTable` renders `thead`/`tbody` using `.table-row`/`.table-head` and accepts `columns: { key: string; label: string }[]` plus `rows: React.ReactNode[]` where each row is a `<div className="table-row">` with `<span>` children and a trailing CTA cell.

- [ ] **Step 2: Shell.tsx**

`Shell` renders `.app-shell` → `.sidebar` (brand row, `primary-nav` links, collapsible `.stage-nav` groups from `NAV_TREE` filtered by `visibleNav(currentRole)`, sidebar user footer) + `.app-main` → `.topbar` (menu button, current screen title, `.role-preview` with a `<select>` bound to `SET_ROLE`, notification icon) + `.content` children + `.mobile-erp-dock`. Each nav item shows a live count badge (open tasks for queues, outcome count for archives).

Mobile: `menu-button` toggles `.sidebar.open` + `.sidebar-scrim`; dock maps to Dashboard / My Team's Work / current primary flow.

- [ ] **Step 3: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/primitives.tsx src/components/Shell.tsx && git commit -m "feat: shell + UI primitives"
```

---

### Task 9: Workspace split + profile + outcomes

**Files:**
- Create: `src/components/WorkspaceSplit.tsx`, `src/components/ProfilePanel.tsx`, `src/components/OutcomePanel.tsx`

**Interfaces:**
- Consumes: `Housemaid`, `Task`, `PREFERENCE_OPTIONS` (data.ts); `Action` dispatch.
- Produces:
  - `ProfilePanel({ maid, onOpenComplaints })` — renders `.profile-mini-head` (avatar, name, `.golden-flag` when `isGoldenProfile`), `.profile-quick-grid` (nationality, housemaid type, mobile, whatsapp, visa expiry, passport expiry, age, salary), employment history, complaints (each with "open in maids.cc" CTA).
  - `OutcomePanel({ task, maid, onAction })` — renders `.task-heading` + `.outcome-grid` of outcome buttons for the task type, plus the dynamic fields for the selected outcome, inline validation, and `.task-action-footer` confirm.
  - `WorkspaceSplit({ maid, task, outcomeProps, activePane, onTogglePane })` — two panes with mobile `.mobile-workspace-tabs`.

- [ ] **Step 1: ProfilePanel.tsx**

Render the profile per §8 of the spec. Golden flag uses `.golden-flag`. Complaints map to `.complaint-row` with `maid.complaints[].erpLink` opening the placeholder maids.cc URL (spec Non-Goals: placeholder link).

- [ ] **Step 2: OutcomePanel.tsx**

A `switch (task.type)` maps each task type to its outcome buttons and dynamic fields:
- `retraction`: Retract to CC / Move to Offboarding / Retract to MaidMatch (opens a preferences `Modal` listing `PREFERENCE_OPTIONS` as `.check-row` checkboxes; require ≥1).
- `shooting`: Done shooting → two `.task-input-field` (stock photo URL, stock video URL, optional).
- `editing`: Editing done → final photo (required) + final video (file OR link, one field with toggle); Send back to shooting (optional comment).
- `publishing`: three `.check-row` toggles for MaidMatch/Peekaboo/Yaya dispatching `FLAG_PLATFORM`.
- `available`: Under trial → employer name + maids.cc profile link (optional).
- `trial`: Hired / Send back to Available & Published / Send back to Available & Pending Publishing / Proceed to cancellation (reason `textarea`, required — show `.validation-summary` if empty).

On confirm, dispatch the matching action via `onAction`, then show a `Toast`.

- [ ] **Step 3: WorkspaceSplit.tsx**

Two panes; on mobile use `.mobile-workspace-tabs` + `.mobile-hidden` to switch between profile/task.

- [ ] **Step 4: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/WorkspaceSplit.tsx src/components/ProfilePanel.tsx src/components/OutcomePanel.tsx && git commit -m "feat: split workspace, profile + outcomes"
```

---

### Task 10: Root app + routing + publish timer (`MaidMatchApp.tsx`)

**Files:**
- Create: `src/MaidMatchApp.tsx`

**Interfaces:**
- Consumes: `reducer`, selectors, `AppState`, `makeSeedState`; `Shell`; all screens (tasks 11–18); `makeSeedState`.
- Produces: default-export `MaidMatchApp` (mounted by `main.tsx`).

- [ ] **Step 1: Implement root component**

`MaidMatchApp` holds `useReducer(reducer, undefined, makeSeedState)`, a local `route` string (screen key), and renders `Shell` + the active screen. It runs a `setInterval` (e.g. every 1s) that dispatches `FLAG_PLATFORM` for any open publishing task whose staggered schedule has elapsed (MaidMatch at +3s, Peekaboo at +6s, Yaya at +9s from `task.createdAt`). It also provides a "Reset demo data" action (topbar) dispatching `{ type: "RESET", state: makeSeedState() }`.

The route switch maps `route` → screen component, gated by `canAccess(currentRole, routeKey)`.

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit** (this lands with a stubbed screen switch; screens added next)

```bash
git add src/MaidMatchApp.tsx && git commit -m "feat: root app, routing, publish timer"
```

---

### Task 11: Dashboard

**Files:**
- Create: `src/screens/Dashboard.tsx`

**Interfaces:**
- Consumes: selectors `openTasks`, `avgTimeByStage`, `archiveForOutcome`; `Housemaid`/`Task`; `TASK_TYPE_LABEL`, `PLATFORMS`.

- [ ] **Step 1: Implement**

`.page-stack` with:
- Greeting header (`.page-header`).
- `.metrics-grid` of `MetricCard`s: entered retraction count, retraction-outcome breakdown (→ CC / → MaidMatch / → Offboard), available-pending vs available-published counts, pending shooting / pending editing.
- A "time-in-step" `Panel` listing `avgTimeByStage` values (formatted hours) for each active stage.
- Hired count + success ratio (Hired ÷ total that ever reached Publishing), plus a compact per-stage pipeline readout.

Derive counts from `state.housemaids` `currentStage` and `state.outcomes`.

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Dashboard.tsx && git commit -m "feat: dashboard KPIs"
```

---

### Task 12: My Team's Work

**Files:**
- Create: `src/screens/TeamWork.tsx`

**Interfaces:**
- Consumes: `myTeamWork`, `maidById`; `currentRole`, `onBreak`.

- [ ] **Step 1: Implement**

`.page-header` with an **"On Break"** `secondary-button` (toggles `TOGGLE_BREAK`; when on break show a `.status-pill.info`). Body is a `DataTable` of `myTeamWork` tasks (maid name via `maidById`, task type label, age-due indicator). Each row's CTA opens the task workspace. Empty state when none.

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/TeamWork.tsx && git commit -m "feat: my team's work + on break"
```

---

### Task 13: Reception

**Files:**
- Create: `src/screens/Reception.tsx`

**Interfaces:**
- Consumes: `Housemaid` where `currentStage === "Reception"`; `SEND_TO_RETRACTION` dispatch.

- [ ] **Step 1: Implement**

Search input filters reception maids by name / mobile / whatsapp / `maidsCcId` (case-insensitive substring). Results `DataTable` columns: name (+ avatar), mobile, whatsapp, nationality, maids.cc id, age, visa expiry. Each row's trailing CTA is a `.primary-button.small` "Send to Retraction Team" dispatching `SEND_TO_RETRACTION`, then `Toast`.

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Reception.tsx && git commit -m "feat: reception search + send to retraction"
```

---

### Task 14: Retraction screens

**Files:**
- Create: `src/screens/Retraction.tsx`

**Interfaces:**
- Consumes: `openTasks(_, "retraction")`, `sortRetraction` + `config.priorityAlgorithm`, `archiveForOutcome`, `OUTCOME_LABEL`; `WorkspaceSplit`/`ProfilePanel`/`OutcomePanel`.

- [ ] **Step 1: Implement queue + archive**

`PendingRetraction`: build the sorted list via `sortRetraction` (mapping tasks → `{ createdAt, nationality, isGoldenProfile }` from `maidById`). Render a `DataTable` where **only the first row** has an enabled "Open Task" `.primary-button.small`; every subsequent row shows a lock icon + disabled button and a `.status-pill` "Locked — finish first". Opening a task routes to the split workspace with that task/maid.

Archive subscreens (`MovedToOffboard`, `RetractedToCC`, `RetractedToMaidMatch`): read-only `DataTable` over `archiveForOutcome(type)` joined to `maidById` (name, nationality, date/outcome metadata).

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Retraction.tsx && git commit -m "feat: retraction queue (locked) + archives"
```

---

### Task 15: Media & Production screens

**Files:**
- Create: `src/screens/MediaProduction.tsx`

**Interfaces:**
- Consumes: `openTasks(_, "shooting")`, `openTasks(_, "editing")`, `archiveForOutcome("ProductionDone")`; `WorkspaceSplit`.

- [ ] **Step 1: Implement**

`PendingShooting`: free-select grid of open shooting tasks → "Open Task" → split workspace (outcome "Done shooting" per Task 9).
`PendingEditing`: free-select grid of open editing tasks → split workspace (outcomes "Editing done" / "Send back to shooting"; left panel also shows `task.metadata.stockPhotoUrl`/`stockVideoUrl`).
`ProductionDone`: read-only archive over `archiveForOutcome("ProductionDone")` (name, nationality, final photo/video links).

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MediaProduction.tsx && git commit -m "feat: media & production flows"
```

---

### Task 16: Publishing screens

**Files:**
- Create: `src/screens/Publishing.tsx`

**Interfaces:**
- Consumes: `openTasks` (publishing/available/trial), `archiveForOutcome` (Hired/Cancelled), `PLATFORMS`, `PLATFORM` labels; `FLAG_PLATFORM` dispatch; `WorkspaceSplit`.

- [ ] **Step 1: Implement**

`AvailablePendingPublishing`: grid with columns Name / Nationality / Age / MaidMatch / Peekaboo / Yaya. Each platform cell is a `.platform-cell` with an `<i>` showing `.green` when `task.metadata.publishState[platform]` is true; clicking a cell (manual flag) dispatches `FLAG_PLATFORM`. The staggered timer in `MaidMatchApp` also drives these greens. Rows auto-move out when all green (handled by the reducer).

`AvailablePublished`: grid → "Open Task" → outcome "Under trial".
`UnderTrial`: grid → outcomes per Task 9.
`Hired` / `Cancelled`: read-only archives.

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Publishing.tsx && git commit -m "feat: publishing flow + staggered auto-publish"
```

---

### Task 17: Users + Roles

**Files:**
- Create: `src/screens/UsersScreen.tsx`, `src/screens/RolesScreen.tsx`

**Interfaces:**
- Consumes: `User`, `ROLES`, `RoleId`.

- [ ] **Step 1: UsersScreen**

Table of users (name, email, roles as `.status-pill` list). "Invite user" `Modal` with name + email + multi-role checkboxes (Google SSO mock — no password field). Appending to local state via a new `ADD_USER` action (add to `store.ts` — a trivial reducer case, or keep users in local component state for the prototype; prefer adding `ADD_USER` to `store.ts` with a matching test in `tests/store.test.ts`).

- [ ] **Step 2: RolesScreen**

Cards (`.roles-grid`) for the 5 roles showing member count (from users) and a one-line description. Read-only in the prototype.

- [ ] **Step 3: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/UsersScreen.tsx src/screens/RolesScreen.tsx && git commit -m "feat: users + roles screens"
```

---

### Task 18: System Configuration

**Files:**
- Create: `src/screens/SystemConfig.tsx`

**Interfaces:**
- Consumes: `SystemConfig`, `SET_CONFIG`, `HOUSEMAID_TYPE_OPTIONS`, `NATIONALITY_OPTIONS`.

- [ ] **Step 1: Implement**

A form of `.panel`s dispatching `SET_CONFIG` patches:
- Break duration (number) + max breaks/day (number).
- Priority algorithm (select: FIFO/LIFO/Filipina/Golden).
- Golden profile definition: nationality multi-select, age min/max, visa-expiry months min/max, housemaid type multi-select.
- Working hours (start/end selects) + days off (multi-select).
- Default assigned role per task (table: each task type → role select, "None" allowed).

"Reset demo data" button dispatches `RESET`.

- [ ] **Step 2: Verify build**

Run `npm run build` — expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SystemConfig.tsx && git commit -m "feat: system configuration"
```

---

### Task 19: Playwright smoke test + deploy + README

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `README.md`

**Interfaces:**
- Consumes: `npm run dev` / built `dist` via `vite preview`.

- [ ] **Step 1: playwright.config.ts**

```ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:4173", viewport: { width: 1280, height: 800 } },
  webServer: { command: "npm run build && npm run preview -- --port 4173", url: "http://localhost:4173", reuseExistingServer: true },
});
```

- [ ] **Step 2: smoke.spec.ts**

One end-to-end flow: switch "View as" to System Admin → Reception → search a seed maid → "Send to Retraction Team" → open Retraction → open first task → "Retract to MaidMatch" + pick a preference → Pending Shooting → "Done shooting" → Pending Editing → "Editing done" → Available Pending Publishing → wait for staggered greens → Available & Published → "Under trial" → Under Trial → "Hired". Assert the maid appears on the Hired archive.

```ts
import { test, expect } from "@playwright/test";
test("retraction to hired happy path", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reception" }).click();
  await page.getByPlaceholder(/search/i).fill("Maria");
  await page.getByRole("button", { name: /Send to Retraction Team/i }).first().click();
  await page.getByRole("button", { name: "Pending Retraction" }).click();
  await page.getByRole("button", { name: "Open Task" }).first().click();
  await page.getByRole("button", { name: "Retract to MaidMatch" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Pending Shooting" }).click();
  await page.getByRole("button", { name: "Open Task" }).first().click();
  await page.getByRole("button", { name: "Done shooting" }).click();
  await page.getByRole("button", { name: "Pending Editing" }).click();
  await page.getByRole("button", { name: "Open Task" }).first().click();
  await page.getByRole("button", { name: "Editing done" }).click();
  // await staggered auto-publish
  await expect(page.getByText("Available & Published")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Open Task" }).first().click();
  await page.getByRole("button", { name: "Under trial" }).click();
  await page.getByRole("button", { name: "Hired" }).click();
  await page.getByRole("button", { name: "Hired" }).first().click();
  await expect(page.getByText("Maria")).toBeVisible();
});
```

(Adjust button labels to match the exact copy used in the components; ensure every CTA has an accessible `name`.)

- [ ] **Step 3: Run smoke test**

Run `npm run e2e` — expected: PASS.

- [ ] **Step 4: README.md**

Document: what it is, `npm install && npm run dev`, `npm run build` (deploys `dist/` to GitHub Pages), `npm test`, `npm run e2e`, and the "View as role" demo instructions.

- [ ] **Step 5: Final verification**

Run `npm run build && npm test && npm run e2e` — expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e README.md && git commit -m "test: e2e smoke + deploy + docs"
```

---

## Self-Review Notes

- **Spec coverage:** all 9 nav entries + 12 subscreens, role visibility matrix, state machine (incl. the three-entity separation and the staggered publish), dashboard KPIs, on-break, reception search, locked retraction queue, system config fields, Apple/mobile polish — each maps to a task above.
- **Type consistency:** `RoleId`, `Stage`, `TaskType`, `OutcomeType`, `Platform`, `SystemConfig`, `AppState`/`Action` names are used identically across tasks.
