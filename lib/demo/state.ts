/**
 * Demo Mode compatibility shim — the general builder lives in lib/app/state.ts.
 */
import { toISODate } from "../engine/dates";
import { demoBundle } from "../app/bundle";
import { buildAppState, type AppState } from "../app/state";

export type DemoState = AppState;
export type { BucketView, GoalView } from "../app/state";

export function buildDemoState(now = new Date()): AppState {
  return buildAppState(demoBundle(toISODate(now)), "demo", now);
}
