"use client";

/**
 * Investor mode — concise and visual: problem, solution, model, flywheel,
 * moat, expansion, plus the interactive unit-economics simulator.
 */
import Link from "next/link";
import { useState } from "react";
import { money, t } from "../../lib/i18n";
import { divideMinor, fromMajor } from "../../lib/money";
import { useNetwork } from "../components/network/NetworkProvider";

export default function InvestorPage() {
  useNetwork(); // re-render on locale change
  return (
    <main className="screen">
      <h1 className="text-[26px] font-bold tracking-tight">{t("net.investor.title")}</h1>
      <p className="subtle mt-2 max-w-[640px]">{t("net.investor.sub")}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <span className="eyebrow">{t("net.investor.problem")}</span>
          <p className="subtle mt-2">{t("net.investor.problemBody")}</p>
        </div>
        <div className="card">
          <span className="eyebrow">{t("net.investor.solution")}</span>
          <p className="subtle mt-2">{t("net.investor.solutionBody")}</p>
        </div>
        <div className="card">
          <span className="eyebrow">{t("net.investor.model")}</span>
          <p className="subtle mt-2">{t("net.investor.modelBody")}</p>
        </div>
        <div className="card">
          <span className="eyebrow">{t("net.investor.moat")}</span>
          <p className="subtle mt-2">{t("net.investor.moatBody")}</p>
        </div>
      </div>

      <div className="card mt-4">
        <span className="eyebrow">{t("net.investor.flywheel")}</span>
        <div className="flow-row mt-3 justify-center">
          {(["institutions", "consumers", "merchants", "rewards"] as const).map((s, i) => (
            <span key={s} className="flow-row">
              {i > 0 ? (
                <span className="flow-arrow" aria-hidden>
                  →
                </span>
              ) : null}
              <span className="flow-step">{t(`net.investor.loop.${s}`)}</span>
            </span>
          ))}
          <span className="flow-arrow" aria-hidden>
            ↻
          </span>
        </div>
      </div>

      <Simulator />

      <div className="card mt-4">
        <span className="eyebrow">{t("net.investor.expansion")}</span>
        <p className="subtle mt-2">{t("net.investor.expansionBody")}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/pitch" className="btn btn-primary">
          {t("net.investor.readPitches")}
        </Link>
        <Link href="/network" className="btn btn-ghost">
          {t("net.investor.seeDemo")}
        </Link>
      </div>
      <p className="micro mt-6">{t("net.investor.disclaimer")}</p>
    </main>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="micro">{label}</span>
        <span className="subtle money">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Simulator() {
  const [events, setEvents] = useState(100_000);
  const [exposurePct, setExposurePct] = useState(60);
  const [selectionPct, setSelectionPct] = useState(55);
  const [redemptionPct, setRedemptionPct] = useState(45);
  const [feeFils, setFeeFils] = useState(fromMajor(1.2));
  const [purchaseFils, setPurchaseFils] = useState(fromMajor(12));
  const [saasFils, setSaasFils] = useState(fromMajor(2_000));

  const served = Math.round((events * exposurePct) / 100);
  const selected = Math.round((served * selectionPct) / 100);
  const redeemed = Math.round((selected * redemptionPct) / 100);
  const merchantSalesMinor = redeemed * purchaseFils;
  const feeRevenueMinor = redeemed * feeFils;
  const oneRevenueMinor = feeRevenueMinor + saasFils;
  const revenuePerEventMinor = events > 0 ? divideMinor(oneRevenueMinor, events, "round") : 0;

  return (
    <div className="card-elevated mt-4">
      <span className="eyebrow">{t("net.investor.simulator")}</span>
      <p className="micro mt-1">{t("net.investor.simulatorHint")}</p>
      <div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
        <Slider label={t("net.investor.inEvents")} value={events} onChange={setEvents} min={10_000} max={1_000_000} step={10_000} format={(v) => v.toLocaleString("en")} />
        <Slider label={t("net.investor.inExposure")} value={exposurePct} onChange={setExposurePct} min={10} max={100} step={5} format={(v) => `${v}%`} />
        <Slider label={t("net.investor.inSelection")} value={selectionPct} onChange={setSelectionPct} min={10} max={100} step={5} format={(v) => `${v}%`} />
        <Slider label={t("net.investor.inRedemption")} value={redemptionPct} onChange={setRedemptionPct} min={10} max={100} step={5} format={(v) => `${v}%`} />
        <Slider label={t("net.investor.inFee")} value={feeFils} onChange={setFeeFils} min={fromMajor(0.2)} max={fromMajor(5)} step={100} format={(v) => money(v)} />
        <Slider label={t("net.investor.inPurchase")} value={purchaseFils} onChange={setPurchaseFils} min={fromMajor(2)} max={fromMajor(60)} step={500} format={(v) => money(v)} />
        <Slider label={t("net.investor.inSaas")} value={saasFils} onChange={setSaasFils} min={0} max={fromMajor(10_000)} step={fromMajor(500)} format={(v) => money(v)} />
      </div>
      <div className="ticket-divider" />
      <div className="stat-grid">
        <div>
          <div className="micro">{t("net.investor.outRedemptions")}</div>
          <div className="stat-value money mt-1">{redeemed.toLocaleString("en")}</div>
        </div>
        <div>
          <div className="micro">{t("net.investor.outSales")}</div>
          <div className="stat-value money mt-1" style={{ color: "var(--positive)" }}>
            {money(merchantSalesMinor, "KWD")}
          </div>
        </div>
        <div>
          <div className="micro">{t("net.investor.outRevenue")}</div>
          <div className="stat-value money mt-1">{money(oneRevenueMinor)}</div>
        </div>
        <div>
          <div className="micro">{t("net.investor.outPerEvent")}</div>
          <div className="stat-value money mt-1">{money(revenuePerEventMinor)}</div>
        </div>
      </div>
      <p className="micro mt-3">{t("net.investor.simDisclaimer")}</p>
    </div>
  );
}
