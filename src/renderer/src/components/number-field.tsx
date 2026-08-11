import { useEffect, useState } from "react";

type NumberFieldProps = {
  value: number;
  onCommit: (value: number) => void;
  testId?: string;
  min?: number;
  step?: number;
  suffix?: string;
  ariaLabel?: string;
  compact?: boolean;
};

export function NumberField({
  value,
  onCommit,
  testId,
  min,
  step = 1,
  suffix = "mm",
  ariaLabel,
  compact = false,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    if (draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const next = Number(draft);
    if (!Number.isFinite(next)) {
      setDraft(String(value));
      return;
    }
    if (min !== undefined && next < min) {
      onCommit(next);
      setDraft(String(value));
      return;
    }
    if (next !== value) onCommit(next);
    else setDraft(String(value));
  }

  return (
    <label className={`number-field${compact ? " number-field--compact" : ""}`}>
      <input
        id={testId}
        data-testid={testId}
        aria-label={ariaLabel}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  );
}
