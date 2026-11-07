import { describe, expect, it } from "vitest";
import { MAX_OFFER_CHARS } from "@/lib/types";
import { POST } from "./route";

const TOO_LONG = "Offer text must be 20,000 characters or fewer.";

function post(body: string, headers: Record<string, string> = {}): Promise<Response> {
  return POST(new Request("http://localhost/api/analyze", { method: "POST", body, headers }));
}

describe("POST /api/analyze input limits", () => {
  it("has a limit of 20,000 characters", () => {
    expect(MAX_OFFER_CHARS).toBe(20_000);
  });

  it("accepts an offer of exactly the limit", async () => {
    const response = await post(JSON.stringify({ text: "a".repeat(MAX_OFFER_CHARS) }));
    expect(response.status).toBe(200);
  });

  it("rejects one character over the limit with a clear error", async () => {
    const response = await post(JSON.stringify({ text: "a".repeat(MAX_OFFER_CHARS + 1) }));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: TOO_LONG });
  });

  it("rejects a body whose declared size is too large, before reading it", async () => {
    const response = await post(JSON.stringify({ text: "short" }), { "content-length": "999999" });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: TOO_LONG });
  });

  it("rejects empty text and a body that is not JSON", async () => {
    const empty = await post(JSON.stringify({ text: "   " }));
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "Paste an offer to check." });
    const broken = await post("{not json");
    expect(broken.status).toBe(400);
    await expect(broken.json()).resolves.toEqual({ error: "Request body must be JSON." });
  });

  it("never echoes the offer text in an error", async () => {
    const canary = `CANARY-${"x".repeat(MAX_OFFER_CHARS)}`;
    const response = await post(JSON.stringify({ text: canary }));
    expect(await response.text()).not.toContain("CANARY");
  });
});
