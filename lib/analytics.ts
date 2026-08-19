/**
 * Analytics abstraction — no vendor coupling. Events carry behavior, never
 * sensitive financial values. Wire a real sink in Milestone 2+.
 */
export type AnalyticsEvent =
  | "onboarding_started"
  | "onboarding_completed"
  | "payday_plan_viewed"
  | "demo_started"
  | "safe_to_spend_viewed"
  | "allocation_generated"
  | "allocation_adjusted"
  | "allocation_accepted"
  | "goal_viewed"
  | "worth_it_used"
  | "insight_viewed"
  | "insight_resolved"
  | "one_chat_message_sent"
  | "grow_projection_viewed";

type Props = Record<string, string | number | boolean>;

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof console !== "undefined" && process.env.NODE_ENV !== "production") {
    console.debug(`[analytics] ${event}`, props ?? {});
  }
}
