"use client";

/**
 * Pitch ONE — the 10/30/60-second pitches plus the merchant and institution
 * sales stories, with the merchant ROI calculator (clearly an estimate).
 */
import Link from "next/link";
import { useState } from "react";
import { money, t } from "../../lib/i18n";
import { divideMinor, fromMajor } from "../../lib/money";
import { useNetwork } from "../components/network/NetworkProvider";

type Tab = "s10" | "s30" | "s60" | "merchant" | "institution";
const TABS: Tab[] = ["s10", "s30", "s60", "merchant", "institution"];

export default function PitchPage() {
  useNetwork(); // re-render on locale change
  const [tab, setTab] = useState<Tab>("s30");

  return (
    <main className="screen mx-auto max-w-[720px]">
      <h1 className="text-[26px] font-bold tracking-tight">{t("net.pitch.title")}</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className="chip"
            style={tab === k ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
            onClick={() => setTab(k)}
          >
            {t(`net.pitch.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === "s10" || tab === "s30" || tab === "s60" ? (
        <div className="card-elevated mt-5">
          <span className="eyebrow">{t(`net.pitch.tab.${tab}`)}</span>
          <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed">{t(`net.pitch.${tab}`)}</p>
        </div>
      ) : null}

      {tab === "merchant" ? (
        <>
          <div className="card-elevated mt-5">
            <h2 className="text-[22px] font-bold leading-snug tracking-tight">{t("net.pitch.merchantHead")}</h2>
            <p className="subtle mt-3">{t("net.pitch.merchantBody")}</p>
            <div className="flow-row mt-4">
              {(["moment", "one", "offer", "customer", "sale"] as const).map((s, i) => (
                <span key={s} className="flow-row">
                  {i > 0 ? (
                    <span className="flow-arrow" aria-hidden>
                      →
                    </span>
                  ) : null}
                  <span className="flow-step">{t(`net.pitch.mflow.${s}`)}</span>
                </span>
              ))}
            </div>
          </div>
          <RoiCalculator />
          <Link href="/merchant/new" className="btn btn-primary mt-4 w-full">
            {t("net.pitch.merchantCta")}
          </Link>
        </>
      ) : null}

      {tab === "institution" ? (
        <>
          <div className="card-elevated mt-5">
            <h2 className="text-[22px] font-bold leading-snug tracking-tight">{t("net.pitch.instHead")}</h2>
            <p className="subtle mt-3">{t("net.pitch.instBody")}</p>
            <div className="flow-row mt-4">
              {(["tx", "one", "reward", "happy", "repeat"] as const).map((s, i) => (
                <span key={s} className="flow-row">
                  {i > 0 ? (
                    <span className="flow-arrow" aria-hidden>
                      →
                    </span>
                  ) : null}
                  <span className="flow-step">{t(`net.pitch.iflow.${s}`)}</span>
                </span>
              ))}
            </div>
            <p className="micro mt-4">{t("net.pitch.instLevels")}</p>
          </div>
          <Link href="/institution" className="btn btn-primary mt-4 w-full">
            {t("net.pitch.instCta")}
          </Link>
        </>
      ) : null}
    </main>
  );
}

function RoiCalculator() {
  const [budgetFils, setBudgetFils] = useState(fromMajor(1_000));
  const [cpaFils, setCpaFils] = useState(fromMajor(2));
  const [purchaseFils, setPurchaseFils] = useState(fromMajor(30));

  const customers = cpaFils > 0 ? divideMinor(budgetFils, cpaFils, "floor") : 0;
  const revenueMinor = customers * purchaseFils;

  return (
    <div className="card mt-4">
      <span className="eyebrow">{t("net.pitch.roiTitle")}</span>
      <div className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-3">
        {(
          [
            ["net.pitch.roiBudget", budgetFils, setBudgetFils, fromMajor(100), fromMajor(5_000), fromMajor(100)],
            ["net.pitch.roiCpa", cpaFils, setCpaFils, fromMajor(0.5), fromMajor(10), fromMajor(0.5)],
            ["net.pitch.roiPurchase", purchaseFils, setPurchaseFils, fromMajor(5), fromMajor(100), fromMajor(5)],
          ] as const
        ).map(([key, value, set, min, max, step]) => (
          <label key={key} className="block">
            <span className="flex items-baseline justify-between">
              <span className="micro">{t(key)}</span>
              <span className="subtle money">{money(value)}</span>
            </span>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} />
          </label>
        ))}
      </div>
      <div className="ticket-divider" />
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <span>
          <span className="micro block">{t("net.pitch.roiCustomers")}</span>
          <span className="stat-value money">{customers.toLocaleString("en")}</span>
        </span>
        <span>
          <span className="micro block">{t("net.pitch.roiRevenue")}</span>
          <span className="stat-value money" style={{ color: "var(--positive)" }}>
            {money(revenueMinor)}
          </span>
        </span>
      </div>
      <p className="micro mt-3">{t("net.pitch.roiDisclaimer")}</p>
    </div>
  );
}
