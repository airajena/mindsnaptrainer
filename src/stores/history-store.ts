import { createStore } from "zustand/vanilla";
import {
  buildStoredSession,
  EMPTY_HISTORY,
  type History,
  personalBestCallouts,
  pruneHistory,
} from "@/engine/history";
import type { SessionState } from "@/engine/types";
import { decode, encode, quarantineKey } from "@/platform/storage/envelope";
import { HistorySchema } from "@/platform/storage/history-schema";
import { safeIdb } from "@/platform/storage/idb";
import { HISTORY_KEY, HISTORY_VERSION } from "@/platform/storage/keys";
import { uuidv7 } from "@/platform/uuid";
import { pushNotice } from "./notice-store";

/**
 * On-device session history (IndexedDB). Written once per completed session —
 * never during play. Loading is lazy and fail-safe: corrupt data is moved to
 * a quarantine key and the app starts clean with a notice.
 */
export const historyStore = createStore<{ history: History; status: "idle" | "loading" | "ready" }>(
  () => ({ history: EMPTY_HISTORY, status: "idle" }),
);

let loading: Promise<History> | null = null;

export function loadHistory(): Promise<History> {
  if (historyStore.getState().status === "ready")
    return Promise.resolve(historyStore.getState().history);
  if (loading) return loading;
  historyStore.setState({ status: "loading" });
  loading = (async () => {
    const res = await safeIdb.get(HISTORY_KEY);
    let history = EMPTY_HISTORY;
    if (res.ok) {
      const raw =
        typeof res.value === "string"
          ? res.value
          : res.value === undefined
            ? null
            : JSON.stringify(res.value);
      const decoded = decode(raw, HistorySchema, HISTORY_VERSION);
      if (decoded.kind === "ok") {
        history = decoded.data;
      } else if (decoded.kind === "corrupt") {
        await safeIdb.set(quarantineKey(HISTORY_KEY, Date.now()), decoded.raw);
        await safeIdb.del(HISTORY_KEY);
        pushNotice(
          "history-corrupt",
          "Your saved history couldn't be read. It was set aside and a fresh history started.",
        );
      }
    }
    historyStore.setState({ history, status: "ready" });
    return history;
  })();
  return loading;
}

async function save(history: History): Promise<void> {
  historyStore.setState({ history });
  const ok = await safeIdb.set(HISTORY_KEY, encode(HISTORY_VERSION, history));
  if (!ok) pushNotice("storage-blocked", "History can't be saved in this browser mode.");
}

/** Stores a completed session; resolves with personal-best callouts for the summary. */
export async function recordSession(state: SessionState): Promise<string[]> {
  if (state.phase.kind !== "complete" || !state.config || state.results.length === 0) return [];
  const history = await loadHistory();
  const session = buildStoredSession({
    id: uuidv7(),
    completedAt: Date.now(),
    config: state.config,
    seed: state.seed,
    summary: state.phase.summary,
    results: state.results,
  });
  const callouts = personalBestCallouts(session, history.sessions);
  await save(pruneHistory({ ...history, sessions: [...history.sessions, session] }));
  return callouts;
}

export async function clearHistory(): Promise<void> {
  historyStore.setState({ history: EMPTY_HISTORY, status: "ready" });
  await safeIdb.del(HISTORY_KEY);
  for (const k of await safeIdb.keys()) if (k.startsWith("quarantine:")) await safeIdb.del(k);
}
