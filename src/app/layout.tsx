import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { NoticeStrip, SiteFooter } from "@/components/shell/site";
import "./globals.css";

// next/font downloads the font files at build time and serves them from this app, so the browser
// makes no request to Google.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-heading" });

export const metadata: Metadata = {
  title: { default: "Offer Check UAE", template: "%s · Offer Check UAE" },
  description: "Rule-based risk indicators for a pasted job offer.",
};

// One header, notice, main landmark and footer for every page. Pages render inside <main>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <NoticeStrip />
        <main id="main" tabIndex={-1} className="shell page">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
