import { createStore } from "zustand/vanilla";

/** One-time, non-blocking notices (storage problems etc.). Shown as a toast outside timed phases. */
export interface Notice {
  id: string;
  text: string;
}

export const noticeStore = createStore<{ notices: Notice[] }>(() => ({ notices: [] }));

export function pushNotice(id: string, text: string): void {
  const { notices } = noticeStore.getState();
  if (notices.some((n) => n.id === id)) return;
  noticeStore.setState({ notices: [...notices, { id, text }] });
}

export function dismissNotice(id: string): void {
  noticeStore.setState({ notices: noticeStore.getState().notices.filter((n) => n.id !== id) });
}
