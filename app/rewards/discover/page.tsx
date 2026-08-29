"use client";

/**
 * Discover — quality over quantity. Personalized "For you" ranking from the
 * preference vector; follow merchants to boost their offers in the auction.
 */
import { t } from "../../../lib/i18n";
import type { Campaign } from "../../../lib/network/types";
import { useNetwork } from "../../components/network/NetworkProvider";
import { categoryLabel, MerchantMark, rewardLabel } from "../../components/network/net-ui";

export default function DiscoverPage() {
  const { state, follow } = useNetwork();

  // Sender-market offers only — the recipient side lives in its own market.
  const offers = state.campaigns.filter(
    (c) => c.status === "active" && c.targeting.market !== "recipient",
  );
  const affinity = (c: Campaign) => {
    const merchant = state.merchants.find((m) => m.id === c.merchantId);
    if (!merchant) return 0;
    const followBoost = state.consumer.followedMerchantIds.includes(merchant.id) ? 20 : 0;
    return (state.consumer.prefs[merchant.category] ?? 50) + followBoost;
  };
  const forYou = [...offers].sort((a, b) => affinity(b) - affinity(a));

  return (
    <main className="screen">
      <h1 className="mt-2 text-[24px] font-bold tracking-tight">{t("net.discover.title")}</h1>
      <p className="subtle mt-1">{t("net.discover.sub")}</p>

      <h2 className="section-title mb-3 mt-6">{t("net.discover.forYou")}</h2>
      {forYou.map((campaign) => {
        const merchant = state.merchants.find((m) => m.id === campaign.merchantId);
        if (!merchant) return null;
        const followed = state.consumer.followedMerchantIds.includes(merchant.id);
        return (
          <div key={campaign.id} className="card mt-3 flex items-center gap-3">
            <MerchantMark merchant={merchant} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{rewardLabel(campaign.reward)}</span>
              <span className="micro block">
                {merchant.name} · {categoryLabel(merchant.category)}
                {campaign.targeting.market === "both_win" ? ` · ${t("net.discover.bothWinTag")}` : ""}
              </span>
            </span>
            <button
              className="chip"
              aria-pressed={followed}
              style={followed ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
              onClick={() => follow(merchant.id)}
            >
              {followed ? t("net.discover.following") : t("net.discover.follow")}
            </button>
          </div>
        );
      })}

      <p className="micro mt-6 text-center">{t("net.discover.note")}</p>
    </main>
  );
}
