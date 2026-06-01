"use client";

import { useEffect, useRef, useState } from "react";

type IntegerInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: number;
  onChange: (value: number) => void;
  emptyAsZero?: boolean;
  /** Pri 0 pusti polje prazno (placeholder). Privzeto true. */
  hideZeroWhenEmpty?: boolean;
};

/** Celoštevilsko polje — brez prikaza "0" dokler uporabnik ne vnese vrednosti. */
export function IntegerInput({
  value,
  onChange,
  emptyAsZero = true,
  hideZeroWhenEmpty = true,
  className,
  onBlur,
  onFocus,
  min,
  max,
  ...rest
}: IntegerInputProps) {
  const [draft, setDraft] = useState(() => (hideZeroWhenEmpty && value === 0 ? "" : String(value)));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(hideZeroWhenEmpty && value === 0 ? "" : String(value));
    }
  }, [value, hideZeroWhenEmpty]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      min={min}
      max={max}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        const trimmed = draft.trim();
        if (trimmed === "" || trimmed === "-") {
          if (emptyAsZero) onChange(0);
          setDraft(hideZeroWhenEmpty ? "" : "0");
        } else {
          const n = Number(trimmed);
          if (Number.isFinite(n)) {
            let v = Math.trunc(n);
            if (min !== undefined) v = Math.max(Number(min), v);
            if (max !== undefined) v = Math.min(Number(max), v);
            onChange(v);
            setDraft(hideZeroWhenEmpty && v === 0 ? "" : String(v));
          } else if (emptyAsZero) {
            onChange(0);
            setDraft(hideZeroWhenEmpty ? "" : "0");
          }
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (next !== "" && !/^-?\d*$/.test(next)) return;
        setDraft(next);
        if (next === "" || next === "-") return;
        const n = Number(next);
        if (Number.isFinite(n) && Math.trunc(n) !== value) onChange(Math.trunc(n));
      }}
      className={className}
    />
  );
}
