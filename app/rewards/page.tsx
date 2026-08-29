"use client";

/**
 * Consumer home — one idea in five seconds: your transfer unlocked something.
 * A pending moment takes over the screen; otherwise the demo transfer
 * simulator stands in for the institution's push notification.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "../../lib/i18n";
import type { AmountBand, MerchantCategory } from "../../lib/network/types";
import { useNetwork } from "../components/network/NetworkProvider";
import {
  expiryLabel,
  LanguageToggle,
  MerchantMark,
  rewardLabel,
  TierBadge,
} from "../components/network/net-ui";

const BANDS: Array<{ key: AmountBand; label: string }> = [
  { key: "50_100", label: "50–100" },
  { key: "100_250", label: "100–250" },
  { key: "250_500", label: "250–500" },
];

const INTENTS: Array<MerchantCategory | "surprise"> = ["food", "grocery", "travel", "entertainment", "surprise"];

export default function RewardsHome() {
  const { state, simulateTransfer, chooseIntent } = useNetwork();
  const router = useRouter();
  const [band, setBand] = useState<AmountBand>("100_250");
  const [rejection, setRejection] = useState<string | null>(null);

  const pendingMoment = [...state.moments].reverse().find((m) => m.resolvedRewardIds.length === 0);
  const available = state.rewards
    .filter((r) => r.status === "available")
    .sort((a, b) => a.expiresISO.localeCompare(b.expiresISO));
  const showIntent = !state.consumer.intent && !pendingMoment && state.consumer.momentCount > 0;

  const onSimulate = () => {
    setRejection(null);
    const { event } = simulateTransfer({ amountBand: band });
    if (event.status === "rejected") {
      setRejection(
        event.rejectionReason === "velocity_limit" ? t("net.home.velocityRejected") : t("net.home.rejected"),
      );
    } else {
      router.push("/rewards/reveal");
    }
  };

  return (
    <main className="screen">
      <div className="flex items-center gap-2">
        <span className="portal-brand" style={{ color: "var(--brand)" }}>
          ONE
        </span>
        <span className="portal-tag">{t("net.consumer.tag")}</span>
        <span className="ms-auto flex items-center gap-2">
          <TierBadge tier={state.consumer.tier} />
          <LanguageToggle />
        </span>
      </div>

      {pendingMoment ? (
        <div className="card-elevated moment-banner mt-5 text-center">
          <p className="subtle">{t("net.home.transferDone")}</p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight">{t("net.home.unlocked")}</h1>
          <Link href="/rewards/reveal" className="btn btn-primary mt-5 w-full">
            {t("net.reveal.cta")}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">{t("net.home.hero")}</h1>
            <p className="subtle mt-2">{t("net.home.heroSub")}</p>
          </div>

          <div className="card-elevated mt-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">{t("net.home.simulateTitle")}</span>
              <span className="demo-tag">{t("net.demoData")}</span>
            </div>
            <p className="subtle mt-2">{t("net.home.simulateSub")}</p>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label={t("net.home.bandLabel")}>
              {BANDS.map((b) => (
                <button
                  key={b.key}
                  className="chip"
                  role="radio"
                  aria-checked={band === b.key}
                  style={band === b.key ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
                  onClick={() => setBand(b.key)}
                >
                  <span className="money">{b.label}</span>&nbsp;{t("net.home.kd")}
                </button>
              ))}
            </div>
            <button className="btn btn-primary mt-4 w-full" onClick={onSimulate}>
              {t("net.home.sendTransfer")}
            </button>
            {rejection ? (
              <p className="micro mt-2" style={{ color: "var(--caution)" }}>
                {rejection}
              </p>
            ) : null}
            <p className="micro mt-3">{t("net.home.corridorNote")}</p>
          </div>
        </>
      )}

      {showIntent ? (
        <div className="card mt-4">
          <p className="subtle">{t("net.intent.question")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTENTS.map((i) => (
              <button key={i} className="chip" onClick={() => chooseIntent(i)}>
                {i === "surprise" ? t("net.intent.surprise") : t(`net.cat.${i}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {available.length > 0 ? (
        <>
          <div className="mt-6 mb-3 flex items-center justify-between">
            <h2 className="section-title">{t("net.home.yourRewards")}</h2>
            <Link href="/rewards/wallet" className="micro font-semibold" style={{ color: "var(--accent)" }}>
              {t("net.home.seeAll")}
            </Link>
          </div>
          {available.slice(0, 3).map((reward) => {
            const merchant = state.merchants.find((m) => m.id === reward.merchantId);
            const campaign = state.campaigns.find((c) => c.id === reward.campaignId);
            const spec = reward.holder === "recipient" && campaign?.recipientReward ? campaign.recipientReward : campaign?.reward;
            if (!merchant || !spec) return null;
            return (
              <Link key={reward.id} href="/rewards/wallet" className="card mb-2 flex items-center gap-3">
                <MerchantMark merchant={merchant} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{rewardLabel(spec)}</span>
                  <span className="micro block">
                    {merchant.name}
                    {reward.holder === "recipient" ? ` · ${t("net.wallet.forRecipient")}` : ""}
                  </span>
                </span>
                <span className="micro" style={{ color: "var(--caution)" }}>
                  {expiryLabel(reward.expiresISO)}
                </span>
              </Link>
            );
          })}
        </>
      ) : null}

      <div className="card mt-4 flex items-center justify-between">
        <span className="subtle">{t("net.home.discoverTeaser")}</span>
        <Link href="/rewards/discover" className="btn btn-quiet">
          {t("net.nav.discover")}
        </Link>
      </div>

      <p className="micro mt-6 text-center">{t("net.home.privacy")}</p>
    </main>
  );
}
