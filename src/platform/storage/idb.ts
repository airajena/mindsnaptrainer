import { del, get, keys, set } from "idb-keyval";

/**
 * IndexedDB via idb-keyval, wrapped so nothing throws: blocked storage,
 * private mode, quota errors all resolve to "unavailable" instead.
 */
export const safeIdb = {
  async get(key: string): Promise<{ ok: true; value: unknown } | { ok: false }> {
    try {
      if (typeof indexedDB === "undefined") return { ok: false };
      return { ok: true, value: await get(key) };
    } catch {
      return { ok: false };
    }
  },
  async set(key: string, value: unknown): Promise<boolean> {
    try {
      if (typeof indexedDB === "undefined") return false;
      await set(key, value);
      return true;
    } catch {
      return false;
    }
  },
  async del(key: string): Promise<void> {
    try {
      await del(key);
    } catch {
      // ignore
    }
  },
  async keys(): Promise<string[]> {
    try {
      return (await keys()).map(String);
    } catch {
      return [];
    }
  },
};
