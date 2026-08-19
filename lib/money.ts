/**
 * Money utilities — ALL monetary amounts in ONE are integer minor units.
 * For KWD: 1.000 KD = 1000 fils. Never use floating point for balances.
 * Pure TypeScript: no React/Next/DOM imports (portable to RN / a package).
 */

export type CurrencyCode = "KWD" | "USD" | "EUR" | "SAR" | "AED" | "BHD";

export interface CurrencyInfo {
  code: CurrencyCode;
  /** minor units per major unit, e.g. 1000 fils = 1 KD */
  minorPerMajor: number;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  KWD: { code: "KWD", minorPerMajor: 1000, decimals: 3 },
  BHD: { code: "BHD", minorPerMajor: 1000, decimals: 3 },
  USD: { code: "USD", minorPerMajor: 100, decimals: 2 },
  EUR: { code: "EUR", minorPerMajor: 100, decimals: 2 },
  SAR: { code: "SAR", minorPerMajor: 100, decimals: 2 },
  AED: { code: "AED", minorPerMajor: 100, decimals: 2 },
};

function assertSafeInt(n: number, label: string): void {
  if (!Number.isFinite(n) || !Number.isInteger(n) || !Number.isSafeInteger(n)) {
    throw new Error(`Money error: ${label} must be a safe integer, got ${n}`);
  }
}

/** Convert a major-unit number (e.g. 12.75) to integer minor units. Only for constants/inputs, never chained arithmetic. */
export function fromMajor(major: number, currency: CurrencyCode = "KWD"): number {
  const info = CURRENCIES[currency];
  const minor = Math.round(major * info.minorPerMajor);
  assertSafeInt(minor, "fromMajor result");
  return minor;
}

/** Minor units → major units number. For display math only (charts), never for balance arithmetic. */
export function toMajor(minor: number, currency: CurrencyCode = "KWD"): number {
  assertSafeInt(minor, "toMajor input");
  return minor / CURRENCIES[currency].minorPerMajor;
}

export function clampNonNegative(minor: number): number {
  assertSafeInt(minor, "clampNonNegative input");
  return minor < 0 ? 0 : minor;
}

/** Integer division with explicit rounding mode. */
export function divideMinor(
  minor: number,
  divisor: number,
  mode: "floor" | "round" | "ceil" = "floor",
): number {
  assertSafeInt(minor, "divideMinor input");
  if (divisor === 0) throw new Error("Money error: division by zero");
  const q = minor / divisor;
  const out = mode === "floor" ? Math.floor(q) : mode === "ceil" ? Math.ceil(q) : Math.round(q);
  assertSafeInt(out, "divideMinor result");
  return out;
}

/** Percentage in basis points (100 bps = 1%), integer-safe with rounding. */
export function percentOf(minor: number, basisPoints: number, mode: "floor" | "round" = "round"): number {
  assertSafeInt(minor, "percentOf input");
  assertSafeInt(basisPoints, "basisPoints");
  const raw = (minor * basisPoints) / 10_000;
  const out = mode === "floor" ? Math.floor(raw) : Math.round(raw);
  assertSafeInt(out, "percentOf result");
  return out;
}

/**
 * Split `total` across weights using largest-remainder so parts sum EXACTLY to total.
 * Weights are relative (need not sum to anything). Zero/negative weights get 0.
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
  assertSafeInt(total, "allocateProportionally total");
  const safeWeights = weights.map((w) => (w > 0 && Number.isFinite(w) ? w : 0));
  const weightSum = safeWeights.reduce((a, b) => a + b, 0);
  if (weightSum === 0 || total === 0) return weights.map(() => 0);

  const exact = safeWeights.map((w) => (total * w) / weightSum);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    out[order[k].i] += 1;
  }
  out.forEach((n) => assertSafeInt(n, "allocateProportionally part"));
  return out;
}

export function sumMinor(values: number[]): number {
  const total = values.reduce((a, b) => {
    assertSafeInt(b, "sumMinor value");
    return a + b;
  }, 0);
  assertSafeInt(total, "sumMinor total");
  return total;
}

/** Preferred short display code per currency for Latin locales (Intl renders KWD as "KWD"). */
const DISPLAY_CODE: Partial<Record<CurrencyCode, string>> = { KWD: "KD", BHD: "BD" };

/** Locale-aware currency formatting. The ONLY way amounts become strings in the UI. */
export function formatMoney(
  minor: number,
  currency: CurrencyCode = "KWD",
  locale = "en-KW",
  options?: { compact?: boolean; signed?: boolean; hideDecimals?: boolean },
): string {
  assertSafeInt(minor, "formatMoney input");
  const info = CURRENCIES[currency];
  const major = minor / info.minorPerMajor;
  const decimals = options?.hideDecimals ? 0 : info.decimals;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: options?.compact ? "compact" : "standard",
    signDisplay: options?.signed ? "exceptZero" : "auto",
  }).format(major);
  const display = DISPLAY_CODE[currency];
  return display && locale.startsWith("en") ? formatted.replace(currency, display).trim() : formatted;
}

/** Bare number without currency symbol, e.g. "12.750" — for hero displays that place the unit separately. */
export function formatAmount(
  minor: number,
  currency: CurrencyCode = "KWD",
  locale = "en-KW",
  hideDecimals = false,
): string {
  assertSafeInt(minor, "formatAmount input");
  const info = CURRENCIES[currency];
  const decimals = hideDecimals ? 0 : info.decimals;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(minor / info.minorPerMajor);
}
