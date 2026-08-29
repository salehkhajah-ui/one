/**
 * POST /api/financial-events — sandbox endpoint demonstrating the institution
 * integration contract. Validates the privacy-minimized payload and returns
 * the reward-auction decision against the seeded demo network.
 *
 * Stateless by design in this milestone: the interactive demo state lives on
 * the client (see docs/NETWORK.md). In production this endpoint writes to
 * Postgres and requires an API key + webhook signature.
 */
import { NextResponse } from "next/server";
import { matchCampaigns } from "../../../lib/network/engine";
import { ingestEvent } from "../../../lib/network/lifecycle";
import { seedNetworkState } from "../../../lib/network/seed";
import type { AmountBand, CountryCode, FinancialEventType } from "../../../lib/network/types";

const EVENT_TYPES: FinancialEventType[] = [
  "remittance_completed",
  "salary_received",
  "bill_paid",
  "card_payment_completed",
  "insurance_renewed",
  "investment_completed",
  "wallet_topup_completed",
  "loan_payment_completed",
];
const BANDS: AmountBand[] = ["lt50", "50_100", "100_250", "250_500", "gt500"];
const COUNTRIES: CountryCode[] = ["KW", "PH", "IN", "EG", "BD", "PK", "SA", "AE"];

interface EventPayload {
  event_type?: unknown;
  institution_id?: unknown;
  customer_ref?: unknown;
  transaction_id?: unknown;
  amount_band?: unknown;
  country?: unknown;
  destination_country?: unknown;
}

export async function POST(request: Request) {
  let body: EventPayload;
  try {
    body = (await request.json()) as EventPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const errors: string[] = [];
  if (!EVENT_TYPES.includes(body.event_type as FinancialEventType)) errors.push("event_type");
  if (typeof body.institution_id !== "string") errors.push("institution_id");
  if (typeof body.transaction_id !== "string" || body.transaction_id.length < 4) errors.push("transaction_id");
  if (!BANDS.includes(body.amount_band as AmountBand)) errors.push("amount_band");
  if (!COUNTRIES.includes(body.country as CountryCode)) errors.push("country");
  if (body.destination_country !== undefined && !COUNTRIES.includes(body.destination_country as CountryCode))
    errors.push("destination_country");
  if (errors.length > 0) return NextResponse.json({ error: "invalid_fields", fields: errors }, { status: 422 });

  const now = new Date();
  const { state, event, moment } = ingestEvent(
    seedNetworkState(),
    {
      type: body.event_type as FinancialEventType,
      institutionId: body.institution_id as string,
      transactionId: body.transaction_id as string,
      amountBand: body.amount_band as AmountBand,
      country: body.country as CountryCode,
      destinationCountry: body.destination_country as CountryCode | undefined,
    },
    now,
  );

  if (event.status === "rejected") {
    return NextResponse.json({ event_id: event.id, status: "rejected", reason: event.rejectionReason }, { status: 200 });
  }

  const institution = state.institutions.find((i) => i.id === event.institutionId)!;
  const candidates = matchCampaigns(state, event, institution, now, 3).map((c) => {
    const campaign = state.campaigns.find((x) => x.id === c.campaignId)!;
    const merchant = state.merchants.find((m) => m.id === campaign.merchantId)!;
    return {
      campaign_id: campaign.id,
      merchant: merchant.name,
      reward: campaign.reward,
      market: campaign.targeting.market,
      score: Number(c.score.toFixed(4)),
    };
  });

  return NextResponse.json({
    event_id: event.id,
    status: "accepted",
    reward_mode: institution.rewardMode,
    moment_opened: !!moment,
    candidates,
    sandbox: true,
  });
}
