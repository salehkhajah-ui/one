"use client";

import type { ReactNode } from "react";
import type { BucketKey } from "../../lib/engine/types";
import { amount, currencyUnitLabel, money, t } from "../../lib/i18n";
import type { StringKey } from "../../lib/i18n-strings";
import type { CurrencyCode } from "../../lib/money";

/** Bucket colors reference the validated palette tokens (see globals.css). */
export const BUCKET_COLORS: Record<BucketKey, string> = {
  life: "var(--bucket-life)",
  bills: "var(--bucket-bills)",
  protect: "var(--bucket-protect)",
  grow: "var(--bucket-grow)",
  goals: "var(--bucket-goals)",
  enjoy: "var(--bucket-enjoy)",
};

const BUCKET_LABEL_KEYS: Record<BucketKey, StringKey> = {
  life: "bucket.life",
  bills: "bucket.bills",
  protect: "bucket.protect",
  grow: "bucket.grow",
  goals: "bucket.goals",
  enjoy: "bucket.enjoy",
};

export function bucketLabel(key: BucketKey): string {
  return t(BUCKET_LABEL_KEYS[key]);
}

export function Money({
  minor,
  currency = "KWD",
  hideDecimals = false,
  className = "",
}: {
  minor: number;
  currency?: CurrencyCode;
  hideDecimals?: boolean;
  className?: string;
}) {
  return (
    <span className={`money ${className}`}>
      {amount(minor, currency, hideDecimals)}&nbsp;{currencyUnitLabel(currency)}
    </span>
  );
}

/** Hero display: big number, smaller unit. */
export function HeroMoney({ minor, currency = "KWD" }: { minor: number; currency?: CurrencyCode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="hero-number money">{amount(minor, currency)}</span>
      <span className="hero-unit">{currencyUnitLabel(currency)}</span>
    </div>
  );
}

/**
 * Proportional stacked bar of bucket amounts.
 * 2px surface gaps between segments (spacer rule) + labeled rows elsewhere
 * carry identity, so color is never the only channel.
 */
export function StackBar({ parts }: { parts: Array<{ key: BucketKey; amountMinor: number }> }) {
  const total = parts.reduce((a, p) => a + p.amountMinor, 0);
  if (total <= 0) return <div className="stack-bar" style={{ background: "var(--hairline)" }} aria-hidden />;
  return (
    <div className="stack-bar" role="img" aria-label={parts.map((p) => `${bucketLabel(p.key)} ${money(p.amountMinor)}`).join(", ")}>
      {parts
        .filter((p) => p.amountMinor > 0)
        .map((p) => (
          <div
            key={p.key}
            className="stack-seg"
            style={{ flexGrow: p.amountMinor, flexBasis: 0, background: BUCKET_COLORS[p.key] }}
          />
        ))}
    </div>
  );
}

export function BucketDot({ bucket }: { bucket: BucketKey }) {
  return <span className="bucket-dot" style={{ background: BUCKET_COLORS[bucket] }} aria-hidden />;
}

export function ProgressBar({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

/** Contextual disclaimer — quiet, reusable, never a legal wall. */
export function Disclaimer({ children }: { children: ReactNode }) {
  return <p className="micro mt-2">{children}</p>;
}

/** Expandable "Why?" — every recommendation must be able to explain itself. */
export function Why({ summary, children }: { summary?: string; children: ReactNode }) {
  summary = summary ?? t("common.why");
  return (
    <details className="mt-2 group">
      <summary className="micro cursor-pointer select-none font-semibold" style={{ color: "var(--accent)" }}>
        {summary}
      </summary>
      <div className="micro mt-1.5 leading-relaxed">{children}</div>
    </details>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between">
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
  );
}
