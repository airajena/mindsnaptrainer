# MindSnap Trainer

A mobile-first web app for training rapid visual memory: a grid flashes a pattern for a precise time, it disappears, and you rebuild it.

- Product spec: [docs/PRD.md](docs/PRD.md)
- Technical plan: [docs/TECH_PLAN.md](docs/TECH_PLAN.md)
- Decisions log: [docs/DECISIONS.md](docs/DECISIONS.md)
- Build progress: [docs/PROGRESS.md](docs/PROGRESS.md)

## Setup

Requires Node ≥ 20.9 and pnpm 10.

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

## Scripts

| Script | What |
|---|---|
| `pnpm dev` | Dev server (test hooks on: `/lab`, `?seed=`) |
| `pnpm build` | Production build |
| `pnpm build:test` | Production build with test hooks, for e2e |
| `pnpm typecheck` | `tsc --noEmit` (strict) |
| `pnpm lint` / `pnpm format` | Biome check / fix |
| `pnpm test` / `pnpm test:coverage` | Vitest unit + property tests |
| `pnpm test:e2e` | Playwright: parallel pass, then timing/perf specs serially (run `pnpm build:test` first) |
| `pnpm check:bundles` | First-load JS budgets (after `pnpm build`) |
| `pnpm lh` | Lighthouse CI on `/`, `/privacy`, `/train` (after `pnpm build`; set `CHROME_PATH` if Chrome isn't installed) |

## Architecture

Functional core, imperative shell:

- `src/engine/` — pure TypeScript: RNG, patterns, scoring, the session state machine, training modes. No React, DOM, clock or `Math.random`.
- `src/platform/` — the only code that touches browser APIs (frame clock, exposure timing, storage, wake lock, haptics).
- `src/stores/` — Zustand stores wrapping the engine.
- `src/features/` — React UI by feature (board, session, setup, progress, landing, settings).
- `src/app/` — Next.js routes.

Dependency direction: `app → features → stores → engine`; `platform` is used by `features` and `stores`.

## Playing on a phone

`pnpm build && pnpm start`, then open `http://<your-computer's-LAN-IP>:3000` on a phone on the same Wi-Fi. `/lab` (dev and `pnpm build:test` builds only) measures exposure timing and tap latency on the device.

## Fonts

`src/app/fonts/` holds Geist (SIL OFL, see LICENSE.txt there) subset to Latin + the symbols the UI uses. If you add text with other characters, regenerate the subsets (DECISIONS D27).
