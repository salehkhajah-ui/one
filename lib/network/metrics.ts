/**
 * Dashboard metrics — every number on a merchant/institution/admin screen is
 * computed here from the ledger + entities + seeded baseline, never invented
 * in components. Ratios are returned as basis points (integers) so the UI
 * formats them without float drift; money stays integer minor units.
 */
import { sumMinor } from "../money";
import { rewardValueMinor } from "./engine";
import type { NetworkState, RewardInstance } from "./types";

function sameUTCDay(iso: string, now: Date): boolean {
  return iso.slice(0, 10) === now.toISOString().slice(0, 10);
}

function bps(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.round((part / whole) * 10_000);
}

export interface MerchantMetrics {
  todayCustomers: number;
  todayRevenueMinor: number;
  todaySpendMinor: number;
  /** ROI as multiple ×10 (e.g. 151 = 15.1×). 0 when no spend. */
  roiTimes10: number;
  totalRevenueMinor: number;
  totalSpendMinor: number;
  /** Cost per acquired customer, minor units. */
  cpaMinor: number;
  served: number;
  selected: number;
  redeemed: number;
  redemptionRateBps: number;
  activeCampaigns: number;
}

export function merchantMetrics(state: NetworkState, merchantId: string, now: Date): MerchantMetrics {
  const base = state.baseline.merchants[merchantId] ?? [];
  const baseToday = base.find((d) => d.dayOffset === 0);
  const campaignIds = new Set(state.campaigns.filter((c) => c.merchantId === merchantId).map((c) => c.id));

  const liveRedemptions = state.redemptions.filter((r) => r.merchantId === merchantId && !r.refunded);
  const liveToday = liveRedemptions.filter((r) => sameUTCDay(r.atISO, now));
  const liveRewards = state.rewards.filter((r) => r.merchantId === merchantId && r.status !== "cancelled");
  const liveServed = state.moments.filter((m) => m.candidateCampaignIds.some((id) => campaignIds.has(id))).length;

  const served = base.reduce((a, d) => a + d.served, 0) + liveServed;
  const selected = base.reduce((a, d) => a + d.selected, 0) + liveRewards.length;
  const redeemed = base.reduce((a, d) => a + d.redeemed, 0) + liveRedemptions.length;

  const totalRevenueMinor = base.reduce((a, d) => a + d.revenueMinor, 0) + sumMinor(liveRedemptions.map((r) => r.purchaseValueMinor));
  const totalSpendMinor = base.reduce((a, d) => a + d.spendMinor, 0) + sumMinor(liveRedemptions.map((r) => r.billedMinor));
  const todayRevenueMinor = (baseToday?.revenueMinor ?? 0) + sumMinor(liveToday.map((r) => r.purchaseValueMinor));
  const todaySpendMinor = (baseToday?.spendMinor ?? 0) + sumMinor(liveToday.map((r) => r.billedMinor));
  const todayCustomers = (baseToday?.newCustomers ?? 0) + liveToday.length;

  return {
    todayCustomers,
    todayRevenueMinor,
    todaySpendMinor,
    roiTimes10: todaySpendMinor > 0 ? Math.round((todayRevenueMinor / todaySpendMinor) * 10) : 0,
    totalRevenueMinor,
    totalSpendMinor,
    cpaMinor: redeemed > 0 ? Math.round(totalSpendMinor / redeemed) : 0,
    served,
    selected,
    redeemed,
    redemptionRateBps: bps(redeemed, selected),
    activeCampaigns: state.campaigns.filter((c) => c.merchantId === merchantId && c.status === "active").length,
  };
}

// ---------------------------------------------------------------- billing ----

export interface MerchantBilling {
  /** What ONE will invoice for the current 14-day period. */
  upcomingInvoiceMinor: number;
  /** Remaining budget across this merchant's live campaigns. */
  budgetRemainingMinor: number;
  /** Daily statement, newest first: billed outcomes per day (baseline + live). */
  days: Array<{ dateISO: string; outcomes: number; billedMinor: number }>;
}

export function merchantBilling(state: NetworkState, merchantId: string, now: Date): MerchantBilling {
  const base = state.baseline.merchants[merchantId] ?? [];
  const live = state.redemptions.filter((r) => r.merchantId === merchantId && !r.refunded);

  const dayMs = 86_400_000;
  const dateFor = (offset: number) => new Date(now.getTime() - offset * dayMs).toISOString().slice(0, 10);
  const days = new Map<string, { outcomes: number; billedMinor: number }>();
  for (const d of base.slice(0, 7)) {
    days.set(dateFor(d.dayOffset), { outcomes: d.redeemed, billedMinor: d.spendMinor });
  }
  for (const r of live) {
    const key = r.atISO.slice(0, 10);
    const row = days.get(key) ?? { outcomes: 0, billedMinor: 0 };
    days.set(key, { outcomes: row.outcomes + 1, billedMinor: row.billedMinor + r.billedMinor });
  }

  const budgetRemainingMinor = state.campaigns
    .filter((c) => c.merchantId === merchantId && (c.status === "active" || c.status === "paused"))
    .reduce((a, c) => a + Math.max(0, c.budget.totalMinor - c.budget.spentMinor), 0);
  const upcomingInvoiceMinor =
    base.reduce((a, d) => a + d.spendMinor, 0) + sumMinor(live.map((r) => r.billedMinor));

  return {
    upcomingInvoiceMinor,
    budgetRemainingMinor,
    days: [...days.entries()]
      .map(([dateISO, v]) => ({ dateISO, ...v }))
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .slice(0, 7),
  };
}

export interface InstitutionMetrics {
  events: number;
  revealed: number;
  selected: number;
  redeemed: number;
  revealRateBps: number;
  redemptionRateBps: number;
  rewardValueMinor: number;
  costMinor: number;
  repeatLiftBps: number;
  liveEvents: number;
  rejectedEvents: number;
}

export function institutionMetrics(state: NetworkState, institutionId: string): InstitutionMetrics {
  const b = state.baseline.institution;
  const liveAccepted = state.events.filter((e) => e.institutionId === institutionId && e.status !== "rejected");
  const rejectedEvents = state.events.filter((e) => e.institutionId === institutionId && e.status === "rejected").length;
  const liveRevealed = state.moments.filter((m) => m.revealed).length;
  const liveSelected = state.moments.filter((m) => m.resolvedRewardIds.length > 0).length;
  const liveRedeemed = state.redemptions.filter((r) => !r.refunded).length;

  const liveRewardValue = sumMinor(
    state.rewards
      .filter((r): r is RewardInstance & { status: "redeemed" } => r.status === "redeemed")
      .map((r) => {
        const campaign = state.campaigns.find((c) => c.id === r.campaignId);
        const spec = r.holder === "recipient" && campaign?.recipientReward ? campaign.recipientReward : campaign?.reward;
        return spec ? rewardValueMinor(spec) : 0;
      }),
  );

  const events = b.events + liveAccepted.length;
  const revealed = b.revealed + liveRevealed;
  const selected = b.selected + liveSelected;
  const redeemed = b.redeemed + liveRedeemed;
  return {
    events,
    revealed,
    selected,
    redeemed,
    revealRateBps: bps(revealed, events),
    redemptionRateBps: bps(redeemed, selected),
    rewardValueMinor: b.rewardValueMinor + liveRewardValue,
    costMinor: b.costMinor,
    repeatLiftBps: b.repeatLiftBps,
    liveEvents: liveAccepted.length,
    rejectedEvents,
  };
}

export interface PlatformMetrics {
  revenueMinor: number;
  events: number;
  redemptions: number;
  fraudSignals: number;
  merchants: number;
  activeCampaigns: number;
  institutions: number;
}

export function platformMetrics(state: NetworkState): PlatformMetrics {
  const baselineSpend = Object.values(state.baseline.merchants)
    .flat()
    .reduce((a, d) => a + d.spendMinor, 0);
  const liveBilled = sumMinor(state.redemptions.filter((r) => !r.refunded).map((r) => r.billedMinor));
  const baselineRedeemed = Object.values(state.baseline.merchants)
    .flat()
    .reduce((a, d) => a + d.redeemed, 0);
  return {
    revenueMinor: baselineSpend + liveBilled,
    events: state.baseline.institution.events + state.events.filter((e) => e.status !== "rejected").length,
    redemptions: baselineRedeemed + state.redemptions.filter((r) => !r.refunded).length,
    fraudSignals: state.fraudSignals.length,
    merchants: state.merchants.filter((m) => m.approved).length,
    activeCampaigns: state.campaigns.filter((c) => c.status === "active").length,
    institutions: state.institutions.filter((i) => i.approved).length,
  };
}
