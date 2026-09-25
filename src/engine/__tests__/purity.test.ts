import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the "functional core" rule: engine/ never touches React, the DOM,
 * the clock or unseeded randomness. Time and seeds arrive in events.
 */
const ENGINE_DIR = join(__dirname, "..");

const FORBIDDEN: [RegExp, string][] = [
  [/\bperformance\.now\b/, "performance.now"],
  [/\bDate\.now\b/, "Date.now"],
  [/\bnew Date\b/, "new Date"],
  [/\bMath\.random\b/, "Math.random"],
  [/\bcrypto\./, "crypto"],
  [/\b(window|document|navigator|localStorage|indexedDB)\b/, "browser globals"],
  [/\brequestAnimationFrame\b|\bsetTimeout\b|\bsetInterval\b/, "timers"],
  [/from\s+["'](react|react-dom|next)(\/|["'])/, "React/Next imports"],
  [/from\s+["']@\/(platform|stores|features|components|app)\b/, "app-layer imports"],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("engine purity", () => {
  const files = sourceFiles(ENGINE_DIR);

  it("finds engine sources", () => expect(files.length).toBeGreaterThan(5));

  for (const file of files) {
    it(`${relative(ENGINE_DIR, file)} uses no forbidden APIs`, () => {
      // Strip comments so docs can mention what's forbidden.
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const [pattern, name] of FORBIDDEN) {
        expect(pattern.test(code), `${name} in ${file}`).toBe(false);
      }
    });
  }
});
