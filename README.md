<p align="center">
  <img src="godview-logo.png" alt="GodView" width="460" />
</p>

<h1 align="center">GodView</h1>

<p align="center">
  <em>A god-view, globe-based macroeconomics simulator.</em><br>
  Set each country's economic levers — interest rate, tariffs, taxes, spending —
  and watch a fully-coupled model ripple through GDP, inflation, FX, trade,
  employment, inequality and public approval, week by week, on a live 3D Earth.
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca">
  <img alt="Vite 6" src="https://img.shields.io/badge/Vite-6-646cff">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178c6">
  <img alt="No backend" src="https://img.shields.io/badge/backend-none-22c55e">
</p>

> **Note:** The in-app UI is in **Portuguese** (`pt-BR`). The model is a *stylized,
> educational* simulation — directionally sensible, **not predictive**.

---

## What it is

GodView is a client-side "god view" strategy sandbox. You pick a country on a 3D
globe, adjust its macro policy levers, and a tick engine (**1 tick = 1 simulated
week**) propagates the effects across every country through a damped
*influence network* — every variable reads the state of all the others, with the
damping and clamps tuned so the system converges instead of exploding.

The demonstrable causal chain baked into the engine:

```
↑ policy rate → currency appreciates → exports fall → GDP growth cools → inflation cools
```

Everything runs in the browser. **There is no backend** — the simulation executes
in a Web Worker and all data ships as static, version-controlled snapshots.

## Features

- **Interactive 3D globe** (`react-globe.gl` / three.js) with multiple base maps:
  Political, Relief ×10, Satellite, Day/Night ("Agora"), Night lights, Hydrographic.
- **9 economic metrics** color-mapped onto countries: GDP (power), GDP per capita,
  population, growth, inflation, unemployment, inequality, education, approval.
- **Infrastructure layers** you can toggle: air / sea / road / rail routes (real
  geometry), cities, submarine cables, waterways, datacenters, satellites (live
  TLE positions), real-time-ish clouds, and a procedural sky with a correctly
  positioned Sun and Moon.
- **Playable scenarios**: Sandbox (today), Trade War, Inflation Shock, Stagflation,
  Oil Shock — each with an objective and starting conditions.
- **Timeline controls**: play / pause / speed, with time-series charts (Recharts).
- **Per-country panel** to adjust levers and see the internal transport mesh.
- **Real starting data** — a World Bank macro snapshot plus real transport routes
  (sea lanes via `searoute`, great-circle air routes), bilateral trade, and more.

## The simulation model

A small, **damped subset** of the "everything influences everything" model. Each
tick, every variable moves a fraction of the way toward a target computed from the
whole world state, then is clamped to a sane range — making the update a
contraction toward bounded equilibria. Modeled blocks include FX, trade balance,
growth (monetary + fiscal + trade + risk), unemployment (Okun's law), inflation
(Phillips via output *and* unemployment gaps + imported/commodity pass-through),
sovereign risk spread, fiscal balance & debt dynamics, inequality, poverty,
public approval (the game "score"), social unrest, education, and a composite
wellbeing index. See [src/sim/engine.ts](src/sim/engine.ts) and the design study
in [plan.md](plan.md) (§4).

## Tech stack

| Area | Choice |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Globe / 3D | `react-globe.gl`, `three` |
| Charts | Recharts |
| UI primitives | Radix UI (dialog, popover, slider) |
| Simulation | Plain-TS tick engine in a Web Worker |
| Satellites | `satellite.js` (TLE propagation) |
| Sea routes | `searoute-js` |
| Tests | Vitest |

## Getting started

Requires **Node 20+**.

```bash
npm install
npm run dev        # start the dev server → http://localhost:5163
```

Other scripts:

```bash
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build locally
npm run test       # run the Vitest suite
```

## Data pipeline

All runtime data lives as static `.ts`/JSON snapshots under [src/data/](src/data/),
generated offline by the ingestion scripts in [scripts/](scripts/) — they are
**build-time only** and never run in the browser:

| Script | Produces |
|---|---|
| `npm run ingest` | G20 macro snapshot (World Bank: GDP, inflation, debt, population, …) |
| `npm run ingest:trade` | Bilateral trade matrix (UN Comtrade) |
| `npm run ingest:searoute` | Real maritime routes through canals & straits |
| `npm run ingest:roads` | Road / rail corridors |
| `npm run ingest:air` | Great-circle air routes between airports |
| `npm run ingest:cities` | City coordinates & population |

The UN Comtrade ingest needs an API key. Create a `.env` (git-ignored) with:

```
COMTRADE_KEY=your_key_here
```

This key is used **only** by the offline scripts — it is not `VITE_`-prefixed and
never reaches the client bundle.

## Project structure

```
src/
  App.tsx            # top-level shell: metric/layer/scope/basemap controls
  main.tsx           # entry point
  globe/             # GlobeView, route geometry, shaders, metric scales
  sim/               # tick engine, types, Web Worker, tests
  panels/            # country panel, world table, timeline, legend
  state/             # simulation context/store
  data/              # generated static snapshots (countries, trade, routes…)
  assets/textures/   # bundled Earth / cloud / moon textures
scripts/             # offline data-ingestion scripts
plan.md              # product plan & feasibility study (pt-BR)
```

## Deployment (Cloudflare Pages)

The app is a fully static SPA — no server required. Config is checked in:
[wrangler.toml](wrangler.toml) (output dir), [public/_redirects](public/_redirects)
(SPA fallback), and [.node-version](.node-version) (Node 20).

**Git-connected (push-to-deploy, recommended):** connect the repo in the Cloudflare
dashboard → Pages → *Create project*. Build command `npm run build`, output
directory `dist` (auto-detected from `wrangler.toml`).

**Direct upload:**

```bash
npm run build
npx wrangler pages deploy dist
```

## Status

Prototype #1 is built and playable. The main open risk is **model calibration** —
keeping the fully-coupled influence network stable and sensible as more real
relationships are added (see `plan.md` §4.2, "Fase 1.5"). The model is intended
for visualization, strategy and teaching — **not economic forecasting**.
