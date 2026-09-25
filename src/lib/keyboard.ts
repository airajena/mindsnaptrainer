/** True when a key event targets a text field (global shortcuts must not fire). */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

/** True when a key event targets a control that handles Enter/Space itself. */
export function isOnControl(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t?.closest(
    "button, a, [role='button'], [role='tab'], [role='radio'], [role='switch'], [role='slider']",
  );
}
