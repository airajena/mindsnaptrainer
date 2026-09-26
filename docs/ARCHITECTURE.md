# Architecture

High-level design (HLD): what the system is made of, how the pieces talk to
each other, and why it's shaped this way. For parameter-level detail (types,
algorithms, exact CSS) see [TECH_PLAN.md](TECH_PLAN.md), which this doc
summarizes and links into. For the reasoning behind specific choices, see the
[ADR log](adr/).

## 1. System context

MindSnap Trainer is a **client-only web app** in V1: no backend, no database,
no third-party network calls at runtime. Everything — pattern generation,
scoring, timing, persistence — runs in the browser.

```
┌─────────────────────────┐
│         Browser          │
│  ┌─────────────────────┐ │
│  │   MindSnap Trainer    │ │        No network calls at
│  │   (this app)          │ │        runtime except loading
│  │                       │ │        the app's own assets.
│  │  localStorage  IndexedDB│
│  └─────────────────────┘ │
└─────────────────────────┘
```

V2 (planned, not built) adds an opt-in account and a Postgres backend for
cross-device sync — see [§8](#8-planned-v2-architecture-accounts--sync) and
[TECH_PLAN.md §16](TECH_PLAN.md#16-v2-architecture-accounts--sync). Nothing in
V1 assumes that backend will exist; local storage remains the source of truth
even after V2 ships (local-first sync, not server-first).

## 2. Guiding architectural principle: functional core, imperative shell

The single idea that shapes every layer below:

> Everything that decides **what happens** (which cells light up, whether a
> selection is correct, when a round is done, what the next round's
> difficulty should be) is a **pure function** with no access to the clock,
> randomness, or the DOM. Everything that deals with **time, pixels, and
> input** is pushed to the thinnest possible layer around that core.

This is why the codebase has an `engine/` directory that is unit-testable
without a browser, a DOM, or fake timers — a session can be replayed
deterministically from one seed number, and a test can assert "given this
exact sequence of taps, the score is exactly this" with no flakiness.

## 3. Layers

```
app/            Next.js routes — thin. Renders a layout or a feature screen.
  │
features/      React UI, organized by feature (board, session, setup,
  │             progress, landing, settings). Owns hooks and components.
  │
stores/        Zustand stores. Bridge between React and the engine/platform.
  │
engine/        Pure TypeScript. No React, DOM, clock, or Math.random.
  │             Session state machine, scoring, pattern generation,
  │             training-mode logic, persistence schemas' shape.
  │
platform/      The ONLY code allowed to touch browser APIs directly:
                rAF, performance.now, IndexedDB/localStorage, Vibration,
                Wake Lock, page visibility.
```

**Dependency rule:** `app → features → stores → engine`, and `platform` is a
leaf usable by `features` and `stores`. `engine` imports nothing from any
other layer — it has zero knowledge that a browser exists. This is enforced
by a purity test (`src/engine/__tests__/purity.test.ts`-equivalent check) that
fails the build if `engine/` references `window`, `document`, `Date.now`,
`Math.random`, or a timer.

Why this split, concretely:

- **Determinism.** A whole training session — every pattern, every round
  outcome — is reproducible from one seed number (`?seed=123` in dev/test
  builds). That's what makes e2e tests exact ("tap this pattern, expect
  exactly 100%") instead of approximate.
- **Testability without a browser.** ~99% branch coverage on `engine/` is
  possible because it's plain functions on plain data. No jsdom, no mocked
  timers, no flaky animation-frame polyfills.
- **Timing correctness.** The one place millisecond precision matters
  (pattern exposure) is isolated in `platform/exposure.ts`, reviewed and
  tested in isolation, and never mixed with business logic that doesn't need
  that precision.

## 4. The session state machine

The center of the app is one discriminated-union state machine
(`engine/machine.ts`) with exactly one active **phase** at a time:

```
 setup ──► ready ──► countdown ──► memorize ──► recall ──► result ──► (loop)
            ▲           │             │            │           │
            │           └─── void ◄───┘            │           │
            └──────────────────────────────────────┘           │
                                                                 ▼
                                                             complete
```

- `reduce(state, event) → state` is a **pure function**. No timestamps or
  random numbers are generated inside it — every event that needs one
  carries it as a payload (e.g. `EXPOSURE_DONE { exposure, recallStartedAt }`,
  `TOGGLE { cell, t, op }`). This is what makes the reducer testable with
  plain data and replayable from a log of events.
- Illegal states are unrepresentable by construction: a `pattern` field only
  exists on phases that need it (`countdown`, `memorize`, `recall`); there's
  no `isPlaying: boolean` flag that could disagree with the current phase.
- A `void` phase (dropped frames, tab switched away, viewport resized during
  a timed phase) discards the round's timing data and replays the same round
  index with a new seed — attempt-scoped, so the session's overall seed
  still fully determines every pattern ever shown.

Full type definitions: [TECH_PLAN.md §6.1](TECH_PLAN.md#61-core-types).
Design rationale for specific fields: [ADR log](adr/) and
[DECISIONS.md](DECISIONS.md) (D8, D17, D19).

## 5. The timing pipeline

This is the part of the app the whole product's credibility rests on: when
the spec says "1.00 s exposure," the app has to actually show the pattern for
~1000 ms, know how close it got, and say so.

```
 countdown starts
        │
        ▼
 sample frame period          (median of ~20 rAF deltas — free, countdown
        │                      already takes ≥ 300 ms)
        ▼
 cells get data-lit            (attributes set BEFORE reveal, while hidden)
        │
        ▼
 single rAF: board root        (one attribute flip = one style recalc,
 gets data-reveal="true"        paint only, no layout, no React re-render
        │                       mid-exposure)
        ▼
 rAF loop counts frames,
 tracks max frame gap
        │
        ▼
 hide on the frame closest      board root data-reveal="false"
 to shownAt + target
        │
        ▼
 report actualMs, frame count,  round voided if gap/error rule fails
 reliable: true/false           (see ADR-0002)
```

Why an attribute flip on the board root, and not per-cell state, and not
React state at all: React's commit scheduling can add a frame of jitter
between "I decided to reveal" and "the pixels changed." Writing directly to
the DOM inside the `requestAnimationFrame` callback guarantees the paint
happens in the same frame the callback fires in. Full algorithm:
[TECH_PLAN.md §7](TECH_PLAN.md#7-timing-pipeline-the-heart-of-the-product).

## 6. The input pipeline

Mirrors the timing pipeline's philosophy: latency is part of the product, not
an afterthought.

- One native, non-passive `pointerdown` listener on the board root (not one
  per cell) so `preventDefault()` can block scroll/zoom/text-selection before
  the browser acts on the gesture.
- Cells toggle on **pointer-down**, not click or pointer-up — the visual
  change is scheduled for the very next frame.
- A drag across the board "paints" a run of cells; the first cell touched
  decides whether the drag adds or removes. Coalesced pointer events plus a
  Bresenham line-fill mean a fast swipe at 120 Hz can't skip a cell between
  two sampled points.
- Hit-testing splits the gaps between cells down the middle using the true
  cell pitch (`(size + gap) / n`), so there are no dead zones — every point
  inside the board maps to exactly one cell.
- Each `Cell` subscribes to a single boolean in a Zustand store
  (`selected[i]`), so a tap re-renders exactly one DOM node, not the grid.

Full algorithm and code: [TECH_PLAN.md §8](TECH_PLAN.md#8-input-pipeline).

## 7. State and persistence

| Store | Persisted? | Backing | Holds |
|---|---|---|---|
| `session-store` | No | in-memory (Zustand) | Current `SessionState` from the engine reducer |
| `selection-store` | No | in-memory (Zustand) | Per-cell `boolean[]` for cheap re-renders |
| `settings-store` | Yes | `localStorage` | Theme, haptics, countdown style, saved presets, last-used config |
| `history-store` | Yes | IndexedDB (`idb-keyval`) | Completed sessions, monthly rollups, test results |

Every persisted value is wrapped in a `{ schemaVersion, data }` envelope,
parsed with `zod/mini` on load. A value that fails validation is **moved
aside** to a `quarantine:<key>:<timestamp>` slot rather than deleted or
allowed to crash the app — the user sees a one-line notice, and the app
starts clean. This is the same rule applied uniformly to a corrupted
settings blob, a browser extension that mangled localStorage, or a future
schema migration that has a bug.

History beyond 1,000 sessions is compacted: older individual sessions roll
into per-config-signature monthly aggregates so long-term trend charts don't
grow storage without bound.

Rationale: [DECISIONS.md](DECISIONS.md) D24 (lazy-loaded schemas for bundle
size); full schema shapes: [TECH_PLAN.md §9](TECH_PLAN.md#9-state-and-persistence).

## 8. Planned V2 architecture (accounts + sync)

Not built. Recorded here so a contributor building it starts from the same
plan instead of re-deriving it. See
[TECH_PLAN.md §16](TECH_PLAN.md#16-v2-architecture-accounts--sync) for the
full schema (Postgres tables, RLS policy shape).

The intended shape: Next.js Server Actions/Route Handlers in front of a
managed Postgres (e.g. Supabase or Neon) with row-level security, reached
only after auth. **Local-first is preserved**: IndexedDB stays the source of
truth during play; completed sessions sync up in the background; signing in
for the first time imports existing on-device history (idempotent, keyed by
the UUIDv7 session ids already generated in V1 — this is why V1 uses UUIDv7
instead of an auto-increment id, so no id remapping is needed at sync time).

## 9. Cross-cutting concerns

- **Accessibility** is not a layer on top — it's built into `features/board`
  (ARIA grid roles, live-region announcements, focus management) and
  verified in CI with `@axe-core/playwright`. See
  [UX_SPEC.md](UX_SPEC.md#accessibility) and
  [TECH_PLAN.md §12](TECH_PLAN.md#12-accessibility-implementation).
- **Performance budgets** are enforced in CI, not just aspired to:
  `scripts/check-bundles.mjs` fails the build if a route's own JS exceeds its
  budget; Lighthouse CI fails on median performance below a threshold. See
  [TECH_PLAN.md §10](TECH_PLAN.md#10-performance-engineering) and ADR-0004.
- **Privacy** is architectural, not a settings toggle: there is no analytics
  SDK, no third-party script, and no server to send data to in V1. The
  landing e2e suite (`e2e/landing.spec.ts`) asserts zero third-party network
  requests on every route as a regression test for this property.

## 10. Where to look next

| Question | Doc |
|---|---|
| What is this product and why does it exist? | [PRD.md](PRD.md) |
| Exact types, algorithms, CSS, folder layout | [TECH_PLAN.md](TECH_PLAN.md) |
| Why was X chosen over Y? | [adr/](adr/), [DECISIONS.md](DECISIONS.md) |
| What does the UI look like and how should it feel? | [UX_SPEC.md](UX_SPEC.md) |
| How is this tested, and how do I test my change? | [TEST_PLAN.md](TEST_PLAN.md) |
| How does a change ship? | [RELEASE_PLAN.md](RELEASE_PLAN.md) |
| What was built, when, and with what measurements? | [PROGRESS.md](PROGRESS.md) |
