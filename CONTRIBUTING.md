# Contributing

Thanks for considering a contribution. This doc covers setup, workflow, and
the standards a PR is expected to meet. For *why* the code is shaped the way
it is, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/LLD.md](docs/LLD.md) before making a non-trivial change — a change
that fights the architecture (e.g. calling `Date.now()` inside `engine/`)
will be asked to be reworked in review.

## Before you start

1. **Read the docs index** in [README.md](README.md#documentation) to find
   the right doc for what you're touching.
2. **Check [docs/DECISIONS.md](docs/DECISIONS.md) and
   [docs/adr/](docs/adr/)** — if the thing you're about to change was
   already decided deliberately (with a documented reason), your PR
   description should say why that reasoning no longer applies, not just
   redo it differently.
3. **For a substantial change** (new feature, architectural change, new
   dependency), open an issue first to discuss the approach before writing
   code — this project has strong opinions about scope creep
   (see [PRD.md §2](docs/PRD.md#2-goals-non-goals-success-criteria) — the
   non-goals list is deliberate) and about bundle size (see
   [Bundle budgets](#bundle-budgets) below).

## Setup

Requires Node ≥ 20.9 and pnpm 10.

```sh
pnpm install
pnpm dev            # http://localhost:3000, test hooks on (/lab, ?seed=)
```

## Workflow

1. Branch from `main`.
2. Make your change.
3. Run the full local gate before opening a PR:

   ```sh
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build:test
   pnpm test:e2e
   ```

   (`pnpm test:e2e` runs the parallel suite, then timing/perf specs
   serially — it's slower than the others; see
   [docs/TEST_PLAN.md](docs/TEST_PLAN.md) for why.)
4. If you touched a route's JS, also run `pnpm build && pnpm check:bundles`
   to catch a budget regression before CI does.
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) — this repo's
   git history is a good reference for the style used.
6. Open a PR. CI (typecheck, lint, unit+coverage, build, bundle check, e2e ×3
   browsers, Lighthouse) must be green to merge — see
   [.github/workflows/ci.yml](.github/workflows/ci.yml) and
   [docs/TEST_PLAN.md §6](docs/TEST_PLAN.md#6-ci-pipeline).

## Standards

The full list lives in [docs/TECH_PLAN.md §13](docs/TECH_PLAN.md#13-coding-standards-and-principles).
The ones most likely to matter for a first PR:

- **`engine/` stays pure.** No React, DOM, `Date`, `Math.random`, or timers.
  A test fails the build if this is violated. See
  [ADR-0001](docs/adr/0001-functional-core-imperative-shell.md).
- **No `any`.** External/unknown data goes through a Zod schema, not a type
  assertion.
- **Illegal states unrepresentable.** Prefer a discriminated union over a
  new boolean flag that could disagree with existing state.
- **Every engine function gets a test**, and prefer a property test (via
  `fast-check`) over several hand-picked examples when the function has a
  checkable invariant.
- **Every bug fix starts with a failing test** that reproduces it (a seeded
  e2e repro, or a property test for an engine invariant that was violated).
- **Tokens only** in styling — no raw hex or arbitrary pixel values in
  component code. See [docs/UX_SPEC.md](docs/UX_SPEC.md).
- **Nothing animates during a timed phase** (countdown/memorize/recall).
  This is a correctness rule, not a style rule — see
  [docs/UX_SPEC.md § Motion rules](docs/UX_SPEC.md#motion-rules).
- **Comments explain *why*, not *what*** — especially in `platform/exposure.ts`
  and the input pipeline, where the reasoning is genuinely subtle and the
  code alone won't convey it to the next reader.

## Bundle budgets

This project enforces JS budgets **on top of the unavoidable React/Next.js
framework floor**, not the PRD's original (unattainable, on this stack)
totals — see [ADR-0004](docs/adr/0004-bundle-budgets-over-prd-totals.md) for
the full reasoning. As of this writing:

| Route | App-code budget (gzip) |
|---|---|
| `/` | 10 KB |
| `/train` | 55 KB |
| `/progress` | 40 KB |
| `/privacy` | 5 KB |

If your change adds a dependency or otherwise grows a route's JS:

- Run `pnpm build && pnpm check:bundles` to see the actual delta.
- Prefer lazy-loading (`next/dynamic`, dynamic `import()`) for anything not
  needed for the first paint or the timed phases — see how dialogs and the
  history store are already lazy-loaded as the pattern to follow.
- If the budget genuinely can't be met, say so in the PR description with
  the numbers, rather than silently exceeding it — CI will fail the build
  either way, but an explained failure is easier to review than a
  mysterious one.

## Testing expectations

See [docs/TEST_PLAN.md](docs/TEST_PLAN.md) for the full pyramid and what
each layer covers. In short: unit/property tests for anything in `engine/`,
an e2e test for anything user-facing that isn't already covered, and no PR
that only adds a feature without a test for it.

If you have access to real mobile devices, a screen reader, or a
high-refresh-rate display, running the manual checklist in
[docs/TEST_PLAN.md §7](docs/TEST_PLAN.md#7-manual-test-checklist-not-yet-executed)
and reporting (or fixing) what you find is one of the highest-value
contributions available right now — everything in that checklist is
currently unverified on real hardware.

## Documentation

If your change affects behavior described in a doc, update that doc in the
same PR:

| You changed... | Update... |
|---|---|
| A product requirement or scope | [docs/PRD.md](docs/PRD.md) |
| An architectural approach | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and add an ADR under [docs/adr/](docs/adr/) if it's a significant, hard-to-reverse call |
| A module's contract/behavior | [docs/LLD.md](docs/LLD.md) |
| Visual design or interaction rules | [docs/UX_SPEC.md](docs/UX_SPEC.md) |
| Test coverage or CI | [docs/TEST_PLAN.md](docs/TEST_PLAN.md) |
| Anything ambiguous you had to decide | [docs/DECISIONS.md](docs/DECISIONS.md) (append, don't rewrite history) |

## Code of conduct

Be respectful, assume good faith, keep discussion focused on the work. No
formal code of conduct file exists yet — if the project grows a community
large enough to need one, that's a welcome contribution too.

## License

By contributing, you agree your contribution is licensed under this
project's [MIT license](LICENSE).
