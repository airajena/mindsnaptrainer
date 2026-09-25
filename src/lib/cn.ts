/**
 * Joins class names, skipping falsy values. Deliberately not tailwind-merge:
 * components are written so classes never conflict, and it saves ~7 KB gzip.
 */
export function cn(...classes: ReadonlyArray<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
