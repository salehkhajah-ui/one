"use client";

/**
 * The reveal — ONE's signature interaction. Maximum taps: Reveal → choose →
 * use/save. Premium and calm; no casino energy.
 */
import Link from "next/link";
import { t } from "../../../lib/i18n";
import type { Campaign, Moment } from "../../../lib/network/types";
import { useNetwork } from "../../components/network/NetworkProvider";
import { expiryLabel, MerchantMark, RewardHeadline, rewardLabel } from "../../components/network/net-ui";

export default function RevealPage() {
  const { state, reveal } = useNetwork();
  const moment = [...state.moments].reverse().find((m) => m.resolvedRewardIds.length === 0);
  const resolved = [...state.moments].reverse().find((m) => m.resolvedRewardIds.length > 0);

  if (!moment && resolved) return <Resolved moment={resolved} />;
  if (!moment)
    return (
      <main className="screen flex min-h-[80dvh] flex-col items-center justify-center gap-4">
        <p className="subtle text-center">{t("net.reveal.nothing")}</p>
        <Link href="/rewards" className="btn btn-ghost">
          {t("net.common.backHome")}
        </Link>
      </main>
    );

  if (!moment.revealed) {
    return (
      <main className="screen flex min-h-[80dvh] flex-col items-center justify-center text-center">
        <div className="gift-orb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 12v8h14v-8" />
            <path d="M12 8v12" />
            <path d="M12 8c-4.5 0-5-5-1.5-5C13 3 12 8 12 8Zm0 0c4.5 0 5-5 1.5-5C11 3 12 8 12 8Z" />
          </svg>
        </div>
        <h1 className="mt-6 text-[24px] font-bold tracking-tight">{t("net.reveal.title")}</h1>
        <p className="subtle mt-2">{t("net.reveal.sub")}</p>
        <button className="btn btn-primary mt-8 w-full" onClick={() => reveal(moment.id)}>
          {t("net.reveal.cta")}
        </button>
      </main>
    );
  }

  return <Choose moment={moment} />;
}

function Choose({ moment }: { moment: Moment }) {
  const { state, select } = useNetwork();
  const event = state.events.find((e) => e.id === moment.eventId);
  const candidates = moment.candidateCampaignIds
    .map((id) => state.campaigns.find((c) => c.id === id))
    .filter((c): c is Campaign => !!c);
  const canGift =
    !!event?.destinationCountry && (state.institutions.find((i) => i.id === event.institutionId)?.recipientRewardsAllowed ?? false);

  return (
    <main className="screen">
      <h1 className="mt-4 text-[24px] font-bold tracking-tight">
        {candidates.length > 1 ? t("net.reveal.choose") : t("net.reveal.yourReward")}
      </h1>
      <p className="subtle mt-1">{t("net.reveal.chooseSub")}</p>

      {candidates.map((campaign, i) => {
        const merchant = state.merchants.find((m) => m.id === campaign.merchantId);
        const recipientMerchant = state.merchants.find((m) => m.id === (campaign.recipientMerchantId ?? campaign.merchantId));
        if (!merchant) return null;
        const market = campaign.targeting.market;
        const destination = event?.destinationCountry ? t(`net.country.${event.destinationCountry}`) : "";
        return (
          <div key={campaign.id} className="card-elevated reveal-card mt-4" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="flex items-center gap-3">
              <MerchantMark merchant={merchant} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{merchant.name}</span>
                <span className="micro flex items-center gap-2">
                  <span className="demo-tag">{t("net.demoData")}</span>
                  {t("net.reveal.validFor", { time: `${campaign.expiryHours}` })}
                </span>
              </span>
            </div>
            <div className="mt-4">
              <RewardHeadline spec={campaign.reward} />
              {market === "both_win" && recipientMerchant ? (
                <p className="subtle mt-2">
                  {t("net.reveal.plusRecipient", {
                    reward: campaign.recipientReward ? rewardLabel(campaign.recipientReward) : "",
                    merchant: recipientMerchant.name,
                    country: destination,
                  })}
                </p>
              ) : market === "recipient" ? (
                <p className="subtle mt-2">{t("net.reveal.forFamily", { country: destination })}</p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button className="btn btn-primary w-full" onClick={() => select(moment.id, campaign.id)}>
                {market === "both_win"
                  ? t("net.reveal.takeBoth")
                  : market === "recipient"
                    ? t("net.reveal.sendIt")
                    : t("net.reveal.keepIt")}
              </button>
              {market === "sender" && canGift ? (
                <button className="btn btn-ghost w-full" onClick={() => select(moment.id, campaign.id, { sendToRecipient: true })}>
                  {t("net.reveal.giftRecipient", { country: destination })}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </main>
  );
}

function Resolved({ moment }: { moment: Moment }) {
  const { state } = useNetwork();
  const rewards = moment.resolvedRewardIds
    .map((id) => state.rewards.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r);
  return (
    <main className="screen flex min-h-[80dvh] flex-col justify-center">
      <h1 className="text-center text-[24px] font-bold tracking-tight">{t("net.reveal.savedTitle")}</h1>
      {rewards.map((reward) => {
        const merchant = state.merchants.find((m) => m.id === reward.merchantId);
        const campaign = state.campaigns.find((c) => c.id === reward.campaignId);
        const spec = reward.holder === "recipient" && campaign?.recipientReward ? campaign.recipientReward : campaign?.reward;
        if (!merchant || !spec) return null;
        return (
          <div key={reward.id} className="card reveal-card mt-4 flex items-center gap-3">
            <MerchantMark merchant={merchant} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{rewardLabel(spec)}</span>
              <span className="micro block">
                {merchant.name}
                {reward.holder === "recipient"
                  ? ` · ${t("net.reveal.sentTo", { country: t(`net.country.${reward.market}`) })}`
                  : ` · ${expiryLabel(reward.expiresISO)}`}
              </span>
            </span>
          </div>
        );
      })}
      <Link href="/rewards/wallet" className="btn btn-primary mt-6 w-full">
        {t("net.reveal.useNow")}
      </Link>
      <Link href="/rewards" className="btn btn-ghost mt-2 w-full">
        {t("net.common.done")}
      </Link>
    </main>
  );
}
