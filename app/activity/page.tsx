"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Transaction } from "../../lib/engine/types";
import { formatDateShort, money, t } from "../../lib/i18n";
import { sumMinor } from "../../lib/money";
import { useApp, useAppControls } from "../components/AppProvider";
import { catLabel } from "../components/text";
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
    for (const tx of state.transactions.slice(0, 120)) {
      const list = byDate.get(tx.transactionDate) ?? [];
      list.push(tx);
      byDate.set(tx.transactionDate, list);
    }
    return [...byDate.entries()];
  }, [state.transactions]);

  const monthStartISO = state.todayISO.slice(0, 8) + "01";
  const monthOut = sumMinor(
    state.transactions
      .filter((tx) => tx.direction === "debit" && tx.transactionDate >= monthStartISO)
      .map((tx) => tx.amountMinor),
  );
  const monthIn = sumMinor(
    state.transactions
      .filter((tx) => tx.direction === "credit" && tx.transactionDate >= monthStartISO)
      .map((tx) => tx.amountMinor),
  );

  return (
    <main className="screen">
      <header className="flex items-center justify-between pt-2">
        <div>
          <div className="eyebrow" style={{ color: "var(--brand)" }}>
            {t("act.eyebrow")}
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("act.title")}</h1>
        </div>
        <Link href="/add" className="btn btn-primary" style={{ minHeight: 40, padding: "8px 16px" }}>
          {t("act.add")}
        </Link>
      </header>

      <section className="card mt-5 flex items-center justify-between" style={{ padding: 14 }}>
        <div>
          <div className="micro">{t("act.monthIn")}</div>
          <div className="text-[15px] font-bold money" style={{ color: "var(--positive)" }}>
            +{money(monthIn, state.currency)}
          </div>
        </div>
        <div className="text-end">
          <div className="micro">{t("act.monthOut")}</div>
          <div className="text-[15px] font-bold money">−{money(monthOut, state.currency)}</div>
        </div>
      </section>

      {groups.length === 0 ? (
        <section className="card mt-6 text-center">
          <p className="subtle">{t("act.empty")}</p>
          <p className="micro mt-1">{t("act.emptyHint")}</p>
          <Link href="/add" className="btn btn-ghost mt-4 w-full">
            {t("act.recordFirst")}
          </Link>
        </section>
      ) : (
        groups.map(([date, txs]) => (
          <section key={date} className="mt-5">
            <div className="section-title mb-2">{date === state.todayISO ? t("common.today") : formatDateShort(date)}</div>
            <div className="card" style={{ padding: "4px 16px" }}>
              <ul>
                {txs.map((tx, i) => {
                  const isUserTx = tx.id.startsWith("user-tx-");
                  return (
                    <li
                      key={tx.id}
                      className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t" : ""}`}
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      <span className="text-lg w-7 text-center" aria-hidden>
                        {CATEGORY_ICONS[tx.category] ?? "💳"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold truncate">{tx.merchant}</div>
                        <div className="micro">
                          {catLabel(tx.category)}
                          {isUserTx && ` · ${t("act.addedByYou")}`}
                        </div>
                      </div>
                      <span
                        className="money text-[14px] font-semibold"
                        style={{ color: tx.direction === "credit" ? "var(--positive)" : "var(--text)" }}
                      >
                        {tx.direction === "credit" ? "+" : "−"}
                        <Money minor={tx.amountMinor} />
                      </span>
                      {isUserTx && (
                        <button
                          className="micro font-semibold"
                          style={{ color: "var(--text-3)" }}
                          aria-label={`Delete ${tx.merchant}`}
                          onClick={() => deleteTransaction(tx.id)}
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

      <Disclaimer>{state.mode === "demo" ? t("act.disclaimerDemo") : t("act.disclaimerManual")}</Disclaimer>
    </main>
  );
}
