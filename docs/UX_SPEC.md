# UX & Design Spec

The design system and interaction rules, in one place for anyone building UI
for this app. Token values and component CSS live in
[TECH_PLAN.md §3](TECH_PLAN.md#3-design-system) and
`src/styles/tokens.css`/`src/app/globals.css` — this doc explains the intent
behind them and the rules that apply across every screen. Screen-by-screen
requirements are in [PRD.md §11](PRD.md#11-screens-and-requirements).

## Design direction

**Instrument panel, not arcade.** Near-black surfaces, crisp white type, one
electric accent color used for exactly two things: lit/selected cells and
primary actions. Everything else is greyscale. The board is always the
brightest, highest-contrast object on any screen it appears on — nothing
should compete with it visually.

This isn't a stylistic preference in isolation — it follows from a product
principle ([PRD.md §4](PRD.md#4-product-principles)): "Nothing moves during
the test." A busy, colorful UI would undercut the credibility of a tool whose
whole pitch is measurement precision.

## Tokens

All colors, spacing, radii, type sizes, and motion durations are CSS custom
properties defined once in `src/styles/tokens.css` and `src/app/globals.css`,
mapped into Tailwind v4 via `@theme inline`. **Components never hardcode a
raw hex value or pixel size** — see [TECH_PLAN.md §3.2–3.5](TECH_PLAN.md#32-colour-tokens)
for the full token tables. This rule is enforced by convention and code
review, not currently by a lint rule — a good first contribution if you want
one.

A live token reference renders at `/lab/tokens` in dev and test builds.

### Color: why an accent this specific

`--accent` (`#3CF2B8`, "signal mint") was chosen for two overlapping jobs: it
needs to read clearly as "lit" against a near-black cell at a glance (a
psychophysics task depends on the signal being unambiguous), and it needs to
pass contrast requirements as a primary-button fill against dark text. The
same token is reused for both lit cells during memorize *and* selected cells
during recall — deliberately, so the visual memory a user forms during
memorize maps directly onto what they see while reconstructing it during
recall, rather than the pattern being (e.g.) green and the user's own taps
being blue.

Light theme (planned, V1.1) inverts this: lit cells become ink-black rather
than a lighter version of the accent, because a light accent color washes out
against a white surface and produces worse contrast than plain ink.

### Typography: why tabular numbers matter here

Every number in the UI — the round counter, the score, timers, exposure
readouts — uses `font-variant-numeric: tabular-nums`. Digits changing width
as they update (e.g. "9" to "10") causes visible layout jitter in a UI whose
whole premise is "nothing moves during the test." This is a hard rule, not a
nice-to-have, for any new numeric display.

## Motion rules

The most important rule in this document:

> **All state changes during a timed phase (countdown, memorize, recall) are
> instant (`--dur-0`, 0 ms).** No fades, no transitions, no easing, anywhere
> near the pattern reveal or hide.

This isn't an aesthetic choice — it's a measurement requirement. A CSS
transition on the reveal would make "how long was the pattern visible"
ambiguous (when does a fade count as "shown"?), directly undermining the
timing claim the whole product is built on. See
[ARCHITECTURE.md §5](ARCHITECTURE.md#5-the-timing-pipeline) for how the
reveal/hide is implemented as a single attribute flip specifically to keep
this instant.

Outside timed phases (landing, setup, results, summary), motion is allowed
and uses the token scale (`--dur-press` 70 ms through `--dur-slow` 380 ms,
[TECH_PLAN.md §3.5](TECH_PLAN.md#35-motion-tokens)), animating only
`transform` and `opacity` (compositor-only, no layout thrash), and always
disabled or reduced under `prefers-reduced-motion`.

## Layout rules

- **The board is always square**, sized to the largest square that fits both
  available width and height, capped at 720px. It never changes size or
  position across ready → countdown → memorize → recall — this is what
  makes CLS (Cumulative Layout Shift) exactly 0 across every phase
  transition, which is both a performance metric and a UX guarantee (a
  shifting board mid-round would be disorienting and could cause a mis-tap).
- Space reserved above/below the board for labels and controls is fixed
  height across phases — a label swapping from "Round 3 / 10" to "Select the
  squares" must never push the board.
- Minimum cell size is 28px; below that, setup warns and suggests a smaller
  board rather than silently shipping an unusable board.
- Mobile-first: 375px is the primary design target
  ([PRD.md §18](PRD.md#18-devices-and-responsiveness)); every screen is
  designed for a thumb reaching the bottom of a phone screen first, then
  scaled up.

## Accessibility

Non-negotiable for every screen except the timed phases themselves (where
the task is inherently visual):

- **WCAG 2.2 AA** contrast, focus visibility, labeling, and 44×44px touch
  targets on every non-game UI element.
- **Full keyboard play**: arrows move a focus ring on the board, Space/Enter
  toggles a cell, `C` clears, `Esc` opens "End session?" — the entire app is
  usable with no pointer at all ([PRD.md §12](PRD.md#12-input-and-latency-requirements)).
- **Color is never the only signal.** The result overlay distinguishes hit
  (solid fill) / miss (dashed ring) / false tap (✕ glyph) by shape as well as
  color, so the app remains usable for color-blind users and under
  `forced-colors` mode.
- **The board is `aria-hidden` during memorize** (the pattern itself is an
  inherently visual task with no meaningful screen-reader equivalent mid-
  flash), but setup, results, and progress are fully screen-reader
  navigable, and a live region announces phase changes and results in
  plain language ("Round 3 of 10. Recall." / "16 of 18, 89 percent").
- Every screen except the timed phases is checked with `@axe-core/playwright`
  in CI with zero tolerance for serious/critical violations — see
  [TEST_PLAN.md](TEST_PLAN.md#accessibility-testing).

Implementation detail (ARIA roles, focus management order, `forced-colors`
styling): [TECH_PLAN.md §12](TECH_PLAN.md#12-accessibility-implementation).

## Interaction feel: input latency is a design requirement

This app treats "does it feel instant" as a UX spec, not just a performance
metric:

- Cells respond on **pointer-down**, not click or pointer-up — the visual
  toggle is queued for the very next frame.
- Dragging across the board "paints" cells, with the first cell touched
  deciding whether the drag adds or removes selections.
- No gesture interference: during recall, the board blocks scroll, pinch-
  zoom, double-tap zoom, text selection, and long-press callouts, so a fast
  swipe never accidentally triggers a browser gesture instead of a
  selection.
- A light haptic tick on selection where supported, off elsewhere (no-op on
  iOS, which has no Vibration API).

Full pointer/keyboard algorithm: [TECH_PLAN.md §8](TECH_PLAN.md#8-input-pipeline);
architectural rationale: [ARCHITECTURE.md §6](ARCHITECTURE.md#6-the-input-pipeline).

## Result overlay legend

The single most important piece of "honest feedback" UI in the product
([PRD.md §15](PRD.md#15-feedback-and-learning)):

| Signal | Meaning | Visual |
|---|---|---|
| Hit | Cell in both the target pattern and your selection | Solid accent fill |
| Miss | Cell in the target pattern, not selected | Dashed amber ring |
| False tap | Cell selected, not in the target pattern | Coral fill + ✕ glyph |

Shape and color together, never color alone (see Accessibility above).

## Copy and tone

- Serious, precise, no exclamation points, no gamified praise language
  ("Great job!!"). Numbers speak for themselves.
- The app must never claim or imply affiliation with the competitive format
  it's designed to train for — presets are named by their parameters (e.g.
  "Competition · 8×8 · 18 · 1.0 s"), never by another product's name. See
  [PRD.md §5](PRD.md#5-naming-and-brand-note) and the root `AGENTS.md`
  guidance on this.
- One copy source of truth for the landing page: `src/features/landing/content.ts`.

## Where the design system lives in code

| What | Where |
|---|---|
| Token definitions | `src/styles/tokens.css`, `src/app/globals.css` |
| Live token reference | `/lab/tokens` (dev/test builds) |
| Shared components | `src/components/` (`button`, `stat`, `stepper`, `confirm-dialog`, …) and `src/components/ui/` (adapted shadcn/radix primitives) |
| Board visuals | `src/features/board/board.css` |
| Landing-only styles | `src/features/landing/landing.css` |
