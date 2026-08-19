import Link from "next/link";

export const metadata = { title: "ONE — Privacy" };

/** Plain-language privacy policy. Draft for MVP — requires legal review before commercial launch. */
export default function PrivacyPage() {
  return (
    <main className="screen" style={{ paddingBottom: 40 }}>
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          ONE
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">Privacy policy</h1>
        <p className="micro mt-1">Last updated 19 August 2026</p>
      </header>

      <div className="mt-5 flex flex-col gap-4 subtle" style={{ fontSize: 14.5 }}>
        <p>
          ONE is a money-allocation app. Your financial information belongs to you. This page explains, in plain
          language, what ONE stores and what it never does.
        </p>

        <h2 className="section-title mt-2">What ONE stores</h2>
        <p>
          Your setup (income, essentials, bills, balances, goals, risk preference) and the transactions you record or
          import are stored <strong>on your device</strong>. If you sign in with your email, an encrypted-in-transit
          copy is also stored in ONE&apos;s database (hosted on Supabase in the EU) so your data can follow you across
          devices. Each account&apos;s data is isolated with row-level security — no other user can access it.
        </p>

        <h2 className="section-title mt-2">Bank messages</h2>
        <p>
          When you paste or share a bank SMS/notification into ONE, the text is parsed <strong>on your device</strong>{" "}
          to extract the transaction. The message text itself is not transmitted or stored — only the resulting
          transaction (amount, merchant, category, date) is kept.
        </p>

        <h2 className="section-title mt-2">What ONE never does</h2>
        <p>
          ONE does not sell your data, does not show ads, does not connect to your bank without your explicit action,
          and does not move real money. ONE provides educational guidance only and does not execute investments.
        </p>

        <h2 className="section-title mt-2">Your controls</h2>
        <p>
          You can delete your cloud backup at any time from the <Link href="/account" style={{ color: "var(--accent)" }}>Account</Link>{" "}
          screen (&quot;Delete my cloud data&quot;), sign out on any device, or clear everything on-device with
          &quot;Start over&quot; on the Home screen. Deleting your cloud data removes it permanently from ONE&apos;s
          database.
        </p>

        <h2 className="section-title mt-2">Sign-in</h2>
        <p>
          Sign-in is passwordless: your email address is used only to send you a sign-in link/code and to identify your
          account. No passwords are stored.
        </p>

        <h2 className="section-title mt-2">Contact</h2>
        <p>
          Questions or requests (including data export or deletion):{" "}
          <a href="mailto:saleh.khajah@gmail.com" style={{ color: "var(--accent)" }}>
            saleh.khajah@gmail.com
          </a>
          .
        </p>

        <p className="micro">
          This policy covers the ONE MVP and will be reviewed by counsel before commercial launch or app-store-wide
          distribution beyond testing.
        </p>
      </div>
    </main>
  );
}
