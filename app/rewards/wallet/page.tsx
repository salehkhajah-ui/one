"use client";

/**
 * Reward wallet — Available / Used / Expired. Two taps from wallet to
 * redemption: open the ticket, show the single-use code.
 */
import { useState } from "react";
import { t } from "../../../lib/i18n";
import { rewardSpecFor } from "../../../lib/network/engine";
import type { RewardInstance } from "../../../lib/network/types";
import { useNetwork } from "../../components/network/NetworkProvider";
import { CodeMatrix, expiryLabel, MerchantMark, RewardHeadline, rewardLabel } from "../../components/network/net-ui";

type Tab = "available" | "used" | "past";

export default function WalletPage() {
  const { state } = useNetwork();
  const [tab, setTab] = useState<Tab>("available");
  const [openId, setOpenId] = useState<string | null>(null);

  const byTab: Record<Tab, RewardInstance[]> = {
    available: state.rewards.filter((r) => r.status === "available"),
    used: state.rewards.filter((r) => r.status === "redeemed"),
    past: state.rewards.filter((r) => r.status === "expired" || r.status === "cancelled"),
  };
  const rewards = [...byTab[tab]].sort((a, b) => b.issuedISO.localeCompare(a.issuedISO));

  return (
    <main className="screen">
      <h1 className="mt-2 text-[24px] font-bold tracking-tight">{t("net.wallet.title")}</h1>
      <div className="mt-4 flex gap-2" role="tablist">
        {(["available", "used", "past"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className="chip"
            style={tab === k ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
            onClick={() => {
              setTab(k);
              setOpenId(null);
            }}
          >
            {t(`net.wallet.tab.${k}`)}
            <span className="money">{byTab[k].length}</span>
          </button>
        ))}
      </div>

      {rewards.length === 0 ? (
        <div className="card mt-4 text-center">
          <p className="subtle">{t("net.wallet.empty")}</p>
        </div>
      ) : null}

      {rewards.map((reward) => {
        const merchant = state.merchants.find((m) => m.id === reward.merchantId);
        const campaign = state.campaigns.find((c) => c.id === reward.campaignId);
        const spec = campaign ? rewardSpecFor(campaign, reward) : undefined;
        if (!merchant || !spec) return null;
        const open = openId === reward.id;
        return (
          <div key={reward.id} className="card mt-3">
            <button className="flex w-full items-center gap-3 text-start" onClick={() => setOpenId(open ? null : reward.id)}>
              <MerchantMark merchant={merchant} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{rewardLabel(spec)}</span>
                <span className="micro block">
                  {merchant.name}
                  {reward.holder === "recipient" ? ` · ${t("net.wallet.forRecipient")}` : ""}
                  {merchant.locations.length > 0 ? ` · ${merchant.locations[0]}` : ""}
                </span>
              </span>
              <span className="micro" style={{ color: reward.status === "available" ? "var(--caution)" : "var(--text-3)" }}>
                {reward.status === "available"
                  ? expiryLabel(reward.expiresISO)
                  : t(`net.wallet.status.${reward.status === "redeemed" ? "used" : reward.status === "expired" ? "expired" : "cancelled"}`)}
              </span>
            </button>
            {open && reward.status === "available" ? (
              <div className="mt-1">
                <div className="ticket-divider" />
                <RewardHeadline spec={spec} />
                <p className="micro mt-1">
                  {reward.holder === "recipient" ? t("net.wallet.recipientHint", { country: t(`net.country.${reward.market}`) }) : t("net.wallet.showCode")}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="code-display">{reward.code}</div>
                  </div>
                  <CodeMatrix code={reward.code} />
                </div>
                <p className="micro mt-2">{t("net.wallet.singleUse")}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </main>
  );
}
