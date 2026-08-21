"use client";

import { useMemo, useRef, useState } from "react";
import type { CashFlowForecast } from "../../lib/engine/forecast";
import { amount, formatDateShort, money, t } from "../../lib/i18n";
import { Why } from "./ui";

/**
 * 30-day balance projection — single-series line with the safety buffer as a
 * labeled threshold, crosshair tooltip, and event markers (salary/bills).
 */
export function ForecastCard({ forecast, basis, currency }: { forecast: CashFlowForecast; basis: string; currency: "KWD" }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 340;
  const H = 140;
  const PAD_L = 8;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 20;

  const { points, bufferMinor, minMinor, firstBelowBufferISO } = forecast;
  const maxV = Math.max(...points.map((p) => p.balanceMinor), bufferMinor);
  const minV = Math.min(...points.map((p) => p.balanceMinor), bufferMinor, 0);
  const span = Math.max(1, maxV - minV);

  const x = (i: number) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - (v - minV) / span) * (H - PAD_T - PAD_B);

  const path = useMemo(
    () => points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.balanceMinor).toFixed(1)}`).join(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points],
  );

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD_L) / (W - PAD_L - PAD_R)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  const hovered = hover !== null ? points[hover] : null;

  return (
    <section className="card">
      <div className="relative" dir="ltr">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          role="img"
          aria-label={`Projected balance over the next 30 days; lowest point ${money(minMinor, currency)}`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* buffer threshold */}
          <line x1={PAD_L} x2={W - PAD_R} y1={y(bufferMinor)} y2={y(bufferMinor)} stroke="var(--caution)" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
          <text x={W - PAD_R} y={y(bufferMinor) - 4} fontSize="8.5" fill="var(--caution)" textAnchor="end">
            {t("forecast.buffer", { amount: amount(bufferMinor, currency, true) })}
          </text>
          {/* projected balance */}
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          {/* event ticks (salary/bills) */}
          {points.map((p, i) =>
            p.events.length > 0 ? (
              <circle
                key={p.dateISO}
                cx={x(i)}
                cy={y(p.balanceMinor)}
                r="3"
                fill={p.events.some((e) => e.direction === "in") ? "var(--positive)" : "var(--text-3)"}
                stroke="var(--card)"
                strokeWidth="1.5"
              />
            ) : null,
          )}
          {/* axis labels */}
          <text x={PAD_L} y={H - 6} fontSize="8.5" fill="var(--text-3)">
            {t("forecast.tomorrow")}
          </text>
          <text x={W - PAD_R} y={H - 6} fontSize="8.5" fill="var(--text-3)" textAnchor="end">
            {t("forecast.plus30")}
          </text>
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={H - PAD_B} stroke="var(--hairline-strong)" strokeWidth="1" />
              <circle cx={x(hover)} cy={y(points[hover].balanceMinor)} r="4" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hovered && (
          <div
            className="card absolute top-0 pointer-events-none"
            style={{
              padding: "8px 12px",
              insetInlineStart: hover !== null && hover > points.length / 2 ? undefined : "10%",
              insetInlineEnd: hover !== null && hover > points.length / 2 ? "10%" : undefined,
            }}
          >
            <div className="micro font-semibold">{formatDateShort(hovered.dateISO)}</div>
            <div className="text-[14px] font-bold money">{money(hovered.balanceMinor, currency)}</div>
            {hovered.events.map((e) => (
              <div key={e.label} className="micro">
                {e.direction === "in" ? "+" : "−"}
                {money(e.amountMinor, currency)} {e.label === "Salary" ? t("forecast.salary") : e.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="subtle mt-3">
        {firstBelowBufferISO ? (
          <span style={{ color: "var(--caution)" }}>
            {t("forecast.warning", { buffer: money(bufferMinor, currency), date: formatDateShort(firstBelowBufferISO) })}
          </span>
        ) : (
          <>{t("forecast.safe", { min: money(minMinor, currency), date: formatDateShort(forecast.minDateISO) })}</>
        )}
      </p>
      <Why summary={t("forecast.how")}>{t("forecast.howBody", { basis })}</Why>
    </section>
  );
}
