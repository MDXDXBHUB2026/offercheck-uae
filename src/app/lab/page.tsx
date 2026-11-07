import type { Metadata } from "next";
import { Placeholder } from "@/components/shell/Placeholder";

export const metadata: Metadata = {
  title: "Test Lab",
  description: "Evaluation results for the rules. Not built yet.",
};

export default function Page() {
  return <Placeholder title="Test Lab" planned="results of the rules on the synthetic test sets, computed from the case files, with what they do not prove." />;
}
