/**
 * AI provider abstraction. The AI layer EXPLAINS — it never calculates.
 * Implementations receive structured engine outputs (via DemoState/application
 * services) and turn them into language. Chat cannot query data arbitrarily:
 * it goes through the fixed tool surface below.
 */
import type { DemoState } from "../demo/state";
import type { WorthItResult } from "../engine/worthIt";

export type ChatCard =
  | { kind: "safeToSpend"; dailyMinor: number; daysRemaining: number; discretionaryMinor: number }
  | { kind: "worthIt"; result: WorthItResult }
  | { kind: "goal"; goalId: string }
  | { kind: "projection"; monthlyMinor: number; years: number; futureValueMinor: number; scenarioLabel: string; ratePct: number };

export interface ChatAnswer {
  text: string;
  card?: ChatCard;
  /** which application function produced the numbers (auditability) */
  tool: string;
}

export interface AIProvider {
  name: string;
  answerFinancialQuestion(question: string, state: DemoState): ChatAnswer;
}

/** Suggested prompts surfaced in the Ask ONE UI (localized via t()). */
export const SUGGESTED_PROMPT_KEYS = [
  "chat.p.weekend",
  "chat.p.phone",
  "chat.p.japan",
  "chat.p.eating",
  "chat.p.protect",
  "chat.p.grow50",
] as const;
