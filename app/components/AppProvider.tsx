"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { track } from "../../lib/analytics";
import { toISODate } from "../../lib/engine/dates";
import { demoBundle, manualBundle } from "../../lib/app/bundle";
import { buildAppState, type AppState } from "../../lib/app/state";
import { clearSetup, loadSetup, saveSetup, type StoredTransaction, type UserSetup } from "../../lib/app/storage";
import { deleteCloudData, pickNewer, pullSetup, pushSetup } from "../../lib/app/sync";
import { t } from "../../lib/i18n";
import { cloudSyncConfigured, getSupabase } from "../../lib/supabase/client";
import { useLocale } from "./LocaleProvider";

export type CloudStatus = "off" | "signedOut" | "syncing" | "synced" | "error";

interface AppControls {
  hasSetup: boolean;
  startDemo: () => void;
  completeOnboarding: (manual: NonNullable<UserSetup["manual"]>) => void;
  acceptPlan: (flex: { protectMinor: number; goalsMinor: number; growMinor: number }) => void;
  addTransaction: (tx: Omit<StoredTransaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  resetAll: () => void;
  cloud: { configured: boolean; status: CloudStatus; email: string | null };
  signOutCloud: () => Promise<void>;
  deleteCloud: () => Promise<boolean>;
  refreshCloud: () => void;
}

const StateContext = createContext<AppState | null>(null);
const ControlsContext = createContext<AppControls | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // undefined = still reading storage (pre-mount), null = no setup yet
  const [setup, setSetup] = useState<UserSetup | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(cloudSyncConfigured() ? "signedOut" : "off");
  const [cloudEmail, setCloudEmail] = useState<string | null>(null);

  useEffect(() => {
    setSetup(loadSetup());
  }, []);

  // Cloud sync: reconcile on sign-in (newest wins), then keep pushing changes.
  const reconcile = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setCloudStatus("signedOut");
      setCloudEmail(null);
      return;
    }
    setCloudEmail(session.user.email ?? null);
    setCloudStatus("syncing");
    try {
      const local = loadSetup();
      const remote = await pullSetup(supabase);
      const winner = pickNewer(local, remote);
      if (winner === "remote" && remote) {
        saveSetup(remote.setup);
        setSetup(remote.setup);
      } else if (winner === "local" && local) {
        await pushSetup(supabase, local);
      }
      setCloudStatus("synced");
    } catch {
      setCloudStatus("error");
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    void reconcile();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void reconcile();
      if (event === "SIGNED_OUT") {
        setCloudStatus("signedOut");
        setCloudEmail(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [reconcile]);

  // Push local changes to the cloud (debounced) while signed in.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !setup || cloudStatus === "off" || cloudStatus === "signedOut") return;
    const t = setTimeout(() => {
      void pushSetup(supabase, setup).then((ok) => setCloudStatus(ok ? "synced" : "error"));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup]);

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

  const signOutCloud = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
  }, []);

  const deleteCloud = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return false;
    return deleteCloudData(supabase);
  }, []);

  const controls = useMemo<AppControls>(
    () => ({
      hasSetup: !!setup,
      startDemo,
      completeOnboarding,
      acceptPlan,
      addTransaction,
      deleteTransaction,
      resetAll,
      cloud: { configured: cloudSyncConfigured(), status: cloudStatus, email: cloudEmail },
      signOutCloud,
      deleteCloud,
      refreshCloud: () => void reconcile(),
    }),
    [setup, startDemo, completeOnboarding, acceptPlan, addTransaction, deleteTransaction, resetAll, cloudStatus, cloudEmail, signOutCloud, deleteCloud, reconcile],
  );

  if (setup === undefined) {
    return (
      <div className="shell" aria-busy="true">
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8">
          <div className="hero-number" style={{ color: "var(--brand)" }}>
            ONE
          </div>
          <p className="subtle text-center">{t("brand.tagline")}</p>
        </div>
      </div>
    );
  }

  const gateExempt = pathname.startsWith("/onboarding") || pathname.startsWith("/privacy");
  if (!setup && !gateExempt) {
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
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  useEffect(() => {
    track("onboarding_started");
  }, []);
  return (
    <div className="shell">
      <main className="screen flex min-h-[100dvh] flex-col justify-center gap-8 pb-16">
        <button
          className="chip absolute top-4"
          style={{ insetInlineEnd: 18 }}
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
        >
          {t("common.language")}
        </button>
        <div className="text-center">
          <div className="hero-number" style={{ color: "var(--brand)" }}>
            ONE
          </div>
          <h1 className="mt-4 text-[24px] font-bold tracking-tight">{t("brand.tagline")}</h1>
          <p className="subtle mx-auto mt-3 max-w-[300px]">{t("firstrun.intro")}</p>
        </div>
        <div className="flex flex-col gap-3">
          <button className="btn btn-primary w-full" onClick={() => router.push("/onboarding")}>
            {t("firstrun.build")}
          </button>
          <button className="btn btn-ghost w-full" onClick={startDemo}>
            {t("firstrun.demo")}
          </button>
        </div>
        <p className="micro text-center">{t("firstrun.privacy")}</p>
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
