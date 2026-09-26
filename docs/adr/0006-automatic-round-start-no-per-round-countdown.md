# ADR-0006: Automatic round start removes the per-round countdown and delay

**Status:** Accepted

## Context

[PRD.md §10](../PRD.md#10-configuration-spec) specified a "round start:
tap to start / auto (1.5 s)" setting. As originally built, **every** round —
including automatic ones — played the full configured countdown (3-2-1, up
to ~1.2 s) plus a fixation dot, regardless of `roundStart`. Combined with
end-of-session feedback (no per-round result screen), this produced roughly
3 seconds of dead time between the end of one pattern and the start of the
next. User feedback (a real player of the reference competitive format)
identified this as breaking the rhythm that competitive players actually
train for, where rounds in "automatic" mode flow back to back with no
re-orientation ritual between them.

## Decision

With `roundStart: "auto"`:

- Only the session's **first** round (right after pressing Start) plays the
  full configured countdown.
- Every subsequent round in the same attempt sequence gets **only** the
  ~0.3 s fixation dot — no 3-2-1, no added delay. The next round begins the
  instant the previous one is submitted (or "Next" is pressed, if per-round
  feedback is on).
- The fixation dot is **kept**, not removed, for two reasons: it gives the
  eyes a target to fixate on right before the flash (removing it would hurt
  perceived — and likely actual — recall performance), and the frame period
  used by the exposure pipeline is sampled during it
  ([ARCHITECTURE.md §5](../ARCHITECTURE.md#5-the-timing-pipeline)); dropping
  it would cost timing accuracy, not just feel.
- A round that's **replayed after a void** is re-entered by a tap (the
  "Replay round" button), so it always gets the full countdown again to
  re-orient the user — only the void-free automatic path skips it.
- "Tap to start" (`roundStart: "tap"`) is unchanged: every round, including
  the first, plays the configured countdown.

Implemented as a small pure function, `roundCountdown(setting, roundStart,
plan)`, in `features/session/round-countdown.ts` (unit-tested); the flow is
covered by `e2e/auto-rounds.spec.ts`. Full rationale also recorded as
[DECISIONS.md](../DECISIONS.md) D30.

## Consequences

**Positive**

- Automatic-mode sessions now match the back-to-back rhythm of the
  competitive format they're meant to train for, closing a real gap between
  practice conditions and the target skill.
- The change is isolated to one small, independently testable function —
  the state machine, timing pipeline, and countdown renderer are all
  untouched; `roundCountdown` only decides *which* countdown style a given
  round gets.
- Timing accuracy is preserved: the fixation dot's frame-period sampling
  still happens on every round, automatic or not.

**Negative / accepted trade-offs**

- Automatic mode is now visually inconsistent between round 1 (full
  countdown) and later rounds (dot only) within the same session — an
  intentional trade-off, not an oversight, but worth calling out for anyone
  reading the UI code cold.
- A round that voids and replays mid-session briefly reintroduces the full
  countdown before returning to back-to-back pacing, which is correct
  behavior but could look like a regression if you don't know the rule.

## Alternatives considered

- **Remove the countdown from automatic mode entirely**, including the
  fixation dot. Rejected: loses the frame-period sample for that round and
  removes the visual re-orientation cue entirely, likely hurting both
  measured timing quality and actual recall performance.
- **Shorten the countdown instead of removing it** (e.g. always play
  "quick" in automatic mode). Rejected: still inserts a fixed delay between
  every round, which was the exact complaint — competitive play has no gap
  at all between rounds beyond the fixation moment.
- **Make the per-round countdown a user-configurable toggle** independent of
  `roundStart`. Rejected as unnecessary complexity for V1: the tap-to-start
  path already gives full control to users who want a countdown every round.
