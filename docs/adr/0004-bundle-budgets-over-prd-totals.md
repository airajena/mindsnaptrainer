# ADR-0004: Enforce app-code bundle budgets in CI instead of unattainable PRD totals

**Status:** Accepted

## Context

[PRD.md §19](../PRD.md#19-non-functional-requirements) set first-load JS
budgets of ≤ 90 KB gzip (landing) and ≤ 150 KB gzip (`/train`). Measured
after scaffolding the mandated stack (Next.js 16 + React 19, per
[TECH_PLAN.md §2](../TECH_PLAN.md#2-stack), which explicitly rules out
alternative frameworks), the **framework alone** — React DOM, the Next.js
router, and its runtime — costs **134.5 KB gzip** on every single page,
before any application code exists. The 90 KB landing budget is therefore
unattainable on this stack regardless of how little app code is written.

## Decision

Keep the PRD's totals visible (`scripts/check-bundles.mjs` prints them on
every run, so the gap is never hidden), but **enforce budgets on the
application's own code** on top of the measured framework floor instead:

| Route | App-code budget (gzip, excluding framework floor) |
|---|---|
| `/` (landing) | 10 KB |
| `/train` | 55 KB |
| `/progress` | 40 KB |
| `/privacy` | 5 KB |

These are checked in CI (`pnpm check:bundles`, part of the `check` job in
[ci.yml](../../.github/workflows/ci.yml)) and fail the build if exceeded.
Getting under them required real cuts: removing the Motion animation library
(~45 KB for one slide-in bar — see D23 in [DECISIONS.md](../DECISIONS.md)),
switching to `zod/mini` with lazy-loaded schemas instead of full Zod on every
route (D24), and lazy-loading dialogs and the history store.

Recorded as [DECISIONS.md](../DECISIONS.md) D22 at the time; promoted to an
ADR here because it's a load-bearing decision for anyone adding a dependency
later — see the [Contributing guide](../../CONTRIBUTING.md#bundle-budgets).

## Consequences

**Positive**

- The budget that's actually enforced measures something the team controls
  (its own code), so it can't be gamed or rendered meaningless by a
  framework version bump.
- Every dependency addition has a concrete, CI-enforced cost check instead
  of a vague "try to keep it small."
- The gap between the PRD's aspirational total and reality stays visible
  in every CI run and in [DECISIONS.md](../DECISIONS.md) D22, rather than
  quietly abandoned.

**Negative / accepted trade-offs**

- The PRD's own stated success criterion ("≤ 90 KB landing JS") is not met
  and, on the current stack, cannot be met. This is called out explicitly as
  an open item rather than resolved — **it needs a product decision**:
  either revise the PRD's budgets to "framework + N KB," or reconsider the
  framework choice. As of this writing it remains open.
- Contributors need to know the *app-code* budget, not the PRD's headline
  number, when deciding whether a new dependency fits — documented in
  [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Alternatives considered

- **Switch frameworks** to hit the PRD's literal number (e.g. a
  no-hydration or islands-only framework). Rejected for V1: TECH_PLAN's
  stack was a given constraint for this build, and a framework migration is
  a large, separate decision — flagged as the other horn of the open
  question above, not silently decided here.
- **Quietly drop the PRD budget** and enforce nothing. Rejected: an
  unenforced budget reliably erodes over time; keeping *some* CI-enforced
  ceiling, even a revised one, was judged better than none.
- **Enforce the PRD's totals literally and treat every PR as failing.**
  Rejected as actively counterproductive — a budget everyone knows is
  impossible to meet trains contributors to ignore CI failures.
