import { getLabData } from "@/lib/labData";

// Roadmap Phase 3: the Test Lab's data as a JSON download, built once at deploy time from the same
// object the /lab page shows. No request data is read, and nothing here calls the network.
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(`${JSON.stringify(getLabData(), null, 2)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="offer-check-test-lab.json"',
    },
  });
}
