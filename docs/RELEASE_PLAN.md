# Release Plan

How this project ships, at its current stage and as it matures. This is a
living document — update it as the release process actually changes, rather
than treating it as aspirational.

## Current stage: pre-release, open source, no production deployment yet

As of this writing: the codebase implements all of V1.0's P0 scope (see the
[PRD §22 checklist](PRD.md#22-acceptance-criteria-v10-definition-of-done)
and [PROGRESS.md](PROGRESS.md) for exactly what's done and what's open), CI
is green, and the project is being open-sourced. **It has not yet been
deployed to a public URL.** There is no CD (continuous deployment) pipeline
yet — deploys, when they start, will be manual pushes to a hosting
provider until that's automated.

This doc describes both **where things stand today** and **the plan** for
getting to a real V1.0 launch and beyond.

## Versioning

Semantic-ish, not yet strict SemVer (no public API to version against — this
is an app, not a library):

- **V1.0** — the scope defined in [PRD.md §21](PRD.md#21-release-plan):
  core trainer, all P0 features. This is what's currently built.
- **V1.1** — training depth: goal ladder, endurance mode, heatmap, insights,
  tap-order replay, PWA offline+install, light theme, sound, export/import.
- **V2** — accounts and cloud sync (see
  [TECH_PLAN.md §16](TECH_PLAN.md#16-v2-architecture-accounts--sync) and
  [ADR-0005](adr/0005-on-device-storage-only-v1.md)).
- **V2.1** — streaks, daily challenge, achievements.
- **V3** — competition features (server-issued seeds, leaderboards).

Git tags will start at `v1.0.0` on the first production deploy.

## Pre-launch checklist (V1.0)

Gating items before the first public deploy, pulled from
[PRD.md §22](PRD.md#22-acceptance-criteria-v10-definition-of-done) and
[PROGRESS.md](PROGRESS.md)'s tracking of it. Everything unchecked here is a
**known gap**, not an oversight — see each linked doc for why it's still
open.

- [x] All automated gates green: unit (Vitest), e2e (Playwright, 3 browsers +
      2 device emulations), Lighthouse CI, bundle budgets — see
      [TEST_PLAN.md](TEST_PLAN.md).
- [x] Zero third-party network requests at runtime (privacy claim, e2e-
      enforced).
- [x] Settings/presets/history survive reload; delete-all wipes them.
- [x] Keyboard-only session completable; automated a11y checks pass (0
      serious/critical).
- [ ] **Trademark check.** [PRD.md §5](PRD.md#5-naming-and-brand-note) flags
      that "Mind Snap" is also the name of a feature in a competitive memory
      game the app is designed to train for, and that a public launch should
      check for trademark risk before shipping under this name. **Not done.**
      Rebrand candidates are listed in the PRD if needed. This blocks a
      public launch under the current name, though it does not block open-
      sourcing the code.
- [ ] **Real-device manual QA** — see
      [TEST_PLAN.md §7](TEST_PLAN.md#7-manual-test-checklist-not-yet-executed).
      All current device coverage is emulated (Pixel 7 / iPhone 14 via
      Playwright); no real phone, tablet, or screen reader pass has been
      done yet.
- [ ] **Lighthouse mobile ≥ 0.95 performance on landing.** Currently 0.93
      median. The remaining gap is the React/Next.js framework's own JS
      floor inside Lighthouse's simulated-throttle model (observed real LCP
      is 0.43s) — see [ADR-0004](adr/0004-bundle-budgets-over-prd-totals.md)
      and D28 in [DECISIONS.md](DECISIONS.md). This is a known, understood
      shortfall, not an unexplained regression.
- [ ] A public hosting URL, HTTPS, and a real domain (or a `*.vercel.app` /
      similar subdomain as an interim).
- [ ] A privacy policy page reviewed against wherever it's actually hosted
      (the existing `/privacy` page describes the on-device-only model
      accurately for the current architecture — re-check it if hosting
      analytics or error-reporting is ever added).

## Deployment (once a hosting decision is made)

The app is a static-output-friendly Next.js app with **no backend and no
environment secrets required for V1** — deployment is "build and serve the
output," not "provision infrastructure."

Recommended path for V1 (no database needed yet): a platform with native
Next.js support (e.g. Vercel) — push to a connected Git repository, it
builds and deploys automatically, and previews are generated per pull
request for free on non-commercial use. If the deployment target instead
needs to support commercial use on a free tier, or a self-managed
environment, alternatives exist (e.g. Cloudflare via the Next.js adapter,
or a container behind any static host) — this is an infrastructure decision
to make at deploy time, not one this document should freeze in place.

**When V2 (accounts + Postgres) lands**, hosting needs to add: a managed
Postgres instance, environment secrets for the auth/database connection, and
a migration step in the deploy pipeline (see
[TECH_PLAN.md §16](TECH_PLAN.md#16-v2-architecture-accounts--sync) for the
schema). None of that exists yet — V1 has no database.

## Rollout strategy (once deployed)

Given the app is a fully client-side experience with on-device state and no
user accounts, a rollout is low-risk compared to a typical backend-service
release: there's no data migration to sequence, no server capacity to ramp,
and a bad deploy only affects users who load the new build (nothing is
running server-side to roll back a stateful mutation from).

1. **Deploy to a preview URL first** (automatic on most platforms for a PR).
   Smoke-test manually: land on `/`, play the demo, start a real session,
   reach `/progress`.
2. **Promote to production** once the preview looks right and CI is green
   on the branch being deployed.
3. **Rollback** is "redeploy the previous build" — since there's no
   database, there's no accompanying data rollback to worry about. This
   changes once V2 introduces a database with migrations; that will need its
   own migration rollback plan at that time.
4. **Monitor**: currently no error-reporting or analytics service is
   integrated (by design — see [ADR-0005](adr/0005-on-device-storage-only-v1.md)).
   If/when error reporting is added post-launch, it must be disclosed on the
   Privacy page and must not send data that identifies a user or their
   training history, to stay consistent with the product's privacy
   principle.

## Feature flagging

There's no runtime feature-flag system. The one flag that exists,
`NEXT_PUBLIC_TEST_HOOKS`, is a **build-time** compile constant (on in
`pnpm dev` and `pnpm build:test`, compiled to `false` and dead-code-
eliminated in a normal `pnpm build`) — see
[ADR-0003](adr/0003-deterministic-seeded-sessions.md). It gates `/lab` and
the `?seed=` override, not product features. New, still-in-progress product
features should be built on a branch and merged when ready, not shipped
behind a runtime flag, unless that changes as the team/contributor base
grows.

## Post-launch: V1.1 and beyond

V1.1 scope, and the longer-term V2/V2.1/V3 roadmap, are defined in
[PRD.md §21](PRD.md#21-release-plan) and summarized in
[ARCHITECTURE.md §8](ARCHITECTURE.md#8-planned-v2-architecture-accounts--sync)
for V2 specifically. Each of those milestones should get its own update to
this document — deployment and rollout mechanics for V2 in particular will
differ meaningfully from V1 once a database and authentication exist.
