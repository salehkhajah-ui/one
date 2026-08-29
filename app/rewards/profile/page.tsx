"use client";

/**
 * Profile — tier progress, taste (preference vector), notifications,
 * intent, and demo controls. Boosts reward behaviors, never transfer size.
 */
import Link from "next/link";
import { t } from "../../../lib/i18n";
import { tierFor } from "../../../lib/network/lifecycle";
import type { MerchantCategory } from "../../../lib/network/types";
import { useNetwork } from "../../components/network/NetworkProvider";
import { CATEGORY_COLORS, categoryLabel, ProgressBar, TierBadge } from "../../components/network/net-ui";

const TIER_THRESHOLDS: Array<{ at: number; tier: ReturnType<typeof tierFor> }> = [
  { at: 3, tier: "silver" },
  { at: 8, tier: "gold" },
  { at: 20, tier: "black" },
];

export default function ProfilePage() {
  const { state, chooseIntent, resetDemo } = useNetwork();
  const c = state.consumer;
  const next = TIER_THRESHOLDS.find((s) => c.momentCount < s.at);
  const cats = Object.entries(c.prefs).sort((a, b) => b[1] - a[1]) as Array<[MerchantCategory, number]>;
  const notifications = state.notifications.filter((n) => n.audience === "consumer").slice(0, 5);

  return (
    <main className="screen">
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-[24px] font-bold tracking-tight">{t("net.profile.title")}</h1>
        <TierBadge tier={c.tier} />
      </div>

      <div className="card-elevated mt-4">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{t("net.profile.moments")}</span>
          <span className="stat-value money">{c.momentCount}</span>
        </div>
        {next ? (
          <>
            <div className="mt-3">
              <ProgressBar pct={(c.momentCount / next.at) * 100} />
            </div>
            <p className="micro mt-2">{t("net.profile.nextTier", { count: next.at - c.momentCount, tier: t(`net.tier.${next.tier}`) })}</p>
          </>
        ) : (
          <p className="micro mt-2">{t("net.profile.topTier")}</p>
        )}
        <p className="micro mt-2">{t("net.profile.tierNote")}</p>
      </div>

      <h2 className="section-title mb-3 mt-6">{t("net.profile.taste")}</h2>
      <div className="card">
        {cats.map(([cat, score]) => (
          <div key={cat} className="mt-2 first:mt-0">
            <div className="flex items-center justify-between">
              <span className="subtle">{categoryLabel(cat)}</span>
              <span className="micro money">{score}</span>
            </div>
            <ProgressBar pct={score} color={CATEGORY_COLORS[cat]} />
          </div>
        ))}
        <p className="micro mt-3">{t("net.profile.tasteNote")}</p>
      </div>

      <h2 className="section-title mb-3 mt-6">{t("net.intent.question")}</h2>
      <div className="flex flex-wrap gap-2">
        {(["food", "grocery", "fashion", "travel", "entertainment", "surprise"] as const).map((i) => (
          <button
            key={i}
            className="chip"
            aria-pressed={c.intent === i}
            style={c.intent === i ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
            onClick={() => chooseIntent(c.intent === i ? undefined : i)}
          >
            {i === "surprise" ? t("net.intent.surprise") : t(`net.cat.${i}`)}
          </button>
        ))}
      </div>

      {notifications.length > 0 ? (
        <>
          <h2 className="section-title mb-3 mt-6">{t("net.profile.notifications")}</h2>
          <div className="card">
            {notifications.map((n) => (
              <p key={n.id} className="subtle mt-2 first:mt-0">
                {t(n.messageKey as Parameters<typeof t>[0], n.params)}
              </p>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="section-title mb-3 mt-6">{t("net.profile.network")}</h2>
      <div className="flex flex-col gap-2">
        <Link href="/" className="card flex items-center justify-between">
          <span className="subtle">{t("net.profile.aboutOne")}</span>
          <span className="micro">→</span>
        </Link>
        <Link href="/merchant" className="card flex items-center justify-between">
          <span className="subtle">{t("net.profile.merchantPortal")}</span>
          <span className="micro">→</span>
        </Link>
        <Link href="/institution" className="card flex items-center justify-between">
          <span className="subtle">{t("net.profile.institutionPortal")}</span>
          <span className="micro">→</span>
        </Link>
      </div>

      <button
        className="btn btn-ghost mt-6 w-full"
        onClick={() => {
          if (window.confirm(t("net.profile.resetConfirm"))) resetDemo();
        }}
      >
        {t("net.profile.reset")}
      </button>
      <p className="micro mt-4 text-center">{t("net.home.privacy")}</p>
    </main>
  );
}
