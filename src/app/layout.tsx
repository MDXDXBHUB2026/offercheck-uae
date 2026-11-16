import type { Metadata, Viewport } from "next";
import { APP_BACKGROUND } from "@/lib/appColors";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { Navbar } from "@/components/shell/Navbar";
import { SiteFooter } from "@/components/shell/site";
import { T } from "@/components/shell/T";
import { ArabicNote } from "@/components/shell/ArabicNote";
import "./globals.css";

// Text uses the font stacks set in globals.css. No font files are downloaded: the reference app's
// Google Fonts are named first in the stack and used only when installed on the device.

export const metadata: Metadata = {
  title: { default: "Offer Check UAE", template: "%s · Offer Check UAE" },
  description: "Rule-based risk indicators for a pasted job offer.",
  // Phase 4a (installable web app): the manifest link comes from src/app/manifest.ts; these are the
  // tab icon and the iPhone / iPad home screen icon and name.
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Offer Check", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: APP_BACKGROUND,
};

// One header, main landmark and footer for every page. Pages render inside <main>.
export default async function RootLayout({ children }: { children: ReactNode }) {
  // Every page is rendered per request so that Next.js can put this request's CSP nonce on its
  // scripts (src/proxy.ts, src/lib/csp.ts). A page prerendered at build time has no nonce, and the
  // policy would block its inline scripts.
  await connection();
  return (
    <html lang="en" dir="ltr">
      <body>
        <a className="skip-link" href="#main">
          <T>Skip to content</T>
        </a>
        <Navbar />
        <main id="main" tabIndex={-1} className="shell page">
          {children}
          {/* Phase 4a: on paper and in a saved PDF too (the footer is not printed). */}
          <ArabicNote printOnly />
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
