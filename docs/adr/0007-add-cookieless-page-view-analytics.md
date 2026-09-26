# ADR-0007: Add cookieless page-view analytics (Vercel Analytics)

**Status:** Accepted

## Context

[ADR-0005](0005-on-device-storage-only-v1.md) established that V1 makes no
network calls at all, enforced by an e2e test asserting zero cross-origin
requests on every page. At the same time, [PRD.md §23](../PRD.md#23-open-questions-and-risks)
question 2 explicitly left the door open: "Cookieless aggregate analytics in
V1.1? Default no; revisit if we need usage data. Must stay cookieless and be
disclosed." Deploying to Vercel makes `@vercel/analytics` a one-line add, and
the project now needs basic usage visibility (which pages get used, whether
the demo converts to a real session) that on-device-only history can't
provide — that data structurally never reaches the maintainer.

## Decision

Add `@vercel/analytics` (`<Analytics />` in the root layout), under strict
conditions that preserve the spirit of ADR-0005 even though it changes its
literal "zero requests" claim:

- **Page views only.** It counts that a page was loaded — nothing about what
  happened inside a training session (patterns, taps, scores, history) is
  visible to it or sent anywhere. That data structurally never leaves the
  device; the analytics script has no access to it.
- **Cookieless, no fingerprinting, no ad identifiers.** This is a stock
  property of Vercel's Web Analytics product, not a custom configuration —
  it does not set a persistent identifier that follows a visitor across
  sites or visits.
- **Disclosed, not silent.** The `/privacy` page, the landing FAQ, and the
  proof-strip copy on the hero were all updated to state exactly what this
  is and isn't, in the same visit as the code change — see
  [UX_SPEC.md](../UX_SPEC.md#copy-and-tone) on plain, precise copy.
- **The enforcing test was narrowed, not deleted.** `e2e/landing.spec.ts`'s
  "no third-party requests" test now allow-lists exactly Vercel's analytics
  script and beacon hostnames by exact match; any other third-party request
  still fails it. The guarantee shifts from "zero third-party requests" to
  "zero third-party requests except this one, named, disclosed exception" —
  a real narrowing, stated plainly rather than quietly.

## Consequences

**Positive**

- Gives basic, honest usage visibility (which pages get traffic, whether the
  demo converts to a real session) without compromising the property that
  matters most: a user's training data — the thing this product is actually
  about — never leaves their device.
- The exception is enforced the same way everything else in this codebase
  is: by a test that fails the build if the allow-list is exceeded, not by a
  promise nobody checks.
- Costs nothing to add on the current hosting choice (Vercel) and needs no
  additional environment configuration.

**Negative / accepted trade-offs**

- **This is a real, if narrow, walk-back of a documented guarantee.**
  [ADR-0005](0005-on-device-storage-only-v1.md)'s "no server call of any
  kind" is no longer literally true. Anyone relying on that ADR's literal
  claim (e.g. auditing this codebase for a genuinely zero-network privacy
  requirement) needs to know about this ADR too — which is exactly why this
  is written down instead of left as an undocumented one-line diff.
- A user who wants literally zero outbound requests can no longer get that
  from this app as deployed, only from a self-built instance with the
  `<Analytics />` line removed.
- Vercel Analytics has its own free-tier event limits and becomes a paid
  line item beyond them — a hosting-cost decision, separate from the privacy
  question, made at deploy time.
- If a future contributor adds an actual tracking/marketing analytics tool
  (session replay, ad pixels, cross-site identifiers), it must **not** be
  folded into this same allow-list without its own ADR — this decision's
  scope is specifically "anonymous page-view counting," not "analytics in
  general."

## Alternatives considered

- **No analytics at all** (status quo). Rejected for this deploy: the
  project has no other way to see whether the landing page or demo are
  working, and the PRD already anticipated this exact trade-off as an open
  question rather than a closed one.
- **A self-hosted, same-origin analytics approach** (e.g. proxying through
  the app's own domain, or a log-based approach with no client-side script
  at all) — would have kept ADR-0005's literal claim intact. Rejected for
  now as more infrastructure than the current usage-visibility need
  justifies; worth revisiting if the zero-request property becomes load-
  bearing for someone (e.g. a security-conscious fork).
- **A paid, more full-featured analytics suite** (funnels, session
  recording). Rejected: far exceeds "do we get any usage signal at all,"
  and most such tools are neither cookieless nor free of persistent
  identifiers by default.
