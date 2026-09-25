/** Calls `onHidden` when the page is hidden (tab switch, app switch, incoming call). */
export function onPageHidden(onHidden: () => void): () => void {
  const handler = () => {
    if (document.visibilityState === "hidden") onHidden();
  };
  document.addEventListener("visibilitychange", handler);
  // pagehide covers iOS cases where visibilitychange is unreliable (bfcache).
  window.addEventListener("pagehide", onHidden);
  return () => {
    document.removeEventListener("visibilitychange", handler);
    window.removeEventListener("pagehide", onHidden);
  };
}

export function isPageHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}
