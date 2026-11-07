import Link from "next/link";
import { Callout, Chip } from "@/components/ui";

// A page whose phase has not been built. It says so plainly and promises no content or numbers.
export function Placeholder({ title, planned }: { title: string; planned: string }) {
  return (
    <section className="hero placeholder" aria-labelledby="page-title">
      <Chip tone="not-built">Not built yet</Chip>
      <h1 id="page-title" className="page-title">
        {title}
      </h1>
      <Callout tone="neutral">
        <p>This page is not built yet. Planned: {planned}</p>
        <p>
          <Link href="/check">Go to the offer check</Link>
        </p>
      </Callout>
    </section>
  );
}
