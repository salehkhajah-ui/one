"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { parseBankMessage } from "../../lib/app/bankParser";
import { toISODate } from "../../lib/engine/dates";
import { currencyUnitLabel, money, t } from "../../lib/i18n";
import type { StringKey } from "../../lib/i18n-strings";
import { fromMajor } from "../../lib/money";
import { useApp, useAppControls } from "../components/AppProvider";
import { catLabel } from "../components/text";
import { Money } from "../components/ui";

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
  return (
    <Suspense fallback={null}>
      <AddTransaction />
    </Suspense>
  );
}

function AddTransaction() {
  const state = useApp();
  const { addTransaction } = useAppControls();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedText = searchParams.get("text") ?? searchParams.get("title") ?? "";

  const [mode, setMode] = useState<"manual" | "message">(sharedText ? "message" : "manual");
  const [messageText, setMessageText] = useState(sharedText);
  const [direction, setDirection] = useState<"debit" | "credit">("debit");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>("Dining");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sharedText) setMode("message");
  }, [sharedText]);

  const parsed = useMemo(() => (messageText.trim() ? parseBankMessage(messageText) : null), [messageText]);

  function saveManual() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError(t("add.amountError"));
    addTransaction({
      amountMinor: fromMajor(value),
      direction,
      merchant: merchant.trim() || (direction === "credit" ? "Income" : category),
      category: direction === "credit" ? "Income" : category,
      dateISO: toISODate(new Date()),
    });
    router.push("/activity");
  }

  function saveParsed() {
    if (!parsed) return;
    addTransaction({
      amountMinor: parsed.amountMinor,
      direction: parsed.direction,
      merchant: parsed.merchant ?? (parsed.direction === "credit" ? "Income" : "Bank message"),
      category: parsed.category,
      dateISO: toISODate(new Date()),
      note: "Imported from bank message",
    });
    router.push("/activity");
  }

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          {t("add.eyebrow")}
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">
          {mode === "message" ? t("add.titleImport") : direction === "debit" ? t("add.titleSpent") : t("add.titleReceived")}
        </h1>
        <p className="subtle mt-1">{t("add.subtitle")}</p>
      </header>

      <div className="mt-4 flex gap-2">
        <button
          className="chip flex-1 justify-center"
          style={mode === "manual" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
          onClick={() => setMode("manual")}
        >
          {t("add.typeIt")}
        </button>
        <button
          className="chip flex-1 justify-center"
          style={mode === "message" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
          onClick={() => setMode("message")}
        >
          {t("add.pasteMsg")}
        </button>
      </div>

      {mode === "message" ? (
        <section className="card mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">{t("add.msgLabel")}</span>
            <textarea
              className="input"
              rows={4}
              placeholder={t("add.msgPlaceholder")}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              autoFocus={!sharedText}
            />
          </label>

          {messageText.trim() && !parsed && (
            <p className="subtle" style={{ color: "var(--caution)" }}>
              {t("add.noAmount")}
            </p>
          )}

          {parsed && (
            <div className="card" style={{ padding: 14, background: "color-mix(in oklab, var(--accent) 4%, var(--card))" }}>
              <div className="eyebrow">{t("add.oneRead")}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[22px] font-bold money" style={{ color: parsed.direction === "credit" ? "var(--positive)" : "var(--text)" }}>
                  {parsed.direction === "credit" ? "+" : "−"}
                  <Money minor={parsed.amountMinor} />
                </span>
                <span className="micro uppercase tracking-widest">{parsed.direction === "credit" ? t("add.received") : t("add.spent")}</span>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-[13.5px]">
                <div className="flex justify-between">
                  <span className="subtle">{t("add.merchant")}</span>
                  <span className="font-semibold">{parsed.merchant ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="subtle">{t("add.category")}</span>
                  <span className="font-semibold">{catLabel(parsed.category)}</span>
                </div>
                {parsed.balanceMinor !== null && (
                  <div className="flex justify-between">
                    <span className="subtle">{t("add.balanceInMsg")}</span>
                    <span className="font-semibold money">{money(parsed.balanceMinor, state.currency)}</span>
                  </div>
                )}
              </div>
              <p className="micro mt-2">
                {t("add.readConfidence", { level: t(`add.conf.${parsed.confidence}` as StringKey), signal: parsed.signal })}
              </p>
              <button className="btn btn-primary mt-3 w-full" onClick={saveParsed}>
                {t("add.confirmSave")}
              </button>
              <button
                className="btn btn-quiet mt-2 w-full"
                onClick={() => {
                  setMode("manual");
                  setDirection(parsed.direction);
                  setAmount(String(parsed.amountMinor / 1000));
                  setMerchant(parsed.merchant ?? "");
                  if (parsed.direction === "debit" && (SPEND_CATEGORIES as readonly string[]).includes(parsed.category)) {
                    setCategory(parsed.category);
                  }
                }}
              >
                {t("add.editFirst")}
              </button>
            </div>
          )}

          <p className="micro">{t("add.shareTip")}</p>
        </section>
      ) : (
        <section className="card mt-4 flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              className="chip flex-1 justify-center"
              style={direction === "debit" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
              onClick={() => setDirection("debit")}
            >
              {t("add.spent")}
            </button>
            <button
              className="chip flex-1 justify-center"
              style={direction === "credit" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
              onClick={() => setDirection("credit")}
            >
              {t("add.received")}
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">{t("add.amount", { unit: currencyUnitLabel(state.currency) })}</span>
            <input
              className="input money"
              placeholder="4.500"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && saveManual()}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="micro font-semibold">{direction === "debit" ? t("add.where") : t("add.from")}</span>
            <input
              className="input"
              placeholder={direction === "debit" ? t("add.wherePlaceholder") : t("add.fromPlaceholder")}
              value={merchant}
              maxLength={40}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </label>

          {direction === "debit" && (
            <div>
              <span className="micro font-semibold">{t("add.category")}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {SPEND_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className="chip"
                    style={category === c ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}
                    onClick={() => setCategory(c)}
                  >
                    {catLabel(c)}
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

          <button className="btn btn-primary w-full" onClick={saveManual}>
            {t("common.save")}
          </button>
          <p className="micro">{t("add.honest", { amount: money(state.safeToSpend.dailyMinor, state.currency) })}</p>
        </section>
      )}
    </main>
  );
}
