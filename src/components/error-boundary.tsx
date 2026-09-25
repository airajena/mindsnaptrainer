"use client";

import { Component, type ReactNode } from "react";

/** Session error boundary: a crash in play never takes history or settings with it. */
export class SessionErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-gutter">
        <h1 className="text-h2">Something broke — your history is safe.</h1>
        <p className="text-text-muted">
          This session couldn&apos;t continue. Your settings and completed sessions are stored
          separately and weren&apos;t affected.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-13 rounded-button bg-accent font-medium text-accent-ink"
        >
          Reload
        </button>
      </main>
    );
  }
}
