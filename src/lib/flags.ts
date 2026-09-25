/**
 * Test hooks (`/lab`, `?seed=`, `?debug=1`) exist in development and in builds
 * made with NEXT_PUBLIC_TEST_HOOKS=1 (used by e2e). In a normal production
 * build this is a compile-time `false`, so the hook code is dead-code-eliminated.
 */
export const TEST_HOOKS =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_TEST_HOOKS === "1";
