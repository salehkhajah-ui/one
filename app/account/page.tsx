"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase/client";
import { useAppControls } from "../components/AppProvider";
import { Disclaimer, SectionHeader } from "../components/ui";

export default function AccountPage() {
  const { cloud, signOutCloud, deleteCloud, refreshCloud } = useAppControls();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode() {
    const supabase = getSupabase();
    if (!supabase) return;
    const target = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) return setMessage("Enter a valid email address.");
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/account` },
    });
    setBusy(false);
    if (error) return setMessage(`Couldn't send the code: ${error.message}`);
    setPhase("code");
    setMessage("Check your email — tap the sign-in link, or enter the 6-digit code if the email shows one.");
  }

  async function verifyCode() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setMessage(`That code didn't work: ${error.message}`);
    setMessage(null);
    refreshCloud();
  }

  const statusLabel: Record<string, string> = {
    off: "Not configured in this build",
    signedOut: "Signed out",
    syncing: "Syncing…",
    synced: "Synced",
    error: "Sync error — will retry on next change",
  };

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          Account
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">Cloud sync</h1>
        <p className="subtle mt-1">Back up your ONE setup so it follows you across devices.</p>
      </header>

      {!cloud.configured ? (
        <section className="card mt-5">
          <p className="subtle">
            Cloud sync isn&apos;t active in this build yet — your data lives safely on this device. It switches on
            automatically once ONE&apos;s backend is provisioned.
          </p>
        </section>
      ) : cloud.email ? (
        <>
          <section className="card-elevated mt-5">
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
          <SectionHeader title="Privacy" />
          <section className="card flex flex-col gap-3">
            <button className="btn btn-ghost w-full" onClick={() => void signOutCloud()}>
              Sign out on this device
            </button>
            <button
              className="btn btn-ghost w-full"
              style={{ borderColor: "var(--caution)", color: "var(--caution)" }}
              onClick={async () => {
                if (window.confirm("Delete your cloud backup? Your data stays on this device.")) {
                  const ok = await deleteCloud();
                  setMessage(ok ? "Cloud backup deleted. This device still has your data." : "Couldn't delete right now — try again.");
                }
              }}
            >
              Delete my cloud data
            </button>
          </section>
        </>
      ) : (
        <section className="card mt-5 flex flex-col gap-4">
          {phase === "email" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="micro font-semibold">Email</span>
                <input
                  className="input"
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void sendCode()}
                />
              </label>
              <button className="btn btn-primary w-full" disabled={busy} onClick={() => void sendCode()}>
                {busy ? "Sending…" : "Send sign-in code"}
              </button>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="micro font-semibold">6-digit code sent to {email}</span>
                <input
                  className="input money text-center text-[22px] tracking-[0.4em]"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && void verifyCode()}
                />
              </label>
              <button className="btn btn-primary w-full" disabled={busy || code.length !== 6} onClick={() => void verifyCode()}>
                {busy ? "Verifying…" : "Verify & sync"}
              </button>
              <button className="micro font-semibold" style={{ color: "var(--accent)" }} onClick={() => setPhase("email")}>
                Use a different email
              </button>
            </>
          )}
        </section>
      )}

      {message && <p className="subtle mt-4">{message}</p>}

      <Disclaimer>
        ONE stores only your setup and the transactions you record, encrypted in transit, isolated per account with
        row-level security. Sign-in is passwordless. You can delete the cloud copy at any time.
      </Disclaimer>
    </main>
  );
}
