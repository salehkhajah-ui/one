"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { track } from "../../lib/analytics";
import { toISODate } from "../../lib/engine/dates";
import { demoBundle, manualBundle } from "../../lib/app/bundle";
import { buildAppState, type AppState } from "../../lib/app/state";
import { clearSetup, loadSetup, saveSetup, type StoredTransaction, type UserSetup } from "../../lib/app/storage";

interface AppControls {
  hasSetup: boolean;
  startDemo: () => void;
  completeOnboarding: (manual: NonNullable<UserSetup["manual"]>) => void;
  acceptPlan: (flex: { protectMinor: number; goalsMinor: number; growMinor: number }) => void;
  addTransaction: (tx: Omit<StoredTransaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  resetAll: () => void;
}

const StateContext = createContext<AppState | null>(null);
const ControlsContext = createContext<AppControls | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // undefined = still reading storage (pre-mount), null = no setup yet
  const [setup, setSetup] = useState<UserSetup | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setSetup(loadSetup());
  }, []);

  const state = useMemo<AppState | null>(() => {
    if (!setup) return null;
    const now = new Date();
    const todayISO = toISODate(now);
    const userTx = setup.transactions ?? [];
    if (setup.mode === "manual" && setup.manual) {
      return buildAppState(manualBundle(setup.manual, todayISO, userTx), "manual", now, setup.acceptedPlan);
    }
    return buildAppState(demoBundle(todayISO, userTx), "demo", now, setup.acceptedPlan);
  }, [setup]);

  const startDemo = useCallback(() => {
    const s: UserSetup = { version: 1, mode: "demo", createdAtISO: toISODate(new Date()) };
    saveSetup(s);
    setSetup(s);
    track("demo_started");
    router.push("/");
  }, [router]);

  const completeOnboarding = useCallback(
    (manual: NonNullable<UserSetup["manual"]>) => {
      const s: UserSetup = { version: 1, mode: "manual", createdAtISO: toISODate(new Date()), manual };
      saveSetup(s);
      setSetup(s);
      track("onboarding_completed");
    },
    [],
  );

  const acceptPlan = useCallback<AppControls["acceptPlan"]>(
    (flex) => {
      setSetup((prev) => {
        if (!prev) return prev;
        const current = state;
        const next: UserSetup = {
          ...prev,
          acceptedPlan: {
            appliedUntilISO: current?.nextPaydayISO ?? toISODate(new Date()),
            protectMinor: flex.protectMinor,
            goalsMinor: flex.goalsMinor,
            growMinor: flex.growMinor,
          },
        };
        saveSetup(next);
        return next;
      });
      track("allocation_accepted");
    },
    [state],
  );

  const addTransaction = useCallback<AppControls["addTransaction"]>((tx) => {
    setSetup((prev) => {
      if (!prev) return prev;
      const stored: StoredTransaction = { ...tx, id: `user-tx-${Date.now()}-${Math.floor(Math.random() * 1e6)}` };
      const next: UserSetup = { ...prev, transactions: [stored, ...(prev.transactions ?? [])] };
      saveSetup(next);
      return next;
    });
    track("transaction_added");
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setSetup((prev) => {
      if (!prev) return prev;
      const next: UserSetup = { ...prev, transactions: (prev.transactions ?? []).filter((t) => t.id !== id) };
      saveSetup(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    clearSetup();
    setSetup(null);
    router.push("/");
  }, [router]);

  const controls = useMemo<AppControls>(
    () => ({ hasSetup: !!setup, startDemo, completeOnboarding, acceptPlan, addTransaction, deleteTransaction, resetAll }),
    [setup, startDemo, completeOnboarding, acceptPlan, addTransaction, deleteTransaction, resetAll],
  );

  if (setup === undefined) {
    return (
      <div className="shell" aria-busy="true">
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8">
          <div className="hero-number" style={{ color: "var(--brand)" }}>
            ONE
          </div>
          <p className="subtle text-center">Every dinar has a mind.</p>
        </div>
      </div>
    );
  }

  const onboarding = pathname.startsWith("/onboarding");
  if (!setup && !onboarding) {
    return (
      <ControlsContext.Provider value={controls}>
        <FirstRun />
      </ControlsContext.Provider>
    );
  }

  return (
    <ControlsContext.Provider value={controls}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ControlsContext.Provider>
  );
}

function FirstRun() {
  const { startDemo } = useAppControls();
  const router = useRouter();
  useEffect(() => {
    track("onboarding_started");
  }, []);
  return (
    <div className="shell">
      <main className="screen flex min-h-[100dvh] flex-col justify-center gap-8 pb-16">
        <div className="text-center">
          <div className="hero-number" style={{ color: "var(--brand)" }}>
            ONE
          </div>
          <h1 className="mt-4 text-[24px] font-bold tracking-tight">Every dinar has a mind.</h1>
          <p className="subtle mx-auto mt-3 max-w-[300px]">
            ONE understands your money and gives every dinar a job — spending, protection, goals and growth.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button className="btn btn-primary w-full" onClick={() => router.push("/onboarding")}>
            Build my ONE plan
          </button>
          <button className="btn btn-ghost w-full" onClick={startDemo}>
            Try the demo first
          </button>
        </div>
        <p className="micro text-center">
          Your numbers stay on this device. ONE provides educational guidance and never moves real money.
        </p>
      </main>
    </div>
  );
}

export function useApp(): AppState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider with completed setup");
  return ctx;
}

export function useAppControls(): AppControls {
  const ctx = useContext(ControlsContext);
  if (!ctx) throw new Error("useAppControls must be used inside AppProvider");
  return ctx;
}

/** Null-safe variant for chrome (nav) that renders before/without setup. */
export function useAppMaybe(): AppState | null {
  return useContext(StateContext);
}
