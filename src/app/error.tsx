"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { useT } from "@/components/shell/lang";

// The app-level error boundary. It never shows the error's message or digest: the message could in
// principle carry user text, and the user cannot act on it anyway.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const t = useT();
  return (
    <section className="hero" aria-labelledby="page-title">
      <h1 id="page-title" className="page-title">
        {t("Something went wrong")}
      </h1>
      <p className="intro">{t("This page could not be shown. Offer Check did not save your text.")}</p>
      <p className="hero-actions">
        <Button onClick={() => retry()}>{t("Try again")}</Button>
        <Link className="button-link secondary" href="/check">
          {t("Go to the offer check")}
        </Link>
      </p>
    </section>
  );
}
