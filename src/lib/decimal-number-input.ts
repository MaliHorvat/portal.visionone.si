/**
 * Decimal input (sl-SI): vejica ali pika kot decimalni ločnik.
 * HTML type="number" vejice ne sprejme — uporabi type="text" + parseDecimalInput.
 */

export const VO_DECIMAL_STEP = "any" as const;

/** @deprecated Uporabi DecimalInput ali decimalTextInputProps + parseDecimalInput */
export const decimalNumberInputProps = {
  step: VO_DECIMAL_STEP,
  inputMode: "decimal" as const,
} as const;

export const decimalTextInputProps = {
  type: "text" as const,
  inputMode: "decimal" as const,
  autoComplete: "off" as const,
};

/** Med tipkanjem: števke, ena vejica/pika, opcijsko minus. */
export function isValidDecimalDraft(raw: string): boolean {
  const s = raw.trim().replace(/\s/g, "");
  if (s === "" || s === "-" || s === "," || s === ".") return true;
  return /^-?\d*([.,]\d*)?$/.test(s);
}

/**
 * "0,5" → 0.5, "1.234,56" → 1234.56, "1,234.56" → 1234.56
 */
export function parseDecimalInput(raw: string): number {
  let s = raw.trim().replace(/\s/g, "");
  if (!s || s === "-" || s === "+" || s === "," || s === ".") return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseDecimalInputOrZero(raw: string): number {
  const n = parseDecimalInput(raw);
  return Number.isFinite(n) ? n : 0;
}

export function formatDecimalInput(n: number, opts?: { maxDecimals?: number }): string {
  if (!Number.isFinite(n)) return "";
  const max = opts?.maxDecimals ?? 10;
  return n.toLocaleString("sl-SI", {
    maximumFractionDigits: max,
    minimumFractionDigits: 0,
    useGrouping: false,
  });
}

export function decimalFromFormData(fd: FormData, name: string, fallback = 0): number {
  const n = parseDecimalInput(String(fd.get(name) ?? ""));
  return Number.isFinite(n) ? n : fallback;
}
