import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/shell/T";

export const metadata: Metadata = {
  title: "Page not found",
};

// Says nothing about the requested address, so nothing from the URL is echoed into the page.
export default function NotFound() {
  return (
    <section className="hero" aria-labelledby="page-title">
      <h1 id="page-title" className="page-title">
        <T>Page not found</T>
      </h1>
      <p className="intro">
        <T>There is no page at this address.</T>
      </p>
      <p className="hero-actions">
        <Link className="button-link" href="/check">
          <T>Go to the offer check</T>
        </Link>
      </p>
    </section>
  );
}
