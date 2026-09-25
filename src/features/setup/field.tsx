/**
 * A labelled config row: a group named by its visible label (the controls
 * inside carry their own accessible names too).
 */
export function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: React.ReactNode;
  children: () => React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="label-caps mb-2 text-label text-text-muted">{label}</legend>
      {children()}
      {helper && <p className="text-small text-text-faint">{helper}</p>}
    </fieldset>
  );
}

/** A switch row: label on the left, control on the right, whole row ≥ 44 px. */
export function SwitchRow({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Switch child is the labelled control.
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span>{label}</span>
        {helper && <span className="text-small text-text-faint">{helper}</span>}
      </span>
      {children}
    </label>
  );
}

/** Quick-pick chips alongside a stepper (rounds, exposure). */
export function Chips<T extends number>({
  values,
  value,
  onPick,
  format,
  label,
}: {
  values: readonly T[];
  value: number;
  onPick: (v: T) => void;
  format: (v: T) => string;
  label: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-wrap gap-2">
      <legend className="sr-only">{label}</legend>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          onClick={() => onPick(v)}
          className="min-h-10 rounded-full border border-border bg-surface-2 px-4 font-mono text-small tabular hover:border-border-strong aria-pressed:border-accent aria-pressed:text-accent"
        >
          {format(v)}
        </button>
      ))}
    </fieldset>
  );
}
