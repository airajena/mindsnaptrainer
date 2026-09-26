import { BRAND } from "@/lib/brand-colors";

/** Board artwork shared by the generated icons and the OG image (ImageResponse JSX: inline styles only). */
export function GridArt({
  n,
  lit,
  size,
  gap,
  radius,
}: {
  n: number;
  lit: ReadonlySet<number>;
  size: number;
  gap: number;
  radius: number;
}) {
  const cell = (size - gap * (n - 1)) / n;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: size, height: size, gap }}>
      {Array.from({ length: n * n }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional cells.
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: radius,
            background: lit.has(i) ? BRAND.accent : BRAND.cell,
            border: lit.has(i) ? "none" : `1px solid ${BRAND.cellEdge}`,
          }}
        />
      ))}
    </div>
  );
}
