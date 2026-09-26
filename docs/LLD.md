# Low-Level Design

Module-by-module contracts: what each file in `src/engine/` and `src/platform/`
is responsible for, its public surface, and the invariants it must hold. This
is the doc to read before modifying one of these files. It complements
[TECH_PLAN.md](TECH_PLAN.md), which has the full type definitions and code —
this doc focuses on *contracts and invariants* rather than restating the code.
See [ARCHITECTURE.md](ARCHITECTURE.md) for how these modules fit together.

## Conventions used below

- **Pure** = no I/O, no clock, no randomness, no thrown exceptions for
  expected inputs (a `RangeError` for a genuinely invalid call, e.g.
  `k > n²`, is fine — that's a programmer error, not a runtime condition).
- **Invariant** = a property a test asserts for *every* input, usually via
  `fast-check` property tests, not just example-based unit tests.

---

## `engine/rng.ts`

**Responsibility:** deterministic pseudo-random numbers from a seed.

| Export | Contract |
|---|---|
| `mulberry32(seed: number)` | Returns a `() => number` generator in `[0, 1)`. Same seed ⇒ same infinite sequence. |
| `splitmix32(x: number)` | One-shot integer hash, `uint32 → uint32`. Used to derive independent seeds from a single session seed (not to generate the session's random numbers directly). |
| round-seed derivation | `roundSeed(sessionSeed, index, attempt)` combines all three through `splitmix32` so replaying round 3 after a void (attempt 1) produces a *different* pattern than attempt 0, while the whole session remains reproducible from `sessionSeed` alone. |

**Invariants:** same input ⇒ bit-identical output sequence (tested by
snapshotting N draws for a fixed seed). Different `(index, attempt)` pairs
must not collide in practice — checked statistically, not proven.

---

## `engine/bitset.ts`

**Responsibility:** compact encode/decode of a cell set (used for persisted
patterns/selections; also the intended format for a future `bytea` column —
see [TECH_PLAN.md §16](TECH_PLAN.md#16-v2-architecture-accounts--sync)).

| Export | Contract |
|---|---|
| `encode(cells: CellIndex[], n: number)` | `Uint8Array` of `⌈n²/8⌉` bytes → base64url string. |
| `decode(s: string, n: number)` | Inverse of `encode`. |

**Invariant:** `decode(encode(cells, n), n)` returns the same set (order-
independent; both sides compared as sets). Property-tested for random subsets
of random board sizes.

---

## `engine/grid.ts`

**Responsibility:** pure geometry over a row-major `n × n` index space —
neighbours, connected clusters, edge/corner classification. No knowledge of
patterns, scoring, or sessions; used by both the generator (clustered/spread
styles) and analytics (pattern-feature extraction for insights).

| Export | Contract |
|---|---|
| `neighbors(cell, n)` | 4-connected (up/down/left/right) neighbors within bounds. |
| `clusters(cells, n)` | Partitions a cell set into 4-connected components. |
| edge/corner helpers | Classify a cell by board position, for heatmap/insight features. |

**Invariant:** every cell in the input to `clusters` appears in exactly one
output cluster (partition, not a filter).

---

## `engine/generator.ts`

**Responsibility:** produce a pattern of exactly `k` cells on an `n × n`
board, in one of three styles, from a seeded RNG.

| Export | Contract |
|---|---|
| `generateUniform(n, k, rand)` | Exactly `k` unique cells in `[0, n²)`, uniformly distributed (partial Fisher–Yates). Throws `RangeError` if `k` is out of `[1, n²]`. |
| `generateSpread(n, k, rand)` | Like uniform, but rejects draws whose largest 4-connected cluster exceeds 3, retried up to 200 times. Falls back to uniform silently past that (ADR: engine has no side channel to log through — see D10). |
| `generateClustered(n, k, rand)` | 2–4 seed cells grow outward one random neighbor at a time until `k` cells are placed. Always terminates (a connected region on a grid always has a free neighbor while free cells remain). |

**Invariants** (property-tested): output has exactly `k` elements, all unique,
all in range, returned sorted; same `(n, k, seed)` ⇒ same pattern, for all
three styles.

---

## `engine/scoring.ts`

**Responsibility:** compare a target pattern against a user's selection.

| Export | Contract |
|---|---|
| `score(pattern, selection)` | Returns `{ hits, misses, falseTaps, accuracy, perfect }`. `accuracy` is the Jaccard index `hits / (hits + misses + falseTaps)`, i.e. `\|T∩S\| / \|T∪S\|`. |

**Invariants** (property-tested, for any pattern/selection pair):
`hits + misses === pattern.length`; `hits + falseTaps === selection.length`;
`0 ≤ accuracy ≤ 1`; `accuracy === 1 ⇔ selection` and `pattern` are the same
set exactly. See [PRD.md §8](PRD.md#8-scoring-model) for why Jaccard was
chosen over a naive `hits / k` (it penalizes spam-tapping).

---

## `engine/difficulty.ts`

**Responsibility:** a single objective number for "how hard is this config,"
so a user can compare, e.g., 7×7/14 against 8×8/18.

| Export | Contract |
|---|---|
| `informationBits(n, k)` | `log2 C(n², k)`, computed as a running sum of logs (not `log2(factorial(...))`) to avoid overflow at realistic board sizes. |

**Invariant:** monotonically increasing in `k` for fixed `n` up to `k = n²/2`,
and symmetric-ish around that point (choosing `k` cells out of `n²` carries
the same information as choosing which `n² − k` to leave dark). Not
explicitly tested for the symmetry property today — a good first contribution
if you're looking for one.

---

## `engine/config.ts`

**Responsibility:** the single source of truth for valid parameter ranges
(`LIMITS`), normalizing a partial/user-supplied config into a complete valid
one, and producing a stable signature string (e.g. `8x18@1000`) used to group
history by "the same test."

| Export | Contract |
|---|---|
| `LIMITS` | Min/max for board size, cell count, exposure, rounds — the numbers in [PRD.md §10](PRD.md#10-configuration-spec) as code, not duplicated elsewhere. |
| `normalizeConfig(partial)` | Clamps every field into `LIMITS`, fills in defaults for missing fields. Never throws — always returns a valid `SessionConfig`. |
| `configSignature(config)` | Deterministic string key for "same test conditions," used by history grouping and personal-best tracking. |
| `DEFAULT_SESSION_CONFIG` | The Warm-up preset's config, used when nothing else applies. |

**Invariant:** `normalizeConfig` is idempotent (`normalizeConfig(normalizeConfig(x)) === normalizeConfig(x)`) and its output always passes the same validation a hand-written config would need to pass.

---

## `engine/machine.ts`

**Responsibility:** the session state machine. See
[ARCHITECTURE.md §4](ARCHITECTURE.md#4-the-session-state-machine) for the
phase diagram and rationale.

| Export | Contract |
|---|---|
| `reduce(state, event) → state` | Pure. Given the current `Phase` and a `SessionEvent`, returns the next state. An event that doesn't apply to the current phase returns the *same* state reference (a no-op), never throws. |
| `INITIAL_STATE` | The machine's state before `START_SESSION`. |
| `selectionFromEvents(events)` | Derives the current selection set by replaying `TOGGLE`/`CLEAR` events — used so the reducer has one source of truth (the event log) instead of storing selection redundantly; a property test asserts this always agrees with the incrementally-maintained selection kept for render performance. |

**Invariants** (table-driven: every event type × every phase, ~90 cases):
no event ever throws; `SUBMIT` with zero selections is a no-op, never
produces a `RoundResult`; `TOGGLE` past the selection limit (when enabled) is
a no-op; a `VOID` event from any phase other than `countdown`/`memorize`
either no-ops or is handled per the phase's own rules (e.g. opening the "End
session?" dialog during `recall` voids that round — see D19).

---

## `engine/staircase.ts`

**Responsibility:** a generic n-down/1-up adaptive staircase, parameterized
so both the capacity test (integer levels) and speed test (multiplicative
levels) share one implementation.

| Export | Contract |
|---|---|
| `step(state, passed, options)` | Given the current `{ level, streak, reversals, direction }` and whether the last round passed, returns the next staircase state. |
| stop rule | Caller checks `reversals.length >= 8 \|\| roundsCounted >= 30`. |
| `threshold(reversals)` | Mean of the last 6 reversal levels. |

**Invariant, verified by simulation** (`engine/__tests__/`, 1,000 runs per
scenario): given a **simulated observer** with a known true threshold and a
logistic pass-probability curve around it, the staircase's estimated
threshold converges to within a documented tolerance of the true value. This
is the test that gives confidence the capacity/speed numbers shown to real
users mean something, without needing real users to validate it.

---

## `engine/modes/*`

**Responsibility:** pluggable "what happens between rounds" policies behind
one `Mode` interface (`init`, `plan`, `update`, `isDone`, `summarize` — full
shape in [TECH_PLAN.md §6.3](TECH_PLAN.md#63-modes)).

| Module | Contract |
|---|---|
| `fixed.ts` | Same `RoundConfig` every round (Custom mode, all presets). `isDone` = round count reached. |
| `capacity.ts` | Wraps `staircase.ts` with integer cell-count levels; `plan` asks the staircase for the next `k`; `summarize` reports `k*` and spread. |
| `speed.ts` | Wraps `staircase.ts` with exposure-ms levels, using two step-size regimes (coarse then fine — see [PRD.md §9.4](PRD.md#94-speed-test-p0)); snaps the chosen exposure to the nearest display frame before use. |
| `index.ts` | The mode registry — `modeId → Mode` lookup used by the machine and setup screen. |

**Invariant:** every mode's `plan()` output must satisfy `config.ts`'s
`LIMITS` — a mode is never allowed to hand the machine an out-of-range
config, even mid-staircase at an extreme level.

---

## `engine/history.ts`

**Responsibility:** turn a completed session's rounds into a compact,
persistable record, and pure aggregation over stored history (personal
bests, grouping by config signature, pruning old sessions into monthly
rollups).

| Export | Contract |
|---|---|
| `compactRound(result)` | Strips a `RoundResult` down to what's worth persisting (drops derivable/large fields). |
| `buildStoredSession(...)` | Assembles the persisted session record, including a UUIDv7 `id`. |
| `sessionSignature(session)` | Same signature scheme as `config.ts`, applied to a stored session. |
| `personalBestCallouts(history, newSession)` | Pure comparison — no I/O — returns which records (if any) the new session broke. |
| `pruneHistory(sessions, cap)` | Sessions beyond `cap` (1,000) are folded into per-signature monthly aggregates via `monthKey`, not deleted outright — long-term trend data survives. |
| `monthKey(timestampMs)` | **Does not use `new Date`** (that would violate the engine's purity rule — `new Date()` with no argument reads the clock, and even with an argument it's a platform API). Implements the civil-from-days algorithm (Howard Hinnant's) directly on the Unix day count to get a `YYYY-MM` key from pure arithmetic. |
| `groupBySignature(sessions)` | Partitions history by config signature, for the progress page's per-test views. |

**Invariant:** `pruneHistory` never loses count — every pruned session's
rounds are represented in exactly one aggregate bucket; aggregates are
associative (merging two months-in-progress equals computing the month
directly from the union of sessions).

---

## `platform/frame-clock.ts`

**Responsibility:** estimate the display's frame period without any prior
knowledge of the refresh rate.

| Export | Contract |
|---|---||
| `sampleFramePeriod(samples = 20)` | Returns a `Promise<number>` (ms). Takes the **median** of consecutive `requestAnimationFrame` deltas — median, not mean, because a single hitch (e.g. a GC pause) shouldn't skew the estimate the reveal/hide math depends on. |

Sampled during the countdown, which already takes ≥ 300 ms, so this is
free — it never adds latency to when a round can start.

---

## `platform/exposure.ts`

**Responsibility:** show the pattern for as close to `targetMs` as the
display allows, and honestly report how close it got. This is the most
scrutinized file in the codebase — read
[ARCHITECTURE.md §5](ARCHITECTURE.md#5-the-timing-pipeline) first for the
why, and ADR-0002 for the exact reliability rule.

| Export | Contract |
|---|---|
| `runExposure(board, targetMs, framePeriod, signal)` | Returns `Promise<ExposureMeasurement>` (`{ shownAt, hiddenAt, actualMs, frames, maxFrameGapMs, reliable }`), or rejects if `signal` aborts mid-exposure (tab hidden, board resized). |
| `isReliable(measurement, framePeriod)` | The rule from ADR-0002: `maxFrameGapMs ≤ 2·framePeriod + 0.5` **and** `\|actualMs − targetMs\| ≤ framePeriod + 0.5`. Both must hold. |
| `clearLit(board)` | Removes `data-lit` from every cell after hide — the recall board must carry zero trace of the answer in the DOM (PRD §14, training integrity). |

**Invariant, simulation-tested** at 60/90/120/144 Hz with synthetically
dropped frames: a measurement is flagged unreliable if and only if it
actually violates the ADR-0002 rule; a reliable measurement's `actualMs` is
always within one frame period of `targetMs`.

---

## `platform/timing-guards.ts`

**Responsibility:** decide when a round in progress must be voided —
`visibilitychange → hidden`, a `ResizeObserver` firing on the board during a
timed phase, or orientation change. Wires browser events to an
`AbortController` that `runExposure` listens to.

**Invariant:** once a guard fires, the exposure promise **always** rejects
(never resolves with a "reliable" measurement) — a round can't sneak through
as valid if the tab was hidden partway through it.

---

## `platform/countdown.ts`

**Responsibility:** the imperative, rAF-driven 3-2-1 + fixation-dot sequence
shown before a round, decoupled from React state so it can't perturb frame
sampling (see D17).

| Export | Contract |
|---|---|
| `countdownSteps(style)` | The sequence of `{ label, durationMs }` steps for `"standard" \| "quick" \| "off"`. |
| `runCountdown(el, steps, onDone)` | Drives the steps via rAF, calling `onDone` when the fixation dot appears (**not** at the reveal — see D17 for why the machine's phase transition is dispatched one beat early). |
| `clearCountdown(el)` | Cancels an in-flight countdown (used when a round is voided or the session ends early). |

---

## `platform/storage/*`

**Responsibility:** the only code allowed to touch `localStorage` /
`IndexedDB` directly, with every read/write wrapped so a quota error,
Safari private-mode restriction, or corrupted value degrades gracefully
instead of crashing the app.

| File | Contract |
|---|---|
| `envelope.ts` | Defines the `{ schemaVersion, data }` wrapper and a generic `Validator<T>` interface (implemented by `zod/mini` schemas) that both `local.ts` and `idb.ts` use identically. |
| `local.ts` | Safe `localStorage` get/set: parse failure or quota error → quarantine the raw value under a `quarantine:<key>:<timestamp>` key, return `undefined`, never throw to the caller. |
| `idb.ts` | Same contract as `local.ts`, backed by `idb-keyval`, for the larger history payload. |
| `keys.ts` | The single list of every storage key the app uses — new persisted data must add its key here, not inline a string elsewhere. |
| `schema.ts`, `history-schema.ts` | `zod/mini` schemas for settings and history payloads respectively, imported lazily (dynamic `import()`) so validation code isn't in any route's first-load JS bundle (D24). |

**Invariant:** no caller of `local.ts`/`idb.ts` ever needs its own
try/catch — every failure mode is absorbed at this layer and surfaced as
either `undefined` (fall back to defaults) or a notice event.

---

## `platform/seed.ts`, `wake-lock.ts`, `haptics.ts`, `visibility.ts`, `uuid.ts`

Small, single-purpose wrappers, each degrading to a silent no-op when the
underlying browser API is unavailable (no `navigator.vibrate` on iOS, no
Wake Lock API on older browsers, etc.) rather than feature-detecting at every
call site.

- `seed.ts` — `crypto.getRandomValues` → a session seed; in dev/test builds
  only, `?seed=` on the URL overrides it (stripped by the bundler in a normal
  production build via the `NEXT_PUBLIC_TEST_HOOKS` compile-time flag — see
  ADR-0003).
- `uuid.ts` — UUIDv7 generation (time-sortable, no dependency — see
  ADR-0001) for history record ids.

---

## Adding a new engine module

1. It must be pure: no `Date`, `Math.random`, `window`/`document`, timers, or
   React imports. The purity test will fail the build otherwise.
2. Give it property tests for its invariants, not just examples — see
   `engine/scoring.ts`'s tests for the pattern to follow.
3. If it touches persisted data shape, add the field to the relevant
   `zod/mini` schema in `platform/storage/` and bump `schemaVersion` with a
   migration, never silently reinterpret old data.
4. Document its contract here.
