/**
 * Device persistence for the demo network state (mirrors lib/app/storage.ts).
 * Everything stays in this browser; "reset demo" simply clears the key.
 */
import { seedNetworkState } from "./seed";
import type { NetworkState } from "./types";

const KEY = "one.network.v1";

export function loadNetworkState(): NetworkState {
  if (typeof window === "undefined") return seedNetworkState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seedNetworkState();
    const parsed = JSON.parse(raw) as NetworkState;
    if (parsed.version !== 1) return seedNetworkState();
    return parsed;
  } catch {
    return seedNetworkState();
  }
}

export function saveNetworkState(state: NetworkState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full/blocked — demo state simply won't persist */
  }
}

export function clearNetworkState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
