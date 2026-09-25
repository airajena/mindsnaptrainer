# Decisions

Choices made where the PRD / tech plan were silent or ambiguous. Newest last.

## D1 — TypeScript 5.9, not 7.0 (M0)
TypeScript 7.0 (the native compiler) is the latest npm release, but Next.js 16.3 still depends on the TS 5 compiler API for its type-check step and plugin. Pinned to `^5` as scaffolded by `create-next-app`. Revisit when Next supports TS 7.

## D2 — No `uuid` package (M0)
UUIDv7 is ~15 lines on top of `crypto.getRandomValues`, so it lives in `platform/` instead of adding a dependency.

## D3 — `cn()` without clsx / tailwind-merge (M0)
Components are written so their classes never conflict, so merging isn't needed. Saves ~7 KB gzip against the landing budget.

## D4 — Test hooks gated by `NEXT_PUBLIC_TEST_HOOKS` (M0)
`/lab`, `?seed=` and `?debug=1` are on in `next dev` and in builds made with `NEXT_PUBLIC_TEST_HOOKS=1` (`pnpm build:test`, used by e2e and CI). In a normal production build the flag is a compile-time constant `false`, so the code is dead-code-eliminated and the routes 404.

## D5 — Dark theme only, no pre-paint theme script (M0)
Light theme is V1.1. With one theme, `data-theme="dark"` is rendered statically on `<html>`, so no inline script is needed yet. The light tokens are already defined under `:root[data-theme="light"]` as the seam.

## D6 — `pnpm` scripts use the shell emulator (M0)
`.npmrc` sets `shell-emulator=true` so `VAR=1 cmd` scripts work on Windows and in CI without `cross-env`.

## D7 — Lighthouse CI installed at M8 (M0)
`@lhci/cli` pulls in a large tree and is only needed for the perf pass, so it's added in M8 rather than at scaffold time. The `lh` script is reserved now.

## D8 — Engine type additions beyond TECH_PLAN §6.1 (M1)
- `RoundPlan.attempt`: the replay count for a round index. The round seed is `hash(sessionSeed, index, attempt)`, so a voided round replays with a fresh pattern and the session stays reproducible from one seed.
- The `recall` phase carries `selection` (sorted) alongside `events`. It's derivable from `events`, but every cell render and every TOGGLE needs it; a property test asserts the two always agree.
- `RECALL_TIMEOUT { t }` event: PRD §10 says a timeout auto-submits the current selection, but `SUBMIT` with zero selections must be a no-op (PRD §20). A separate event keeps both rules, and `RoundResult.timedOut` records it.
- `Mode.plan(state, config)` returns the next `RoundConfig`; the machine derives index and seed itself, so modes can't get seeding wrong.
- `EXPOSURE_DONE` with `reliable: false` voids the round inside the reducer (`dropped-frames`), so the rule lives in one place instead of in each caller.

## D9 — Clustered pattern generator (M1)
TECH_PLAN says "seed 2–4 cluster centres, grow by random neighbour walks until k". Implemented as frontier growth: each step picks a random cluster with free neighbours and adds one of them at random. It always terminates with exactly k cells (a connected grid with a free cell always has a taken cell next to it).

## D10 — Spread fallback is silent (M1)
The spread generator falls back to uniform after 200 rejected draws. TECH_PLAN says to "log in dev", but the engine can't have side effects, so it doesn't log. The fallback only happens on dense small boards, where "spread" is impossible anyway.

## D11 — Exposure reliability rule tightened (M2)
PRD §13.4 voids a round when any frame gap exceeds 2× the frame period. That alone tolerates one dropped frame *at the hide boundary*, which can overshoot by up to 1.5 frames and still count, breaking the ±1-frame promise (PRD §2). An exposure is now reliable only if **both** hold: max gap ≤ 2p and |actual − target| ≤ p, each with 0.5 ms tolerance. The tolerance matters because a gap of exactly one dropped frame (2p) would otherwise flip-flop on float jitter, and WebKit reports whole-millisecond timestamps. The second condition also catches a mid-exposure refresh-rate change (ProMotion throttling). Unit-tested with a simulated display (`platform/exposure.test.ts`).

## D12 — Gesture lock is a board prop (M2)
TECH_PLAN puts `touch-action: none` on every board. Session boards keep that (`data-gestures="locked"`, the default). Decorative boards (the idle landing demo, setup previews) use `touch-action: manipulation`, so the page can still scroll when a thumb lands on them. The `touchstart` blocker only acts while input is enabled.

## D13 — Performance e2e runs serially (M2)
Timing and latency measurements are skewed by CPU contention from parallel Playwright workers. Firefox went from 7 dropped-frame exposures out of 50 with 6 workers to 1 out of 50 with one. Tests tagged `@timing`/`@perf` run in a second, single-worker pass (`pnpm test:e2e` does both).

## D14 — Windows WebKit perf is reported, not asserted (M2)
Playwright's WebKit build on Windows has irregular rAF (43–62 frames per second of exposure, 1 ms timestamps). It says nothing about Safari on macOS or iOS. On `win32` + WebKit, the dropped-frame rate and latency p95 are attached as annotations instead of asserted. The algorithm checks (±½ frame when no frame drops; nothing counted is outside ±1 frame) are still asserted there. CI runs on Linux, where all bars apply.

## D15 — Hit-test splits gaps exactly (M2)
TECH_PLAN's `floor((x − left) / width · n)` puts cell boundaries up to 3g/8 off the gap centres. `hitTest` uses the cell pitch `(size + gap) / n` and a `g/2` shift, so each gap is split exactly down the middle. The gap is read once per gesture from computed style.
