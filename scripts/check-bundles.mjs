// First-load JS budget check (PRD §19, DECISIONS D22). Run after `next build`.
//
// Reads each prerendered page's HTML, collects the <script src> chunks it
// loads up front (skipping `nomodule` polyfills modern browsers never fetch;
// lazy next/dynamic chunks aren't in the HTML so they don't count), and sums
// their gzip sizes.
//
// Reports two numbers per route:
// - total:  everything the browser downloads first (PRD §19's metric)
// - app:    total minus the framework floor (chunks every route shares:
//           React DOM + Next runtime), i.e. the JS our own code adds.
// The framework floor alone exceeds PRD's 90 KB landing budget on Next 16 +
// React 19, so CI enforces the app budgets and reports the totals.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const ROUTES = {
  "/": { prdTotal: 90, app: 10 },
  "/train": { prdTotal: 150, app: 55 },
  "/progress": { prdTotal: 150, app: 40 },
  "/privacy": { prdTotal: 90, app: 5 },
};

const root = process.cwd();
const htmlFor = (route) =>
  join(root, ".next/server/app", route === "/" ? "index.html" : `${route.slice(1)}.html`);

const gz = new Map();
const size = (src) => {
  if (!gz.has(src)) {
    const path = join(root, ".next", src.replace(/^\/_next\//, "").split("?")[0]);
    gz.set(src, gzipSync(readFileSync(path), { level: 9 }).length / 1024);
  }
  return gz.get(src);
};

const chunks = {};
for (const route of Object.keys(ROUTES)) {
  const file = htmlFor(route);
  if (!existsSync(file)) {
    console.error(`✗ ${route}: no prerendered HTML at ${file} — run next build first`);
    process.exit(1);
  }
  const html = readFileSync(file, "utf8");
  chunks[route] = [
    ...new Set(
      [...html.matchAll(/<script([^>]*)>/g)]
        .filter((m) => !/nomodule/i.test(m[1]))
        .map((m) => /src="([^"]+\.js)"/.exec(m[1])?.[1])
        .filter(Boolean),
    ),
  ];
}

const shared = Object.values(chunks).reduce((a, b) => a.filter((c) => b.includes(c)));
const floor = shared.reduce((sum, c) => sum + size(c), 0);
console.log(`Framework floor (shared by every route): ${floor.toFixed(1)} KB gzip\n`);

let failed = false;
for (const [route, budget] of Object.entries(ROUTES)) {
  const total = chunks[route].reduce((sum, c) => sum + size(c), 0);
  const app = total - floor;
  const ok = app <= budget.app;
  if (!ok) failed = true;
  const prd = total <= budget.prdTotal ? "within PRD" : `PRD ${budget.prdTotal} KB not met`;
  console.log(
    `${ok ? "✓" : "✗"} ${route.padEnd(10)} app ${app.toFixed(1).padStart(5)} / ${budget.app} KB   total ${total.toFixed(1).padStart(6)} KB (${prd})`,
  );
}
process.exit(failed ? 1 : 0);
