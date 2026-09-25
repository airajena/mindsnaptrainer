# Progress

## M0 — Scaffold, tokens, tooling, CI (2026-09-25)

**Built**
- Next.js 16.3.6 (App Router, Turbopack), React 19.3, TypeScript 5.9 strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- Tailwind v4 with the TECH_PLAN §3 tokens in `src/styles/tokens.css`, mapped via `@theme inline`. The default Tailwind palette is cleared so only tokens exist.
- Geist Sans and Geist Mono self-hosted via `geist` (`next/font/local`).
- Biome 2.5, Vitest 5 (v8 coverage, ≥ 95% threshold on `src/engine/**`), Playwright 1.63 (Chromium, Firefox, WebKit, Pixel 7, iPhone 14).
- Dev-only token page at `/lab/tokens`, gated by `TEST_HOOKS`.
- GitHub Actions: typecheck → lint → unit + coverage → test build → e2e on 3 engines.

**Tests**: typecheck ✓, lint ✓, unit 1/1 ✓, e2e smoke 10/10 ✓ (includes "no third-party requests").

**Deferred**: Lighthouse CI (`@lhci/cli`) to M8 (D7). Pre-commit hook not added yet; CI enforces lint.
