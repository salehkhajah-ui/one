"use client";

/**
 * Shared UI for the Financial Moment Network surfaces. All copy flows
 * through t(); all money through lib/i18n money helpers.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { money, t } from "../../../lib/i18n";
import type { StringKey } from "../../../lib/i18n-strings";
import type { Merchant, MerchantCategory, MembershipTier, RewardSpec } from "../../../lib/network/types";
import { useNetwork } from "./NetworkProvider";

// ------------------------------------------------------------- category ----

/** Category colors reuse the validated bucket palette tokens. */
export const CATEGORY_COLORS: Record<MerchantCategory, string> = {
  food: "var(--bucket-enjoy)",
  coffee: "var(--bucket-goals)",
  grocery: "var(--bucket-grow)",
  fashion: "var(--bucket-bills)",
  travel: "var(--bucket-life)",
  telecom: "var(--bucket-protect)",
  entertainment: "var(--accent)",
};

export function categoryLabel(cat: MerchantCategory): string {
  return t(`net.cat.${cat}` as StringKey);
}

export function MerchantMark({ merchant, size = 40 }: { merchant: Merchant; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        color: CATEGORY_COLORS[merchant.category],
        background: `color-mix(in oklab, ${CATEGORY_COLORS[merchant.category]} 14%, transparent)`,
        border: "1px solid var(--hairline-strong)",
      }}
    >
      {merchant.name.slice(0, 1)}
    </span>
  );
}

// -------------------------------------------------------------- rewards ----

/** Human reward label: "20% off" / "3.000 KD voucher" / "Free coffee" / "2-for-1 meal". */
export function rewardLabel(spec: RewardSpec): string {
  switch (spec.kind) {
    case "percent":
      return t("net.reward.percentOff", { pct: Math.round((spec.valueBps ?? 0) / 100) });
    case "fixed":
      return t("net.reward.voucher", { amount: money(spec.amountMinor ?? 0, spec.currency) });
    case "credit":
      return t("net.reward.credit", { amount: money(spec.amountMinor ?? 0, spec.currency) });
    case "free_item":
      return t("net.reward.free", { item: t(`net.item.${spec.itemKey ?? "coffee"}` as StringKey) });
    case "bogo":
      return t("net.reward.bogo", { item: t(`net.item.${spec.itemKey ?? "meal"}` as StringKey) });
  }
}

/** Big headline version for reveal + wallet cards. */
export function RewardHeadline({ spec }: { spec: RewardSpec }) {
  if (spec.kind === "percent")
    return (
      <div className="reward-headline">
        <span className="money">{Math.round((spec.valueBps ?? 0) / 100)}%</span>{" "}
        <span className="text-[16px]" style={{ color: "var(--text-2)" }}>
          {t("net.reward.offWord")}
        </span>
      </div>
    );
  if (spec.kind === "fixed" || spec.kind === "credit")
    return (
      <div className="reward-headline money">{money(spec.amountMinor ?? 0, spec.currency)}</div>
    );
  return <div className="reward-headline text-[30px]">{rewardLabel(spec)}</div>;
}

export function hoursLeft(expiresISO: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(expiresISO).getTime() - now.getTime()) / 3_600_000));
}

export function expiryLabel(expiresISO: string): string {
  const h = hoursLeft(expiresISO);
  if (h >= 48) return t("net.expiresDays", { days: Math.round(h / 24) });
  return t("net.expiresHours", { hours: h });
}

// ---------------------------------------------------------------- codes ----

/** Decorative scan matrix derived from the code (the code itself is the credential). */
export function CodeMatrix({ code }: { code: string }) {
  const cells: boolean[] = [];
  let acc = 7;
  for (let i = 0; i < 81; i++) {
    acc = (acc * 31 + code.charCodeAt(i % code.length) * (i + 3)) % 97;
    cells.push(acc % 3 !== 0);
  }
  return (
    <div className="code-matrix" aria-hidden>
      {cells.map((on, i) => (
        <span key={i} data-on={on} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- stats ----

export function StatCard({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "positive" | "caution" }) {
  return (
    <div className="card">
      <div className="micro">{label}</div>
      <div className="stat-value money mt-1" style={tone ? { color: `var(--${tone})` } : undefined}>
        {value}
      </div>
      {sub ? <div className="micro mt-1">{sub}</div> : null}
    </div>
  );
}

export function formatPctBps(bps: number, decimals = 0): string {
  return `${(bps / 100).toFixed(decimals)}%`;
}

/** ROI multiple from roiTimes10 (e.g. 151 → "15.1×"). */
export function formatRoi(roiTimes10: number): string {
  return `${(roiTimes10 / 10).toFixed(1)}×`;
}

// ----------------------------------------------------------------- tiers ----

export const TIER_LABEL_KEYS: Record<MembershipTier, StringKey> = {
  one: "net.tier.one" as StringKey,
  silver: "net.tier.silver" as StringKey,
  gold: "net.tier.gold" as StringKey,
  black: "net.tier.black" as StringKey,
};

export function TierBadge({ tier }: { tier: MembershipTier }) {
  const colors: Record<MembershipTier, string> = {
    one: "var(--text-2)",
    silver: "var(--text)",
    gold: "var(--caution)",
    black: "var(--accent)",
  };
  return (
    <span className="tier-badge" style={{ color: colors[tier] }}>
      {t(TIER_LABEL_KEYS[tier])}
    </span>
  );
}

// ----------------------------------------------------------------- chrome ----

/** Language toggle shared by all network surfaces. */
export function LanguageToggle() {
  const { locale, setLocale } = useNetwork();
  return (
    <button className="chip" onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
      {t("common.language")}
    </button>
  );
}

/** Portal top bar: brand, surface tag, cross-links. */
export function PortalHeader({ tagKey, extra }: { tagKey: StringKey; extra?: ReactNode }) {
  return (
    <header className="portal-nav">
      <Link href="/network" className="portal-brand" style={{ color: "var(--brand)" }}>
        ONE
      </Link>
      <span className="portal-tag">{t(tagKey)}</span>
      <span className="demo-tag">{t("net.demoData")}</span>
      <span className="ms-auto flex items-center gap-2">
        {extra}
        <LanguageToggle />
      </span>
    </header>
  );
}

const CONSUMER_TABS: Array<{ href: string; labelKey: StringKey; icon: ReactNode }> = [
  {
    href: "/rewards",
    labelKey: "net.nav.home" as StringKey,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/rewards/wallet",
    labelKey: "net.nav.wallet" as StringKey,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
        <path d="M7 7V5a2 2 0 0 1 2-2h8" />
      </svg>
    ),
  },
  {
    href: "/rewards/discover",
    labelKey: "net.nav.discover" as StringKey,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5Z" />
      </svg>
    ),
  },
  {
    href: "/rewards/profile",
    labelKey: "net.nav.profile" as StringKey,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
      </svg>
    ),
  },
];

/** Consumer bottom navigation — four tabs, nothing more. */
export function ConsumerNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Rewards">
      <div className="bottom-nav-inner" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {CONSUMER_TABS.map((tab) => {
          const active = tab.href === "/rewards" ? pathname === "/rewards" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="nav-item" data-active={active} aria-current={active ? "page" : undefined}>
              {tab.icon}
              <span>{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
