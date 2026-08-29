"use client";

/**
 * Campaign creator — the 4-click law: Goal → Offer → Audience → Launch.
 * Templates and the AI generator prefill everything; advanced settings stay
 * behind the review step instead of a wall of form fields.
 */
import Link from "next/link";
import { useState } from "react";
import { money, t } from "../../../lib/i18n";
import { fromMajor } from "../../../lib/money";
import type { CampaignDraft } from "../../../lib/network/lifecycle";
import type { Campaign, CampaignObjective, RewardKind, RewardSpec } from "../../../lib/network/types";
import { useNetwork } from "../../components/network/NetworkProvider";
import { rewardLabel } from "../../components/network/net-ui";

const OBJECTIVES: CampaignObjective[] = ["new_customers", "more_sales", "repeat_customers", "slow_days", "launch", "premium"];
const KINDS: RewardKind[] = ["percent", "fixed", "free_item", "bogo", "credit"];

interface Draft {
  merchantId: string;
  objective: CampaignObjective;
  kind: RewardKind;
  percent: number;
  amountKD: number;
  expiryHours: number;
  audience: "everyone" | "new" | "existing";
  market: "sender" | "recipient" | "both_win";
  feeKD: number;
  budgetKD: number;
}

const DEFAULT_DRAFT: Draft = {
  merchantId: "m_tropicfeel",
  objective: "new_customers",
  kind: "percent",
  percent: 20,
  amountKD: 3,
  expiryHours: 72,
  audience: "new",
  market: "sender",
  feeKD: 1.5,
  budgetKD: 300,
};

/** Objective → sensible defaults so most merchants never touch a number. */
function recommendFor(objective: CampaignObjective, base: Draft): Draft {
  switch (objective) {
    case "new_customers":
      return { ...base, objective, kind: "percent", percent: 20, audience: "new", expiryHours: 72, feeKD: 1.5 };
    case "repeat_customers":
      return { ...base, objective, kind: "credit", amountKD: 2, audience: "existing", expiryHours: 96, feeKD: 1 };
    case "slow_days":
      return { ...base, objective, kind: "bogo", audience: "everyone", expiryHours: 24, feeKD: 0.9 };
    case "launch":
      return { ...base, objective, kind: "percent", percent: 15, audience: "everyone", expiryHours: 48, feeKD: 1.2 };
    case "premium":
      return { ...base, objective, kind: "percent", percent: 15, audience: "everyone", expiryHours: 120, feeKD: 4 };
    default:
      return { ...base, objective: "more_sales", kind: "free_item", audience: "everyone", expiryHours: 72, feeKD: 1 };
  }
}

/** Deterministic "AI" generator: keywords → recommended campaign. */
function generateFromPrompt(prompt: string, base: Draft): Draft {
  const p = prompt.toLowerCase();
  let objective: CampaignObjective = "more_sales";
  if (/(new|first|acqui)/.test(p) || p.includes("جدد")) objective = "new_customers";
  else if (/(back|repeat|return|loyal)/.test(p) || p.includes("يرجع")) objective = "repeat_customers";
  else if (/(slow|monday|sunday|tuesday|weekday|quiet)/.test(p) || p.includes("هادي")) objective = "slow_days";
  else if (/(launch|new product|opening)/.test(p) || p.includes("افتتاح")) objective = "launch";
  else if (/(premium|vip|high)/.test(p)) objective = "premium";
  return recommendFor(objective, base);
}

function toSpec(d: Draft): RewardSpec {
  switch (d.kind) {
    case "percent":
      return { kind: "percent", valueBps: d.percent * 100, currency: "KWD" };
    case "fixed":
      return { kind: "fixed", amountMinor: fromMajor(d.amountKD), currency: "KWD" };
    case "credit":
      return { kind: "credit", amountMinor: fromMajor(d.amountKD), currency: "KWD" };
    case "free_item":
      return { kind: "free_item", itemKey: "coffee", currency: "KWD" };
    case "bogo":
      return { kind: "bogo", itemKey: "meal", currency: "KWD" };
  }
}

function toCampaignDraft(d: Draft): CampaignDraft {
  const spec = toSpec(d);
  return {
    merchantId: d.merchantId,
    name: rewardLabel(spec),
    objective: d.objective,
    reward: spec,
    recipientReward: d.market === "both_win" ? { kind: "fixed", amountMinor: fromMajor(2), currency: "KWD" } : undefined,
    recipientMerchantId: d.market === "both_win" ? "m_sarisari" : undefined,
    targeting: {
      audience: d.audience,
      eventTypes: ["remittance_completed", "salary_received", "bill_paid", "wallet_topup_completed"],
      market: d.market,
      amountBands: d.objective === "premium" ? ["250_500", "gt500"] : undefined,
      daysOfWeek: d.objective === "slow_days" ? [0, 1, 2, 3] : undefined,
      destinationCountries: d.market !== "sender" ? ["PH"] : undefined,
    },
    pricing:
      d.objective === "repeat_customers"
        ? { model: "cps", shareBps: 1_000 }
        : d.objective === "new_customers"
          ? { model: "cpr", feeMinor: fromMajor(d.feeKD) }
          : { model: "cpa", feeMinor: fromMajor(d.feeKD) },
    budgetTotalMinor: fromMajor(d.budgetKD),
    perCustomerCap: 3,
    expiryHours: d.expiryHours,
  };
}

export default function NewCampaignPage() {
  const { state, launch } = useNetwork();
  const merchants = state.merchants.filter((m) => m.markets.includes("KW"));
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [prompt, setPrompt] = useState("");
  const [launched, setLaunched] = useState<Campaign | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  if (launched) {
    return (
      <main className="screen mx-auto max-w-[560px]">
        <div className="card-elevated reveal-card mt-10 text-center">
          <h1 className="text-[24px] font-bold tracking-tight">{t("net.creator.liveTitle")}</h1>
          <p className="subtle mt-2">{t("net.creator.liveSub", { name: launched.name })}</p>
          <p className="micro mt-3">{t("net.creator.liveHint")}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/merchant" className="btn btn-primary w-full">
              {t("net.creator.backToDashboard")}
            </Link>
            <Link href="/rewards" className="btn btn-ghost w-full">
              {t("net.creator.tryAsCustomer")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="screen mx-auto max-w-[640px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight">{t("net.creator.title")}</h1>
        <span className="micro money">{step}/4</span>
      </div>

      {step === 1 ? (
        <>
          <div className="card-elevated mt-4">
            <span className="eyebrow">{t("net.creator.aiTitle")}</span>
            <p className="micro mt-1">{t("net.creator.aiHint")}</p>
            <textarea
              className="input mt-3"
              rows={2}
              value={prompt}
              placeholder={t("net.creator.aiPlaceholder")}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              className="btn btn-quiet mt-3"
              disabled={prompt.trim().length < 4}
              onClick={() => {
                setDraft(generateFromPrompt(prompt, draft));
                setStep(4);
              }}
            >
              {t("net.creator.aiGenerate")}
            </button>
          </div>

          <h2 className="section-title mb-3 mt-6">{t("net.creator.goal")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {OBJECTIVES.map((o) => (
              <button
                key={o}
                className="card text-start"
                style={draft.objective === o ? { borderColor: "var(--accent)" } : undefined}
                onClick={() => {
                  setDraft(recommendFor(o, draft));
                  setStep(2);
                }}
              >
                <span className="block font-semibold">{t(`net.objective.${o}`)}</span>
                <span className="micro mt-1 block">{t(`net.objective.${o}.hint`)}</span>
              </button>
            ))}
          </div>
          <label className="mt-5 block">
            <span className="micro">{t("net.creator.forMerchant")}</span>
            <select className="input mt-1" value={draft.merchantId} onChange={(e) => set({ merchantId: e.target.value })}>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2 className="section-title mb-3 mt-6">{t("net.creator.offer")}</h2>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k}
                className="chip"
                aria-pressed={draft.kind === k}
                style={draft.kind === k ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
                onClick={() => set({ kind: k })}
              >
                {t(`net.kind.${k}`)}
              </button>
            ))}
          </div>
          {draft.kind === "percent" ? (
            <div className="card mt-4">
              <div className="flex items-baseline justify-between">
                <span className="subtle">{t("net.creator.discount")}</span>
                <span className="stat-value money">{draft.percent}%</span>
              </div>
              <input type="range" min={5} max={50} step={5} value={draft.percent} onChange={(e) => set({ percent: Number(e.target.value) })} />
            </div>
          ) : draft.kind === "fixed" || draft.kind === "credit" ? (
            <div className="card mt-4">
              <div className="flex items-baseline justify-between">
                <span className="subtle">{t("net.creator.value")}</span>
                <span className="stat-value money">{money(fromMajor(draft.amountKD))}</span>
              </div>
              <input type="range" min={1} max={10} step={0.5} value={draft.amountKD} onChange={(e) => set({ amountKD: Number(e.target.value) })} />
            </div>
          ) : null}
          <div className="card mt-3">
            <div className="flex items-baseline justify-between">
              <span className="subtle">{t("net.creator.expiry")}</span>
              <span className="subtle money">{draft.expiryHours}h</span>
            </div>
            <input type="range" min={24} max={168} step={24} value={draft.expiryHours} onChange={(e) => set({ expiryHours: Number(e.target.value) })} />
            <p className="micro mt-1">{t("net.creator.expiryHint")}</p>
          </div>
          <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2 className="section-title mb-3 mt-6">{t("net.creator.audience")}</h2>
          <div className="flex flex-col gap-2">
            {(["everyone", "new", "existing"] as const).map((a) => (
              <button
                key={a}
                className="card text-start"
                style={draft.audience === a ? { borderColor: "var(--accent)" } : undefined}
                onClick={() => set({ audience: a })}
              >
                <span className="font-semibold">{t(`net.audience.${a}`)}</span>
              </button>
            ))}
          </div>
          <h2 className="section-title mb-3 mt-6">{t("net.creator.whereRedeemed")}</h2>
          <div className="flex flex-wrap gap-2">
            {(["sender", "recipient", "both_win"] as const).map((m) => (
              <button
                key={m}
                className="chip"
                aria-pressed={draft.market === m}
                style={draft.market === m ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
                onClick={() => set({ market: m })}
              >
                {t(`net.market.${m}`)}
              </button>
            ))}
          </div>
          <p className="micro mt-2">{t("net.creator.marketHint")}</p>
          <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <h2 className="section-title mb-3 mt-6">{t("net.creator.review")}</h2>
          <div className="card-elevated">
            <p className="text-[20px] font-semibold">{rewardLabel(toSpec(draft))}</p>
            <p className="subtle mt-1">
              {merchants.find((m) => m.id === draft.merchantId)?.name} · {t(`net.objective.${draft.objective}`)} ·{" "}
              {t(`net.audience.${draft.audience}`)} · {t(`net.market.${draft.market}`)}
            </p>
            <div className="ticket-divider" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <label>
                <span className="micro">{t("net.creator.budget")}</span>
                <input
                  type="number"
                  min={50}
                  className="input mt-1"
                  style={{ width: 130 }}
                  value={draft.budgetKD}
                  onChange={(e) => set({ budgetKD: Math.max(0, Number(e.target.value)) })}
                />
              </label>
              <label>
                <span className="micro">{t("net.creator.fee")}</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  className="input mt-1"
                  style={{ width: 130 }}
                  value={draft.feeKD}
                  onChange={(e) => set({ feeKD: Math.max(0, Number(e.target.value)) })}
                />
              </label>
            </div>
            <p className="micro mt-3">{t("net.creator.payNote")}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={() => setStep(1)}>
              {t("net.creator.edit")}
            </button>
            <button className="btn btn-primary flex-1" onClick={() => setLaunched(launch(toCampaignDraft(draft)))}>
              {t("net.creator.launch")}
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="mt-5 flex gap-2">
      <button className="btn btn-ghost flex-1" onClick={onBack}>
        {t("net.common.back")}
      </button>
      <button className="btn btn-primary flex-1" onClick={onNext}>
        {t("common.next")}
      </button>
    </div>
  );
}
