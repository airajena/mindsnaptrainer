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

## M2 — Board, timing pipeline, input pipeline, /lab (2026-09-26)

**Built**
- `platform/`: `frame-clock` (median rAF period), `exposure` (rAF reveal/hide as one `data-reveal` flip on the board root, measured `actualMs`, reliability rule D11, `clearLit`), `timing-guards` (void on page hidden, resize, orientation), `visibility`, `haptics`, `seed`.
- `stores/selection-store`: per-board vanilla Zustand store; each cell subscribes to `selected[i]` and `focus === i`.
- `features/board`: `Board` + memoised `Cell` (ARIA grid, positional labels only), `board.css` (no background transitions, touch CSS, forced-colours, reduced motion), `geometry` (dead-zone-free hit test, Bresenham line fill, focus movement), `use-board-input` (native non-passive `pointerdown`, toggle on touch-down, pointer capture, primary pointer only, coalesced events + line fill, first cell sets add/remove, keyboard roving focus, haptics), `timed-exposure` (guards + countdown-concurrent frame sampling + exposure + DOM scrub).
- `/lab` (dev/test builds only): exposure bench (N runs, distribution, frames histogram, ±½ / ±1 frame rates, dropped-frame and void counts), tap-latency meter (p50/p95, Event Timing ≥ 16 ms counter), long-task counter.

**Tests**: 230 unit tests (engine coverage unchanged at 98% branches), including a simulated-display suite for `runExposure` at 60/90/120/144 Hz with dropped frames. E2E: 28 parallel + 6 serial perf tests passing (Chromium, Firefox, WebKit, Pixel 7, iPhone 14 projects). Covered: toggle on pointer-down before release, fast 2-sample swipe fills a whole row, drag-to-deselect, gap clicks hit a cell, keyboard play, touch tap, CDP touch swipe with no page scroll, 50 × 1000 ms exposures.

**Measurements** (headless, Windows 11 dev machine; not a real phone):

| Scenario | Exposure, 100 × 1000 ms | Tap latency (event → next frame) |
|---|---|---|
| Chromium 153 desktop, 60 Hz | 100/100 at 60 frames; mean 999.96 ms; max error 0.1 ms; 0 unreliable | p50 2.2 ms, p95 7.0 ms (mouse) |
| Firefox headless, 144 Hz | 100/100 within ½ frame; max error 3 ms; 10 flagged for dropped frames | p50 4 ms, p95 7 ms (mouse) |
| Pixel 7 emulation, touch | 100/100 at 60 frames; max error 0.2 ms | p50 27.5 ms, p95 31.9 ms (CDP touch) |
| Pixel 7 emulation, touch, 4× CPU throttle | 100/100 within ½ frame; max error 0.2 ms; 0 unreliable | p50 23.9 ms, p95 39.7 ms (CDP touch) |

Latency breakdown (CDP touch, Pixel 7 emulation): our handler + React commit is 0.7 ms p50 / 2.6 ms p95 unthrottled and ~3.5 ms p50 at 4× throttle. The rest is the emulated touch pipeline (~10 ms before the event reaches JS) plus waiting for the next frame. Whether the "1 frame + 8 ms" budget holds needs a real phone.

**Deferred / open**: real-device measurement (iPhone Safari, mid-range Android). Needs a phone on the LAN hitting `pnpm dev` or a test build at `/lab`.

## M3 + M4 + M6 (+ M5 persistence) — Playable app (2026-09-26)

**M3 — session flow**: `/train` is one route with the phase switch (`train-screen`). `SessionStage` keeps a single Board in a fixed-row grid across ready → countdown → memorize → recall → void (board never moves; controls pinned to the thumb zone). The rAF countdown feeds `runTimedExposure`. Results come with the Overlay · Yours · Actual board (side by side on desktop) and a timing detail. The summary has a sparkline, a round list with per-round overlays and personal-best callouts. Guards: Back → "End session?", Esc, wake lock, visibility/resize voids, "device dropping frames" after 3 voids in a row. There's a live region, focus management, an error boundary, and `?seed=` in test builds.

**M4 — setup**: Presets · Tests · Custom tabs. Preset cards (built-in + up to 20 saved). Full §10 config form (segmented board size + custom stepper, cells stepper + slider, exposure chips + stepper + slider with the frame note, rounds chips + stepper, selection limit / auto-submit, recall limit, feedback, round start, advanced pattern style). Live preview board, difficulty readout (bits, bits/s), sticky Start. The last config is restored.

**M6 — tests (engine + setup)**: generic 2-down/1-up `staircase`, capacity and speed modes with PRD step rules and stop rules. Simulated-observer convergence over 1,000 sessions for 3 thresholds each.

**M5 (part) — persistence and settings**: versioned, Zod-validated envelopes with quarantine for corrupt data, fail-safe localStorage/IndexedDB adapters, settings store (persisted), history store (one write per completed session, pruning into monthly aggregates past 1,000 sessions), personal-best callouts, settings sheet with delete-all, notices toast, UUIDv7 ids.

**Tests**: 251 unit (engine coverage still ≥ 95% branches). E2E session spec 18/18 on Chromium, Firefox and WebKit: seeded Warm-up scores 100% in every round, end-of-session feedback skips results, tab switch voids and replays with the next attempt's pattern, Back opens the dialog, keyboard-only round, no `data-lit` in the DOM during recall.

## M5 (rest) + M6 (rest) + M7 + M8 — Progress, landing, hardening (2026-09-26)

**M5**: `/progress` — tests (latest, best, trend per signature), accuracy over time per config with personal bests, session list, empty state → capacity test. Personal-best callouts in the summary. Pure `groupBySignature` in the engine.

**M6**: capacity/speed summary with the threshold ± spread and a hand-rolled staircase chart (reversals ringed, threshold dashed).

**M7**: landing per PRD §11.1. Static Server Component hero, headline as LCP. Playable 5×5 demo on the real engine, Board and timing pipeline, loaded via `next/dynamic` after first paint with identical placeholder markup (no shift). How-it-works loops paused off-screen and static under reduced motion. Modes, honest numbers (real result components with sample data), thumb section, privacy band, FAQ, final CTA, mobile sticky CTA (IntersectionObserver). Privacy & about page, 404, OG image, apple icon, SVG icon, manifest, robots, sitemap. Deep links `/train?test=`, `?preset=`, `?tab=custom`.

**M8**: axe (WCAG 2.2 AA tags) on landing, privacy, setup ×3 tabs, settings, ready, result, summary, progress — 0 serious/critical. Contrast fix (D26). Lighthouse CI (D28). Bundle budgets (D22–D24). Font subsetting + inline CSS (D27). Responsive pass at 320/375/414/768/1024/1440 + landscape phone: no horizontal scroll on any page; the session board is square and fully on-screen with Start in view, even at 12×12. Fixes from this pass: header overflow at 320 px, setup restore racing user input after async settings hydration (caught by the persistence e2e), demo losing focus when "Try it" was used before the demo chunk loaded.

**Measured**
- Unit: 265 passing; engine coverage 99.4% statements, 95.9% branches.
- E2E: 55 parallel + 11 serial perf, plus a11y 12 and responsive 14, all passing (Windows WebKit perf reported, not asserted — D14).
- First-load JS gzip: framework floor 134.5 KB; app code landing 4.2, `/train` 45.6, `/progress` 32.6, `/privacy` 0. PRD totals not met (D22).
- Lighthouse (mobile, simulated 4G, median of 3): landing Perf 0.93 / A11y 1.00 / BP 1.00 / SEO 1.00, CLS 0, simulated LCP 2.7–3.2 s, observed LCP 0.43 s; privacy Perf 0.96; train Perf 0.90. All A11y/BP/SEO 1.00.
- Timing (headless, 50 × 1000 ms): Chromium 50/50 at 60 frames, max error 0.2 ms; Firefox (144 Hz) 50/50 within ½ frame, max 0.18 ms; Windows WebKit 23/50 reliable (reported only).

### PRD §22 checklist

- [x] Landing → playing a demo round in ≤ 2 taps ("Try it right here" → "Tap to play", or tap the board directly: 1 tap).
- [ ] Full session in each mode on iPhone Safari, Android Chrome, desktop Chrome/Firefox/Safari — **desktop Chromium/Firefox/WebKit and Pixel 7 / iPhone 14 emulation pass; real devices not tested (no devices available to me).**
- [x] Automated timing test: 50 rounds at 1000 ms, every counted exposure within ±1 frame (`e2e/timing.spec.ts`).
- [x] Seeded e2e selects the exact pattern and scores 100% (`e2e/session.spec.ts`).
- [x] Tab switch during memorize/countdown voids and replays (`e2e/session.spec.ts`).
- [ ] No scroll/zoom/selection/callout on the board during recall — **automated: CDP touch swipe doesn't scroll the page; CSS in place. Manual device check still needed.**
- [x] Fast swipe across a full row selects every cell (mouse, 2 move events; CDP touch on Pixel 7).
- [x] CLS = 0 across phase transitions (measured: board rect identical ready→countdown→memorize→recall, layout-shift sum 0; Lighthouse CLS 0).
- [x] Settings, presets and history survive reload; delete-all wipes them (`e2e/persistence.spec.ts`).
- [x] Keyboard-only session round (`e2e/session.spec.ts`).
- [ ] Lighthouse mobile ≥ 95 in all four categories on landing — **A11y/BP/SEO 100; Performance median 0.93 (0.91–0.96), see D22/D28.**
- [x] No third-party network requests at runtime (`e2e/landing.spec.ts`, all pages).

**Deferred to V1.1 (per PRD)**: Road to 18, endurance, heatmap, insights, tap-order replay, technique tips, PWA offline + install (service worker), light theme, sounds, export/import.
