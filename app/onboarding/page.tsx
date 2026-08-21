"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { track } from "../../lib/analytics";
import type { FinancialProfile } from "../../lib/engine/types";
import { currencyUnitLabel, money, t } from "../../lib/i18n";
import type { StringKey } from "../../lib/i18n-strings";
import { fromMajor } from "../../lib/money";
import type { StoredBill, StoredGoal, UserSetup } from "../../lib/app/storage";
import { manualBundle } from "../../lib/app/bundle";
import { buildAppState } from "../../lib/app/state";
import { toISODate } from "../../lib/engine/dates";
import { useAppControls } from "../components/AppProvider";
import { bucketLabel, BucketDot, Money, StackBar } from "../components/ui";
import type { BucketKey } from "../../lib/engine/types";

type Step = "income" | "payday" | "essentials" | "bills" | "protection" | "goals" | "growth" | "generate" | "plan";

const STEPS: Step[] = ["income", "payday", "essentials", "bills", "protection", "goals", "growth", "generate", "plan"];

const GOAL_TEMPLATES: Array<{ key: string; nameKey: StringKey; emoji: string; defaultTargetKD: number }> = [
  { key: "travel", nameKey: "onb.goal.travel", emoji: "✈️", defaultTargetKD: 1500 },
  { key: "car", nameKey: "onb.goal.car", emoji: "🚗", defaultTargetKD: 5000 },
  { key: "home", nameKey: "onb.goal.home", emoji: "🏠", defaultTargetKD: 20000 },
  { key: "education", nameKey: "onb.goal.education", emoji: "🎓", defaultTargetKD: 3000 },
  { key: "wedding", nameKey: "onb.goal.wedding", emoji: "💍", defaultTargetKD: 6000 },
  { key: "other", nameKey: "onb.goal.other", emoji: "⭐", defaultTargetKD: 1000 },
];

const BILL_CHIPS: Array<StringKey> = ["onb.bills.rent", "onb.bills.phone", "onb.bills.internet", "onb.bills.gym", "onb.bills.streaming"];

interface Draft {
  displayName: string;
  incomeKD: string;
  incomeType: FinancialProfile["incomeType"];
  paydayDay: number;
  essentialsKD: string;
  bills: StoredBill[];
  checkingKD: string;
  protectKD: string;
  goals: StoredGoal[];
  experience: FinancialProfile["investmentExperience"];
}

function parseKD(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return fromMajor(n);
}

const RISK_FROM_EXPERIENCE: Record<Draft["experience"], FinancialProfile["riskPreference"]> = {
  new: "low",
  some: "moderate",
  experienced: "high",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useAppControls();
  const [step, setStep] = useState<Step>("income");
  const [draft, setDraft] = useState<Draft>({
    displayName: "",
    incomeKD: "",
    incomeType: "salary",
    paydayDay: 25,
    essentialsKD: "",
    bills: [],
    checkingKD: "",
    protectKD: "",
    goals: [],
    experience: "new",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  const stepIndex = STEPS.indexOf(step);
  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const manual = useMemo((): NonNullable<UserSetup["manual"]> | null => {
    const income = parseKD(draft.incomeKD);
    const essentials = parseKD(draft.essentialsKD);
    const checking = parseKD(draft.checkingKD) ?? 0;
    const protect = parseKD(draft.protectKD) ?? 0;
    if (income === null || income === 0 || essentials === null) return null;
    return {
      displayName: draft.displayName.trim() || "there",
      monthlyIncomeMinor: income,
      incomeType: draft.incomeType,
      paydayDayOfMonth: draft.paydayDay,
      essentialMonthlyEstimateMinor: essentials,
      checkingBalanceMinor: checking,
      protectBalanceMinor: protect,
      riskPreference: RISK_FROM_EXPERIENCE[draft.experience],
      investmentExperience: draft.experience,
      bills: draft.bills.filter((b) => b.amountMinor > 0 && b.name.trim().length > 0),
      goals: draft.goals,
    };
  }, [draft]);

  const preview = useMemo(() => {
    if (step !== "plan" || !manual) return null;
    return buildAppState(manualBundle(manual, toISODate(new Date())), "manual", new Date());
  }, [step, manual]);

  useEffect(() => {
    if (step === "generate") {
      const timer = setTimeout(() => setStep("plan"), 1900);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <main className="screen flex min-h-[100dvh] flex-col">
      {/* progress */}
      {step !== "generate" && step !== "plan" && (
        <div className="flex items-center gap-3 pt-2">
          <button
            className="btn btn-quiet"
            style={{ minHeight: 38, padding: "8px 14px" }}
            onClick={() => (stepIndex === 0 ? router.push("/") : go(STEPS[stepIndex - 1]))}
            aria-label="Back"
          >
            ←
          </button>
          <div className="progress-track flex-1">
            <div
              className="progress-fill"
              style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%`, background: "var(--brand)" }}
            />
          </div>
        </div>
      )}

      {step === "income" && (
        <StepShell
          title={t("onb.income.title")}
          subtitle={t("onb.income.subtitle")}
          onNext={() => {
            const v = parseKD(draft.incomeKD);
            if (v === null || v === 0) return setError(t("onb.income.error"));
            go("payday");
          }}
          error={error}
        >
          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">{t("onb.income.name")}</span>
            <input
              className="input"
              placeholder={t("onb.income.namePlaceholder")}
              value={draft.displayName}
              maxLength={30}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="micro font-semibold">{t("onb.income.monthly", { unit: currencyUnitLabel("KWD") })}</span>
            <input
              className="input money"
              placeholder="1200"
              inputMode="decimal"
              value={draft.incomeKD}
              onChange={(e) => setDraft({ ...draft, incomeKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <div className="mt-3 flex gap-2">
            {(["salary", "irregular"] as const).map((kind) => (
              <button
                key={kind}
                className="chip"
                style={draft.incomeType === kind ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
                onClick={() => setDraft({ ...draft, incomeType: kind })}
              >
                {kind === "salary" ? t("onb.income.salary") : t("onb.income.irregular")}
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === "payday" && (
        <StepShell title={t("onb.payday.title")} subtitle={t("onb.payday.subtitle")} onNext={() => go("essentials")} error={error}>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                className="chip justify-center"
                style={{
                  padding: "8px 0",
                  ...(draft.paydayDay === d ? { borderColor: "var(--brand)", color: "var(--text)", fontWeight: 700 } : {}),
                }}
                onClick={() => setDraft({ ...draft, paydayDay: d })}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="micro mt-3">{t("onb.payday.note", { day: draft.paydayDay })}</p>
        </StepShell>
      )}

      {step === "essentials" && (
        <StepShell
          title={t("onb.ess.title")}
          subtitle={t("onb.ess.subtitle")}
          onNext={() => {
            const v = parseKD(draft.essentialsKD);
            if (v === null) return setError(t("onb.ess.error"));
            go("bills");
          }}
          error={error}
        >
          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">{t("onb.ess.label", { unit: currencyUnitLabel("KWD") })}</span>
            <input
              className="input money"
              placeholder="480"
              inputMode="decimal"
              value={draft.essentialsKD}
              onChange={(e) => setDraft({ ...draft, essentialsKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <p className="micro mt-2">{t("onb.ess.note")}</p>
        </StepShell>
      )}

      {step === "bills" && (
        <StepShell
          title={t("onb.bills.title")}
          subtitle={t("onb.bills.subtitle")}
          onNext={() => go("protection")}
          nextLabel={draft.bills.length === 0 ? t("onb.bills.none") : t("common.next")}
          error={error}
        >
          <div className="flex flex-col gap-3">
            {draft.bills.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder={t("onb.bills.name")}
                  value={b.name}
                  maxLength={30}
                  onChange={(e) => {
                    const bills = [...draft.bills];
                    bills[i] = { ...b, name: e.target.value };
                    setDraft({ ...draft, bills });
                  }}
                />
                <input
                  className="input money"
                  style={{ width: 90 }}
                  placeholder="KD"
                  inputMode="decimal"
                  value={b.amountMinor === 0 ? "" : String(b.amountMinor / 1000)}
                  onChange={(e) => {
                    const bills = [...draft.bills];
                    bills[i] = { ...b, amountMinor: parseKD(e.target.value.replace(/[^\d.]/g, "")) ?? 0 };
                    setDraft({ ...draft, bills });
                  }}
                />
                <button
                  className="btn btn-quiet"
                  style={{ minHeight: 42, padding: "8px 12px" }}
                  aria-label={`Remove ${b.name || "bill"}`}
                  onClick={() => setDraft({ ...draft, bills: draft.bills.filter((x) => x.id !== b.id) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {BILL_CHIPS.map((nameKey) => (
              <button
                key={nameKey}
                className="chip"
                onClick={() =>
                  setDraft({
                    ...draft,
                    bills: [
                      ...draft.bills,
                      { id: `bill-${Date.now()}-${draft.bills.length}`, name: t(nameKey), amountMinor: 0, dayOfMonth: 5 },
                    ],
                  })
                }
              >
                + {t(nameKey)}
              </button>
            ))}
            <button
              className="chip"
              onClick={() =>
                setDraft({
                  ...draft,
                  bills: [
                    ...draft.bills,
                    { id: `bill-${Date.now()}-${draft.bills.length}`, name: "", amountMinor: 0, dayOfMonth: 5 },
                  ],
                })
              }
            >
              {t("onb.bills.other")}
            </button>
          </div>
        </StepShell>
      )}

      {step === "protection" && (
        <StepShell
          title={t("onb.prot.title")}
          subtitle={t("onb.prot.subtitle")}
          onNext={() => go("goals")}
          error={error}
        >
          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">{t("onb.prot.checking", { unit: currencyUnitLabel("KWD") })}</span>
            <input
              className="input money"
              placeholder="700"
              inputMode="decimal"
              value={draft.checkingKD}
              onChange={(e) => setDraft({ ...draft, checkingKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="micro font-semibold">{t("onb.prot.savings", { unit: currencyUnitLabel("KWD") })}</span>
            <input
              className="input money"
              placeholder="0"
              inputMode="decimal"
              value={draft.protectKD}
              onChange={(e) => setDraft({ ...draft, protectKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <p className="micro mt-2">{t("onb.prot.zeroOk")}</p>
        </StepShell>
      )}

      {step === "goals" && (
        <StepShell
          title={t("onb.goals.title")}
          subtitle={t("onb.goals.subtitle")}
          onNext={() => go("growth")}
          nextLabel={draft.goals.length === 0 ? t("onb.goals.skip") : t("common.next")}
          error={error}
        >
          <div className="flex flex-col gap-3">
            {GOAL_TEMPLATES.map((tpl) => {
              const existing = draft.goals.find((g) => g.id === tpl.key);
              return (
                <div key={tpl.key}>
                  <button
                    className="chip w-full justify-start"
                    style={existing ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
                    onClick={() => {
                      if (existing) {
                        setDraft({ ...draft, goals: draft.goals.filter((g) => g.id !== tpl.key) });
                      } else if (draft.goals.length < 3) {
                        setDraft({
                          ...draft,
                          goals: [
                            ...draft.goals,
                            {
                              id: tpl.key,
                              name: t(tpl.nameKey),
                              emoji: tpl.emoji,
                              targetMinor: fromMajor(tpl.defaultTargetKD),
                              currentMinor: 0,
                              months: 24,
                              priority: draft.goals.length === 0 ? "high" : "medium",
                            },
                          ],
                        });
                      }
                    }}
                  >
                    <span aria-hidden>{tpl.emoji}</span> {t(tpl.nameKey)}
                    {existing && <span className="ms-auto">✓</span>}
                  </button>
                  {existing && (
                    <div className="mt-2 flex items-center gap-2 ps-2">
                      <span className="micro w-14">{t("onb.goals.target")}</span>
                      <input
                        className="input money flex-1"
                        inputMode="decimal"
                        value={existing.targetMinor === 0 ? "" : String(existing.targetMinor / 1000)}
                        onChange={(e) => {
                          const v = parseKD(e.target.value.replace(/[^\d.]/g, "")) ?? 0;
                          setDraft({
                            ...draft,
                            goals: draft.goals.map((g) => (g.id === tpl.key ? { ...g, targetMinor: v } : g)),
                          });
                        }}
                      />
                      <span className="micro">{currencyUnitLabel("KWD")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </StepShell>
      )}

      {step === "growth" && (
        <StepShell
          title={t("onb.growth.title")}
          subtitle={t("onb.growth.subtitle")}
          onNext={() => {
            if (!manual) return setError(t("onb.growth.error"));
            go("generate");
          }}
          error={error}
        >
          <div className="flex flex-col gap-3">
            {(
              [
                ["new", "onb.growth.new", "onb.growth.newHint"],
                ["some", "onb.growth.some", "onb.growth.someHint"],
                ["experienced", "onb.growth.exp", "onb.growth.expHint"],
              ] as const
            ).map(([key, labelKey, hintKey]) => (
              <button
                key={key}
                className="card w-full text-start"
                style={{
                  padding: 14,
                  borderColor: draft.experience === key ? "var(--brand)" : "var(--hairline)",
                }}
                onClick={() => setDraft({ ...draft, experience: key })}
              >
                <div className="text-[14.5px] font-bold">{t(labelKey)}</div>
                <div className="micro mt-0.5">{t(hintKey)}</div>
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === "generate" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-16">
          <div className="hero-number" style={{ color: "var(--brand)" }}>
            ONE
          </div>
          <p className="subtle animate-pulse">{t("onb.generate")}</p>
        </div>
      )}

      {step === "plan" && preview && manual && (
        <div className="flex-1 pb-8">
          <h1 className="mt-4 text-[22px] font-bold">{t("onb.plan.title")}</h1>
          <p className="subtle mt-1">{t("onb.plan.subtitle", { amount: money(manual.monthlyIncomeMinor) })}</p>
          <section className="card-elevated mt-4">
            <StackBar
              parts={(Object.keys(preview.planBuckets) as BucketKey[]).map((k) => ({
                key: k,
                amountMinor: preview.planBuckets[k],
              }))}
            />
            <ul className="mt-4 flex flex-col gap-3">
              {(Object.keys(preview.planBuckets) as BucketKey[]).map((k) => (
                <li key={k} className="flex items-center gap-3">
                  <BucketDot bucket={k} />
                  <span className="flex-1 text-[14.5px] font-semibold">{bucketLabel(k)}</span>
                  <Money minor={preview.planBuckets[k]} className="text-[14.5px] font-semibold" />
                </li>
              ))}
            </ul>
            <p className="micro mt-4">{t("onb.plan.note")}</p>
          </section>
          <button
            className="btn btn-primary mt-6 w-full"
            onClick={() => {
              completeOnboarding(manual);
              router.push("/");
            }}
          >
            {t("onb.plan.start")}
          </button>
          <p className="micro mt-3 text-center">{t("onb.plan.disclaimer")}</p>
        </div>
      )}
    </main>
  );
}

function StepShell({
  title,
  subtitle,
  children,
  onNext,
  nextLabel,
  error,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  nextLabel?: string;
  error: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-5 text-[22px] font-bold">{title}</h1>
      <p className="subtle mt-1 mb-5">{subtitle}</p>
      <div className="flex-1">{children}</div>
      {error && (
        <p className="subtle mb-2" style={{ color: "var(--caution)" }}>
          {error}
        </p>
      )}
      <button className="btn btn-primary mb-4 w-full" onClick={onNext}>
        {nextLabel ?? t("common.next")}
      </button>
    </div>
  );
}
