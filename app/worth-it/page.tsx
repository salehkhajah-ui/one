"use client";

import { useState } from "react";
import { track } from "../../lib/analytics";
import type { WorthItResult } from "../../lib/engine/worthIt";
import { currencyUnitLabel, formatDateShort, money } from "../../lib/i18n";
import { fromMajor } from "../../lib/money";
import { useApp } from "../components/AppProvider";
import { Disclaimer, Money, SectionHeader } from "../components/ui";

export default function WorthItPage() {
  const state = useApp();
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [result, setResult] = useState<WorthItResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function evaluate() {
    const parsed = Number(price);
    if (!item.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Add the item and a price above zero — then ONE can run the numbers.");
      setResult(null);
      return;
    }
    setError(null);
    setResult(state.evaluatePurchase(item.trim(), fromMajor(parsed)));
    track("worth_it_used");
  }

  const verdictBadge: Record<WorthItResult["verdict"], { label: string; color: string }> = {
    yes_enjoy: { label: "Yes — guilt-free", color: "var(--positive)" },
    yes_discretionary: { label: "Yes — with trade-offs", color: "var(--caution)" },
    delay_helps: { label: "Waiting helps", color: "var(--caution)" },
    protected_at_risk: { label: "Would touch protected money", color: "var(--caution)" },
  };

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          Worth it?
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">Run a purchase through your plan</h1>
        <p className="subtle mt-1">No judgment — just what actually changes.</p>
      </header>

      <section className="card mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="micro font-semibold">What is it?</span>
          <input
            className="input"
            placeholder="New phone, weekend trip, sneakers…"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            maxLength={60}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="micro font-semibold">Price ({currencyUnitLabel(state.currency)})</span>
          <input
            className="input money"
            placeholder="300"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && evaluate()}
          />
        </label>
        {error && (
          <p className="subtle" style={{ color: "var(--caution)" }}>
            {error}
          </p>
        )}
        <button className="btn btn-primary w-full" onClick={evaluate}>
          Check it
        </button>
      </section>

      {result && (
        <>
          <SectionHeader title="The answer" />
          <section className="card-elevated">
            <span
              className="chip cursor-default"
              style={{ color: verdictBadge[result.verdict].color, borderColor: verdictBadge[result.verdict].color }}
            >
              {verdictBadge[result.verdict].label}
            </span>
            <p className="mt-3 text-[15px] leading-relaxed">{result.headline}</p>
          </section>

          <SectionHeader title="Impact" />
          <section className="card flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="subtle">Safe to Spend / day</span>
              <span className="text-[14px] font-semibold money">
                {money(result.dailySafeToSpendBeforeMinor)} → {money(result.dailySafeToSpendAfterMinor)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="subtle">Protected money touched</span>
              <span
                className="text-[14px] font-semibold"
                style={{ color: result.affordableWithoutProtected ? "var(--positive)" : "var(--caution)" }}
              >
                {result.affordableWithoutProtected ? "No" : "Yes"}
              </span>
            </div>
            {result.goalDelayDays !== null && result.goalName && (
              <div className="flex justify-between">
                <span className="subtle">{result.goalName}</span>
                <span className="text-[14px] font-semibold">delayed ~{result.goalDelayDays} days</span>
              </div>
            )}
            {result.growReductionMinor > 0 && (
              <div className="flex justify-between">
                <span className="subtle">Grow this month</span>
                <span className="text-[14px] font-semibold">
                  −<Money minor={result.growReductionMinor} />
                </span>
              </div>
            )}
            {result.suggestedDateISO && (
              <div className="flex justify-between">
                <span className="subtle">Healthier timing</span>
                <span className="text-[14px] font-semibold" style={{ color: "var(--positive)" }}>
                  {formatDateShort(result.suggestedDateISO)}
                </span>
              </div>
            )}
          </section>

          <SectionHeader title="Your options" />
          <div className="flex flex-col gap-3">
            {result.alternatives.map((a) => (
              <section key={a.key} className="card" style={{ padding: 14 }}>
                <div className="text-[14.5px] font-bold">{a.label}</div>
                <p className="subtle mt-1">{a.detail}</p>
              </section>
            ))}
          </div>
          <Disclaimer>Whatever you choose is yours to make — ONE just shows the trade-offs.</Disclaimer>
        </>
      )}
    </main>
  );
}
