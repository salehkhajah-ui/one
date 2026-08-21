"use client";

import { useState } from "react";
import { t } from "../../lib/i18n";
import { getSupabase } from "../../lib/supabase/client";
import { useAppControls } from "../components/AppProvider";
import { useLocale } from "../components/LocaleProvider";
import { Disclaimer, SectionHeader } from "../components/ui";

export default function AccountPage() {
  const { cloud, signOutCloud, deleteCloud, refreshCloud } = useAppControls();
  const { locale, setLocale } = useLocale();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode() {
    const supabase = getSupabase();
    if (!supabase) return;
    const target = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) return setMessage(t("acct.invalidEmail"));
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/account` },
    });
    setBusy(false);
    if (error) return setMessage(t("acct.sendFailed", { msg: error.message }));
    setPhase("code");
    setMessage(t("acct.checkEmail"));
  }

  async function verifyCode() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setMessage(t("acct.codeFailed", { msg: error.message }));
    setMessage(null);
    refreshCloud();
  }

  const statusLabel: Record<string, string> = {
    off: t("acct.notConfigured"),
    signedOut: t("acct.status.signedOut"),
    syncing: t("acct.status.syncing"),
    synced: t("acct.status.synced"),
    error: t("acct.status.error"),
  };

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          {t("acct.eyebrow")}
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("acct.title")}</h1>
        <p className="subtle mt-1">{t("acct.subtitle")}</p>
      </header>

      <section className="card mt-5 flex items-center justify-between" style={{ padding: 14 }}>
        <span className="text-[14px] font-semibold">{t("acct.language")}</span>
        <button className="chip" onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
          {t("common.language")}
        </button>
      </section>

      {!cloud.configured ? (
        <section className="card mt-4">
          <p className="subtle">{t("acct.notConfigured")}</p>
        </section>
      ) : cloud.email ? (
        <>
          <section className="card-elevated mt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold">{cloud.email}</div>
                <div className="micro mt-0.5">{statusLabel[cloud.status]}</div>
              </div>
              <span
                className="bucket-dot"
                style={{
                  background:
                    cloud.status === "synced"
                      ? "var(--positive)"
                      : cloud.status === "error"
                        ? "var(--caution)"
                        : "var(--text-3)",
                }}
                aria-hidden
              />
            </div>
          </section>
          <SectionHeader title={t("acct.privacy")} />
          <section className="card flex flex-col gap-3">
            <button className="btn btn-ghost w-full" onClick={() => void signOutCloud()}>
              {t("acct.signOut")}
            </button>
            <button
              className="btn btn-ghost w-full"
              style={{ borderColor: "var(--caution)", color: "var(--caution)" }}
              onClick={async () => {
                if (window.confirm(t("acct.deleteConfirm"))) {
                  const ok = await deleteCloud();
                  setMessage(ok ? t("acct.deleted") : t("acct.deleteFailed"));
                }
              }}
            >
              {t("acct.deleteCloud")}
            </button>
          </section>
        </>
      ) : (
        <section className="card mt-4 flex flex-col gap-4">
          {phase === "email" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="micro font-semibold">{t("acct.email")}</span>
                <input
                  className="input"
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void sendCode()}
                />
              </label>
              <button className="btn btn-primary w-full" disabled={busy} onClick={() => void sendCode()}>
                {busy ? t("acct.sending") : t("acct.sendCode")}
              </button>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="micro font-semibold">{t("acct.codeSentTo", { email })}</span>
                <input
                  className="input money text-center text-[22px] tracking-[0.4em]"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  dir="ltr"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && void verifyCode()}
                />
              </label>
              <button className="btn btn-primary w-full" disabled={busy || code.length !== 6} onClick={() => void verifyCode()}>
                {busy ? t("acct.verifying") : t("acct.verify")}
              </button>
              <button className="micro font-semibold" style={{ color: "var(--accent)" }} onClick={() => setPhase("email")}>
                {t("acct.diffEmail")}
              </button>
            </>
          )}
        </section>
      )}

      {message && <p className="subtle mt-4">{message}</p>}

      <Disclaimer>{t("acct.disclaimer")}</Disclaimer>
    </main>
  );
}
