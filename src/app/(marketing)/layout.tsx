import Link from "next/link";
import { buttonClass } from "@/components/button";
import { Logo } from "@/components/logo";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-gutter">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-button focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="-ml-1 inline-flex min-h-11 items-center gap-2 px-1 font-medium">
          <Logo className="size-6" />
          <span>MindSnap Trainer</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href="/progress"
            className="hidden min-h-11 items-center rounded-button px-3 text-small font-medium text-text-muted hover:text-text sm:inline-flex"
          >
            Progress
          </Link>
          <Link href="/train" className={buttonClass("secondary", "md")}>
            Train
          </Link>
        </nav>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="flex flex-col gap-4 border-t border-border py-8 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-small text-text-muted md:flex-row md:items-center md:justify-between md:pb-8">
        <p>
          MindSnap Trainer is an independent practice tool, not affiliated with Matiks or any other
          game.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-text">
            Privacy &amp; about
          </Link>
          <Link href="/train" className="inline-flex min-h-11 items-center hover:text-text">
            Train
          </Link>
          <Link href="/progress" className="inline-flex min-h-11 items-center hover:text-text">
            Progress
          </Link>
        </nav>
      </footer>
    </div>
  );
}
