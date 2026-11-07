"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

// The app-level error boundary. It never shows the error's message or digest: the message could in
// principle carry user text, and the user cannot act on it anyway.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="hero" aria-labelledby="page-title">
      <h1 id="page-title" className="page-title">
        Something went wrong
      </h1>
      <p className="intro">This page could not be shown. Your text was not saved anywhere.</p>
      <p className="hero-actions">
        <Button onClick={() => retry()}>Try again</Button>
        <Link className="button-link secondary" href="/check">
          Go to the offer check
        </Link>
      </p>
    </section>
  );
}
