import type { Metadata } from "next";
import { ThreatRadar } from "@/components/radar/ThreatRadar";

export const metadata: Metadata = {
  title: "Threat Radar",
  description: "Common job-scam patterns in the UAE, shown with labelled example reports.",
};

// Rendered per request only so that it gets the CSP nonce (src/proxy.ts); it reads no request data.

export default function RadarPage() {
  return <ThreatRadar />;
}
