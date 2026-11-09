"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

// Prints the page (or saves it as PDF from the print dialog). The print stylesheet hides the header,
// footer and controls.
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="secondary" className="no-print" onClick={() => window.print()}>
      <Printer className="icon" aria-hidden="true" />
      {label}
    </Button>
  );
}
