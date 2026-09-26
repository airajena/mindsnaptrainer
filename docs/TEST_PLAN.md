# Test Plan

What's tested, at which layer, with which tool, and why. Testing strategy
was set in [TECH_PLAN.md §14](TECH_PLAN.md#14-testing-strategy); this doc
tracks it against what's actually implemented, plus how to run and extend
each layer. For current pass/fail numbers and measured timing/perf results
from the last full run, see [PROGRESS.md](PROGRESS.md).

## Test pyramid

```
        ┌─────────────┐
        │   Manual     │   Real-device checklist (§7) — not yet executed
        ├─────────────┤
        │   E2E        │   Playwright — 8 spec files, ~93 tests, 3 browsers
        ├─────────────┤
        │  Component   │   Testing Library (as needed alongside unit tests)
        ├─────────────┤
        │  Property    │   fast-check — invariants over generated inputs
        ├─────────────┤
        │  Unit        │   Vitest — every engine module, ~99% branch coverage
        └─────────────┘
```

Lower layers are cheap and run on every save; higher layers are slower and
catch what only a real browser (or a real device) can reveal, like actual
frame timing.

## 1. Unit and property tests — Vitest + fast-check

**Run:** `pnpm test` (watch: `pnpm test:watch`) · **Coverage:** `pnpm test:coverage`

**Scope:** every module in `src/engine/` (see [LLD.md](LLD.md) for each
module's contract) plus platform modules that can be tested without a real
browser (`platform/exposure.ts` via a simulated frame clock).

**What's covered:**

| Area | Technique |
|---|---|
| RNG (`rng.ts`) | Fixed-seed sequences match a snapshot; different seeds diverge |
| Pattern generation (`generator.ts`) | Property: exactly `k` unique in-range cells, sorted, for all 3 styles; same seed ⇒ same pattern |
| Scoring (`scoring.ts`) | Property: `hits+misses=k`, `hits+falseTaps=|S|`, `0≤accuracy≤1`, `accuracy=1 ⇔ S=T`, for randomly generated pattern/selection pairs |
| Bitset (`bitset.ts`) | Property: `decode(encode(x)) == x` for random cell sets and board sizes |
| State machine (`machine.ts`) | Table-driven: every event type × every phase (~90 cases); property: reducer never throws across any random 80-event sequence, selection/limit/round-count invariants hold throughout |
| Staircases (`staircase.ts`) | **Simulation**: a synthetic observer with a known true threshold and a logistic pass-probability curve runs 1,000 simulated sessions per scenario; asserts the estimated threshold converges within a documented tolerance of the true value, for both capacity (3 target levels) and speed (3 target exposures) |
| Exposure timing (`platform/exposure.ts`) | Simulated display driver at 60/90/120/144 Hz, with synthetically dropped frames, asserting the ADR-0002 reliability rule fires exactly when it should |
| History (`history.ts`) | `monthKey`'s pure civil-date arithmetic against known dates; `pruneHistory` conserves round counts across aggregation; `personalBestCallouts` against constructed histories |
| Round-countdown policy (`round-countdown.ts`) | The auto-vs-tap, first-round-vs-later rule from ADR-0006, table-driven over `(setting, roundStart, index, attempt)` |

**Coverage target:** ≥ 95% branches on `src/engine/**` (enforced by Vitest's
coverage thresholds in CI). Last measured: 95.9% branches, 99.4% statements
([PROGRESS.md](PROGRESS.md)).

**Purity guard:** a dedicated test fails if any file under `src/engine/`
references `window`, `document`, `Date` (constructor or `.now()`),
`Math.random`, or a timer — enforcing [ADR-0001](adr/0001-functional-core-imperative-shell.md)
mechanically rather than by convention alone.

**Writing a new unit test:** for engine code, prefer a property test over
several example tests if the function has a checkable invariant (see
`scoring.test.ts` as the template) — it catches edge cases you wouldn't
think to write by hand.

## 2. Component tests — Testing Library

Used where a unit test on pure logic isn't enough to cover a rendering or
event-wiring concern (e.g. does the right ARIA attribute actually land on
the DOM node). Kept minimal by design: most interactive behavior that would
traditionally need a component test is instead covered by the pure
`geometry.ts` hit-test logic (unit-tested directly) plus e2e tests that
exercise the real rendered board.

## 3. End-to-end tests — Playwright

**Run:** `pnpm test:e2e` (runs `pnpm build:test` first if you haven't) —
this executes the parallel suite, then re-runs `@timing`/`@perf`-tagged specs
serially with `--workers=1` (see [ADR-0002](adr/0002-frame-accurate-exposure-reliability-rule.md#negative--accepted-trade-offs)
for why: parallel CPU contention skews real frame timing).

**Browsers:** Chromium, Firefox, WebKit, plus Pixel 7 and iPhone 14 device
emulation projects (touch input, viewport, UA).

| Spec file | Covers |
|---|---|
| `session.spec.ts` | Full seeded sessions score exactly 100% when tapping the known pattern; end-of-session feedback skips per-round results; tab-switch mid-countdown voids and replays with a new seed; browser Back opens "End session?"; full keyboard-only play; the pattern is never in the DOM during recall (`data-lit` count is 0) |
| `input.spec.ts` | Pointer-down toggles before release; fast multi-cell swipe fills a full row; drag-to-deselect; taps in the gaps between cells still hit the correct cell (no dead zones); touch swipe via CDP doesn't scroll the page |
| `timing.spec.ts` `@timing` | 50 rounds at 1000 ms exposure; every *counted* (non-void) exposure is within ±1 frame period of target |
| `auto-rounds.spec.ts` `@perf` | Automatic round start: no countdown digits shown after round 1, no "Start round" button appears, elapsed time from submit to next recall is well under the old tap-driven pacing (ADR-0006) |
| `persistence.spec.ts` | Settings, saved presets, and history survive a reload; "Delete all data" wipes localStorage and IndexedDB; corrupted stored settings are quarantined, never fatal |
| `landing.spec.ts` | Privacy and 404 pages render; **zero third-party network requests on any route** (regression guard for ADR-0005's privacy claim); CLS is 0 from ready through recall |
| `a11y.spec.ts` | `@axe-core/playwright` on landing, privacy, all 3 setup tabs, settings, ready, result, summary, progress — zero serious/critical violations |
| `responsive.spec.ts` | At 320/375/414/768/1024/1440px and one landscape-phone size: no horizontal scroll on any page; the session board stays square, fully visible, with cells ≥ 28px even on a 12×12 board |

`helpers.ts` centralizes seeded-session setup (`startSession`,
`reachRecall`, `playPerfectRound`, `expectedPattern`) so every spec computes
its expected pattern from the same pure `engine/generator.ts` the app uses —
see [ADR-0003](adr/0003-deterministic-seeded-sessions.md).

**Rule for timing-sensitive tests:** never poll the page (e.g.
`expect(...).toBeVisible()` in a loop) while a pattern is on screen — the
automation protocol round-trip can itself cost a dropped frame at high
refresh rates and cause a real, correct void. Timing/perf specs sit still
(a fixed `waitForTimeout`) through countdown + exposure before asserting.

**Known gap:** WebKit's Playwright build on Windows has irregular rAF
timing unrelated to real Safari. Its timing numbers are attached as
annotations, not asserted — see
[ADR-0002](adr/0002-frame-accurate-exposure-reliability-rule.md). CI runs on
Linux, where the full timing assertions apply to all three engines.

## 4. Accessibility testing

`@axe-core/playwright` runs against every non-timed screen (see
`a11y.spec.ts` above) with zero tolerance for serious/critical violations,
as part of the same e2e run. This is a floor, not a substitute for manual
screen-reader and keyboard testing (§7) — automated a11y tools catch
perhaps a third of real accessibility issues.

## 5. Performance testing

**Bundle budgets:** `pnpm check:bundles` (after `pnpm build`) fails if any
route's own JS exceeds its budget on top of the measured framework floor —
see [ADR-0004](adr/0004-bundle-budgets-over-prd-totals.md) for the exact
numbers and why they're measured this way.

**Lighthouse CI:** `pnpm lh` (after `pnpm build`) runs against `/`,
`/privacy`, `/train`, asserting the **median of 3 runs** (not the best-of-3
default, which hid a borderline score in practice — see
[DECISIONS.md](DECISIONS.md) D28): performance ≥ 0.90 is an error, ≥ 0.95 a
warning; accessibility/best-practices/SEO ≥ 0.95 are errors; CLS = 0 is an
error.

## 6. CI pipeline

Defined in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), three
jobs on every PR and push to `main`:

1. **`check`** — install → typecheck → lint (Biome) → unit tests with
   coverage → production build → bundle budget check.
2. **`e2e`** (needs `check`) — install Playwright browsers → test build →
   full e2e suite (parallel then serial perf pass) → uploads the Playwright
   HTML report as an artifact on failure.
3. **`lighthouse`** (needs `check`) — production build → Lighthouse CI →
   uploads the report as an artifact always (pass or fail), for trend
   tracking.

All three must be green to merge (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

## 7. Manual test checklist (not yet executed)

Automated coverage above uses desktop browser engines and Pixel 7/iPhone 14
*emulation*. The following still needs real hardware and is tracked as an
open item ([PROGRESS.md](PROGRESS.md) PRD §22 checklist):

- [ ] Full session, each mode, on a real iPhone (Safari) and a real
      mid/low-range Android phone (Chrome) — tap latency and exposure
      timing on `/lab`, not just functional correctness.
- [ ] Manual confirmation that no scroll/zoom/text-selection/callout is
      possible on the board during recall on real touch hardware (CDP touch
      emulation covers this in CI, but real touch drivers can differ).
- [ ] A tablet (iPad) at both orientations.
- [ ] A real 120Hz+ display (ProMotion iPhone, a 144Hz gaming monitor) to
      sanity-check the frame-clock estimate and reliability rule against
      real variable refresh behavior, not just CI's simulated driver.
- [ ] A screen reader (VoiceOver + Safari, NVDA/JAWS + Chrome) walking the
      full flow: setup → session → results → progress — beyond what axe's
      static analysis can catch.
- [ ] Low-storage / Safari private-mode behavior: confirm the "history can't
      be saved in this browser mode" notice appears correctly, and the app
      remains fully playable without persistence.

If you have access to devices in this list, running this checklist and
filing the results (or a PR fixing what it finds) is a high-value
contribution — see [CONTRIBUTING.md](../CONTRIBUTING.md).

## 8. Regression policy

Every bug fix starts with a failing test that reproduces it — a seeded e2e
repro where the bug is behavioral, a property test where it's an engine
invariant that was violated ([TECH_PLAN.md §13](TECH_PLAN.md#13-coding-standards-and-principles),
rule 19). A fix without a regression test attached will be asked for one in
review.
