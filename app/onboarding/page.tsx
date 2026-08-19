"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { track } from "../../lib/analytics";
import type { FinancialProfile } from "../../lib/engine/types";
import { currencyUnitLabel, money } from "../../lib/i18n";
import { fromMajor } from "../../lib/money";
import type { StoredBill, StoredGoal, UserSetup } from "../../lib/app/storage";
import { manualBundle } from "../../lib/app/bundle";
import { buildAppState } from "../../lib/app/state";
import { toISODate } from "../../lib/engine/dates";
import { useAppControls } from "../components/AppProvider";
import { BUCKET_LABELS, BucketDot, Money, StackBar } from "../components/ui";
import type { BucketKey } from "../../lib/engine/types";

type Step = "income" | "payday" | "essentials" | "bills" | "protection" | "goals" | "growth" | "generate" | "plan";

const STEPS: Step[] = ["income", "payday", "essentials", "bills", "protection", "goals", "growth", "generate", "plan"];

const GOAL_TEMPLATES: Array<{ key: string; name: string; emoji: string; defaultTargetKD: number }> = [
  { key: "travel", name: "Travel", emoji: "✈️", defaultTargetKD: 1500 },
  { key: "car", name: "Car", emoji: "🚗", defaultTargetKD: 5000 },
  { key: "home", name: "Home", emoji: "🏠", defaultTargetKD: 20000 },
  { key: "education", name: "Education", emoji: "🎓", defaultTargetKD: 3000 },
  { key: "wedding", name: "Wedding", emoji: "💍", defaultTargetKD: 6000 },
  { key: "other", name: "Something else", emoji: "⭐", defaultTargetKD: 1000 },
];

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
      const t = setTimeout(() => setStep("plan"), 1900);
      return () => clearTimeout(t);
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
          title="Income"
          subtitle="How much do you normally receive each month?"
          onNext={() => {
            const v = parseKD(draft.incomeKD);
            if (v === null || v === 0) return setError("Enter your typical monthly income to continue.");
            go("payday");
          }}
          error={error}
        >
          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">What should ONE call you? (optional)</span>
            <input
              className="input"
              placeholder="Your first name"
              value={draft.displayName}
              maxLength={30}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="micro font-semibold">Monthly income ({currencyUnitLabel("KWD")})</span>
            <input
              className="input money"
              placeholder="1200"
              inputMode="decimal"
              value={draft.incomeKD}
              onChange={(e) => setDraft({ ...draft, incomeKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <div className="mt-3 flex gap-2">
            {(["salary", "irregular"] as const).map((t) => (
              <button
                key={t}
                className="chip"
                style={draft.incomeType === t ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
                onClick={() => setDraft({ ...draft, incomeType: t })}
              >
                {t === "salary" ? "Regular salary" : "Irregular — this is my average"}
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === "payday" && (
        <StepShell title="Payday" subtitle="When do you usually get paid?" onNext={() => go("essentials")} error={error}>
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
          <p className="micro mt-3">Day {draft.paydayDay} of each month.</p>
        </StepShell>
      )}

      {step === "essentials" && (
        <StepShell
          title="Essentials"
          subtitle="Roughly how much do you need each month for everyday essentials — food, transport, groceries? (Bills come next.)"
          onNext={() => {
            const v = parseKD(draft.essentialsKD);
            if (v === null) return setError("A rough number is fine — you can refine it later.");
            go("bills");
          }}
          error={error}
        >
          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">Monthly essentials ({currencyUnitLabel("KWD")})</span>
            <input
              className="input money"
              placeholder="480"
              inputMode="decimal"
              value={draft.essentialsKD}
              onChange={(e) => setDraft({ ...draft, essentialsKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <p className="micro mt-2">An estimate is fine. Later, ONE can estimate this automatically from transactions.</p>
        </StepShell>
      )}

      {step === "bills" && (
        <StepShell
          title="Bills"
          subtitle="Add your major recurring commitments — rent, phone, internet, subscriptions."
          onNext={() => go("protection")}
          nextLabel={draft.bills.length === 0 ? "No bills right now" : "Next"}
          error={error}
        >
          <div className="flex flex-col gap-3">
            {draft.bills.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Name"
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
            {["Rent", "Phone", "Internet", "Gym", "Streaming"].map((name) => (
              <button
                key={name}
                className="chip"
                onClick={() =>
                  setDraft({
                    ...draft,
                    bills: [
                      ...draft.bills,
                      { id: `bill-${Date.now()}-${draft.bills.length}`, name, amountMinor: 0, dayOfMonth: 5 },
                    ],
                  })
                }
              >
                + {name}
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
              + Other
            </button>
          </div>
        </StepShell>
      )}

      {step === "protection" && (
        <StepShell
          title="Protection"
          subtitle="Where does your money stand today?"
          onNext={() => go("goals")}
          error={error}
        >
          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">Checking balance right now ({currencyUnitLabel("KWD")})</span>
            <input
              className="input money"
              placeholder="700"
              inputMode="decimal"
              value={draft.checkingKD}
              onChange={(e) => setDraft({ ...draft, checkingKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="micro font-semibold">Emergency savings today ({currencyUnitLabel("KWD")})</span>
            <input
              className="input money"
              placeholder="0"
              inputMode="decimal"
              value={draft.protectKD}
              onChange={(e) => setDraft({ ...draft, protectKD: e.target.value.replace(/[^\d.]/g, "") })}
            />
          </label>
          <p className="micro mt-2">Zero is a completely fine answer — that&apos;s what Protect is for.</p>
        </StepShell>
      )}

      {step === "goals" && (
        <StepShell
          title="Goals"
          subtitle="What are you building toward? Pick up to three."
          onNext={() => go("growth")}
          nextLabel={draft.goals.length === 0 ? "Skip for now" : "Next"}
          error={error}
        >
          <div className="flex flex-col gap-3">
            {GOAL_TEMPLATES.map((t) => {
              const existing = draft.goals.find((g) => g.id === t.key);
              return (
                <div key={t.key}>
                  <button
                    className="chip w-full justify-start"
                    style={existing ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
                    onClick={() => {
                      if (existing) {
                        setDraft({ ...draft, goals: draft.goals.filter((g) => g.id !== t.key) });
                      } else if (draft.goals.length < 3) {
                        setDraft({
                          ...draft,
                          goals: [
                            ...draft.goals,
                            {
                              id: t.key,
                              name: t.name,
                              emoji: t.emoji,
                              targetMinor: fromMajor(t.defaultTargetKD),
                              currentMinor: 0,
                              months: 24,
                              priority: draft.goals.length === 0 ? "high" : "medium",
                            },
                          ],
                        });
                      }
                    }}
                  >
                    <span aria-hidden>{t.emoji}</span> {t.name}
                    {existing && <span className="ms-auto">✓</span>}
                  </button>
                  {existing && (
                    <div className="mt-2 flex items-center gap-2 ps-2">
                      <span className="micro w-14">Target</span>
                      <input
                        className="input money flex-1"
                        inputMode="decimal"
                        value={existing.targetMinor === 0 ? "" : String(existing.targetMinor / 1000)}
                        onChange={(e) => {
                          const v = parseKD(e.target.value.replace(/[^\d.]/g, "")) ?? 0;
                          setDraft({
                            ...draft,
                            goals: draft.goals.map((g) => (g.id === t.key ? { ...g, targetMinor: v } : g)),
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
          title="Growth"
          subtitle="How familiar are you with investing? This only shapes how ONE balances Grow and Enjoy — it's educational, not advice."
          onNext={() => {
            if (!manual) return setError("Something's missing — check your income and essentials steps.");
            go("generate");
          }}
          error={error}
        >
          <div className="flex flex-col gap-3">
            {(
              [
                ["new", "New to investing", "ONE keeps growth gentle and prioritizes safety."],
                ["some", "Some experience", "A balanced split between growing and enjoying."],
                ["experienced", "Experienced", "A stronger tilt toward long-term growth."],
              ] as const
            ).map(([key, label, hint]) => (
              <button
                key={key}
                className="card w-full text-left"
                style={{
                  padding: 14,
                  borderColor: draft.experience === key ? "var(--brand)" : "var(--hairline)",
                }}
                onClick={() => setDraft({ ...draft, experience: key })}
              >
                <div className="text-[14.5px] font-bold">{label}</div>
                <div className="micro mt-0.5">{hint}</div>
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
          <p className="subtle animate-pulse">ONE is giving your dinars a job…</p>
        </div>
      )}

      {step === "plan" && preview && manual && (
        <div className="flex-1 pb-8">
          <h1 className="mt-4 text-[22px] font-bold">Your ONE Plan</h1>
          <p className="subtle mt-1">
            Each month, from your {money(manual.monthlyIncomeMinor)} income:
          </p>
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
                  <span className="flex-1 text-[14.5px] font-semibold">{BUCKET_LABELS[k]}</span>
                  <Money minor={preview.planBuckets[k]} className="text-[14.5px] font-semibold" />
                </li>
              ))}
            </ul>
            <p className="micro mt-4">Every dinar has a job. You can adjust any of this on the Plan tab.</p>
          </section>
          <button
            className="btn btn-primary mt-6 w-full"
            onClick={() => {
              completeOnboarding(manual);
              router.push("/");
            }}
          >
            Start using ONE
          </button>
          <p className="micro mt-3 text-center">
            Virtual allocations only — ONE never moves real money and does not execute investments.
          </p>
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
  nextLabel = "Next",
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
        {nextLabel}
      </button>
    </div>
  );
}
