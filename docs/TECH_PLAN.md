# MindSnap Trainer — Technical Plan

Companion to `PRD.md`. This doc covers the stack, design system, architecture, folder structure, the timing and input pipelines, coding standards and testing. When the PRD says *what*, this says *how*.

---

## 1. Architecture at a glance

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│                                                                         │
│  app/ (Next.js routes)                                                  │
│    (marketing)/  landing, privacy       ← Server Components, static     │
│    (app)/train, progress                ← thin server shell + client UI │
│        │                                                                │
│  features/  board · session · setup · progress · landing · settings     │
│        │         (React client components, hooks)                       │
│        ▼                                                                │
│  stores/    session (in-memory) · settings (localStorage) ·             │
│             history (IndexedDB)             ← Zustand                   │
│        │                                                                │
│        ▼                                                                │
│  engine/    rng · bitset · generator · scoring · machine · modes ·      │
│             staircase · analytics · difficulty                          │
│             ← pure TypeScript. No React, no DOM, no clock, no random.   │
│                                                                         │
│  platform/  frame-clock · exposure · wake-lock · haptics · visibility · │
│             storage adapters        ← the only code that touches        │
│                                        browser APIs                     │
└─────────────────────────────────────────────────────────────────────────┘
               V1: no server, no database, no third-party requests
```

**Core idea: functional core, imperative shell.** Everything that decides *what happens* (patterns, scoring, phase transitions, test protocols, stats) lives in `engine/` as pure, deterministic, 100%-testable functions. Everything that deals with *time, pixels and input* lives in `platform/` and `features/board/` and is kept as small as possible.

Dependency direction is one-way: `app → features → stores → engine`, with `platform` usable by `features` and `stores`. `engine` imports nothing from the app.

---

## 2. Stack

Install the **latest stable** versions at build time; check release notes rather than pinning from memory.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router, latest stable)** + **React 19** | Static landing with Server Components, route-level code splitting, `next/font`, metadata/OG, easy path to V2 server features |
| Language | **TypeScript**, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | Grid indexing bugs are the #1 risk; the compiler should catch them |
| Styling | **Tailwind CSS v4** (CSS-first `@theme` tokens) | Tokens in CSS, zero runtime, tiny output |
| Components | **shadcn/ui** (copied in, owned) | Accessible primitives for Dialog, Sheet, Tabs, ToggleGroup, Slider, Switch, Tooltip. Only add what's used |
| Motion | **Motion** (`motion/react`, formerly Framer Motion) with `LazyMotion` + `m` | Landing and result screens only. **Never** in countdown/memorize/recall |
| State | **Zustand** (vanilla store for session, `persist` for settings/history) | Selector subscriptions let one cell re-render without re-rendering the board |
| Validation | **Zod** | Validate persisted data, imported JSON, URL params |
| Storage | localStorage (settings) + **idb-keyval** (history in IndexedDB) | History outgrows localStorage's ~5 MB; idb-keyval is < 1 KB |
| Icons | **lucide-react** (tree-shaken) | Consistent stroke icons |
| Charts | **Hand-rolled SVG** components (sparkline, line, staircase, heatmap) | The charts are simple; chart libraries cost 40–100 KB |
| PWA | **Serwist** (`@serwist/next`) — V1.1 | Maintained Workbox successor for Next.js |
| Lint/format | **Biome** | One fast tool for lint + format |
| Tests | **Vitest**, **Testing Library**, **fast-check**, **Playwright** | Unit, property, component, cross-browser e2e with mobile emulation |
| Package manager | **pnpm** | |
| Hosting | **Vercel** (static output) | Landing is fully static; app routes are static shells |
| CI | GitHub Actions + Lighthouse CI | |

**Deliberately not used in V1:** a backend, a database, auth, Redux, XState (a typed reducer is enough and smaller), CSS-in-JS, a chart library, analytics SDKs, Google Fonts at runtime (fonts are self-hosted by `next/font`), canvas/WebGL for the board (DOM grid of ≤ 144 elements is fast and accessible).

---

## 3. Design system

### 3.1 Direction

Instrument panel, not arcade. Near-black surfaces, crisp white type, one electric accent that's used for exactly two things: **lit cells** and **primary actions**. Everything else is greyscale. The board is always the brightest, highest-contrast object on screen.

### 3.2 Colour tokens

Defined once in `src/styles/tokens.css` as CSS variables and mapped into Tailwind v4's `@theme`. Components never use raw hex.

**Dark (default)**

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#08090B` | App background |
| `--bg-subtle` | `#0D0F12` | Section bands on landing |
| `--surface` | `#121519` | Cards, sheets |
| `--surface-2` | `#191D22` | Inputs, raised elements |
| `--border` | `#242931` | Hairlines |
| `--border-strong` | `#333A44` | Focused/hovered borders |
| `--text` | `#F3F5F7` | Primary text |
| `--text-muted` | `#A0A8B4` | Secondary text |
| `--text-faint` | `#6B7380` | Tertiary, non-essential only |
| `--accent` | `#3CF2B8` | **Signal mint** — lit cells, primary buttons, focus ring |
| `--accent-hover` | `#6BF7CA` | Primary button hover |
| `--accent-ink` | `#03140E` | Text on accent |
| `--cell` | `#15191E` | Empty cell |
| `--cell-edge` | `#20252D` | Empty cell inset border |
| `--cell-lit` | `var(--accent)` | Lit (memorize) and selected (recall) — same colour so recall matches the memory image |
| `--hit` | `#3CF2B8` | Result: hit (solid) |
| `--miss` | `#FFB020` | Result: miss (dashed amber ring) |
| `--false` | `#FF4D6D` | Result: false tap (coral + ✕) |
| `--danger` | `#FF4D6D` | Destructive actions |

**Light (V1.1)** — `--bg #F6F7F9`, `--surface #FFFFFF`, `--text #0B0D10`, `--text-muted #4A525E`, `--border #E3E6EB`, `--accent #00A57A`, `--accent-ink #FFFFFF`, `--cell #ECEEF2`, `--cell-lit #0B0D10` (ink-black lit cells give the strongest contrast on light), `--miss #B26B00`, `--false #D6284A`.

Contrast checks: `--text` and `--text-muted` on `--bg` are AAA/AA for body text. `--text-faint` is only for decorative or duplicated info. Lit cell vs empty cell is > 10:1 in dark mode.

### 3.3 Typography

- **Geist Sans** for UI and headings, **Geist Mono** for every number (scores, counters, timers, board labels). Self-hosted via the `geist` package / `next/font`, `display: swap`, preloaded.
- All numbers: `font-variant-numeric: tabular-nums` so counters don't jitter.
- Fluid scale (clamp between 360 px and 1280 px viewports):

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | `clamp(2.75rem, 1.5rem + 5.2vw, 5.75rem)` | 600 | −0.045em | Landing hero |
| `h1` | `clamp(2rem, 1.4rem + 2.6vw, 3.25rem)` | 600 | −0.035em | Section titles |
| `h2` | `clamp(1.5rem, 1.2rem + 1.2vw, 2rem)` | 600 | −0.025em | Card titles |
| `score` | `clamp(3.5rem, 2rem + 7vw, 6rem)` | 500 mono | −0.04em | `16 / 18` headline |
| `body` | `1rem` / 1.55 | 400 | 0 | Default |
| `small` | `0.875rem` / 1.45 | 400 | 0 | Helper text |
| `label` | `0.75rem` / 1 | 500 | +0.08em, uppercase | Eyebrows, stat labels (`ROUND 3 / 10`) |

- Max line length 64ch for prose. Headings `text-wrap: balance`, body `text-wrap: pretty`.

### 3.4 Space, radius, elevation

- 4 px base grid. Page gutter 16 px (mobile) / 24 px (tablet) / 32 px (desktop). Section spacing on landing `clamp(4rem, 3rem + 6vw, 8rem)`.
- Radius: buttons 12 px, cards 16 px, sheets 24 px top, chips full. Cells `calc(var(--cell-size) * 0.16)` so they look the same at every board size.
- Elevation through surface colour steps and 1 px borders, not shadows. The only glow: a soft `--accent` shadow on the primary CTA on landing.
- Board gap: `clamp(3px, calc(var(--cell-size) * 0.1), 8px)`.

### 3.5 Motion tokens

| Token | Value | Use |
|---|---|---|
| `--dur-0` | 0 ms | **All timed-phase changes** |
| `--dur-press` | 70 ms | Press feedback (transform only) |
| `--dur-fast` | 140 ms | Hover, toggles |
| `--dur-base` | 220 ms | Sheets, tab changes, result entrance |
| `--dur-slow` | 380 ms | Landing reveals |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Default |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Sheets |

Rules: animate only `transform` and `opacity`. Every animation is disabled or reduced under `prefers-reduced-motion`. Result numbers count up in ≤ 400 ms. Phase changes inside a session are instant.

### 3.6 Components to build

`Button` (primary/secondary/ghost, sizes md/lg, pointer-down press state), `Chip`, `Stepper` (−/value/+, long-press repeat, tap value to type), `SegmentedControl`, `Stat` (label + mono value), `ScoreHeadline`, `Board` (+ `Cell`), `ResultBoard` (overlay/yours/actual), `Sparkline`, `LineChart`, `StaircaseChart`, `Heatmap`, `AppHeader`, `StickyActionBar`, `SettingsSheet`, `ConfirmDialog`, `Toast`.

---

## 4. Landing page implementation

- Route `src/app/(marketing)/page.tsx`: **Server Component**, statically generated. Only the demo board and the mobile sticky CTA are client islands.
- Hero demo board: reuses the real `Board` + a mini session (5×5, 6 cells, 1.5 s) via the same engine — no fake demo code path. Hydrated with `next/dynamic` after first paint so it doesn't block LCP; the static server-rendered board shows first (identical markup, no layout shift when it hydrates).
- LCP element is the headline text (not an image). Fonts preloaded.
- Section loops (How it works) are CSS keyframes on tiny boards, paused with `animation-play-state` via an `IntersectionObserver`, static under reduced motion.
- Mobile sticky CTA appears when the hero leaves the viewport (`IntersectionObserver`, no scroll listeners).
- Metadata: title, description, canonical, Open Graph image generated with `opengraph-image.tsx` (a rendered board), `manifest.ts`, icons.
- Copy lives in one `landing/content.ts` so it's editable in one place.

---

## 5. Folder structure

```
mindsnap-trainer/
├── docs/
│   ├── PRD.md
│   └── TECH_PLAN.md
├── public/
│   └── icons/                        # PWA icons, maskable
├── src/
│   ├── app/
│   │   ├── layout.tsx                # <html>, fonts, theme script, viewport
│   │   ├── globals.css               # Tailwind import, tokens, base styles
│   │   ├── manifest.ts
│   │   ├── opengraph-image.tsx
│   │   ├── not-found.tsx
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx            # marketing header/footer
│   │   │   ├── page.tsx              # landing
│   │   │   └── privacy/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx            # app chrome, wake-lock provider
│   │       ├── train/page.tsx        # renders <TrainScreen/> (client)
│   │       ├── progress/page.tsx
│   │       └── lab/page.tsx          # dev-only: timing + latency test bench
│   │
│   ├── engine/                       # PURE. No React/DOM/clock/Math.random
│   │   ├── types.ts                  # Config, Round, Result, Phase, Event...
│   │   ├── rng.ts                    # seeded PRNG
│   │   ├── bitset.ts                 # Uint8Array-backed cell sets + encode/decode
│   │   ├── generator.ts              # pattern generation (uniform/spread/clustered)
│   │   ├── scoring.ts                # hits/misses/false/accuracy
│   │   ├── machine.ts                # session reducer: (state, event) => state
│   │   ├── staircase.ts              # generic n-down/1-up staircase
│   │   ├── modes/
│   │   │   ├── index.ts              # Mode interface + registry
│   │   │   ├── fixed.ts              # custom + presets
│   │   │   ├── capacity.ts
│   │   │   ├── speed.ts
│   │   │   ├── ladder.ts             # V1.1
│   │   │   └── endurance.ts          # V1.1
│   │   ├── analytics.ts              # session summary, PBs, pattern features, heatmap
│   │   ├── insights.ts               # V1.1
│   │   ├── difficulty.ts             # information bits
│   │   ├── presets.ts
│   │   └── __tests__/
│   │
│   ├── platform/                     # the only place that touches browser APIs
│   │   ├── frame-clock.ts            # rAF sampling, frame-period estimate
│   │   ├── exposure.ts               # frame-accurate reveal/hide
│   │   ├── visibility.ts             # page hidden → abort signal
│   │   ├── wake-lock.ts
│   │   ├── haptics.ts
│   │   ├── audio.ts                  # V1.1
│   │   ├── seed.ts                   # crypto.getRandomValues → seed
│   │   └── storage/
│   │       ├── schema.ts             # Zod schemas, version, migrations
│   │       ├── local.ts              # localStorage adapter (safe)
│   │       └── idb.ts                # idb-keyval adapter (safe)
│   │
│   ├── stores/
│   │   ├── session-store.ts          # vanilla Zustand; wraps engine/machine
│   │   ├── selection-store.ts        # per-cell selection for fast subscriptions
│   │   ├── settings-store.ts         # persisted (localStorage)
│   │   └── history-store.ts          # persisted (IndexedDB)
│   │
│   ├── features/
│   │   ├── board/
│   │   │   ├── board.tsx
│   │   │   ├── cell.tsx
│   │   │   ├── board.css             # grid, cell states, touch rules
│   │   │   ├── use-board-size.ts
│   │   │   ├── use-board-input.ts    # pointer + keyboard
│   │   │   ├── use-exposure.ts
│   │   │   └── result-board.tsx
│   │   ├── session/
│   │   │   ├── train-screen.tsx      # phase switch
│   │   │   ├── phase-ready.tsx
│   │   │   ├── phase-countdown.tsx
│   │   │   ├── phase-recall-controls.tsx
│   │   │   ├── phase-result.tsx
│   │   │   ├── session-summary.tsx
│   │   │   └── use-session-guard.ts  # back button, visibility, resize
│   │   ├── setup/
│   │   │   ├── setup-screen.tsx
│   │   │   ├── preset-picker.tsx
│   │   │   ├── config-form.tsx
│   │   │   ├── difficulty-readout.tsx
│   │   │   └── preview-board.tsx
│   │   ├── progress/
│   │   │   ├── progress-screen.tsx
│   │   │   └── charts/ (sparkline, line-chart, staircase-chart, heatmap)
│   │   ├── landing/
│   │   │   ├── content.ts
│   │   │   ├── hero.tsx
│   │   │   ├── demo-board.tsx
│   │   │   ├── how-it-works.tsx
│   │   │   ├── modes.tsx
│   │   │   ├── honest-numbers.tsx
│   │   │   ├── privacy-band.tsx
│   │   │   ├── faq.tsx
│   │   │   └── sticky-cta.tsx
│   │   └── settings/
│   │       └── settings-sheet.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn primitives (owned code)
│   │   └── (shared: button, stat, score-headline, stepper, app-header...)
│   ├── lib/
│   │   ├── cn.ts
│   │   └── format.ts                 # ms → "1.00 s", percentages
│   └── styles/
│       └── tokens.css
├── e2e/
│   ├── session.spec.ts
│   ├── timing.spec.ts
│   ├── input.spec.ts
│   └── a11y.spec.ts
├── biome.json
├── next.config.ts
├── playwright.config.ts
├── vitest.config.ts
└── tsconfig.json
```

Naming: files and folders `kebab-case`; components `PascalCase` exports; hooks `useX`; one component per file; named exports only (except Next.js route files).

---

## 6. Engine design

### 6.1 Core types

```ts
// engine/types.ts
export type CellIndex = number;              // 0 .. n*n-1, row-major

export interface RoundConfig {
  boardSize: number;                         // n
  cellCount: number;                         // k
  exposureMs: number;
  patternStyle: "uniform" | "spread" | "clustered";
  selectionLimit: boolean;
  autoSubmit: boolean;
  recallLimitMs: number | null;
}

export interface SessionConfig extends RoundConfig {
  modeId: "fixed" | "capacity" | "speed" | "ladder" | "endurance";
  rounds: number;
  feedback: "each-round" | "end";
  roundStart: "tap" | "auto";
  passThreshold: number;                     // 0.9
}

export interface RoundPlan {                 // what a mode hands to the machine
  index: number;
  seed: number;
  config: RoundConfig;
}

export interface ExposureMeasurement {
  shownAt: number;
  hiddenAt: number;
  actualMs: number;
  frames: number;
  maxFrameGapMs: number;
  reliable: boolean;
}

export interface SelectionEvent { cell: CellIndex; t: number; op: "add" | "remove" }

export interface RoundResult {
  plan: RoundPlan;
  pattern: CellIndex[];                      // sorted
  selection: CellIndex[];                    // sorted
  hits: number;
  misses: number;
  falseTaps: number;
  accuracy: number;                          // Jaccard
  perfect: boolean;
  passed: boolean;
  exposure: ExposureMeasurement;
  recallTimeMs: number;
  firstTapMs: number | null;
  events: SelectionEvent[];
}

export type VoidReason = "hidden" | "resize" | "dropped-frames";

export type Phase =
  | { kind: "setup" }
  | { kind: "ready"; plan: RoundPlan }
  | { kind: "countdown"; plan: RoundPlan; pattern: CellIndex[] }
  | { kind: "memorize"; plan: RoundPlan; pattern: CellIndex[] }
  | { kind: "recall"; plan: RoundPlan; pattern: CellIndex[]; exposure: ExposureMeasurement; startedAt: number; events: SelectionEvent[] }
  | { kind: "result"; result: RoundResult }
  | { kind: "void"; plan: RoundPlan; reason: VoidReason }
  | { kind: "complete"; summary: SessionSummary };

export type SessionEvent =
  | { type: "START_SESSION"; config: SessionConfig; seed: number }
  | { type: "BEGIN_ROUND" }
  | { type: "COUNTDOWN_DONE" }
  | { type: "EXPOSURE_DONE"; exposure: ExposureMeasurement; recallStartedAt: number }
  | { type: "TOGGLE"; cell: CellIndex; t: number; op: "add" | "remove" }
  | { type: "CLEAR"; t: number }
  | { type: "SUBMIT"; t: number }
  | { type: "VOID"; reason: VoidReason }
  | { type: "NEXT" }
  | { type: "ABORT" };
```

Illegal states are unrepresentable: a `pattern` only exists in phases that need it; `result` only after submit. No boolean flags like `isPlaying` / `isRecall`.

### 6.2 Machine

`engine/machine.ts` exports `reduce(state: SessionState, event: SessionEvent): SessionState`. Rules:

- Pure. **All timestamps and seeds arrive in events.** The reducer never calls `performance.now()`, `Date.now()` or `Math.random()`.
- Events that don't apply to the current phase return the same state object (no-op), which makes stray taps and double submits harmless.
- `TOGGLE` enforces the selection limit and bounds; `SUBMIT` with zero selections is a no-op.
- When `SUBMIT` lands: score → `RoundResult` → hand to the mode (`mode.next(history)`) → `result` phase (or straight to next `ready` if feedback is `end`).
- `VOID` from `countdown`/`memorize` → `void` phase; `NEXT` from `void` re-plans the same round index with a new seed derived from the session seed and a void counter.
- Session seed + round index + void counter → round seed, via a hash (`splitmix32`). Whole sessions are reproducible from one number.

### 6.3 Modes

```ts
// engine/modes/index.ts
export interface Mode<S = unknown> {
  id: SessionConfig["modeId"];
  init(config: SessionConfig): S;
  plan(state: S, roundIndex: number, seed: number): RoundConfig;   // next round's params
  update(state: S, result: RoundResult): S;                         // after a counted round
  isDone(state: S, counted: number): boolean;
  summarize(state: S, results: RoundResult[]): ModeSummary;         // threshold estimates etc.
}
```

`staircase.ts` is a generic `nDown1Up` staircase (`{ level, streak, reversals[], direction }`) used by both capacity (integer levels) and speed (multiplicative levels, snapped to frames at render time). Unit-test it with a **simulated observer** whose true threshold is known and assert the estimate converges within tolerance over 1,000 simulated sessions.

### 6.4 RNG and generation

```ts
// engine/rng.ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function splitmix32(x: number): number {
  x = (x + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
```

```ts
// engine/generator.ts — uniform: partial Fisher–Yates, exactly k unique cells
export function generateUniform(n: number, k: number, rand: () => number): CellIndex[] {
  const total = n * n;
  if (k < 1 || k > total) throw new RangeError(`k=${k} out of range for ${n}x${n}`);
  const cells = Array.from({ length: total }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rand() * (total - i));
    const tmp = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = tmp;
  }
  return cells.slice(0, k).sort((a, b) => a - b);
}
```

- `spread`: rejection sampling on uniform output — reject patterns whose largest 4-connected cluster > 3 (max 200 attempts, then fall back to uniform and log in dev).
- `clustered`: seed 2–4 cluster centres, grow by random neighbour walks until k.
- Seeds come from `crypto.getRandomValues` in `platform/seed.ts`. In dev/test only, `?seed=123` on `/train` fixes the session seed (for e2e and bug reports). Stripped in production builds.

### 6.5 Bitset encoding

`bitset.ts` stores cell sets as `Uint8Array` (1 bit per cell, `⌈n²/8⌉` bytes) with `encode(set) → base64url` and `decode`. 8×8 = 8 bytes → 11 chars. Used for persisted patterns/selections and for V2's `bytea` columns.

### 6.6 Scoring and difficulty

```ts
export function score(pattern: readonly CellIndex[], selection: readonly CellIndex[]) {
  const t = new Set(pattern);
  let hits = 0;
  for (const c of selection) if (t.has(c)) hits++;
  const falseTaps = selection.length - hits;
  const misses = pattern.length - hits;
  const union = pattern.length + falseTaps;
  const accuracy = union === 0 ? 1 : hits / union;
  return { hits, misses, falseTaps, accuracy, perfect: misses === 0 && falseTaps === 0 };
}

// log2 C(N, k) without overflow
export function informationBits(n: number, k: number): number {
  const N = n * n;
  let bits = 0;
  for (let i = 1; i <= k; i++) bits += Math.log2(N - k + i) - Math.log2(i);
  return bits;                                // 8x8, k=18 ≈ 51.7
}
```

Property tests (fast-check): `hits + misses === k`, `hits + falseTaps === |S|`, `0 ≤ accuracy ≤ 1`, `accuracy === 1 ⇔ S = T`, generator returns exactly k unique in-range sorted cells, same seed ⇒ same pattern.

### 6.7 Analytics

Pure functions over `RoundResult[]`: `summarizeSession`, `personalBests(history, signature)`, `patternFeatures(pattern, n)` → `{ clusters, largestCluster, isolatedCells, edgeCells, quadrantCounts }`, `cellHeatmap(history, n)`, and in V1.1 `insights(history)` which only emits an insight when evidence ≥ 20 rounds and effect ≥ 1.5×.

---

## 7. Timing pipeline (the heart of the product)

### 7.1 Principles

1. The pattern's cells get their `data-lit` attributes **during the countdown**, while the board root has `data-reveal="false"`. Reveal and hide are then a **single attribute flip on the board root** — one style recalc, paint only, no layout.
2. The flip happens **inside a `requestAnimationFrame` callback**, imperatively on a ref, not through React state. React scheduling can add a frame of jitter; the DOM write in rAF is painted in that same frame.
3. Hide on the frame whose presentation is **closest** to `shownAt + target`, using a measured frame period.
4. Report `actualMs = hiddenAt − shownAt` using rAF timestamps, and flag the round unreliable if any frame gap exceeded 2× the period.
5. After hide, clear `data-lit` from the DOM, then dispatch `EXPOSURE_DONE` to the store. The first blank frame's timestamp is `recallStartedAt`.

### 7.2 Frame clock

```ts
// platform/frame-clock.ts
export function sampleFramePeriod(samples = 20): Promise<number> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let prev = 0;
    const tick = (t: number) => {
      if (prev) deltas.push(t - prev);
      prev = t;
      if (deltas.length < samples) requestAnimationFrame(tick);
      else {
        deltas.sort((a, b) => a - b);
        resolve(deltas[Math.floor(deltas.length / 2)]!);   // median, robust to hiccups
      }
    };
    requestAnimationFrame(tick);
  });
}
```

Sampled during the countdown (which lasts ≥ 300 ms anyway), so it's free.

### 7.3 Exposure runner

```ts
// platform/exposure.ts
export function runExposure(
  board: HTMLElement,
  targetMs: number,
  framePeriod: number,
  signal: AbortSignal,
): Promise<ExposureMeasurement> {
  return new Promise((resolve, reject) => {
    let raf = 0, shownAt = 0, prev = 0, frames = 0, maxGap = 0;

    const abort = () => { cancelAnimationFrame(raf); board.dataset.reveal = "false"; reject(signal.reason); };
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });

    raf = requestAnimationFrame((t) => {
      board.dataset.reveal = "true";          // painted in this frame
      shownAt = prev = t;
      raf = requestAnimationFrame(tick);
    });

    function tick(t: number) {
      frames++;
      maxGap = Math.max(maxGap, t - prev);
      prev = t;
      if (t >= shownAt + targetMs - framePeriod / 2) {
        board.dataset.reveal = "false";       // first blank frame
        signal.removeEventListener("abort", abort);
        resolve({
          shownAt, hiddenAt: t, actualMs: t - shownAt, frames,
          maxFrameGapMs: maxGap, reliable: maxGap <= framePeriod * 2,
        });
        return;
      }
      raf = requestAnimationFrame(tick);
    }
  });
}
```

`use-exposure.ts` wires this up: creates an `AbortController`, aborts on `visibilitychange → hidden` and on board `ResizeObserver` changes, dispatches `VOID` on abort or on `reliable === false`, otherwise dispatches `EXPOSURE_DONE`.

### 7.4 What must not happen during a timed phase

- No Motion/Framer animations, no CSS transitions on cells, no toast, no layout changes to anything around the board (reserve heights for labels).
- No `setTimeout`/`setInterval` driving visuals.
- No React state updates on every frame. The optional memorize progress bar is a CSS `scaleX` animation started in the reveal frame with `animation-duration: targetMs` — compositor-only.
- No image decoding, font loading, or dynamic imports (everything the session needs is loaded before `ready`).

### 7.5 `/lab` test bench (dev only)

A page that runs 100 exposures at a chosen target and shows the distribution of `actualMs`, frame count and dropped-frame rate, plus a tap-latency meter (§8.4). Used for manual device QA and by `e2e/timing.spec.ts`.

---

## 8. Input pipeline

### 8.1 Board CSS

```css
/* features/board/board.css */
.board {
  --gap: clamp(3px, calc(var(--cell-size) * 0.1), 8px);
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  gap: var(--gap);
  inline-size: var(--board-size);
  aspect-ratio: 1;
  contain: layout paint style;
  touch-action: none;                  /* no scroll, pinch, double-tap zoom */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;         /* no iOS long-press callout */
  -webkit-tap-highlight-color: transparent;
}
.cell {
  border-radius: calc(var(--cell-size) * 0.16);
  background: var(--cell);
  box-shadow: inset 0 0 0 1px var(--cell-edge);
}
.board[data-reveal="true"] .cell[data-lit],
.cell[data-selected] {
  background: var(--cell-lit);
  box-shadow: none;
}
.cell[data-pressed] { transform: scale(0.92); transition: transform var(--dur-press) var(--ease-out); }
@media (prefers-reduced-motion: reduce) { .cell[data-pressed] { transform: none; } }
```

No `transition` on `background` — state changes are instant.

### 8.2 Board sizing

```css
.board-slot {
  --chrome: 11rem;                     /* reserved: header + label + controls */
  --board-size: min(
    100vw - 2 * var(--gutter) - env(safe-area-inset-left) - env(safe-area-inset-right),
    100dvh - var(--chrome) - env(safe-area-inset-top) - env(safe-area-inset-bottom),
    45rem
  );
}
```

`use-board-size.ts` reads the rendered size with a `ResizeObserver` to set `--cell-size` and cache the rect for hit-testing. The slot has fixed height reservations above and below so switching labels between phases never moves the board (CLS 0).

### 8.3 Pointer handling

Event delegation on the board root — one listener, not one per cell.

```ts
// features/board/use-board-input.ts (core logic)
function hitTest(x: number, y: number, rect: DOMRect, n: number): CellIndex | -1 {
  const col = Math.floor(((x - rect.left) / rect.width) * n);   // gaps belong to nearest cell
  const row = Math.floor(((y - rect.top) / rect.height) * n);
  if (col < 0 || row < 0 || col >= n || row >= n) return -1;
  return row * n + col;
}

const onPointerDown = (e: PointerEvent) => {
  if (!e.isPrimary || !canSelect()) return;
  e.preventDefault();
  board.setPointerCapture(e.pointerId);
  rect = board.getBoundingClientRect();           // cache once per gesture
  const cell = hitTest(e.clientX, e.clientY, rect, n);
  if (cell < 0) return;
  mode = isSelected(cell) ? "remove" : "add";
  apply(cell, e.timeStamp);
  last = cell;
};

const onPointerMove = (e: PointerEvent) => {
  if (!e.isPrimary || last < 0 || !swipeEnabled) return;
  const events = e.getCoalescedEvents?.() ?? [e];  // fast swipes don't skip cells
  for (const ev of events) {
    const cell = hitTest(ev.clientX, ev.clientY, rect, n);
    if (cell >= 0 && cell !== last) {
      if ((mode === "add") !== isSelected(cell)) apply(cell, ev.timeStamp);
      last = cell;
    }
  }
};

const onPointerEnd = () => { last = -1; };
```

- Listeners are attached natively with `{ passive: false }` on `pointerdown` (so `preventDefault` works); `contextmenu` is prevented on the board.
- `apply()` updates the selection store (which re-renders one cell) and fires `haptics.tick()`; the `TOGGLE` event with the timestamp goes to the session store.
- For very fast diagonal swipes, `apply` also fills cells on the straight line between the previous and current cell (Bresenham) — prevents skipped cells at 120 Hz swipes on large boards.
- Keyboard: roving focus (`tabIndex` on the focused cell only), arrows move, Space/Enter toggles.

### 8.4 Keeping it one frame

- Selection lives in `selection-store.ts` as `readonly boolean[]`, replaced per toggle (≤ 144 items, trivial). Each `Cell` is `memo`'d and subscribes with `useStore(s => s.selected[i])`, so a tap re-renders exactly one cell.
- React 19 treats pointer events as discrete: the update commits synchronously before the next paint.
- No layout reads in `pointermove` except the cached rect. No `getBoundingClientRect` per move.
- Measure it: in `/lab` and under `?debug=1`, record `e.timeStamp` at pointerdown and the timestamp of the next rAF after commit; show p50/p95. Also observe `PerformanceObserver({ type: "event", durationThreshold: 16 })` to catch slow interactions in dev.
- Target on a mid-range Android: p95 ≤ one frame + 8 ms.

---

## 9. State and persistence

| Store | Kind | Persisted | Holds |
|---|---|---|---|
| `session-store` | vanilla Zustand | no | `SessionState` from the engine; `dispatch(event)` |
| `selection-store` | vanilla Zustand | no | `selected: boolean[]` for fast per-cell subscriptions (mirrors engine selection) |
| `settings-store` | Zustand + `persist` (localStorage) | yes | theme, haptics, sound, countdown, round start, swipe, progress bar, last config, custom presets |
| `history-store` | Zustand + `persist` (IndexedDB via idb-keyval) | yes | completed sessions (compact rounds), monthly aggregates, test results |

- Every persisted payload has `{ schemaVersion, data }`, is parsed with Zod on load, and runs through `migrations[version]`. Parse failure → move raw value to a `quarantine:<timestamp>` key, start clean, show a one-time notice.
- All storage access is wrapped in try/catch (Safari private mode, quota errors, blocked storage). Failure degrades to in-memory with a notice.
- Session results are written to history once, when the session completes (not per round) — no storage I/O during play.
- IDs are UUIDv7 (time-sortable, collision-free), ready for V2 sync.
- History pruning: > 1,000 sessions → oldest roll into monthly per-signature aggregates.

---

## 10. Performance engineering

- **Server Components by default**; `"use client"` only on leaves that need it (board, session, setup form, sticky CTA).
- Route-level splitting: landing never loads the session engine except the small demo island (lazy after first paint).
- `LazyMotion` with `domAnimation` features; `m.div` instead of `motion.div`.
- Everything the session needs is loaded before the `ready` phase — no lazy imports mid-session.
- No layout thrash: reads batched in `ResizeObserver`, writes in rAF.
- `content-visibility: auto` on long landing sections below the fold.
- Images: none required; OG image generated. Icons are inline SVG.
- Budgets enforced in CI (Lighthouse CI + `next build` bundle output check): see PRD §19.
- Test on a real low-end Android with CPU throttling 4× in DevTools as the baseline.

---

## 11. Platform features

- **Wake Lock**: request on session start, release on complete/abort, re-request on `visibilitychange → visible`. Silent no-op if unsupported.
- **Haptics**: `navigator.vibrate?.(8)` on select, `navigator.vibrate?.([10, 40, 10])` on limit reached. Setting-controlled, no-op on iOS.
- **Viewport**: `width=device-width, initial-scale=1, viewport-fit=cover`; theme-color matches `--bg`. Do **not** set `maximum-scale=1` / `user-scalable=no` globally (hurts accessibility) — zoom is blocked only on the board via `touch-action`.
- **Theme**: an inline script in `<head>` sets `data-theme` before paint to avoid a flash.
- **Back button**: during a session push a history entry; `popstate` opens "End session?".
- **PWA (V1.1)**: Serwist precaches the app shell and fonts; `display: standalone`, portrait-primary, maskable icons.
- **Sound (V1.1)**: Web Audio API with pre-decoded buffers (no `<audio>` element latency); off by default.

---

## 12. Accessibility implementation

- Semantic landmarks, one `h1` per page, skip link.
- Board: `role="grid"`, rows `role="row"`, cells `role="gridcell"` with `aria-selected` during recall and labels "Row 3, column 5". `aria-hidden="true"` during memorize.
- Live region announces phase changes ("Round 3 of 10. Recall.") and results ("16 of 18, 89 percent").
- Focus management: focus moves to the board on recall start, to the result headline on submit, back to Start on summary.
- Focus ring: 2 px `--accent` outline + 2 px offset, visible on all interactive elements.
- `forced-colors: active`: cells use `Canvas`/`CanvasText`/`Highlight` with borders.
- Axe checks in Playwright on landing, setup, result, summary, progress.

---

## 13. Coding standards and principles

**Architecture**

1. Functional core, imperative shell. Business logic in `engine/`, browser APIs in `platform/`, glue in hooks.
2. Make illegal states unrepresentable (discriminated unions, not boolean flags).
3. One source of truth per piece of state. Derived values are computed, not stored.
4. Determinism: randomness only through seeded RNG; time only through event payloads.
5. No premature abstraction. Three concrete uses before extracting a helper. No dependency without a written reason.

**TypeScript**

6. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
7. No `any`. External data is `unknown` → Zod → typed.
8. Exhaustive `switch` on unions with a `never` check.
9. Prefer `readonly` arrays/props in engine APIs.

**React**

10. Server Components by default; `"use client"` at the smallest leaf.
11. Components do one thing; > ~150 lines is a signal to split.
12. No `useEffect` for derived state or event handling; effects only sync with external systems (DOM, storage, browser APIs).
13. Subscribe to the narrowest store slice; memoise cells.
14. Error boundary around the session screen with a "Something broke — your history is safe" fallback.

**Styling**

15. Tokens only (no raw hex/px in components except layout primitives).
16. Mobile-first classes; `@media (hover: hover)` for hover styles.
17. Animate only `transform`/`opacity`; honour reduced motion.

**Quality**

18. Every engine function has unit tests; engine coverage ≥ 95% branches.
19. Every bug fix starts with a failing test (seeded repro where possible).
20. Conventional Commits; small PRs; CI must be green to merge.
21. Comments explain *why*, not *what*. Timing and input code gets thorough comments because it's subtle.

---

## 14. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest | rng, generator, bitset, scoring, difficulty, machine (table-driven: every event × every phase), modes, staircase, analytics, storage migrations |
| Property | fast-check | scoring invariants, generator invariants, bitset round-trip, reducer never throws on any event sequence |
| Simulation | Vitest | staircase convergence with simulated observers (known threshold) over 1,000 runs |
| Component | Testing Library | board pointer + keyboard input, setup form validation, result board rendering |
| E2E | Playwright (Chromium, WebKit, Firefox; Pixel 7 + iPhone 14 emulation with touch) | full sessions per mode using `?seed=`; tap the known pattern and assert 100%; swipe selection; void on tab hide (`page.evaluate` to dispatch visibility); back-button dialog; persistence across reload; delete-all |
| Timing | Playwright + `/lab` | 50 exposures at 1000 ms; assert every `actualMs` within ±1 frame period |
| A11y | @axe-core/playwright | no serious/critical violations |
| Perf | Lighthouse CI | budgets from PRD §19 |
| Manual | Device checklist | iPhone (Safari), mid/low Android (Chrome), iPad, desktop 60/120/144 Hz: tap latency, swipe, no zoom/scroll/callout, landscape, safe areas |

---

## 15. Tooling and CI

- Scripts: `dev`, `build`, `start`, `lint` (biome check), `format`, `typecheck` (`tsc --noEmit`), `test`, `test:e2e`, `lh`.
- GitHub Actions on PR: install (pnpm, cached) → typecheck → lint → unit → build → e2e (3 browsers) → Lighthouse CI.
- Pre-commit (lefthook or simple-git-hooks): biome on staged files.
- `README.md`: setup, scripts, architecture summary, link to docs.

---

## 16. V2 architecture (accounts + sync)

```
Next.js (Server Actions / Route Handlers)
   │
   ├── Supabase Auth (magic link + Google)
   └── Supabase Postgres (RLS) ── Drizzle ORM + migrations
```

- Stays **local-first**: IndexedDB remains the source during play; completed sessions sync up in the background. Signing in for the first time imports on-device history (idempotent by UUIDv7 ids).
- Schema:

```sql
create table training_configs (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  name text not null, config jsonb not null, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table training_sessions (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  config_id uuid references training_configs on delete set null,
  mode text not null, signature text not null,           -- e.g. '8x18@1000'
  seed bigint not null, started_at timestamptz not null, completed_at timestamptz,
  rounds_counted int not null, rounds_void int not null default 0,
  mean_accuracy real, mean_hits real, perfect_rounds int, mean_recall_ms int,
  mode_summary jsonb                                       -- capacity/speed thresholds
);

create table training_rounds (
  id uuid primary key, session_id uuid not null references training_sessions on delete cascade,
  round_index int not null, board_size smallint not null, cell_count smallint not null,
  exposure_target_ms int not null, exposure_actual_ms real not null, timing_reliable boolean not null,
  seed bigint not null, pattern bytea not null, selection bytea not null,
  hits smallint not null, misses smallint not null, false_taps smallint not null,
  accuracy real not null, recall_ms int not null, first_tap_ms int, events jsonb
);

create index on training_sessions (user_id, signature, completed_at desc);
-- RLS: user_id = auth.uid() on every table (rounds via session ownership)
```

- Personal records via a view or a small table updated on insert.
- V3 leaderboards need server-issued seeds and plausibility checks (recall time vs selections, timing flags); client scores alone can't be trusted.

---

## 17. Build order

| # | Milestone | Done when |
|---|---|---|
| M0 | Scaffold: Next.js, TS strict, Tailwind v4 tokens, Biome, Vitest, Playwright, CI | CI green on an empty app; tokens visible on a style page |
| M1 | Engine: types, rng, bitset, generator, scoring, difficulty, machine, fixed mode | Unit + property tests pass, ≥ 95% branch coverage |
| M2 | Board + timing + input, on `/lab` | Timing bench within ±1 frame; tap latency p95 target met on a real phone; swipe works; no zoom/scroll |
| M3 | Session flow: ready → countdown → memorize → recall → result → summary; guards (visibility, resize, back) | Seeded e2e scores 100%; void rounds replay |
| M4 | Setup: presets, custom config, preview, difficulty readout, saved presets | All §10 params work with validation |
| M5 | Persistence + progress (basic) + settings + delete-all | Reload survives; corrupt storage quarantined |
| M6 | Capacity + speed tests with charts | Simulation tests converge; summary shows thresholds |
| M7 | Landing page with live demo + privacy page | Lighthouse ≥ 95 ×4 on mobile |
| M8 | A11y pass, perf pass, device QA, polish | PRD §22 checklist complete |
| V1.1 | Ladder, endurance, heatmap, insights, tap replay, PWA, light theme, sound, export/import | |
