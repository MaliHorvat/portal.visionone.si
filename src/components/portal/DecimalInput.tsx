"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatDecimalInput,
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
  maxDecimals?: number;
};

/** Besedilno polje za decimalna števila z vejico (npr. 0,5). */
export function DecimalInput({
  value,
  onChange,
  emptyAsZero = true,
  maxDecimals,
  className,
  onBlur,
  onFocus,
  ...rest
}: DecimalInputProps) {
  const [draft, setDraft] = useState(() => formatDecimalInput(value, { maxDecimals }));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(formatDecimalInput(value, { maxDecimals }));
    }
  }, [value, maxDecimals]);

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
        const parsed = parseDecimalInput(draft);
        if (Number.isFinite(parsed)) {
          onChange(parsed);
          setDraft(formatDecimalInput(parsed, { maxDecimals }));
        } else if (emptyAsZero) {
          onChange(0);
          setDraft(formatDecimalInput(0, { maxDecimals }));
        } else {
          setDraft(formatDecimalInput(value, { maxDecimals }));
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
