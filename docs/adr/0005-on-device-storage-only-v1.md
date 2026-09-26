# ADR-0005: On-device storage only in V1; sync deferred to V2

**Status:** Accepted

## Context

[PRD.md §2](../PRD.md#2-goals-non-goals-success-criteria) and
[§16](../PRD.md#16-data-and-privacy-v1) make "no account, no tracking, data
stays on the device" a V1 product principle, not just a technical default.
At the same time, session history needs to survive reloads, support trend
charts over hundreds of sessions, and eventually (V2) sync across devices
without a painful migration.

## Decision

- V1 persists everything client-side: settings in `localStorage`, session
  history in IndexedDB (via `idb-keyval`), both behind a versioned,
  validated envelope (see [LLD.md](../LLD.md#platformstorage) and
  [ARCHITECTURE.md §7](../ARCHITECTURE.md#7-state-and-persistence)).
- History records use **UUIDv7** ids from day one — even though V1 has no
  server to sync to — specifically so that when V2 adds accounts, a user's
  existing on-device history can be imported idempotently by id, with no
  id-remapping step and no risk of duplicate records on a retry.
- History beyond 1,000 sessions is compacted into monthly aggregates per
  config signature rather than deleted, so long-run trend data survives
  indefinitely on a fixed storage budget.
- No analytics SDK, no third-party script, no server call of any kind exists
  in the V1 codebase — verified by an e2e test
  (`e2e/landing.spec.ts`, "no third-party requests on any page") that fails
  CI if one is ever introduced.

  > **Post-V1.0 update:** [ADR-0007](0007-add-cookieless-page-view-analytics.md)
  > narrows this specific claim by adding a disclosed, cookieless page-view
  > counter. Training data itself is still never transmitted anywhere — that
  > guarantee is unchanged and still enforced structurally, not just by
  > policy. Read ADR-0007 for exactly what changed and what didn't.

## Consequences

**Positive**

- The privacy claim is structurally true, not just a policy statement — 
  there's no backend in V1 for data to leak to even by accident, and a
  regression test guards against a dependency quietly adding one.
  the "delete all data" feature ([DECISIONS.md](../DECISIONS.md), settings)
  is a complete, one-step guarantee.
- The V2 migration path is designed in from the start rather than
  retrofitted: UUIDv7 ids mean "sign in for the first time" can be a simple
  idempotent upload, not a data-reconciliation project.

**Negative / accepted trade-offs**

- No cross-device history in V1 — a user's progress lives on one
  browser/device until they use it again there. This is called out as a
  known limitation, not a gap discovered later.
- Storage is subject to browser quotas and can be cleared by the user or the
  browser (e.g. Safari's storage eviction policy in private/low-storage
  conditions); the app degrades to "start clean" with a notice rather than
  crashing, but data loss in that scenario is possible and disclosed on the
  Privacy page.
- Every new piece of persisted data needs its own schema entry and version
  bump discipline (see [LLD.md](../LLD.md#platformstorage)); there's no
  server-side schema to fall back on for correctness.

## Alternatives considered

- **A lightweight backend from V1** just for history (no accounts). 
  Rejected: still a server to run and secure, still a place data could leak
  from, for a benefit (cross-device sync) explicitly scoped to V2.
- **Auto-increment ids**, switching to UUIDs only when V2 is built.
  Rejected: would force an id-remapping migration exactly when it's least
  convenient (real users' real history, mid-launch of the sync feature).
