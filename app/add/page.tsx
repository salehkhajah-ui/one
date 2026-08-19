"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toISODate } from "../../lib/engine/dates";
import { currencyUnitLabel, money } from "../../lib/i18n";
import { fromMajor } from "../../lib/money";
import { useApp, useAppControls } from "../components/AppProvider";

const SPEND_CATEGORIES = [
  "Dining",
  "Groceries",
  "Transport",
  "Shopping",
  "Entertainment",
  "Subscriptions",
  "Utilities",
  "Health",
  "Travel",
  "Other",
] as const;

export default function AddTransactionPage() {
  const state = useApp();
  const { addTransaction } = useAppControls();
  const router = useRouter();

  const [direction, setDirection] = useState<"debit" | "credit">("debit");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>("Dining");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return setError("Enter an amount above zero.");
    }
    addTransaction({
      amountMinor: fromMajor(parsed),
      direction,
      merchant: merchant.trim() || (direction === "credit" ? "Income" : category),
      category: direction === "credit" ? "Income" : category,
      dateISO: toISODate(new Date()),
    });
    router.push("/activity");
  }

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          Record
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">
          {direction === "debit" ? "I spent money" : "Money came in"}
        </h1>
        <p className="subtle mt-1">Safe to Spend updates the moment you save.</p>
      </header>

      <section className="card mt-5 flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            className="chip flex-1 justify-center"
            style={direction === "debit" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
            onClick={() => setDirection("debit")}
          >
            Spent
          </button>
          <button
            className="chip flex-1 justify-center"
            style={direction === "credit" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
            onClick={() => setDirection("credit")}
          >
            Received
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="micro font-semibold">Amount ({currencyUnitLabel(state.currency)})</span>
          <input
            className="input money"
            placeholder="4.500"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="micro font-semibold">{direction === "debit" ? "Where? (optional)" : "From? (optional)"}</span>
          <input
            className="input"
            placeholder={direction === "debit" ? "Coffee shop, restaurant, store…" : "Salary, refund, gift…"}
            value={merchant}
            maxLength={40}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </label>

        {direction === "debit" && (
          <div>
            <span className="micro font-semibold">Category</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPEND_CATEGORIES.map((c) => (
                <button
                  key={c}
                  className="chip"
                  style={category === c ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="subtle" style={{ color: "var(--caution)" }}>
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full" onClick={save}>
          Save
        </button>
        <p className="micro">
          Today&apos;s Safe to Spend is {money(state.safeToSpend.dailyMinor, state.currency)} — recording keeps it honest,
          never judgmental.
        </p>
      </section>
    </main>
  );
}
