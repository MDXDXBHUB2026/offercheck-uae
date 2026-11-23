import { after } from "next/server";
import { recordCount, type CountName } from "@/lib/rateLimit";

// Production Phase 5: adds one to a daily total after the response has been sent, so a slow or dead
// store never delays a request. Outside a request (a unit test, a script) `after` is not available
// and the count simply starts without being waited for. recordCount never throws.
export function countAfter(name: CountName): void {
  try {
    after(() => recordCount(name));
  } catch {
    void recordCount(name);
  }
}
