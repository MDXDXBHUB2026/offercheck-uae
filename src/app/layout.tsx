import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { NoticeStrip, SiteFooter } from "@/components/shell/site";
import "./globals.css";

// Text uses the system font stack set in globals.css (San Francisco on Apple devices), so no
// font files are downloaded.

export const metadata: Metadata = {
  title: { default: "Offer Check UAE", template: "%s · Offer Check UAE" },
  description: "Rule-based risk indicators for a pasted job offer.",
};

// One header, notice, main landmark and footer for every page. Pages render inside <main>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
