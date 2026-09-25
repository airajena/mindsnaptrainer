# Decisions

Choices made where the PRD / tech plan were silent or ambiguous. Newest last.

## D1 — TypeScript 5.9, not 7.0 (M0)
TypeScript 7.0 (the native compiler) is the latest npm release, but Next.js 16.3 still depends on the TS 5 compiler API for its type-check step and plugin. Pinned to `^5` as scaffolded by `create-next-app`. Revisit when Next supports TS 7.

## D2 — No `uuid` package (M0)
UUIDv7 is ~15 lines on top of `crypto.getRandomValues`, so it lives in `platform/` instead of adding a dependency.

## D3 — `cn()` without clsx / tailwind-merge (M0)
Components are written so their classes never conflict, so merging isn't needed. Saves ~7 KB gzip against the landing budget.

## D4 — Test hooks gated by `NEXT_PUBLIC_TEST_HOOKS` (M0)
`/lab`, `?seed=` and `?debug=1` are on in `next dev` and in builds made with `NEXT_PUBLIC_TEST_HOOKS=1` (`pnpm build:test`, used by e2e and CI). In a normal production build the flag is a compile-time constant `false`, so the code is dead-code-eliminated and the routes 404.

## D5 — Dark theme only, no pre-paint theme script (M0)
Light theme is V1.1. With one theme, `data-theme="dark"` is rendered statically on `<html>`, so no inline script is needed yet. The light tokens are already defined under `:root[data-theme="light"]` as the seam.

## D6 — `pnpm` scripts use the shell emulator (M0)
`.npmrc` sets `shell-emulator=true` so `VAR=1 cmd` scripts work on Windows and in CI without `cross-env`.

## D7 — Lighthouse CI installed at M8 (M0)
`@lhci/cli` pulls in a large tree and is only needed for the perf pass, so it's added in M8 rather than at scaffold time. The `lh` script is reserved now.
