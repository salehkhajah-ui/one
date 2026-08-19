"use client";

import { useEffect, useRef, useState } from "react";
import { mockAIProvider } from "../../lib/ai/mock";
import { SUGGESTED_PROMPTS, type ChatAnswer } from "../../lib/ai/provider";
import { track } from "../../lib/analytics";
import { formatDateShort, money } from "../../lib/i18n";
import { useApp } from "../components/AppProvider";
import { BUCKET_COLORS, Money, ProgressBar } from "../components/ui";

interface ChatItem {
  id: number;
  role: "user" | "one";
  text: string;
  answer?: ChatAnswer;
}

export default function AskOnePage() {
  const state = useApp();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items]);

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const answer = mockAIProvider.answerFinancialQuestion(q, state);
    setItems((prev) => [
      ...prev,
      { id: ++idRef.current, role: "user", text: q },
      { id: ++idRef.current, role: "one", text: answer.text, answer },
    ]);
    setInput("");
    track("one_chat_message_sent", { tool: answer.tool });
  }

  return (
    <main className="screen flex min-h-[calc(100dvh-var(--nav-h))] flex-col">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          Ask ONE
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">Your money, answered</h1>
      </header>

      <div className="flex-1 pb-4">
        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <span className="text-3xl" aria-hidden>
              ✦
            </span>
            <p className="subtle max-w-[280px]">
              Ask about your real numbers — Safe to Spend, goals, spending, or whether something is affordable.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p} className="chip" onClick={() => ask(p)}>
                  {p}
                </button>
              ))}
            </div>
            <p className="micro max-w-[300px]">
              Demo Mode uses a mock assistant wired to ONE&apos;s calculation engine — answers come from your data, never
              invented.
            </p>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {items.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="chat-bubble-user">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="flex flex-col gap-2">
                  <div className="chat-bubble-one">{m.text}</div>
                  {m.answer?.card && <AnswerCard card={m.answer.card} />}
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-2 pb-2 pt-2" style={{ background: "var(--page)" }}>
        <input
          className="input flex-1"
          placeholder="Ask ONE anything about your money…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(input)}
          aria-label="Ask ONE"
        />
        <button className="btn btn-primary" onClick={() => ask(input)} aria-label="Send">
          ↑
        </button>
      </div>
    </main>
  );
}

function AnswerCard({ card }: { card: NonNullable<ChatAnswer["card"]> }) {
  const state = useApp();

  if (card.kind === "safeToSpend") {
    return (
      <section className="card" style={{ padding: 14, maxWidth: "92%" }}>
        <div className="eyebrow">Safe to spend</div>
        <div className="mt-1 text-[24px] font-bold money">{money(card.dailyMinor)}</div>
        <div className="micro">
          per day · {money(card.discretionaryMinor)} total over {card.daysRemaining} days
        </div>
      </section>
    );
  }

  if (card.kind === "worthIt") {
    const r = card.result;
    return (
      <section className="card" style={{ padding: 14, maxWidth: "92%" }}>
        <div className="eyebrow">Impact</div>
        <div className="mt-2 flex flex-col gap-1.5 text-[13.5px]">
          <div className="flex justify-between gap-4">
            <span className="subtle">Safe to Spend/day</span>
            <span className="font-semibold money">
              {money(r.dailySafeToSpendBeforeMinor)} → {money(r.dailySafeToSpendAfterMinor)}
            </span>
          </div>
          {r.goalDelayDays !== null && r.goalName && (
            <div className="flex justify-between gap-4">
              <span className="subtle">{r.goalName}</span>
              <span className="font-semibold">~{r.goalDelayDays} days later</span>
            </div>
          )}
          {r.suggestedDateISO && (
            <div className="flex justify-between gap-4">
              <span className="subtle">Better timing</span>
              <span className="font-semibold" style={{ color: "var(--positive)" }}>
                {formatDateShort(r.suggestedDateISO)}
              </span>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (card.kind === "goal") {
    const g = state.goals.find((x) => x.id === card.goalId);
    if (!g) return null;
    return (
      <section className="card" style={{ padding: 14, maxWidth: "92%" }}>
        <div className="flex items-center gap-2">
          <span aria-hidden>{g.emoji}</span>
          <span className="text-[14px] font-bold">{g.name}</span>
          <span className="micro ms-auto">{g.progressPct}%</span>
        </div>
        <div className="mt-2">
          <ProgressBar pct={g.progressPct} color={BUCKET_COLORS.goals} />
        </div>
        <div className="micro mt-1.5">
          <Money minor={g.currentMinor} hideDecimals /> of <Money minor={g.targetMinor} hideDecimals />
        </div>
      </section>
    );
  }

  if (card.kind === "projection") {
    return (
      <section className="card" style={{ padding: 14, maxWidth: "92%" }}>
        <div className="eyebrow">Hypothetical</div>
        <div className="mt-1 text-[20px] font-bold money">{money(card.futureValueMinor)}</div>
        <div className="micro">
          {money(card.monthlyMinor)}/month · {card.years} years · {card.scenarioLabel} {card.ratePct}% — not guaranteed
        </div>
      </section>
    );
  }

  return null;
}
