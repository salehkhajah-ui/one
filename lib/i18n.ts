/**
 * Internationalization scaffold. English-first; Arabic (RTL) planned.
 * ALL user-visible currency formatting flows through here or lib/money.ts —
 * components never hard-code currency symbols or decimal handling.
 */
import { formatAmount, formatMoney, type CurrencyCode } from "./money";

export type Locale = "en" | "ar";

export const APP_LOCALE: Locale = "en";

/** BCP-47 tag used for number/date formatting. */
export const FORMAT_LOCALE = "en-KW";

/** Short currency unit label per locale (KWD renders as "KD" in English UI). */
export function currencyUnitLabel(currency: CurrencyCode, locale: Locale = APP_LOCALE): string {
  const labels: Record<Locale, Partial<Record<CurrencyCode, string>>> = {
    en: { KWD: "KD", BHD: "BD" },
    ar: { KWD: "د.ك", BHD: "د.ب" },
  };
  return labels[locale][currency] ?? currency;
}

export function money(minor: number, currency: CurrencyCode = "KWD"): string {
  return `${formatAmount(minor, currency, FORMAT_LOCALE)} ${currencyUnitLabel(currency)}`;
}

export function moneyCompact(minor: number, currency: CurrencyCode = "KWD"): string {
  return `${formatAmount(minor, currency, FORMAT_LOCALE, true)} ${currencyUnitLabel(currency)}`;
}

/** Bare formatted amount (no unit) for hero numbers that place the unit separately. */
export function amount(minor: number, currency: CurrencyCode = "KWD", hideDecimals = false): string {
  return formatAmount(minor, currency, FORMAT_LOCALE, hideDecimals);
}

export function moneyIntl(minor: number, currency: CurrencyCode = "KWD"): string {
  return formatMoney(minor, currency, FORMAT_LOCALE);
}

export function formatDateShort(iso: string, locale: Locale = APP_LOCALE): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-KW", {
    day: "numeric",
    month: "short",
    year: new Date().getFullYear() === y ? undefined : "numeric",
  }).format(new Date(y, m - 1, d));
}
