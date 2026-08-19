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

/** Suggested prompts surfaced in the Ask ONE UI. */
export const SUGGESTED_PROMPTS = [
  "What can I safely spend this weekend?",
  "Can I afford a 300 KD phone?",
  "When will I reach my Japan goal?",
  "How much did I spend eating out?",
  "Why did ONE allocate money to Protect?",
  "What happens if I increase Grow by 50 KD?",
];
