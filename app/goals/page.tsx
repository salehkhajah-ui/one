"use client";

import { useEffect, useState } from "react";
import { track } from "../../lib/analytics";
import { emergencyStageLabel, formatDateShort, money, t } from "../../lib/i18n";
import { useApp } from "../components/AppProvider";
import { BUCKET_COLORS, Disclaimer, Money, ProgressBar, SectionHeader, Why } from "../components/ui";

export default function GoalsPage() {
  const state = useApp();
  const [open, setOpen] = useState<string | null>(state.goals[0]?.id ?? null);
  const [paused, setPaused] = useState<Record<string, boolean>>({});

  useEffect(() => {
    track("goal_viewed");
  }, []);

  const em = state.emergency;
  const emPct = em.stageTargetMinor > 0 ? Math.round((em.currentMinor / em.stageTargetMinor) * 100) : 0;

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          {t("goals.eyebrow")}
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("goals.title")}</h1>
      </header>

      {/* Emergency milestone (Protect) */}
      <section className="card-elevated mt-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🛡️
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-bold">{t("goals.emergency")}</div>
            <div className="micro">{t("goals.milestone", { stage: emergencyStageLabel(em.stage, state.profile.emergencyTargetMonths), n: em.stage })}</div>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <Money minor={em.currentMinor} className="text-[17px] font-bold" />
          <span className="subtle">
            {t("common.of")} <Money minor={em.stageTargetMinor} />
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar pct={emPct} color={BUCKET_COLORS.protect} />
        </div>
        <p className="subtle mt-3">{t("goals.covers", { months: em.monthsCovered.toFixed(1) })}</p>
        <Why summary={t("common.assumptions")}>
          {t("goals.emergencyWhy", {
            essentials: money(state.profile.essentialMonthlyEstimateMinor),
            target: state.profile.emergencyTargetMonths,
          })}
        </Why>
      </section>

      <SectionHeader title={t("goals.your")} />
      <div className="flex flex-col gap-3">
        {state.goals.map((g) => {
          const isOpen = open === g.id;
          const isPaused = paused[g.id] ?? false;
          const allocated = state.allocation.items.find((i) => i.goalId === g.id)?.amountMinor ?? 0;
          return (
            <section key={g.id} className="card" style={isPaused ? { opacity: 0.65 } : undefined}>
              <button className="flex w-full items-center gap-3 text-start" onClick={() => setOpen(isOpen ? null : g.id)}>
                <span className="text-2xl" aria-hidden>
                  {g.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold">
                    {g.name}
                    {isPaused && <span className="micro font-medium"> · {t("goals.paused")}</span>}
                  </div>
                  <div className="micro">
                    <Money minor={g.currentMinor} hideDecimals /> / <Money minor={g.targetMinor} hideDecimals /> ·{" "}
                    {g.progressPct}%
                  </div>
                </div>
                <span className="text-[18px]" style={{ color: "var(--text-3)" }} aria-hidden>
                  {isOpen ? "▾" : "›"}
                </span>
              </button>
              <div className="mt-3">
                <ProgressBar pct={g.progressPct} color={BUCKET_COLORS.goals} />
              </div>

              {isOpen && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="subtle">{t("goals.targetDate")}</span>
                    <span className="text-[14px] font-semibold">
                      {g.targetDate ? formatDateShort(g.targetDate) : t("goals.flexible")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="subtle">{t("goals.neededMonthly")}</span>
                    <Money minor={g.plan.requiredMonthlyMinor} className="text-[14px] font-semibold" />
                  </div>
                  <div className="flex justify-between">
                    <span className="subtle">{t("goals.inPlan")}</span>
                    <Money minor={allocated} className="text-[14px] font-semibold" />
                  </div>
                  <div className="flex justify-between">
                    <span className="subtle">{t("goals.projectedFinish")}</span>
                    <span
                      className="text-[14px] font-semibold"
                      style={{ color: g.projection.onTrack === false ? "var(--caution)" : "var(--positive)" }}
                    >
                      {g.projection.projectedDate ? formatDateShort(g.projection.projectedDate) : t("goals.needsPace")}
                    </span>
                  </div>
                  {!g.plan.feasible && (
                    <p className="subtle" style={{ color: "var(--caution)" }}>
                      {t("goals.deadlinePassed")}
                    </p>
                  )}
                  <p className="subtle mt-1">
                    {g.projection.onTrack === false
                      ? t("goals.behind")
                      : t("goals.onTrack", {
                          days: g.projection.daysToComplete ? t("goals.daysToGo", { n: g.projection.daysToComplete }) : "",
                        })}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn btn-quiet flex-1"
                      onClick={() => setPaused((p) => ({ ...p, [g.id]: !isPaused }))}
                    >
                      {isPaused ? t("goals.resume") : t("goals.pause")}
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Disclaimer>{t("goals.disclaimer")}</Disclaimer>
    </main>
  );
}
