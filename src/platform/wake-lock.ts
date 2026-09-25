/**
 * Screen Wake Lock for the duration of a session so the phone doesn't dim
 * mid-round. Re-acquired when the page becomes visible again (the browser
 * releases it on hide). Silent no-op where unsupported.
 */
export function holdWakeLock(): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let released = false;

  const acquire = async () => {
    if (released || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try {
      sentinel = await navigator.wakeLock.request("screen");
      if (released) void sentinel.release();
    } catch {
      // Denied (battery saver, permissions policy) — not worth surfacing.
    }
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") void acquire();
  };

  void acquire();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    released = true;
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}
