/**
 * Internationalization: English + Arabic (RTL).
 * ALL user-visible strings flow through t(); currency and dates flow through
 * the helpers here — components never hard-code symbols or decimal handling.
 * Money keeps Western digits in both languages (Kuwaiti banking convention).
 */
import { formatAmount, formatMoney, type CurrencyCode } from "./money";
import { STRINGS, type Locale, type StringKey } from "./i18n-strings";

export type { Locale, StringKey };

const LOCALE_KEY = "one.locale.v1";

/** Module-level active locale; LocaleProvider sets it and re-renders the tree. */
let activeLocale: Locale = "en";

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(LOCALE_KEY);
    return v === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Translate a key in the active locale, interpolating {param} placeholders. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  let out: string = entry ? entry[activeLocale] : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      out = out.split(`{${name}}`).join(String(value));
    }
  }
  return out;
}

/** Localized emergency-stage label (the engine's stageLabel stays English for audit). */
export function emergencyStageLabel(stage: 1 | 2 | 3 | 4, targetMonths: number): string {
  if (stage === 4) return t("stage.4", { months: targetMonths });
  return t(`stage.${stage}` as StringKey);
}

/** BCP-47 tag for number formatting — Latin digits in both languages for money legibility. */
export function formatLocaleTag(): string {
  return activeLocale === "ar" ? "ar-KW-u-nu-latn" : "en-KW";
}

/** Short currency unit label ("KD" / "د.ك"). */
export function currencyUnitLabel(currency: CurrencyCode = "KWD"): string {
  const labels: Record<Locale, Partial<Record<CurrencyCode, string>>> = {
    en: { KWD: "KD", BHD: "BD" },
    ar: { KWD: "د.ك", BHD: "د.ب" },
  };
  return labels[activeLocale][currency] ?? currency;
}

export function money(minor: number, currency: CurrencyCode = "KWD"): string {
  return `${formatAmount(minor, currency, formatLocaleTag())} ${currencyUnitLabel(currency)}`;
}

export function moneyCompact(minor: number, currency: CurrencyCode = "KWD"): string {
  return `${formatAmount(minor, currency, formatLocaleTag(), true)} ${currencyUnitLabel(currency)}`;
}

/** Bare formatted amount (no unit) for hero numbers that place the unit separately. */
export function amount(minor: number, currency: CurrencyCode = "KWD", hideDecimals = false): string {
  return formatAmount(minor, currency, formatLocaleTag(), hideDecimals);
}

export function moneyIntl(minor: number, currency: CurrencyCode = "KWD"): string {
  return formatMoney(minor, currency, formatLocaleTag());
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(activeLocale === "ar" ? "ar-KW-u-nu-latn" : "en-KW", {
    day: "numeric",
    month: "short",
    year: new Date().getFullYear() === y ? undefined : "numeric",
  }).format(new Date(y, m - 1, d));
}
