"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatDecimalForField,
  formatDecimalInput,
  isExplicitZeroDraft,
  isValidDecimalDraft,
  parseDecimalInput,
} from "@/lib/decimal-number-input";

type DecimalInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: number;
  onChange: (value: number) => void;
  /** Ob blur: prazno polje → 0 */
  emptyAsZero?: boolean;
  /** Pri vrednosti 0 ne prikaži "0" — placeholder ostane viden. Privzeto true. */
  hideZeroWhenEmpty?: boolean;
  maxDecimals?: number;
};

/** Besedilno polje za decimalna števila z vejico (npr. 0,5). */
export function DecimalInput({
  value,
  onChange,
  emptyAsZero = true,
  hideZeroWhenEmpty = true,
  maxDecimals,
  className,
  onBlur,
  onFocus,
  ...rest
}: DecimalInputProps) {
  const [draft, setDraft] = useState(() =>
    formatDecimalForField(value, { maxDecimals, hideZeroWhenEmpty }),
  );
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(formatDecimalForField(value, { maxDecimals, hideZeroWhenEmpty }));
    }
  }, [value, maxDecimals, hideZeroWhenEmpty]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        const trimmed = draft.trim();
        const parsed = parseDecimalInput(draft);
        if (trimmed === "" || trimmed === "," || trimmed === "." || trimmed === "-") {
          if (emptyAsZero) onChange(0);
          setDraft(hideZeroWhenEmpty ? "" : formatDecimalInput(0, { maxDecimals }));
        } else if (Number.isFinite(parsed)) {
          onChange(parsed);
          const showEmpty = hideZeroWhenEmpty && parsed === 0 && !isExplicitZeroDraft(draft);
          setDraft(showEmpty ? "" : formatDecimalInput(parsed, { maxDecimals }));
        } else if (emptyAsZero) {
          onChange(0);
          setDraft(hideZeroWhenEmpty ? "" : formatDecimalInput(0, { maxDecimals }));
        } else {
          setDraft(formatDecimalForField(value, { maxDecimals, hideZeroWhenEmpty }));
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (!isValidDecimalDraft(next)) return;
        setDraft(next);
        const parsed = parseDecimalInput(next);
        if (Number.isFinite(parsed) && parsed !== value) onChange(parsed);
      }}
      className={className}
    />
  );
}
