# MaidMatch ERP Prototype

A static React 19 + Vite + TypeScript prototype of the MaidMatch operations ERP. It
models the full lifecycle of a housemaid as she moves through the business:

**Reception → Retraction → Shooting → Editing → Publishing → Available → Under Trial → Hired**

The state machine is client-side only (no backend) and resets on reload. It is meant
to demonstrate the screens, flows, role-based visibility and staggered publishing
behaviour in a browser.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## Building

```bash
npm run build
```

Type-checks the app and produces a production bundle in `dist/`. Because `base` is
`"./"` in `vite.config.ts`, the output is relative-path friendly and can be deployed
as a static site (e.g. GitHub Pages) without further configuration.

To preview the production build locally:

```bash
npm run preview
```

## Tests

```bash
npm test        # unit tests (Vitest) for the reducer, priority, hours, roles and stages
npm run e2e     # Playwright smoke test against the built app
```

`npm run e2e` builds the app, serves `dist/` with `vite preview` on port 4173, and runs
`e2e/smoke.spec.ts` — a single happy-path test that drives one maid from Reception all
the way to the Hired archive (including the locked retraction queue and the staggered
auto-publish timer). If Chromium isn't installed yet, run:

```bash
npx playwright install chromium
```

## View as role demo

The top bar contains a **"Viewing as"** `<select>`. It switches the active role without
any login and changes which navigation entries and screens are visible:

| Role | Sees |
| --- | --- |
| System Admin | Everything (default) |
| Super Admin | Everything |
| Retractor | Dashboard, My Team's Work, Reception, Retraction, Publishing |
| Media Team | Dashboard, My Team's Work, Media & Production |
| Sales | Dashboard, My Team's Work, Publishing |

Screens the current role can't reach render a "You don't have access" empty state.

## Project layout

- `src/screens/` — one component per ERP screen (Reception, Retraction, Media, Publishing, Users, Roles, System Config, Dashboard, Team Work)
- `src/components/` — Shell (nav + topbar), OutcomePanel, ProfilePanel, WorkspaceSplit, primitives
- `src/store.ts` — reducer + seed state (the state machine)
- `src/data.ts` — seed housemaids, users, preferences, config
- `src/lib/` — roles, stages, priority, hours
- `e2e/` — Playwright smoke test
- `tests/` — Vitest unit tests
