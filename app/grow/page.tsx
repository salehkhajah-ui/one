"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "../../lib/analytics";
import { buildGrowPaths } from "../../lib/engine/growPaths";
import { calculateCompoundProjection, SCENARIOS } from "../../lib/engine/projection";
import { amount, moneyCompact, money, t } from "../../lib/i18n";
import type { StringKey } from "../../lib/i18n-strings";
import { fromMajor } from "../../lib/money";
import { useApp } from "../components/AppProvider";
import { Disclaimer, Money, SectionHeader, Why } from "../components/ui";

const PATH_KEYS: Record<
  "protect_first" | "index_investing" | "capital_stable",
  { title: StringKey; summary: StringKey; steps: StringKey[]; reason: StringKey; rangeKeys: StringKey[] }
> = {
  protect_first: {
    title: "gp.protect_first.title",
    summary: "gp.protect_first.summary",
    steps: ["gp.protect_first.s1", "gp.protect_first.s2", "gp.protect_first.s3"],
    reason: "gp.protect_first.reason",
    rangeKeys: [],
  },
  index_investing: {
    title: "gp.index.title",
    summary: "gp.index.summary",
    steps: ["gp.index.s1", "gp.index.s2", "gp.index.s3", "gp.index.s4"],
    reason: "gp.index.reason",
    rangeKeys: ["gp.range.a1", "gp.range.a2", "gp.range.a3"],
  },
  capital_stable: {
    title: "gp.stable.title",
    summary: "gp.stable.summary",
    steps: ["gp.stable.s1", "gp.stable.s2", "gp.stable.s3"],
    reason: "gp.stable.reason",
    rangeKeys: ["gp.range.d1", "gp.range.d2", "gp.range.d3"],
  },
};

const SCENARIO_COLORS: Record<string, string> = {
  conservative: "var(--grow-1)",
  base: "var(--grow-2)",
  optimistic: "var(--grow-3)",
};

export default function GrowPage() {
  const state = useApp();
  const [monthly, setMonthly] = useState(state.growMonthlyMinor);

  useEffect(() => {
    track("grow_projection_viewed");
  }, []);

  const horizons = [5, 10, 20];
  const table = useMemo(
    () =>
      horizons.map((years) => ({
        years,
        values: SCENARIOS.map((s) => calculateCompoundProjection(0, monthly, years, s)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthly],
  );
  const futureMe = useMemo(
    () => calculateCompoundProjection(0, monthly, 20, SCENARIOS.find((s) => s.key === "base")!),
    [monthly],
  );
  const paths = useMemo(
    () =>
      buildGrowPaths({
        currency: "KWD",
        growMonthlyMinor: monthly,
        emergency: state.emergency,
        riskPreference: state.profile.riskPreference,
      }),
    [monthly, state.emergency, state.profile.riskPreference],
  );

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          {t("grow.eyebrow")}
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("grow.title")}</h1>
        <p className="subtle mt-1">{t("grow.subtitle")}</p>
      </header>

      <section className="card-elevated mt-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="eyebrow">{t("grow.monthlyToGrow")}</div>
            <div className="mt-1 text-[30px] font-bold money">
              <Money minor={monthly} />
            </div>
          </div>
          <div className="text-right">
            <div className="micro">{t("grow.oneRecommends")}</div>
            <Money minor={state.growMonthlyMinor} className="text-[15px] font-semibold" />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={fromMajor(300)}
          step={fromMajor(5)}
          value={monthly}
          aria-label="Monthly Grow contribution"
          onChange={(e) => setMonthly(Number(e.target.value))}
        />
        <p className="micro">{t("grow.sliderNote")}</p>
      </section>

      <SectionHeader title={t("grow.hypoGrowth")} />
      <section className="card">
        <ProjectionChart monthlyMinor={monthly} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {SCENARIOS.map((s) => (
            <span key={s.key} className="micro flex items-center gap-1.5">
              <span className="bucket-dot" style={{ background: SCENARIO_COLORS[s.key] }} />
              {t(`grow.${s.key}` as StringKey)} {s.annualReturnPct}%
            </span>
          ))}
        </div>
        <div className="divider my-4" />
        <table className="w-full text-[13.5px]" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr className="micro text-left">
              <th className="font-medium pb-2">{t("grow.horizon")}</th>
              {SCENARIOS.map((s) => (
                <th key={s.key} className="font-medium pb-2 text-right">
                  {t(`grow.${s.key}` as StringKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.years} style={{ borderTop: "1px solid var(--hairline)" }}>
                <td className="py-2 subtle">{t("grow.years", { n: row.years })}</td>
                {row.values.map((v) => (
                  <td key={v.scenario.key} className="py-2 text-right font-semibold">
                    {moneyCompact(v.futureValueMinor)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Why summary={t("grow.assumptions")}>
          {futureMe.assumptions.map((a) => (
            <span key={a}>{a} </span>
          ))}
        </Why>
      </section>

      <SectionHeader title={t("grow.futureMe")} />
      <section className="card">
        <p className="subtle">
          {t("grow.futureMeBody", {
            monthly: money(monthly),
            contributed: money(futureMe.totalContributedMinor),
            value: money(futureMe.futureValueMinor),
          })}
        </p>
        <Disclaimer>{t("grow.futureMeDisclaimer")}</Disclaimer>
      </section>

      {/* Grow Paths — educational pathways with honest one-year ranges */}
      <SectionHeader title={t("grow.ways")} />
      <div className="flex flex-col gap-3">
        {paths.map((p) => (
          <section key={p.key} className="card">
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                {p.emoji}
              </span>
              <div className="text-[15px] font-bold">{t(PATH_KEYS[p.key].title)}</div>
            </div>
            <p className="subtle mt-2">
              {t(PATH_KEYS[p.key].summary, {
                stage: state.emergency.stageLabel,
                gap: money(state.emergency.stageGapMinor),
                monthly: money(monthly),
              })}
            </p>
            {p.range && (
              <div className="card mt-3" style={{ padding: 12, background: "color-mix(in oklab, var(--accent) 4%, var(--card))" }}>
                <div className="micro font-semibold uppercase tracking-widest">{t("grow.afterOneYear")}</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="money text-[17px] font-bold">{money(p.range.lowMinor)}</span>
                  <span className="micro">{t("common.to")}</span>
                  <span className="money text-[17px] font-bold" style={{ color: "var(--positive)" }}>
                    {money(p.range.highMinor)}
                  </span>
                </div>
                <div className="micro mt-1">
                  {t("grow.onContributed", {
                    amount: money(p.range.contributedMinor),
                    mid: money(p.range.midMinor),
                    low: p.range.lowRatePct,
                    high: p.range.highRatePct,
                  })}
                </div>
                <Why summary={t("grow.assumptions")}>
                  {PATH_KEYS[p.key].rangeKeys.map((k) => (
                    <span key={k}>{t(k)} </span>
                  ))}
                </Why>
              </div>
            )}
            <ol className="mt-3 flex flex-col gap-1.5">
              {PATH_KEYS[p.key].steps.map((k, i) => (
                <li key={k} className="subtle flex gap-2">
                  <span className="micro font-bold" style={{ color: "var(--accent)", minWidth: 14 }}>
                    {i + 1}
                  </span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ol>
            <p className="micro mt-3">
              {t("grow.whyPath")} {t(PATH_KEYS[p.key].reason)}
            </p>
          </section>
        ))}
      </div>

      <SectionHeader title={t("grow.beforeTrusting")} />
      <section className="card">
        <div className="micro font-semibold uppercase tracking-widest" style={{ color: "var(--positive)" }}>
          {t("grow.trustCriteria")}
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {(["gp.trust.1", "gp.trust.2", "gp.trust.3", "gp.trust.4"] as const).map((k) => (
            <li key={k} className="subtle flex gap-2">
              <span aria-hidden>✓</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
        <div className="divider my-4" />
        <div className="micro font-semibold uppercase tracking-widest" style={{ color: "var(--caution)" }}>
          {t("grow.walkAway")}
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {(["gp.flag.1", "gp.flag.2", "gp.flag.3", "gp.flag.4"] as const).map((k) => (
            <li key={k} className="subtle flex gap-2">
              <span aria-hidden>✕</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      </section>
      <Disclaimer>{t("grow.pathsDisclaimer")}</Disclaimer>
    </main>
  );
}

/**
 * Scenario projection chart — 3 ordered lines (one hue, light→dark), thin marks,
 * crosshair tooltip on hover/drag, recessive grid. Values are hypothetical.
 */
function ProjectionChart({ monthlyMinor }: { monthlyMinor: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  const W = 340;
  const H = 180;
  const PAD_L = 8;
  const PAD_R = 46;
  const PAD_T = 10;
  const PAD_B = 22;
  const YEARS = 20;

  const series = useMemo(
    () =>
      SCENARIOS.map((s) => ({
        scenario: s,
        points: Array.from({ length: YEARS + 1 }, (_, y) => ({
          year: y,
          value: calculateCompoundProjection(0, monthlyMinor, y, s).futureValueMinor,
        })),
      })),
    [monthlyMinor],
  );

  const maxV = Math.max(1, ...series.map((s) => s.points[YEARS].value));
  const x = (year: number) => PAD_L + (year / YEARS) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - v / maxV) * (H - PAD_T - PAD_B);

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const year = Math.round(((px - PAD_L) / (W - PAD_L - PAD_R)) * YEARS);
    setHoverYear(Math.max(0, Math.min(YEARS, year)));
  }

  const gridValues = [0.25, 0.5, 0.75, 1].map((f) => maxV * f);

  return (
    <div className="relative" dir="ltr">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Hypothetical growth of ${money(monthlyMinor)} monthly over 20 years across three scenarios`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverYear(null)}
      >
        {gridValues.map((v) => (
          <line key={v} x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--hairline)" strokeWidth="1" />
        ))}
        {[0, 5, 10, 15, 20].map((yr) => (
          <text key={yr} x={x(yr)} y={H - 6} fontSize="9" fill="var(--text-3)" textAnchor="middle">
            {yr === 0 ? "now" : `${yr}y`}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.scenario.key}>
            <path
              d={s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={SCENARIO_COLORS[s.scenario.key]}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <text
              x={W - PAD_R + 4}
              y={y(s.points[YEARS].value) + 3}
              fontSize="9"
              fontWeight="600"
              fill={SCENARIO_COLORS[s.scenario.key]}
            >
              {amount(s.points[YEARS].value, "KWD", true)}
            </text>
          </g>
        ))}
        {hoverYear !== null && (
          <g>
            <line x1={x(hoverYear)} x2={x(hoverYear)} y1={PAD_T} y2={H - PAD_B} stroke="var(--hairline-strong)" strokeWidth="1" />
            {series.map((s) => (
              <circle
                key={s.scenario.key}
                cx={x(hoverYear)}
                cy={y(s.points[hoverYear].value)}
                r="4"
                fill={SCENARIO_COLORS[s.scenario.key]}
                stroke="var(--card)"
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>
      {hoverYear !== null && (
        <div
          className="card absolute top-0 pointer-events-none"
          style={{
            padding: "8px 12px",
            insetInlineStart: hoverYear > 12 ? undefined : "12%",
            insetInlineEnd: hoverYear > 12 ? "18%" : undefined,
          }}
        >
          <div className="micro font-semibold">{hoverYear === 0 ? "Now" : `${hoverYear} years`}</div>
          {series.map((s) => (
            <div key={s.scenario.key} className="micro flex items-center gap-1.5">
              <span className="bucket-dot" style={{ background: SCENARIO_COLORS[s.scenario.key] }} />
              {moneyCompact(s.points[hoverYear].value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
