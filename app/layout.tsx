import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProvider } from "./components/AppProvider";
import { BottomNav } from "./components/BottomNav";

export const metadata: Metadata = {
  title: "ONE — Every dinar has a mind",
  description: "ONE gives every dinar a job: safe to spend, protection, goals and long-term growth.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ONE" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
    { media: "(prefers-color-scheme: light)", color: "#f2f4f8" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <div className="shell">{children}</div>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
