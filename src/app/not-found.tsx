import Link from "next/link";
import { buttonClass } from "@/components/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-gutter">
      <p className="font-mono text-label text-text-muted tabular">404</p>
      <h1 className="text-h1">Nothing flashed here.</h1>
      <p className="text-text-muted">That page doesn't exist.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("secondary", "lg")}>
          Home
        </Link>
        <Link href="/train" className={buttonClass("primary", "lg")}>
          Start training
        </Link>
      </div>
    </main>
  );
}
