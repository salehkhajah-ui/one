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
import { LocaleProvider } from "./components/LocaleProvider";
import { NetworkProvider } from "./components/network/NetworkProvider";
import { Shell } from "./components/Shell";

export const metadata: Metadata = {
  title: "ONE — Every transaction creates an opportunity",
  description:
    "The Financial Moment Network: verified financial transactions instantly unlock personalized, merchant-funded rewards.",
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
        <LocaleProvider>
          <NetworkProvider>
            <Shell>{children}</Shell>
          </NetworkProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
