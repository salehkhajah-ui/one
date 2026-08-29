/**
 * Reward matching engine — evaluates every active campaign against an
 * accepted financial event and ranks candidates by ecosystem score:
 *
 *   score = relevance × predicted redemption × merchant economic value
 *           × reward attractiveness   (× eligibility as a hard gate)
 *
 * The engine deliberately does NOT pick the highest bidder: customer
 * relevance and reward attractiveness weigh as much as merchant economics,
 * because long-term network health beats maximizing one transaction.
 * Scores are unitless floats; money never flows through them.
 */
import { percentOf } from "../money";
import type {
  Campaign,
  FinancialEvent,
  Institution,
  Merchant,
  NetworkState,
  RewardSpec,
} from "./types";

/** Assumed basket for converting percent rewards into comparable value (10 KD). */
export const REFERENCE_BASKET_MINOR = 10_000;

/** Customer-facing value of a reward in minor units (for ranking + dashboards). */
export function rewardValueMinor(spec: RewardSpec, basketMinor = REFERENCE_BASKET_MINOR): number {
  switch (spec.kind) {
    case "percent":
      return percentOf(basketMinor, spec.valueBps ?? 0);
    case "fixed":
    case "credit":
      return spec.amountMinor ?? 0;
    case "free_item":
      return 2_000; // reference value of a free item (~2 KD)
    case "bogo":
      return percentOf(basketMinor, 5_000); // half the basket
  }
}

/**
 * The spec a reward instance actually renders/redeems as: recipient-side
 * instances use the campaign's recipientReward, and issuance-time referral
 * boosts widen percent rewards. The single source of truth for the UI.
 */
export function rewardSpecFor(
  campaign: Campaign,
  reward: Pick<import("./types").RewardInstance, "holder" | "boostBps">,
): RewardSpec {
  const base = reward.holder === "recipient" && campaign.recipientReward ? campaign.recipientReward : campaign.reward;
  if (reward.boostBps && base.kind === "percent") {
    return { ...base, valueBps: (base.valueBps ?? 0) + reward.boostBps };
  }
  return base;
}

/** Expected merchant fee ONE bills if this campaign converts (minor units). */
export function expectedBillingMinor(campaign: Campaign): number {
  const p = campaign.pricing;
  if (p.model === "cps") return percentOf(REFERENCE_BASKET_MINOR * 3, p.shareBps ?? 0);
  return p.feeMinor ?? 0;
}

function merchantOf(state: NetworkState, id: string): Merchant | undefined {
  return state.merchants.find((m) => m.id === id);
}

/** Count rewards this customer already holds from a campaign (per-customer cap). */
function issuedCount(state: NetworkState, campaignId: string): number {
  return state.rewards.filter((r) => r.campaignId === campaignId && r.status !== "cancelled").length;
}

function hasRedeemedWith(state: NetworkState, merchantId: string): boolean {
  return state.redemptions.some((r) => r.merchantId === merchantId && !r.refunded);
}

export interface EligibilityResult {
  eligible: boolean;
  reason?:
    | "inactive"
    | "budget_exhausted"
    | "merchant_unapproved"
    | "category_blocked"
    | "event_type"
    | "amount_band"
    | "market"
    | "day_of_week"
    | "customer_cap"
    | "audience";
}

/** Hard eligibility gate — every reason is auditable. */
export function checkEligibility(
  state: NetworkState,
  campaign: Campaign,
  event: FinancialEvent,
  institution: Institution,
  now: Date,
): EligibilityResult {
  if (campaign.status !== "active") return { eligible: false, reason: "inactive" };
  const merchant = merchantOf(state, campaign.merchantId);
  if (!merchant || !merchant.approved) return { eligible: false, reason: "merchant_unapproved" };
  if (institution.blockedCategories.includes(merchant.category))
    return { eligible: false, reason: "category_blocked" };
  if (!campaign.targeting.eventTypes.includes(event.type)) return { eligible: false, reason: "event_type" };
  if (campaign.targeting.amountBands && !campaign.targeting.amountBands.includes(event.amountBand))
    return { eligible: false, reason: "amount_band" };

  // Market gate: the reward must be redeemable where its holder lives.
  const market = campaign.targeting.market;
  if (market === "sender" && !merchant.markets.includes(event.country))
    return { eligible: false, reason: "market" };
  if (market === "recipient") {
    if (!institution.recipientRewardsAllowed || !event.destinationCountry)
      return { eligible: false, reason: "market" };
    if (!merchant.markets.includes(event.destinationCountry)) return { eligible: false, reason: "market" };
    if (
      campaign.targeting.destinationCountries &&
      !campaign.targeting.destinationCountries.includes(event.destinationCountry)
    )
      return { eligible: false, reason: "market" };
  }
  if (market === "both_win") {
    if (!institution.recipientRewardsAllowed || !event.destinationCountry)
      return { eligible: false, reason: "market" };
    const recipientMerchant = merchantOf(state, campaign.recipientMerchantId ?? campaign.merchantId);
    if (!merchant.markets.includes(event.country)) return { eligible: false, reason: "market" };
    if (!recipientMerchant?.markets.includes(event.destinationCountry))
      return { eligible: false, reason: "market" };
  }

  if (campaign.targeting.daysOfWeek && !campaign.targeting.daysOfWeek.includes(now.getDay()))
    return { eligible: false, reason: "day_of_week" };

  const remaining = campaign.budget.totalMinor - campaign.budget.spentMinor;
  if (remaining < expectedBillingMinor(campaign)) return { eligible: false, reason: "budget_exhausted" };
  if (issuedCount(state, campaign.id) >= campaign.budget.perCustomerCap)
    return { eligible: false, reason: "customer_cap" };

  if (campaign.targeting.audience === "new" && hasRedeemedWith(state, campaign.merchantId))
    return { eligible: false, reason: "audience" };
  if (campaign.targeting.audience === "existing" && !hasRedeemedWith(state, campaign.merchantId))
    return { eligible: false, reason: "audience" };

  return { eligible: true };
}

export interface ScoredCandidate {
  campaignId: string;
  score: number;
  relevance: number;
  predictedRedemption: number;
  economicValue: number;
  attractiveness: number;
}

/** Rank one eligible campaign for this customer + event. */
export function scoreCampaign(state: NetworkState, campaign: Campaign): ScoredCandidate {
  const merchant = merchantOf(state, campaign.merchantId);
  const category = merchant?.category ?? "food";

  // Relevance: learned preference vector (0..100) + live intent + follows.
  let relevance = (state.consumer.prefs[category] ?? 50) / 100;
  if (state.consumer.intent && state.consumer.intent === category) relevance = Math.min(1, relevance + 0.3);
  if (merchant && state.consumer.followedMerchantIds.includes(merchant.id))
    relevance = Math.min(1, relevance + 0.15);

  // Predicted redemption: base rate by reward kind, nudged by generosity.
  const baseByKind: Record<RewardSpec["kind"], number> = {
    percent: 0.35,
    fixed: 0.45,
    credit: 0.4,
    free_item: 0.5,
    bogo: 0.4,
  };
  const value = rewardValueMinor(campaign.reward);
  const generosity = Math.min(0.25, value / 20_000); // up to +0.25 for ~5 KD value
  const predictedRedemption = Math.min(0.9, baseByKind[campaign.reward.kind] + generosity);

  // Merchant economic value: expected billing normalized against 3 KD reference.
  const economicValue = Math.min(1, expectedBillingMinor(campaign) / 3_000);

  // Attractiveness: reward value normalized against 5 KD reference.
  const attractiveness = Math.min(1, value / 5_000);

  return {
    campaignId: campaign.id,
    score: relevance * predictedRedemption * (0.5 + economicValue / 2) * (0.5 + attractiveness / 2),
    relevance,
    predictedRedemption,
    economicValue,
    attractiveness,
  };
}

/** Full auction: eligibility gate, score, rank. Deterministic tie-break by id. */
export function matchCampaigns(
  state: NetworkState,
  event: FinancialEvent,
  institution: Institution,
  now: Date,
  limit: number,
): ScoredCandidate[] {
  return state.campaigns
    .filter((c) => checkEligibility(state, c, event, institution, now).eligible)
    .map((c) => scoreCampaign(state, c))
    .sort((a, b) => b.score - a.score || a.campaignId.localeCompare(b.campaignId))
    .slice(0, limit);
}
