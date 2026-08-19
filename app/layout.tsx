import type { Metadata, Viewport } from "next";
import { Titillium_Web } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const titillium = Titillium_Web({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
import { AppProvider } from "./components/AppProvider";
import { BottomNav } from "./components/BottomNav";
import { ServiceWorker } from "./components/ServiceWorker";

export const metadata: Metadata = {
  title: "ONE — Every dinar has a mind",
  description: "ONE gives every dinar a job: safe to spend, protection, goals and long-term growth.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ONE" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030608" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6f7" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={titillium.variable}>
      <body>
        <ServiceWorker />
        <AppProvider>
          <div className="shell">{children}</div>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
