/** Overlay legend: the same shapes as the result board, so it reads without colour. */
export function OverlayLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-text-muted">
      <li className="flex items-center gap-2">
        <span className="size-4 rounded-[4px] bg-hit" aria-hidden />
        Hit
      </li>
      <li className="flex items-center gap-2">
        <span
          className="size-4 rounded-[4px] outline-2 outline-miss outline-dashed -outline-offset-2"
          aria-hidden
        />
        Miss
      </li>
      <li className="flex items-center gap-2">
        <span className="grid size-4 place-items-center rounded-[4px] bg-false" aria-hidden>
          <svg
            aria-hidden="true"
            viewBox="0 0 10 10"
            className="size-3 fill-none stroke-bg stroke-[1.6]"
            strokeLinecap="round"
          >
            <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
          </svg>
        </span>
        False tap
      </li>
    </ul>
  );
}
