# ADR-0003: Deterministic, seeded sessions as the testing strategy

**Status:** Accepted

## Context

End-to-end tests for a game-like flow are notoriously flaky when the thing
being tested is randomly generated — "click somewhere plausible" tests don't
catch scoring bugs, and can't assert an exact result. At the same time, a
seed override must never leak into a real user's production session (it
would let someone predict or manipulate a pattern) or bloat the production
bundle with test-only code paths.

## Decision

- Every session has a **seed** (from `crypto.getRandomValues` in normal use).
  The entire session — every round's pattern, every replay after a void — is
  a pure function of that one seed via `splitmix32`-derived per-round seeds
  ([LLD.md](../LLD.md#enginerngts)).
- In **dev and test builds only**, `?seed=123` on `/train` overrides the
  session seed, gated behind a `NEXT_PUBLIC_TEST_HOOKS` compile-time flag.
  `pnpm dev` has it on by default; a normal `pnpm build` compiles it to the
  literal `false`, so the dead branch (and the `/lab` route entirely) is
  eliminated by the bundler and doesn't exist in what ships to users.
  `pnpm build:test` (`NEXT_PUBLIC_TEST_HOOKS=1 next build`) is the build e2e
  and CI run against.
- E2E tests (`e2e/session.spec.ts`, `e2e/timing.spec.ts`, etc.) fix the seed,
  compute the exact expected pattern with the same pure `engine/generator.ts`
  function the app uses, and assert an **exact** outcome (e.g. "tapping
  cells [3, 7, 12, …] scores exactly 100%"), not an approximate one.

## Consequences

**Positive**

- E2E tests are exact and deterministic rather than fuzzy, which makes a
  regression in scoring or pattern generation show up as a hard test
  failure instead of a vague flake.
- Bug reports can include a seed and exact steps, making them reproducible.
- The test-hooks flag is verified dead in production by the bundle-size
  check (`scripts/check-bundles.mjs`) — if `/lab` or the seed override ever
  leaked into a production bundle, the budget check would catch the size
  regression.

**Negative / accepted trade-offs**

- Requires discipline: any new source of "randomness" or "current time"
  introduced anywhere in the app must go through the same seeded/event-
  payload path, or it silently breaks reproducibility for that piece. The
  engine purity test only catches this within `engine/`, not in
  `features/`.
- The `?seed=` mechanism is a permanent piece of test infrastructure to
  maintain, not something removed after initial development.

## Alternatives considered

- **Mock `Math.random` globally in tests.** Rejected: doesn't help outside
  the test process (e.g. reproducing a user's bug report), and encourages
  reaching for `Math.random()` directly in application code, which the
  functional-core principle ([ADR-0001](0001-functional-core-imperative-shell.md))
  already forbids inside `engine/`.
- **Record-and-replay of real sessions** instead of seeded generation.
  Rejected as far heavier infrastructure for the same benefit, and it
  doesn't give a human-readable, shareable repro like a seed number does.
