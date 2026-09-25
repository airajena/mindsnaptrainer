"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { SessionState } from "@/engine/types";
import type { SessionStore } from "@/stores/session-store";

export const SessionContext = createContext<SessionStore | null>(null);

export function useSession(): SessionStore {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession outside <SessionContext>");
  return session;
}

/** Narrow subscription to the session state. Keep selectors returning stable references. */
export function useSessionState<T>(selector: (s: SessionState) => T): T {
  const session = useSession();
  return useStore(session.store, (s) => selector(s.state));
}
