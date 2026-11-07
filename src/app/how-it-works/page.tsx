import type { Metadata } from "next";
import { Placeholder } from "@/components/shell/Placeholder";

export const metadata: Metadata = {
  title: "How it works",
  description: "How Offer Check works. Not built yet.",
};

export default function Page() {
  return <Placeholder title="How it works" planned="a diagram of the agents and the trust boundaries, read from the code so it cannot disagree with the app." />;
}
