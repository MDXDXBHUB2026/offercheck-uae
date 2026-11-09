import type { Metadata } from "next";
import { ThreatRadar } from "@/components/radar/ThreatRadar";

export const metadata: Metadata = {
  title: "Threat Radar",
  description: "Common job-scam patterns in the UAE, shown with labelled demo examples.",
};

export const dynamic = "force-static";

export default function RadarPage() {
  return <ThreatRadar />;
}
