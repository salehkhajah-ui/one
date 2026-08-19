"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Transaction } from "../../lib/engine/types";
import { formatDateShort, money } from "../../lib/i18n";
import { sumMinor } from "../../lib/money";
import { useApp, useAppControls } from "../components/AppProvider";
import { Disclaimer, Money } from "../components/ui";

const CATEGORY_ICONS: Partial<Record<Transaction["category"], string>> = {
  Income: "💼",
  Groceries: "🛒",
  Dining: "🍽️",
  Transport: "⛽",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Subscriptions: "📺",
  Utilities: "📡",
  Health: "💪",
  Travel: "✈️",
};

export default function ActivityPage() {
  const state = useApp();
  const { deleteTransaction } = useAppControls();

  const groups = useMemo(() => {
    const byDate = new Map<string, Transaction[]>();
    for (const t of state.transactions.slice(0, 120)) {
      const list = byDate.get(t.transactionDate) ?? [];
      list.push(t);
      byDate.set(t.transactionDate, list);
    }
    return [...byDate.entries()];
  }, [state.transactions]);

  const monthStartISO = state.todayISO.slice(0, 8) + "01";
  const monthOut = sumMinor(
    state.transactions
      .filter((t) => t.direction === "debit" && t.transactionDate >= monthStartISO)
      .map((t) => t.amountMinor),
  );
  const monthIn = sumMinor(
    state.transactions
      .filter((t) => t.direction === "credit" && t.transactionDate >= monthStartISO)
      .map((t) => t.amountMinor),
  );

  return (
    <main className="screen">
      <header className="flex items-center justify-between pt-2">
        <div>
          <div className="eyebrow" style={{ color: "var(--brand)" }}>
            Activity
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight">Money in motion</h1>
        </div>
        <Link href="/add" className="btn btn-primary" style={{ minHeight: 40, padding: "8px 16px" }}>
          + Add
        </Link>
      </header>

      <section className="card mt-5 flex items-center justify-between" style={{ padding: 14 }}>
        <div>
          <div className="micro">This month in</div>
          <div className="text-[15px] font-bold money" style={{ color: "var(--positive)" }}>
            +{money(monthIn, state.currency)}
          </div>
        </div>
        <div className="text-right">
          <div className="micro">This month out</div>
          <div className="text-[15px] font-bold money">−{money(monthOut, state.currency)}</div>
        </div>
      </section>

      {groups.length === 0 ? (
        <section className="card mt-6 text-center">
          <p className="subtle">Nothing recorded yet.</p>
          <p className="micro mt-1">Add what you spend and Safe to Spend stays honest — no bank connection needed.</p>
          <Link href="/add" className="btn btn-ghost mt-4 w-full">
            Record your first transaction
          </Link>
        </section>
      ) : (
        groups.map(([date, txs]) => (
          <section key={date} className="mt-5">
            <div className="section-title mb-2">{date === state.todayISO ? "Today" : formatDateShort(date)}</div>
            <div className="card" style={{ padding: "4px 16px" }}>
              <ul>
                {txs.map((t, i) => {
                  const isUserTx = t.id.startsWith("user-tx-");
                  return (
                    <li
                      key={t.id}
                      className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t" : ""}`}
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      <span className="text-lg w-7 text-center" aria-hidden>
                        {CATEGORY_ICONS[t.category] ?? "💳"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold truncate">{t.merchant}</div>
                        <div className="micro">
                          {t.category}
                          {isUserTx && " · added by you"}
                        </div>
                      </div>
                      <span
                        className="money text-[14px] font-semibold"
                        style={{ color: t.direction === "credit" ? "var(--positive)" : "var(--text)" }}
                      >
                        {t.direction === "credit" ? "+" : "−"}
                        <Money minor={t.amountMinor} />
                      </span>
                      {isUserTx && (
                        <button
                          className="micro font-semibold"
                          style={{ color: "var(--text-3)" }}
                          aria-label={`Delete ${t.merchant}`}
                          onClick={() => deleteTransaction(t.id)}
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ))
      )}

      <Disclaimer>
        {state.mode === "demo"
          ? "Demo history is generated; anything you add yourself updates balances and Safe to Spend instantly."
          : "Everything you record stays on this device and updates Safe to Spend instantly."}
      </Disclaimer>
    </main>
  );
}
