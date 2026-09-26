# MindSnap Trainer — Product Requirements Document

| | |
|---|---|
| **Version** | 2.0 (rewrite of v1 draft) |
| **Status** | Ready for build |
| **Owner** | Aira |
| **Last updated** | 2026-09-25 |
| **Companion doc** | `TECH_PLAN.md` (stack, architecture, design system, code standards) |

---

## 0. TL;DR

MindSnap Trainer is a web app for training rapid visual-spatial memory: a grid flashes a pattern for a precise, short time, the pattern disappears, and you rebuild it from memory.

It is a **trainer**, not a game clone. What makes it worth using over any random memory game:

1. **Frame-accurate exposure timing** — 1.00 s means ~1000 ms of pixels on screen, measured and reported, not "roughly a setTimeout".
2. **Real training protocols** — capacity and speed tests using adaptive staircases (the same method psychophysics labs use), plus a goal ladder that walks you up to a target like *18 squares @ 1 s*.
3. **Honest feedback** — hits, misses and false taps per round, an overlay that shows exactly what you got wrong, and trends over time.
4. **Zero friction** — no account, no tracking; history stays on the device. Installable, works offline.
5. **Built for thumbs first** — tap and swipe input that responds on the next frame, no zoom/scroll interference, no dead zones between cells.

V1 ships all of that without a backend. V2 adds accounts and cloud sync. V3 considers competition features.

### What changed from the v1 draft

| Area | v1 draft | This version | Why |
|---|---|---|---|
| Data in V1 | Memory only, lost on close | Stored **on-device** (IndexedDB), with clear/export | Progress tracking is the core value; on-device keeps the "no account, no tracking" promise |
| Scoring | `correct / target` | Hits/target headline + **Jaccard accuracy** that penalises false taps | Old metric rewarded spamming taps when no selection limit is set |
| Test modes | Vague "capacity 10→12→14" | Defined **staircase** protocols with stop rules and threshold estimates | Produces a stable, comparable number instead of a noisy single run |
| Screens | Separate routes for results | One `/train` route, phases in a state machine | No navigation jank, back button can't leak the answer, no layout shift |
| Result view | Side-by-side boards | **Overlay** board on mobile (side-by-side on desktop) | Two 8×8 boards side by side are unreadable on a 375 px screen |
| Timing | "Use performance.now + rAF" | Specified algorithm, measured actual exposure, dropped-frame and tab-switch voiding | Makes the timing claim verifiable |
| Input | "Click cells" | Pointer-down toggle, swipe-to-paint, no dead zones, keyboard, haptics | Latency and feel are the product on mobile |
| Difficulty | Unspecified index | **Information load in bits** (`log2 C(n², k)`) as an objective difficulty readout | Lets users compare 7×7/14 vs 8×8/18 on one axis |

---

## 1. Background and problem

Competitive memory games (e.g. the 8×8 "flash 18 squares for 1 second" format) are fun but give no control over training. Someone trying to get better at that format can't answer basic questions:

- What's my actual capacity at 1 s? At 0.75 s?
- Am I improving week over week, or just having good days?
- Do I lose edge cells? Isolated cells? The last cells I tap?
- What should I practise today to get from 15/18 to 18/18?

Generic brain-training apps don't help either: fixed difficulty, sloppy timing, cartoonish UI, accounts and ads before the first round.

## 2. Goals, non-goals, success criteria

### Goals (V1)

1. Precise, configurable visual-memory rounds (board size, cell count, exposure, rounds, recall rules).
2. Training protocols that produce a meaningful, repeatable metric (capacity, speed threshold).
3. Feedback that teaches: per-round error overlay, session summary, long-term trends.
4. Mobile-first input that feels instant.
5. A landing page that lets people play within 5 seconds of arriving.
6. No account, no remote data, no third-party tracking.

### Non-goals (V1)

Accounts, cloud sync, social features, public profiles, leaderboards, payments, ads, AI coaching, chat, native apps (the PWA covers install).

### Success criteria

V1 ships without analytics, so success is measured through quality gates and direct feedback, not funnels.

| Type | Criterion |
|---|---|
| Timing | ≥ 99% of exposures within ±1 display frame of target on Chromium, Safari, Firefox (60 Hz and 120 Hz) |
| Input latency | p95 pointer-down → visual change ≤ 1 frame + 8 ms on a mid-range Android phone; INP < 100 ms on all pages |
| Performance | Lighthouse mobile ≥ 95 on landing (Perf, A11y, Best Practices, SEO); LCP < 1.8 s on 4G; CLS = 0 |
| Accessibility | WCAG 2.2 AA on all non-game UI; full keyboard play |
| Reliability | Zero data loss across reloads; corrupt storage never crashes the app |
| Product | Users (friends/testers, n ≥ 10) complete a 10-round session on first visit without instructions; qualitative "feels instant" on phones |

Whether to add cookieless aggregate analytics later is an open question (§22).

## 3. Users

**Primary — the competitor.** Plays 8×8 memory challenges in a competitive game and wants to get better at a specific format. Cares about exact settings, timing accuracy, numbers, and progress. Plays in short bursts on a phone.

**Secondary — the self-improver.** Interested in brain training or working memory in general. Wants a clean, serious tool, guided modes, and a sense of progress without configuring anything.

### Jobs to be done

- "Give me the exact competition conditions so practice transfers."
- "Tell me my real limit, not one lucky round."
- "Show me what I got wrong so I can fix how I memorise."
- "Push me slightly past my comfort zone automatically."
- "Let me do 5 minutes on my phone in a queue without signing up."

## 4. Product principles

1. **Nothing moves during the test.** From reveal to submit, the screen contains the board and a few static labels. No animations, no timers ticking (unless opted in), no layout shift.
2. **Measure, don't assume.** Every timing claim is measured and recorded. If a round's timing was compromised, say so and don't count it.
3. **Complexity lives in setup and analytics, never in the round.**
4. **Instant input.** Taps register on touch-down, visually respond on the next frame.
5. **Serious, not childish.** Dark, precise, typographic. Think instrument panel, not cartoon.
6. **Private by default.** No account, no tracking, data on the device, one button to wipe it.

## 5. Naming and brand note

- Working name: **MindSnap Trainer**. "Mind Snap" is the name of a feature in Matiks. Before any public launch, do a trademark check; if there's risk, rebrand (candidates: *Glimpse*, *Flashgrid*, *Snapgrid*).
- The app must never present itself as affiliated with Matiks or any other game. Presets are named by their parameters (e.g. **"Competition · 8×8 · 18 · 1.0 s"**), not by another product's name. The FAQ states the app is independent.
- Tagline options: **"See it. Hold it. Rebuild it."** / **"Train your visual memory. Measure it."**

## 6. Glossary

| Term | Definition |
|---|---|
| **Board** | An `n × n` grid of cells. |
| **Target set (T)** | Cells lit during exposure; `|T| = k`. |
| **Selection (S)** | Cells the user selected during recall. |
| **Exposure** | Time the pattern is visible. *Target* = configured; *actual* = measured. |
| **Hit** | Cell in `T ∩ S`. |
| **Miss** | Cell in `T \ S`. |
| **False tap** | Cell in `S \ T`. |
| **Accuracy** | Jaccard index `|T ∩ S| / |T ∪ S|`. 100% only when `S = T` exactly. |
| **Perfect round** | 0 misses and 0 false taps. |
| **Capacity (k\*)** | Estimated cell count at which the user passes ~70% of rounds at a fixed exposure (from the capacity staircase). |
| **Speed threshold (t\*)** | Estimated exposure at which the user passes ~70% of rounds at a fixed cell count. |
| **Information load** | `log2(C(n², k))` bits — how much information the pattern carries. 8×8/18 ≈ 52 bits. |
| **Config signature** | `n × k @ exposure` plus recall rules; used to group history (e.g. `8×18@1000`). |
| **Void round** | A round discarded because timing was compromised (tab switch, dropped frames, resize). Replayed with a new pattern, not counted. |

## 7. Core loop

```
 SETUP ──► READY ──► COUNTDOWN ──► MEMORIZE ──► RECALL ──► RESULT ──► (next round) ──► SUMMARY
            ▲          │              │           │           │
            │          └── void ◄─────┘           │           │
            └────────────────────────────────────────────────┘
```

- **Ready** — "Tap to start round 3" (or auto-start, per setting). Lets the user control pacing. Space / tap anywhere on the board starts.
- **Countdown** — 3-2-1 (default 3 × 400 ms), then a fixation dot for 300 ms at board centre, then reveal. Options: standard / quick (1 × 500 ms) / off (fixation only).
- **Memorize** — pattern visible for the target exposure. Nothing else on screen changes.
- **Recall** — pattern gone, same board in the same pixel position. User selects cells, then submits.
- **Result** — per-round feedback (or skipped if feedback is set to "end of session").
- **Summary** — after the last round.

The session is one state machine with exactly one active phase (see `TECH_PLAN.md §6`).

## 8. Scoring model

For each round:

```
hits      = |T ∩ S|
misses    = |T \ S|           = k - hits
falseTaps = |S \ T|
accuracy  = hits / |T ∪ S|    = hits / (k + falseTaps)
perfect   = misses == 0 && falseTaps == 0
passed    = accuracy >= passThreshold   (default 0.90; used by test modes)
```

Also recorded per round:

- `exposureTargetMs`, `exposureActualMs`, `framesShown`, `timingReliable`
- `recallTimeMs` — recall phase start (first blank frame) → submit
- `firstTapMs` — recall start → first selection (proxy for hesitation/decay)
- `selectionEvents` — ordered `[cellIndex, tMs, add|remove]` (enables "cells tapped later are wrong more often" insight)
- `seed`, pattern, final selection

**Headline shown to users:** `16 / 18` (hits over target) with accuracy % underneath. Both matter: hits/target is the intuitive number, accuracy is the honest one.

**Session metrics:** mean accuracy, mean hits, perfect rounds, best/worst round, mean recall time, mean first-tap time, void count. Void rounds are excluded from every metric.

## 9. Training modes

All modes use the same round engine; they differ only in how the next round's parameters are chosen and when the session ends.

### 9.1 Custom (P0)
User sets every parameter (§10). Fixed parameters for all rounds.

### 9.2 Presets (P0)

| Preset | Board | Cells | Exposure | Rounds | Notes |
|---|---|---|---|---|---|
| **Warm-up** | 8×8 | 10 | 1.5 s | 5 | Default for first-time users |
| **Competition** | 8×8 | 18 | 1.0 s | 10 | Selection limited to 18; feedback at end of session |
| **Speed drill** | 8×8 | 18 | 0.75 s | 10 | |
| **Small & fast** | 6×6 | 10 | 0.5 s | 10 | |
| **Big board** | 10×10 | 20 | 2.0 s | 10 | |

Users can save their own presets (P0, stored on-device, max 20).

### 9.3 Capacity test (P0)
Finds how many cells the user can hold at a fixed board and exposure.

- Fixed: board (default 8×8), exposure (default 1.0 s).
- Start at `k = 8`. **2-down / 1-up staircase**: two consecutive passes → `k + 1`; one fail → `k − 1` (floor 3, ceiling 50% of cells). Pass = accuracy ≥ 0.90.
- Stop after 8 reversals or 30 counted rounds, whichever is first.
- Result: `k*` = mean `k` at the last 6 reversals, with a ± spread. Shown as **"Capacity at 1.0 s: 16.5 cells"**.
- Converges near the ~71% pass point, so the number is stable across sessions.

### 9.4 Speed test (P0)
Finds the shortest exposure at which the user can hold `k` cells.

- Fixed: board, `k` (default 8×8, 18).
- Start at 2000 ms. 2-down/1-up on exposure. Step: ×0.85 down / ×1.15 up for the first 2 reversals, then ×0.93 / ×1.07. Clamp 150–5000 ms; round to the nearest display frame.
- Same stop rule. Result: **"18 cells: 840 ms"** threshold.

### 9.5 Goal ladder — "Road to 18" (P1, V1.1)
Adaptive training towards a user-chosen goal (default 8×8 · 18 · 1.0 s).

- Builds a ladder of steps from an easy start to the goal, alternating a +1 cell step and a −10% exposure step.
- Blocks of 5 rounds. Block mean accuracy > 95% → up one step; 80–95% → stay; < 80% → down one step.
- Starting step comes from the latest capacity test if one exists.
- UI shows the ladder as a progress track: "Step 9 of 14 · 16 cells @ 1.1 s".
- Once the goal is held for 2 consecutive blocks, offer "Beyond goal" steps.

### 9.6 Endurance (P1)
30–100 rounds at fixed params with the accuracy trend across the session — shows fatigue.

## 10. Configuration spec

| Parameter | Range | Default | Control | Notes |
|---|---|---|---|---|
| Board size `n` | 4–12 | 8 | Segmented (6/7/8/9/10) + "Custom" stepper | Above 10 on screens < 390 px: warn that cells will be small |
| Cells `k` | 2 – ⌊n²/2⌋ | 18 (8×8) | Stepper + slider; tap number to type | Above 50% it's easier to memorise the blanks, so capped |
| Exposure | 150–5000 ms, step 50 | 1000 | Presets (0.5/0.75/1/1.5/2 s) + stepper + slider | Shows "≈ 60 frames @ 60 Hz" |
| Rounds | 1–100 | 10 | Chips 5/10/20/30 + stepper | |
| Selection limit | off / = k | = k | Toggle | When on, can't select more than `k`; Submit enables at `k` |
| Auto-submit at k | on/off | off | Toggle | Only available with selection limit |
| Recall time limit | none / 5 / 10 / 15 / 30 s | none | Segmented | On timeout, auto-submit current selection |
| Feedback | after each round / end of session | after each round | Segmented | Competition preset uses end of session |
| Round start | tap to start / auto (1.5 s) | tap | Segmented | |
| Pattern style | uniform / spread / clustered | uniform | Segmented (advanced) | Uniform = what competitions use |
| Countdown | standard / quick / off | standard | Settings | |
| Memorize progress bar | on/off | off | Settings | Off = nothing moves during exposure |

The setup screen shows a live **difficulty readout**: `8×8 · 18 cells · 1.00 s — 52 bits · 52 bits/s`.

## 11. Screens and requirements

Priority: **P0** = V1 launch, **P1** = V1.1, **P2** = later.

### 11.1 Landing page `/` (P0)

Goal: communicate what it is in 3 seconds and get the visitor playing within 5.

1. **Hero**
   - Eyebrow: `VISUAL MEMORY TRAINER`
   - Headline: **"One second. Eighteen squares. Remember them all."**
   - Sub: "A pattern flashes. It disappears. You rebuild it. Frame-accurate timing, adaptive training and honest stats, so you actually get better."
   - Primary CTA **Start training** → `/train`. Secondary **Try it right here** scrolls focus to the demo board.
   - **Playable demo board** in the hero (right side on desktop, directly under the headline on mobile): a 5×5 board, 6 cells, 1.5 s. Idle state loops a subtle "pattern shimmer" (CSS, paused off-screen, static with reduced motion). Tap → countdown → play one round → result "5/6 — nice. Now try 8×8." → CTA.
   - Proof strip: `Frame-accurate timing · No sign-up · Works offline · Nothing leaves your device`
2. **How it works** — three steps, each with a tiny looping board: *See* (pattern appears), *Hold* (board blank), *Rebuild* (cells tapped in).
3. **Training modes** — cards: Competition preset, Capacity test, Speed test, Road to 18 (labelled "Soon" until V1.1), Custom.
4. **Honest numbers** — a real round-result component rendered with sample data, explaining hits / misses / false taps and the overlay colours.
5. **Built for your thumb** — short copy on instant touch, swipe to select, installable app. Visual: the live board component, not a stock phone mockup.
6. **Privacy** — "No account. No cookies. No tracking. Your history lives on your device, and you can wipe it with one tap."
7. **FAQ** — Is it free? Do I need an account? Is this the official Mind Snap? (No — independent.) Does it work offline? Why does it say 1,008 ms instead of 1,000? (Frame alignment, explained in one sentence.)
8. **Final CTA** band + footer (Privacy, About, GitHub if open-sourced).

Mobile: after the hero scrolls out, a slim sticky bottom bar shows **Start training**. No carousels, no autoplay video, no images above the fold except the live board.

### 11.2 Setup `/train` — setup phase (P0)

- Top: mode tabs **Presets · Tests · Custom** (Road to 18 joins in V1.1).
- Presets: horizontal chip row on mobile, grid on desktop. Each shows its signature and bits. Tapping one fills the config.
- Config card with the controls in §10. Advanced options collapsed by default.
- **Live preview board** reflecting `n` and density (random sample, re-rolls on change, clearly labelled "preview").
- Difficulty readout.
- **Start** button: full-width, sticky at the bottom on mobile (thumb zone), respects the safe-area inset.
- Last used config is restored on return.
- Desktop: config left, preview board right.

### 11.3 Ready / countdown (P0)
- Board visible and empty in its final position (no layout shift into memorize).
- Above board: `ROUND 3 / 10`. Below: "Tap the board or press Space".
- Countdown digits render *over* the board centre in a fixed-size box, then the fixation dot.

### 11.4 Memorize (P0)
- Only change: lit cells appear, then disappear. Instant on/off — **no fades** (a fade makes the effective exposure ambiguous).
- Optional 2 px progress bar (off by default).
- All pointer/keyboard input on the board is ignored.

### 11.5 Recall (P0)
- Same board, same position, same size. Label above: `SELECT THE SQUARES` and counter `0 / 18` (tabular numerals).
- Tap toggles a cell on **pointer-down**. Dragging paints: the first cell decides add or remove mode for the whole drag.
- With selection limit on: at `k` selections, further adds are rejected with a short counter shake + light haptic.
- Controls under the board in the thumb zone: **Clear** (secondary) and **Submit** (primary). Submit disabled at 0 selections.
- Optional recall countdown shown as static text that updates once per second (not a moving bar).
- No indication of correctness until submit.

### 11.6 Round result (P0)
- Headline `16 / 18` (large, mono), accuracy below, then a stat row: Hits · Misses · False taps · Recall time.
- **Comparison board**:
  - Mobile: one board with a segmented control **Overlay · Yours · Actual** (default Overlay).
  - Desktop (≥ 1024 px): Yours and Actual side by side, Overlay toggle available.
  - Overlay legend: **Hit** = solid accent cell. **Miss** = amber outlined ring (dashed). **False tap** = coral cell with an ✕ glyph. Shape + colour, never colour alone.
- Void rounds show "Timing interrupted — this round doesn't count" and a **Replay round** button.
- **Next round** primary button; Space/Enter also advances. Optional auto-advance.

### 11.7 Session summary (P0)
- Mean accuracy (hero number), mean hits `16.4 / 18`, perfect rounds `7 / 20`, best/worst, mean recall time, mean first-tap time.
- Per-round accuracy sparkline.
- Test modes: the threshold result (`Capacity at 1.0 s: 16.5 ± 0.8`) and the staircase chart.
- Personal-best callouts ("New best mean accuracy for 8×18@1000").
- Actions: **Train again** (same config), **Change settings**, **View progress**.

### 11.8 Progress `/progress` (P0 basic, P1 full)
- P0: session list (date, config, mean accuracy), personal bests per config signature, accuracy-over-time chart for a selected config, capacity and speed test history.
- P1: error **heatmap** (per-cell miss rate normalised by how often each cell was a target), insights (§15), streak/days trained, export/import.
- Empty state: one-line explanation + **Take a capacity test** CTA.

### 11.9 Settings (sheet, P0)
Theme (dark / light P1 / system), haptics, sounds (P1), countdown, memorize progress bar, round start, swipe-to-select, reduced motion override, **Export data** (P1), **Delete all data** (confirm dialog).

### 11.10 Privacy & About (P0)
Plain-language page: what's stored, where, how to delete it; independence from other games.

## 12. Input and latency requirements

| Req | Detail |
|---|---|
| Touch-down activation | Cells toggle on `pointerdown`, never on `click`/`pointerup`. |
| Next-frame feedback | The toggled cell's new state is painted on the next frame. Budget: p95 ≤ 1 frame + 8 ms from event timestamp to paint. |
| No dead zones | Gaps between cells belong to the nearest cell; a tap anywhere on the board hits exactly one cell. |
| Swipe to paint | Drag across cells to select/deselect (mode set by first cell). Uses coalesced pointer events so fast swipes don't skip cells. Can be disabled in settings. |
| No gesture interference | During recall, the board blocks scroll, pinch-zoom, double-tap zoom, text selection, long-press callouts, context menus and tap highlight. |
| Primary pointer only | Second fingers are ignored during a drag (no accidental multi-select). |
| Haptics | Light tick on select where supported (Android). No-op elsewhere. Toggle in settings. |
| Keyboard | Arrows move a focus ring; Space/Enter toggles; `C` clears; `Enter` with focus outside the board submits; Space starts/advances; `Esc` opens "End session?". |
| Mouse | Same as touch; hover styles only on `(hover: hover)` devices. |
| Buttons | ≥ 44×44 px targets, press state on pointer-down. |

## 13. Timing requirements

1. Exposure is **frame-aligned**: the pattern is shown on one display frame and hidden on the frame closest to `shownAt + target`. Expected error ≤ ½ frame (≈ 8 ms at 60 Hz, 4 ms at 120 Hz).
2. Actual exposure is **measured** from frame timestamps and stored with every round.
3. The reveal is a single attribute change on the board root (paint-only, no layout).
4. A round is **voided** if, between countdown start and hide: the page becomes hidden (tab/app switch), the viewport resizes or rotates, or any frame gap exceeds 2× the measured frame period.
5. Frame period is estimated from rAF deltas during the countdown (median).
6. The UI can show actual timing in the round result ("Exposure 1,000 ms (60 frames)") — shown under an "i" detail, not in the headline.
7. The exposure setting's helper text states that the browser can only show whole frames.

Limitation to acknowledge in the FAQ: browsers can't measure photons, only frames. Display latency is constant for a device, so it doesn't change how long the pattern is visible.

## 14. Training integrity

This isn't anti-cheat, it's keeping practice honest.

- The pattern is removed from the DOM data attributes when memorize ends; the recall board holds no answer.
- Accessible labels never reveal lit state during memorize/recall.
- Browser back during a session opens "End session?" instead of navigating.
- Leaving mid-memorize voids the round (§13).
- No replay of the pattern before submit.
- Reloading mid-session: session is lost by design (V1); settings and completed sessions persist.

## 15. Feedback and learning

- **Per-round overlay** (P0) — the most important learning tool.
- **Tap-order replay** (P1) — on the result board, a "Replay taps" button animates your selections in order at 4× speed; shows whether your last taps were the wrong ones.
- **Heatmap** (P1) — where on the board you miss most.
- **Insights** (P1) — generated from on-device history, only shown when statistically meaningful (≥ 20 rounds of evidence, effect ≥ 1.5×). Examples:
  - "You miss edge cells 2.1× more than centre cells."
  - "Isolated cells (no neighbours) are missed 1.8× more than cells in clusters."
  - "Your last 3 taps per round are wrong 3× more often than your first 3."
  - "Accuracy drops sharply below 900 ms at 18 cells."
- **Technique tips** (P1) — short, optional cards: chunking by quadrant, seeing shapes/letters in clusters, scanning the whole board rather than fixating. Accessible from the summary, never shown mid-session.

## 16. Data and privacy (V1)

- **Stored on-device only**: settings and custom presets (localStorage), session history (IndexedDB).
- No cookies, no third-party scripts, no analytics, no fonts from third-party CDNs at runtime (self-hosted).
- Storage is versioned and validated on load; corrupt data is quarantined (moved aside) and the app starts clean with a notice, never a crash.
- **Delete all data** in settings. **Export/Import JSON** (P1), which also becomes the V2 migration path.
- History cap: keep the latest 1,000 sessions; older ones roll into per-config monthly aggregates so trends survive.
- Landing copy: "No account. Your history stays on this device."

## 17. Accessibility

- WCAG 2.2 AA for all non-game UI: contrast, focus visible, labels, headings, 44 px targets.
- Full keyboard play (§12).
- Screen readers: setup, results and progress are fully readable. During memorize the board is `aria-hidden` (the task is inherently visual); results announce the score via a live region.
- `prefers-reduced-motion`: disables decorative motion, number tickers and landing loops. The timed reveal is unaffected (it's an instant change, not an animation).
- Colour is never the only signal (overlay uses rings and ✕ glyphs).
- High-contrast mode support (`forced-colors`): cells get system colours and borders.
- Text scales to 200% without breaking layouts (board shrinks, controls wrap).

## 18. Devices and responsiveness

| Class | Width | Layout |
|---|---|---|
| Small phone | 320–374 | Single column; board fills width minus 16 px gutters; setup controls stacked |
| Phone | 375–479 | Primary design target |
| Large phone / small tablet | 480–767 | Single column, board capped by height |
| Tablet | 768–1023 | Setup two-column; results side-by-side optional |
| Desktop | ≥ 1024 | Setup left / board right; results side-by-side |
| Landscape phone | height < 500 | Board on the left sized to height; labels and controls in a column on the right |

Rules:

- Board is always square and sized to the largest square that fits the available width **and** height (minus chrome and safe areas). Max 720 px.
- Uses dynamic viewport units (`dvh`) so mobile browser toolbars don't cause jumps.
- Respects safe-area insets (notches, home indicator).
- Minimum cell size 28 px; below that, the setup warns and suggests a smaller board.
- Supported browsers: last 2 versions of Chrome, Edge, Firefox, Safari (macOS + iOS 17+), Samsung Internet.
- Display refresh rates 60, 90, 120, 144 Hz all handled by frame-rate-independent timing.
- **Screen Wake Lock** during a session so the phone doesn't dim mid-round.
- **Installable PWA** (P1), fully offline after first load.

## 19. Non-functional requirements

| Area | Budget |
|---|---|
| Landing JS (gzip) | ≤ 90 KB first load |
| `/train` JS (gzip) | ≤ 150 KB first load |
| LCP (landing, 4G, mid phone) | < 1.8 s |
| INP (all pages) | < 100 ms (target < 50 ms) |
| CLS | 0 on every screen, including phase transitions |
| Long tasks during a session | none > 50 ms |
| Memory | Stable over a 100-round session (no growth > 5 MB) |
| Offline (P1) | Everything except first load works offline |

## 20. Edge cases

| Case | Behaviour |
|---|---|
| Tab/app switch during countdown or memorize | Void round, new seed, replay |
| Rotate/resize during memorize | Void round |
| Rotate/resize during recall | Board resizes, selections preserved, hit-test rect recomputed |
| Incoming call/notification overlay on mobile | Handled by visibility/void rules |
| Double tap on a cell | Two toggles (select then deselect) — consistent and predictable, no zoom |
| Tap during memorize | Ignored |
| Submit with 0 selections | Button disabled; keyboard Enter ignored |
| Recall timeout | Auto-submit current selection |
| Storage full / blocked (private mode) | App works, shows "History can't be saved in this browser mode" once |
| Corrupt stored data | Quarantine, start clean, notify |
| Very low frame rate device | Frame-gap voiding kicks in; after 3 voids in a row, show "Your device is dropping frames — close other apps" |
| k = 50% cap on tiny boards | Cap enforced in UI and engine |
| Browser back mid-session | "End session?" dialog |

## 21. Release plan

### V1.0 — Core trainer (P0)
Engine, state machine, frame-accurate exposure, touch/mouse/keyboard input, custom config, presets + saved presets, capacity test, speed test, round result with overlay, session summary, on-device history, basic progress page, settings, landing page, privacy page, wake lock, dark theme, a11y baseline, perf budgets met.

### V1.1 — Training depth (P1)
Road to 18 goal ladder, endurance mode, heatmap, insights, tap-order replay, technique tips, PWA offline + install, light theme, sounds, export/import.

### V2 — Accounts and sync (P2)
Supabase Auth + Postgres, cloud history, import of on-device history on first sign-in, cross-device sync, personal records, saved configs in the cloud.

### V2.1 — Motivation
Streaks, daily challenge (same seed for everyone that day), achievements.

### V3 — Competition
Server-issued seeds and server-side timing sanity checks, leaderboards per config signature, weekly challenges, tournament mode. Client-reported scores can't be fully trusted; leaderboards need server-issued patterns and plausibility checks.

## 22. Acceptance criteria (V1.0 definition of done)

- [ ] A first-time visitor can go landing → playing a demo round in ≤ 2 taps.
- [ ] Full session in each mode completes on iPhone Safari, Android Chrome, desktop Chrome/Firefox/Safari.
- [ ] Automated timing test: 50 rounds at 1000 ms, every measured exposure within ±1 frame.
- [ ] Automated input test: a seeded e2e session selects the exact pattern and scores 100%.
- [ ] Tab switch during memorize voids the round and replays it.
- [ ] No scroll, zoom, text selection or callout is possible on the board during recall (manual device check).
- [ ] Swipe across a full row at speed selects every cell in it.
- [ ] CLS = 0 across all phase transitions (measured).
- [ ] Settings, presets and history survive reload; delete-all wipes them.
- [ ] Keyboard-only user can complete a session.
- [ ] Lighthouse mobile ≥ 95 in all four categories on landing.
- [ ] No third-party network requests at runtime.

## 23. Open questions and risks

| # | Question / risk | Current stance |
|---|---|---|
| 1 | Trademark risk around "Mind Snap" | Check before public launch; rebrand candidates listed |
| 2 | Cookieless aggregate analytics in V1.1? | **Resolved post-V1.0**: added Vercel Analytics (cookieless page views only, no cross-site tracking or identification). Disclosed on `/privacy` and in the landing FAQ; never sees anything from inside a training session. See [ADR-0007](adr/0007-add-cookieless-page-view-analytics.md). |
| 3 | Pass threshold 0.90 for staircases — too strict/lenient at small k? | Validate with testers; make it an advanced setting |
| 4 | Swipe-to-paint default on — accidental paints? | Default on; watch tester feedback |
| 5 | Does the competition format limit selections to k? | Default limit on in the Competition preset; configurable |
| 6 | Open-source the project? | Undecided; affects footer and README |
| 7 | iOS has no Vibration API | Accept; haptics are a nice-to-have |
