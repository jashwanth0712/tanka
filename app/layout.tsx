import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";
import { CommandMenuProvider } from "@/components/layout/CommandMenu";
import { DemoBanner, Footer, MobileTabBar, Nav } from "@/components/layout/Shell";
import { Providers } from "./providers";
import "./globals.css";

// One friendly sans for everything (feed, headlines, numbers). Mono only for on-chain data.
const sans = Poppins({ subsets: ["latin", "devanagari"], weight: ["300", "400", "500", "600"], variable: "--font-poppins", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tankha — Salaries no one can delete", template: "%s · Tankha" },
  description:
    "Anonymous company discussions, salary packages and workplace reviews, stored on Arkiv. No company can take them down. Anyone can query them.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <CommandMenuProvider>
            <div aria-hidden className="ambient">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-accent-fg"
            >
              Skip to content
            </a>
            <DemoBanner />
            <Nav />
            <main id="main" className="min-h-[60vh] pb-24 md:pb-0">
              {children}
            </main>
            <Footer />
            <div className="h-20 md:hidden" aria-hidden />
            <MobileTabBar />
          </CommandMenuProvider>
        </Providers>
      </body>
    </html>
  );
}
