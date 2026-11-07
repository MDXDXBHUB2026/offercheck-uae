import type { Metadata } from "next";
import { Placeholder } from "@/components/shell/Placeholder";

export const metadata: Metadata = {
  title: "About and limits",
  description: "Intended use and limits of Offer Check. Not built yet.",
};

export default function Page() {
  return <Placeholder title="About and limits" planned="intended use, who it is for, what it does not do and how to report a problem. The current limits are listed at the end of the Check page." />;
}
