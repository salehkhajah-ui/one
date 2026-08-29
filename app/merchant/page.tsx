"use client";

/**
 * Merchant dashboard — a merchant must understand ONE in 30 seconds:
 * today's customers, revenue, spend and ROI up top; the funnel and
 * campaigns below; the copilot only ever *suggests* (merchant approves).
 */
import Link from "next/link";
import { useState } from "react";
import { money, t } from "../../lib/i18n";
import { merchantBilling, merchantMetrics } from "../../lib/network/metrics";
import type { Campaign } from "../../lib/network/types";
import { useNetwork } from "../components/network/NetworkProvider";
import { formatPctBps, formatRoi, MerchantMark, ProgressBar, rewardLabel, StatCard } from "../components/network/net-ui";

export default function MerchantDashboard() {
  const { state, setStatus, applyReward } = useNetwork();
  const merchants = state.merchants.filter((m) => m.markets.includes("KW"));
  const [merchantId, setMerchantId] = useState("m_tropicfeel");
  const merchant = state.merchants.find((m) => m.id === merchantId) ?? merchants[0];
  const metrics = merchantMetrics(state, merchant.id, new Date());
  const billing = merchantBilling(state, merchant.id, new Date());
  const campaigns = state.campaigns.filter((c) => c.merchantId === merchant.id);

  // Copilot: one grounded recommendation for the first live percent campaign.
  const coachable = campaigns.find((c) => c.status === "active" && c.reward.kind === "percent" && (c.reward.valueBps ?? 0) < 2_500);
  const [applied, setApplied] = useState(false);

  return (
    <main className="screen">
      <div className="flex flex-wrap items-center gap-3">
        <MerchantMark merchant={merchant} size={44} />
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{merchant.name}</h1>
          <p className="micro">{t("net.merchant.subtitle")}</p>
        </div>
        <label className="ms-auto">
          <span className="sr-only">{t("net.merchant.switch")}</span>
          <select className="input" style={{ width: "auto" }} value={merchant.id} onChange={(e) => setMerchantId(e.target.value)}>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2 className="section-title mb-3 mt-6">{t("common.today")}</h2>
      <div className="stat-grid">
        <StatCard label={t("net.merchant.customers")} value={metrics.todayCustomers} />
        <StatCard label={t("net.merchant.revenue")} value={money(metrics.todayRevenueMinor)} tone="positive" />
        <StatCard label={t("net.merchant.spend")} value={money(metrics.todaySpendMinor)} />
        <StatCard label={t("net.merchant.roi")} value={formatRoi(metrics.roiTimes10)} sub={t("net.merchant.roiSub")} />
      </div>

      <h2 className="section-title mb-3 mt-6">{t("net.merchant.funnel")}</h2>
      <div className="card">
        {(
          [
            ["net.merchant.served", metrics.served],
            ["net.merchant.selected", metrics.selected],
            ["net.merchant.redeemed", metrics.redeemed],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="mt-2 first:mt-0">
            <div className="flex items-center justify-between">
              <span className="subtle">{t(key)}</span>
              <span className="subtle money">{value}</span>
            </div>
            <ProgressBar pct={metrics.served > 0 ? (value / metrics.served) * 100 : 0} />
          </div>
        ))}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
          <span className="micro">
            {t("net.merchant.redemptionRate")}: <span className="money">{formatPctBps(metrics.redemptionRateBps)}</span>
          </span>
          <span className="micro">
            {t("net.merchant.cpa")}: <span className="money">{money(metrics.cpaMinor)}</span>
          </span>
          <span className="micro">
            {t("net.merchant.totalRevenue")}: <span className="money">{money(metrics.totalRevenueMinor)}</span>
          </span>
        </div>
        <p className="micro mt-2">{t("net.merchant.attributionNote")}</p>
      </div>

      {coachable && !applied ? (
        <div className="card-elevated mt-4">
          <span className="eyebrow">{t("net.merchant.copilot")}</span>
          <p className="subtle mt-2">
            {t("net.merchant.copilotAdvice", {
              campaign: coachable.name,
              from: Math.round((coachable.reward.valueBps ?? 0) / 100),
              to: Math.round(((coachable.reward.valueBps ?? 0) + 500) / 100),
            })}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                applyReward(coachable.id, { ...coachable.reward, valueBps: (coachable.reward.valueBps ?? 0) + 500 });
                setApplied(true);
              }}
            >
              {t("net.merchant.applyRec")}
            </button>
            <button className="btn btn-ghost" onClick={() => setApplied(true)}>
              {t("net.merchant.dismiss")}
            </button>
          </div>
          <p className="micro mt-2">{t("net.merchant.copilotNote")}</p>
        </div>
      ) : null}

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="section-title">{t("net.merchant.campaigns")}</h2>
        <Link href="/merchant/new" className="micro font-semibold" style={{ color: "var(--accent)" }}>
          {t("net.merchant.newCampaign")}
        </Link>
      </div>
      {campaigns.length === 0 ? (
        <div className="card">
          <p className="subtle">{t("net.merchant.noCampaigns")}</p>
        </div>
      ) : (
        campaigns.map((campaign) => <CampaignRow key={campaign.id} campaign={campaign} onToggle={setStatus} />)
      )}

      <h2 className="section-title mb-3 mt-6">{t("net.billing.title")}</h2>
      <div className="card">
        <div className="stat-grid">
          <div>
            <div className="micro">{t("net.billing.upcoming")}</div>
            <div className="stat-value money mt-1">{money(billing.upcomingInvoiceMinor)}</div>
          </div>
          <div>
            <div className="micro">{t("net.billing.budgetRemaining")}</div>
            <div className="stat-value money mt-1">{money(billing.budgetRemainingMinor)}</div>
          </div>
          <div>
            <div className="micro">{t("net.billing.method")}</div>
            <div className="subtle mt-2">{t("net.billing.methodValue")}</div>
          </div>
        </div>
        <div className="ticket-divider" />
        <div className="micro mb-1">{t("net.billing.statement")}</div>
        {billing.days.map((d) => (
          <div key={d.dateISO} className="mt-1 flex items-center justify-between">
            <span className="micro money">{d.dateISO}</span>
            <span className="micro">{t("net.billing.outcomes", { count: d.outcomes })}</span>
            <span className="subtle money">{money(d.billedMinor)}</span>
          </div>
        ))}
        <p className="micro mt-3">{t("net.billing.note")}</p>
      </div>

      <div className="card mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="subtle">{t("net.merchant.pitchTeaser")}</span>
        <Link href="/pitch" className="btn btn-quiet">
          {t("net.merchant.seeHow")}
        </Link>
      </div>
      <div className="card mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="subtle">{t("net.join.teaser")}</span>
        <Link href="/merchant/join" className="btn btn-quiet">
          {t("net.join.cta")}
        </Link>
      </div>
    </main>
  );
}

function CampaignRow({ campaign, onToggle }: { campaign: Campaign; onToggle: (id: string, status: Campaign["status"]) => void }) {
  const pct = campaign.budget.totalMinor > 0 ? (campaign.budget.spentMinor / campaign.budget.totalMinor) * 100 : 0;
  return (
    <div className="card mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{campaign.name}</span>
          <span className="micro block">
            {rewardLabel(campaign.reward)} · {t(`net.objective.${campaign.objective}`)} ·{" "}
            {t(`net.campaign.status.${campaign.status}`)}
          </span>
        </span>
        {campaign.status === "active" || campaign.status === "paused" ? (
          <button className="chip" onClick={() => onToggle(campaign.id, campaign.status === "active" ? "paused" : "active")}>
            {campaign.status === "active" ? t("net.campaign.pause") : t("net.campaign.resume")}
          </button>
        ) : null}
      </div>
      <div className="mt-3">
        <ProgressBar pct={pct} color={pct > 85 ? "var(--caution)" : "var(--accent)"} />
        <p className="micro mt-1">
          {t("net.campaign.budgetUsed", {
            spent: money(campaign.budget.spentMinor),
            total: money(campaign.budget.totalMinor),
          })}
        </p>
      </div>
    </div>
  );
}
