import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

// Says nothing about the requested address, so nothing from the URL is echoed into the page.
export default function NotFound() {
  return (
    <section className="hero" aria-labelledby="page-title">
      <h1 id="page-title" className="page-title">
        Page not found
      </h1>
      <p className="intro">There is no page at this address.</p>
      <p className="hero-actions">
        <Link className="button-link" href="/check">
          Go to the offer check
        </Link>
      </p>
    </section>
  );
}
