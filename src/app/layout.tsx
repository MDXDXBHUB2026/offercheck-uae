import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navbar } from "@/components/shell/Navbar";
import { SiteFooter } from "@/components/shell/site";
import "./globals.css";

// Text uses the font stacks set in globals.css. No font files are downloaded: the reference app's
// Google Fonts are named first in the stack and used only when installed on the device.

export const metadata: Metadata = {
  title: { default: "Offer Check UAE", template: "%s · Offer Check UAE" },
  description: "Rule-based risk indicators for a pasted job offer.",
};

// One header, main landmark and footer for every page. Pages render inside <main>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navbar />
        <main id="main" tabIndex={-1} className="shell page">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
