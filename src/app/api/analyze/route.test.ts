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

// 20,000 characters at 6 bytes each (JSON \uXXXX escapes) plus 2,048 bytes of overhead.
const MAX_BODY_BYTES = 122_048;

// A body with no Content-Length, sent in chunks as a client would stream it. It counts the bytes
// the route pulled and whether the route cancelled the rest.
function streamedBody(total: number, chunkSize: number, prefix = "") {
  const head = new TextEncoder().encode(prefix);
  const seen = { pulled: 0, cancelled: false };
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (seen.pulled >= total) return controller.close();
        const size = Math.min(chunkSize, total - seen.pulled);
        const chunk = new Uint8Array(size).fill(0x61);
        chunk.set(head.subarray(seen.pulled, seen.pulled + size).subarray(0, size));
        controller.enqueue(chunk);
        seen.pulled += size;
      },
      cancel() {
        seen.cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  return { stream, seen };
}

function streamRequest(body: ReadableStream<Uint8Array>, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body,
    headers,
    duplex: "half",
  } as RequestInit);
}

function jsonStream(json: string, chunkSize: number): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(json);
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
}

describe("POST /api/analyze streamed body cap", () => {
  it("reads a small body with no Content-Length", async () => {
    const request = streamRequest(jsonStream(JSON.stringify({ text: "Pay AED 500 to start" }), 7));
    expect(request.headers.get("content-length")).toBeNull();
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("risk.score");
  });

  it("reads an offer of exactly the limit with no Content-Length", async () => {
    const response = await POST(streamRequest(jsonStream(JSON.stringify({ text: "é".repeat(MAX_OFFER_CHARS) }), 4096)));
    expect(response.status).toBe(200);
  });

  it("cuts off an oversized body with no Content-Length at the cap", async () => {
    const chunk = 1024;
    const { stream, seen } = streamedBody(10 * 1024 * 1024, chunk, '{"text":"');
    const request = streamRequest(stream);
    expect(request.headers.get("content-length")).toBeNull();
    const response = await POST(request);
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: TOO_LONG });
    expect(seen.cancelled).toBe(true);
    expect(seen.pulled).toBeGreaterThan(MAX_BODY_BYTES);
    expect(seen.pulled).toBeLessThanOrEqual(MAX_BODY_BYTES + chunk);
  });

  it("does not trust a Content-Length that understates the body", async () => {
    const { stream, seen } = streamedBody(10 * 1024 * 1024, 1024, '{"text":"');
    const response = await POST(streamRequest(stream, { "content-length": "20" }));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: TOO_LONG });
    expect(seen.pulled).toBeLessThanOrEqual(MAX_BODY_BYTES + 1024);
    expect(seen.cancelled).toBe(true);
  });

  it("ignores a small false Content-Length on a valid body", async () => {
    const body = JSON.stringify({ text: "Pay AED 500 to start" });
    expect((await post(body, { "content-length": "5" })).status).toBe(200);
  });

  it("refuses a body one byte over the cap, and never echoes it", async () => {
    const json = JSON.stringify({ text: "CANARY" + "a".repeat(MAX_BODY_BYTES) }).slice(0, MAX_BODY_BYTES + 1);
    const response = await POST(streamRequest(jsonStream(json, 8192)));
    expect(response.status).toBe(413);
    expect(await response.text()).not.toContain("CANARY");
  });
});

describe("POST /api/analyze worst-case JSON escaping", () => {
  // U+0001 is sent as \u0001: 6 bytes in the JSON body for 1 character of text.
  const CONTROL = String.fromCharCode(1);
  const body = (count: number) => JSON.stringify({ text: CONTROL.repeat(count) });

  it("has a byte cap that covers 20,000 escaped characters", () => {
    expect(new TextEncoder().encode(body(MAX_OFFER_CHARS)).length).toBeLessThan(MAX_BODY_BYTES);
  });

  it("accepts 20,000 control characters", async () => {
    const response = await POST(streamRequest(jsonStream(body(MAX_OFFER_CHARS), 8192)));
    expect(response.status).toBe(200);
  });

  it("refuses 20,001 control characters with the same 413 message", async () => {
    const response = await POST(streamRequest(jsonStream(body(MAX_OFFER_CHARS + 1), 8192)));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: TOO_LONG });
  });

  it("still cuts off an oversized chunked body at the new cap", async () => {
    const { stream, seen } = streamedBody(10 * 1024 * 1024, 4096, '{"text":"');
    const response = await POST(streamRequest(stream));
    expect(response.status).toBe(413);
    expect(seen.cancelled).toBe(true);
    expect(seen.pulled).toBeGreaterThan(MAX_BODY_BYTES);
    expect(seen.pulled).toBeLessThanOrEqual(MAX_BODY_BYTES + 4096);
  });
});
