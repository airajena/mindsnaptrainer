# Progress

## M0 — Scaffold, tokens, tooling, CI (2026-09-25)

**Built**
- Next.js 16.3.6 (App Router, Turbopack), React 19.3, TypeScript 5.9 strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- Tailwind v4 with the TECH_PLAN §3 tokens in `src/styles/tokens.css`, mapped via `@theme inline`. The default Tailwind palette is cleared so only tokens exist.
- Geist Sans and Geist Mono self-hosted via `geist` (`next/font/local`).
- Biome 2.5, Vitest 5 (v8 coverage, ≥ 95% threshold on `src/engine/**`), Playwright 1.63 (Chromium, Firefox, WebKit, Pixel 7, iPhone 14).
- Dev-only token page at `/lab/tokens`, gated by `TEST_HOOKS`.
- GitHub Actions: typecheck → lint → unit + coverage → test build → e2e on 3 engines.

**Tests**: typecheck ✓, lint ✓, unit 1/1 ✓, e2e smoke 10/10 ✓ (includes "no third-party requests").

**Deferred**: Lighthouse CI (`@lhci/cli`) to M8 (D7). Pre-commit hook not added yet; CI enforces lint.

## M1 — Engine (2026-09-25)

**Built** (`src/engine/`, pure TS): `types`, `rng` (mulberry32, splitmix32, round-seed derivation), `bitset` (Uint8Array + hand-rolled base64url), `grid` (neighbours, clusters), `generator` (uniform / spread / clustered), `scoring` (Jaccard), `difficulty` (information bits, bits/s), `config` (limits, normalisation, signatures, defaults), `presets` (PRD §9.2), `analytics` (session summary, pattern features), `modes` (registry + fixed), `machine` (the session reducer).

**Tests**: 201 passing. Table-driven: every event × every phase (88 cases). fast-check properties: scoring invariants, generator invariants for all three styles, bitset round-trip, reducer never throws on any 80-event sequence while keeping the selection, limit and round-count invariants. A purity guard test fails if `engine/` uses the clock, `Math.random`, browser globals, timers or React. Coverage on `engine/`: 99.2% statements, 98% branches, 100% functions.

**Deferred**: `staircase.ts` and the capacity/speed modes to M6 per the build order. `personalBests` and `cellHeatmap` land with history in M5 / V1.1.
