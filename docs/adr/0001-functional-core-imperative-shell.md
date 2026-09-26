# ADR-0001: Functional core, imperative shell: pure engine, no backend in V1

**Status:** Accepted

## Context

MindSnap Trainer's core value proposition depends on two things that are easy
to get subtly wrong in a typical React app: (1) exact, verifiable timing of a
visual flash, and (2) a training/scoring model (staircases, difficulty in
bits, Jaccard accuracy) that has to be *correct*, not just "looks right in
manual testing." Both need to be testable without a browser, without flaky
timers, and without needing a server.

Separately, V1 has an explicit product requirement: no account, no tracking,
data stays on the device ([PRD.md §2](../PRD.md#2-goals-non-goals-success-criteria),
[§16](../PRD.md#16-data-and-privacy-v1)).

## Decision

Structure the codebase as a **functional core, imperative shell**:

- `engine/` contains all business logic (pattern generation, scoring, the
  session state machine, training-mode policies, analytics) as pure
  TypeScript functions on plain data. No React, no DOM, no `Date`,
  `Math.random`, or timers. Every timestamp and random draw the engine needs
  arrives as an event payload from the caller.
- `platform/` is the only code allowed to touch actual browser APIs (rAF,
  storage, wake lock, haptics), kept as thin as possible.
- **No backend in V1.** All persistence is client-side (`localStorage` +
  IndexedDB). There is no server to design, deploy, or secure yet.

A purity test fails the build if `engine/` ever imports something that
breaks this rule.

See [ARCHITECTURE.md §2–4](../ARCHITECTURE.md#2-guiding-architectural-principle-functional-core-imperative-shell)
for the resulting layer diagram and state machine.

## Consequences

**Positive**

- Whole sessions are deterministic and replayable from one seed number,
  which makes e2e tests exact ("tap this exact pattern, expect exactly
  100%") instead of approximate/flaky.
- `engine/` reaches ~99% branch coverage because it needs no mocking,
  fake timers, or DOM — it's plain function calls on plain data.
- Property-based tests (fast-check) are cheap to write against pure
  functions and catch edge cases example-based tests miss (e.g. scoring
  invariants across every possible pattern/selection pair).
- No backend means no auth, no database, no server security surface, and no
  hosting bill for V1 — it ships as a static-output Next.js app.

**Negative / accepted trade-offs**

- Every timestamp and random value the engine needs must be threaded through
  as an event payload from `platform/`, which is more ceremony at call sites
  than reaching for `Date.now()` inline.
- No cross-device history sync in V1 — a user's progress is tied to one
  browser/device until V2 ships an account system
  ([ADR-0005](0005-on-device-storage-only-v1.md)).
- Adding a genuinely new *kind* of side effect (e.g. a sound engine) means
  deciding up front whether it belongs in `platform/` or can stay pure,
  rather than just importing an audio library wherever convenient.

## Alternatives considered

- **Business logic inline in React components/hooks**, using `Date.now()`
  and `Math.random()` directly where needed. Rejected: makes deterministic
  replay and precise timing tests effectively impossible, and couples
  scoring logic to React's render cycle.
- **A backend from day one** (even a thin one) to hold history. Rejected for
  V1: contradicts the "no account, no tracking, nothing leaves your device"
  product principle, and adds infrastructure the product doesn't need yet.
  Revisited in V2 — see [TECH_PLAN.md §16](../TECH_PLAN.md#16-v2-architecture-accounts--sync).
