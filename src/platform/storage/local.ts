/**
 * localStorage that never throws. Safari private mode, blocked storage and
 * quota errors all degrade to "not persisted" instead of crashing the app.
 */
export const safeLocal = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
  keys(): string[] {
    try {
      return Object.keys(window.localStorage);
    } catch {
      return [];
    }
  },
};
