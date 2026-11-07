import type { Metadata } from "next";
import { Placeholder } from "@/components/shell/Placeholder";

export const metadata: Metadata = {
  title: "Guide",
  description: "Official-channel guidance. Not built yet.",
};

export default function Page() {
  return <Placeholder title="Guide" planned="guidance on checking an offer through official channels. Each item will be shown only with an official source and the date it was last verified." />;
}
