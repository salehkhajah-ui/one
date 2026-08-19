"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { buildDemoState, type DemoState } from "../../lib/demo/state";
import { track } from "../../lib/analytics";

const DemoContext = createContext<DemoState | null>(null);

/**
 * Demo Mode state provider. Data is generated client-side (deterministic seed,
 * anchored to the viewer's local date) after mount, so server and client never
 * disagree about "today". Until then we show the ONE splash — which doubles as
 * the "ONE is giving your dinars a job" moment.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => {
    const s = buildDemoState(new Date());
    setState(s);
    track("demo_started");
    track("allocation_generated", { engineVersion: s.allocation.engineVersion });
  }, []);

  if (!state) {
    return (
      <div className="shell" aria-busy="true">
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8">
          <div className="hero-number" style={{ color: "var(--brand)" }}>
            ONE
          </div>
          <p className="subtle text-center">Every dinar has a mind.</p>
          <p className="micro text-center">Giving your dinars a job…</p>
        </div>
      </div>
    );
  }

  return <DemoContext.Provider value={state}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoState {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
