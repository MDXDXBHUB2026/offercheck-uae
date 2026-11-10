import { T } from "@/components/shell/T";

// Shown while a page segment loads. A plain status line; no progress is invented.
export default function Loading() {
  return (
    <p className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <T>Loading</T>
    </p>
  );
}
