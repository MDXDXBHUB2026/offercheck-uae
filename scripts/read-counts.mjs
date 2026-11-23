// Prints the daily totals Offer Check keeps (src/lib/rateLimit.ts, "Daily totals"): checks, errors and
// limit hits for the last 14 UTC days, as a table. For the owner to run on their own computer. There
// is no public endpoint for these numbers.
//
// It reads KV_REST_API_URL and KV_REST_API_TOKEN from your own environment. Nothing is written to a
// file, and the address and token are never printed. To use a local env file that is not committed:
//   node --env-file=.env.local scripts/read-counts.mjs
// or set the two variables in your shell first.
const NAMES = ["checks", "analyze_errors", "analyze_rate_limits", "translate_requests", "translate_refusals"];
const HEAD = ["day (UTC)", "checks", "analyze errors", "analyze 429", "translate requests", "translate refused"];
const DAYS = 14;
const PREFIX = "oc:v1:m";

const url = process.env.KV_REST_API_URL?.trim().replace(/\/+$/, "");
const token = process.env.KV_REST_API_TOKEN?.trim();
if (!url || !token) {
  console.error("KV_REST_API_URL and KV_REST_API_TOKEN are not set in this environment.");
  process.exit(2);
}

const days = Array.from({ length: DAYS }, (_, i) => new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
const commands = days.flatMap((day) => NAMES.map((name) => ["GET", `${PREFIX}:${day.replaceAll("-", "")}:${name}`]));

let replies;
try {
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`the store answered ${response.status}`);
  replies = await response.json();
  if (!Array.isArray(replies) || replies.length !== commands.length) throw new Error("unexpected reply");
} catch (error) {
  // Only the reason, never the address or the token.
  console.error(`Could not read the counts: ${error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, "[address]") : "unknown error"}`);
  process.exit(1);
}

const rows = days.map((day, d) => [day, ...NAMES.map((_, n) => String(Number(replies[d * NAMES.length + n]?.result ?? 0) || 0))]);
const widths = HEAD.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (cells) => cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("  ");
console.log(line(HEAD));
console.log(widths.map((w) => "-".repeat(w)).join("  "));
for (const row of rows) console.log(line(row));
console.log("\nCounts are per UTC day. A day with no counts shows 0. Keys expire after 40 days.");
