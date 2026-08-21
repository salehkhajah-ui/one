"use client";

import { useState } from "react";
import { track } from "../../lib/analytics";
import type { WorthItResult } from "../../lib/engine/worthIt";
import { currencyUnitLabel, formatDateShort, money, t } from "../../lib/i18n";
import { fromMajor } from "../../lib/money";
import { useApp } from "../components/AppProvider";
import { worthItAlternative, worthItHeadline } from "../components/text";
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
      setError(t("wi.error"));
      setResult(null);
      return;
    }
    setError(null);
    setResult(state.evaluatePurchase(item.trim(), fromMajor(parsed)));
    track("worth_it_used");
  }

  const verdictColor: Record<WorthItResult["verdict"], string> = {
    yes_enjoy: "var(--positive)",
    yes_discretionary: "var(--caution)",
    delay_helps: "var(--caution)",
    protected_at_risk: "var(--caution)",
  };

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          {t("wi.eyebrow")}
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("wi.title")}</h1>
        <p className="subtle mt-1">{t("wi.subtitle")}</p>
      </header>

      <section className="card mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="micro font-semibold">{t("wi.what")}</span>
          <input
            className="input"
            placeholder={t("wi.whatPlaceholder")}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            maxLength={60}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="micro font-semibold">{t("wi.price", { unit: currencyUnitLabel(state.currency) })}</span>
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
          {t("wi.check")}
        </button>
      </section>

      {result && (
        <>
          <SectionHeader title={t("wi.answer")} />
          <section className="card-elevated">
            <span
              className="chip cursor-default"
              style={{ color: verdictColor[result.verdict], borderColor: verdictColor[result.verdict] }}
            >
              {t(`wi.v.${result.verdict}`)}
            </span>
            <p className="mt-3 text-[15px] leading-relaxed">{worthItHeadline(result)}</p>
          </section>

          <SectionHeader title={t("wi.impact")} />
          <section className="card flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="subtle">{t("wi.stsPerDay")}</span>
              <span className="text-[14px] font-semibold money" dir="ltr">
                {money(result.dailySafeToSpendBeforeMinor)} → {money(result.dailySafeToSpendAfterMinor)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="subtle">{t("wi.protectedTouched")}</span>
              <span
                className="text-[14px] font-semibold"
                style={{ color: result.affordableWithoutProtected ? "var(--positive)" : "var(--caution)" }}
              >
                {result.affordableWithoutProtected ? t("wi.no") : t("wi.yes")}
              </span>
            </div>
            {result.goalDelayDays !== null && result.goalName && (
              <div className="flex justify-between">
                <span className="subtle">{result.goalName}</span>
                <span className="text-[14px] font-semibold">{t("wi.delayedBy", { n: result.goalDelayDays })}</span>
              </div>
            )}
            {result.growReductionMinor > 0 && (
              <div className="flex justify-between">
                <span className="subtle">{t("wi.growThisMonth")}</span>
                <span className="text-[14px] font-semibold">
                  −<Money minor={result.growReductionMinor} />
                </span>
              </div>
            )}
            {result.suggestedDateISO && (
              <div className="flex justify-between">
                <span className="subtle">{t("wi.betterTiming")}</span>
                <span className="text-[14px] font-semibold" style={{ color: "var(--positive)" }}>
                  {formatDateShort(result.suggestedDateISO)}
                </span>
              </div>
            )}
          </section>

          <SectionHeader title={t("wi.options")} />
          <div className="flex flex-col gap-3">
            {result.alternatives.map((a) => {
              const alt = worthItAlternative(a, result, state.nextPaydayISO);
              return (
                <section key={a.key} className="card" style={{ padding: 14 }}>
                  <div className="text-[14.5px] font-bold">{alt.label}</div>
                  <p className="subtle mt-1">{alt.detail}</p>
                </section>
              );
            })}
          </div>
          <Disclaimer>{t("wi.choiceNote")}</Disclaimer>
        </>
      )}
    </main>
  );
}
