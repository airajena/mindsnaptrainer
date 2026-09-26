import Link from "next/link";
import { SettingsButton } from "@/features/settings/settings-button";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";

/** App chrome for setup / progress. Not shown during a session. */
export function AppHeader({ current }: { current: "train" | "progress" }) {
  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-button px-2.5 text-small font-medium hover:bg-surface-2 sm:px-3",
        active ? "text-text" : "text-text-muted",
      )}
    >
      {label}
    </Link>
  );
  return (
    <header className="flex h-14 items-center justify-between gap-2">
      <Link
        href="/"
        className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-button px-1 font-medium"
      >
        <Logo className="size-6" />
        <span className="max-[359px]:sr-only">MindSnap</span>
      </Link>
      <nav aria-label="App" className="flex items-center gap-1">
        {link("/train", "Train", current === "train")}
        {link("/progress", "Progress", current === "progress")}
        <SettingsButton />
      </nav>
    </header>
  );
}
