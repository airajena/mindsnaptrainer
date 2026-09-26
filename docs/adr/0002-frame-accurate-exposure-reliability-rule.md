# ADR-0002: Frame-accurate exposure with a strict dual reliability rule

**Status:** Accepted

## Context

The product's core claim is that "1.00 s" means the pattern was actually on
screen for close to 1000 ms, measured, not assumed
([PRD.md §13](../PRD.md#13-timing-requirements)). [PRD.md §13.4](../PRD.md#13-timing-requirements)
originally specified voiding a round if any frame gap during it exceeded 2×
the measured frame period.

That rule alone has a gap: a single dropped frame *right at the hide
boundary* can make the exposure overshoot by up to 1.5 frame periods and
still pass the "gap ≤ 2×period" check, silently breaking the product's
own ±1-frame promise ([PRD.md §2](../PRD.md#2-goals-non-goals-success-criteria)).
Additionally, float-precision jitter around exactly `2×period` caused
flip-flopping between reliable/unreliable on borderline frames, and WebKit's
whole-millisecond timestamp rounding made an exact threshold unworkable.

## Decision

An exposure is `reliable` only if **both** hold:

```
maxFrameGapMs ≤ 2 × framePeriod + 0.5
|actualMs − targetMs| ≤ framePeriod + 0.5
```

The `+0.5` ms tolerance on each side absorbs floating-point/timestamp-
rounding jitter without meaningfully weakening the check. The second
condition also catches a case the gap rule alone misses: a mid-exposure
refresh-rate change (e.g. iOS ProMotion throttling down), where no single
frame gap is large but the cumulative drift pushes the actual exposure
outside tolerance.

Implemented in `platform/exposure.ts` (`isReliable`), simulation-tested in
`platform/exposure.test.ts` at 60/90/120/144 Hz with synthetically dropped
frames. See [LLD.md](../LLD.md#platformexposurets) for the module contract
and [ARCHITECTURE.md §5](../ARCHITECTURE.md#5-the-timing-pipeline) for how
this fits the reveal/hide pipeline.

## Consequences

**Positive**

- The ±1-frame promise in the PRD is actually enforced, not just usually
  true.
- A round that's silently 1.5 frames too long — which a user might not
  notice but which would corrupt a capacity/speed threshold estimate — is
  now caught and voided instead of counted.
- The 0.5 ms tolerance eliminates a class of test flakiness that would
  otherwise show up as intermittent CI failures on exact-boundary cases.

**Negative / accepted trade-offs**

- Marginally more voided/replayed rounds on unstable displays or heavily
  loaded machines, versus the looser original rule — an accepted cost for
  correctness. This is also why perf/timing e2e tests run serially
  ([DECISIONS.md](../DECISIONS.md) D13): parallel CPU contention was
  triggering exactly this rule far more often than a real single-tab session
  would.
- Windows' WebKit build under Playwright has irregular rAF timing unrelated
  to real Safari; those runs are reported as annotations, not asserted in
  CI ([DECISIONS.md](../DECISIONS.md) D14).

## Alternatives considered

- **Keep only the max-gap rule** (as originally specified). Rejected: allows
  the overshoot case above to pass silently.
- **Tighter gap threshold** (e.g. `1.5×period` instead of `2×`) without the
  actual-vs-target check. Rejected: doesn't address the refresh-rate-change
  case, and a tighter gap alone would void far more rounds on ordinary
  60 Hz displays that occasionally miss one frame under normal load.
- **No tolerance band** (exact `≤` comparison). Rejected after observing
  flip-flopping test results caused by float/timestamp rounding.
