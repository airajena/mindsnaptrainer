# Architecture Decision Records

An ADR captures one significant, hard-to-reverse architectural decision: the
context that forced it, the options weighed, and the consequences accepted.
It's a complement to [DECISIONS.md](../DECISIONS.md), not a replacement:

- **[DECISIONS.md](../DECISIONS.md)** is a running log of *every* choice made
  where the spec was silent or ambiguous, in the order they came up during
  the build — including small, easily-reversed calls (e.g. "which npm
  script name"). Newest entry last. Read it to understand a specific
  behavior's origin.
- **`adr/`** (this directory) pulls out the decisions with real architectural
  weight — the ones a new contributor should read *before* proposing a
  change in that area, because reversing them would mean redesigning a
  subsystem, not editing a line.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-functional-core-imperative-shell.md) | Functional core, imperative shell: pure engine, no backend in V1 | Accepted |
| [0002](0002-frame-accurate-exposure-reliability-rule.md) | Frame-accurate exposure with a strict dual reliability rule | Accepted |
| [0003](0003-deterministic-seeded-sessions.md) | Deterministic, seeded sessions as the testing strategy | Accepted |
| [0004](0004-bundle-budgets-over-prd-totals.md) | Enforce app-code bundle budgets in CI instead of unattainable PRD totals | Accepted |
| [0005](0005-on-device-storage-only-v1.md) | On-device storage only in V1; sync deferred to V2 | Accepted |
| [0006](0006-automatic-round-start-no-per-round-countdown.md) | Automatic round start removes the per-round countdown and delay | Accepted |
| [0007](0007-add-cookieless-page-view-analytics.md) | Add cookieless page-view analytics (Vercel Analytics) — narrows ADR-0005 | Accepted |

## Format

Each ADR follows the same shape: Status, Context, Decision, Consequences,
Alternatives considered. New ADRs are numbered sequentially and never
renumbered or deleted — a superseded decision gets a new ADR that says so and
links back, so the history stays legible.
