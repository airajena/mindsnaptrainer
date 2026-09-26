/**
 * Every persisted payload is `{ schemaVersion, data }`. On load: parse the
 * envelope, run migrations up to the current version, validate with Zod.
 * Anything that fails is reported as corrupt so the caller can quarantine it.
 */
/** Anything with Zod's safeParse (full or mini). */
export interface Validator<T> {
  safeParse(
    data: unknown,
  ): { success: true; data: T } | { success: false; error: { message: string } };
}

export type Migrations = Record<number, (data: unknown) => unknown>;

export type Decoded<T> =
  | { kind: "ok"; data: T }
  | { kind: "empty" }
  | { kind: "corrupt"; raw: string; error: string };

export function encode<T>(version: number, data: T): string {
  return JSON.stringify({ schemaVersion: version, data });
}

export function decode<T>(
  raw: string | null | undefined,
  schema: Validator<T>,
  version: number,
  migrations: Migrations = {},
): Decoded<T> {
  if (raw === null || raw === undefined) return { kind: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("schemaVersion" in parsed) ||
      !("data" in parsed)
    ) {
      return { kind: "corrupt", raw, error: "missing envelope" };
    }
    let v = Number((parsed as { schemaVersion: unknown }).schemaVersion);
    let data = (parsed as { data: unknown }).data;
    if (!Number.isInteger(v) || v < 1 || v > version) {
      return { kind: "corrupt", raw, error: `unsupported schemaVersion ${String(v)}` };
    }
    while (v < version) {
      const migrate = migrations[v];
      if (!migrate) return { kind: "corrupt", raw, error: `no migration from v${v}` };
      data = migrate(data);
      v++;
    }
    const result = schema.safeParse(data);
    if (!result.success) return { kind: "corrupt", raw, error: result.error.message };
    return { kind: "ok", data: result.data };
  } catch (err) {
    return { kind: "corrupt", raw, error: err instanceof Error ? err.message : String(err) };
  }
}

export function quarantineKey(key: string, now: number): string {
  return `quarantine:${key}:${now}`;
}
