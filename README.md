# MindSnap Trainer

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A mobile-first web app for training rapid visual memory: a grid flashes a
pattern for a precise time, it disappears, and you rebuild it from memory.
Frame-accurate exposure timing, adaptive capacity/speed tests, and honest
per-round feedback — no account, and your training data never leaves your
device (see [docs/adr/0007](docs/adr/0007-add-cookieless-page-view-analytics.md)
for the one disclosed, cookieless exception: anonymous page-view counts).
See [docs/PRD.md](docs/PRD.md) for the full product rationale.

This is an independent, open-source project. It is not affiliated with, and
does not claim affiliation with, Matiks or any other game or company.

## Documentation

Start with [ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the system fits
together, or jump straight to whichever doc matches what you're doing:

| Doc | What it's for |
|---|---|
| [PRD.md](docs/PRD.md) | Product requirements — what to build and why, success criteria, scope |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | High-level design: layers, the session state machine, the timing and input pipelines |
| [TECH_PLAN.md](docs/TECH_PLAN.md) | Full technical plan: stack, design tokens, exact algorithms, folder structure |
| [LLD.md](docs/LLD.md) | Low-level design: every `engine/`/`platform/` module's contract and invariants |
| [adr/](docs/adr/) | Architecture Decision Records — the load-bearing decisions and why they were made |
| [DECISIONS.md](docs/DECISIONS.md) | Running log of every ambiguity resolved during the build, in order |
| [UX_SPEC.md](docs/UX_SPEC.md) | Design system and interaction rules: color, motion, a11y, input feel |
| [TEST_PLAN.md](docs/TEST_PLAN.md) | What's tested, at which layer, how to run and extend each layer |
| [RELEASE_PLAN.md](docs/RELEASE_PLAN.md) | Versioning, deployment, rollout strategy, pre-launch checklist |
| [PROGRESS.md](docs/PROGRESS.md) | Build log by milestone, with measured timing/perf/coverage numbers |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to set up, the standards a PR needs to meet, bundle budgets |

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

## Architecture at a glance

Functional core, imperative shell — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture:

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, coding standards
and bundle budgets.

## License

[MIT](LICENSE) for the application source. Bundled fonts under
`src/app/fonts/` are licensed separately under the SIL OFL 1.1.
