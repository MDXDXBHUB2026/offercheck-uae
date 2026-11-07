import { NextResponse } from "next/server";
import { runWithAudit } from "@/lib/auditRun";
import { MAX_OFFER_CHARS } from "@/lib/types";

// 81,024 bytes: room for MAX_OFFER_CHARS at up to 4 bytes a character, plus the JSON around it.
// Text full of characters JSON escapes as \uXXXX (6 bytes) can hit this cap below 20,000 characters.
const MAX_BODY_BYTES = MAX_OFFER_CHARS * 4 + 1024;
const TOO_LONG = `Offer text must be ${MAX_OFFER_CHARS.toLocaleString("en-US")} characters or fewer.`;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

class TooLarge extends Error {}

// Reads the body as a stream and stops as soon as it passes the cap, without reading the rest.
// A declared Content-Length is never trusted: a short claim on a long body is cut off the same way.
async function readCapped(request: Request): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new TooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request) {
  // A declared size over the cap is refused before anything is read. A request with no
  // Content-Length is read, and refused only if the body passes the cap.
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return errorResponse(TOO_LONG, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(await readCapped(request));
  } catch (error) {
    if (error instanceof TooLarge) return errorResponse(TOO_LONG, 413);
    return errorResponse("Request body must be JSON.", 400);
  }

  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return errorResponse("Paste an offer to check.", 400);
  }
  if (text.length > MAX_OFFER_CHARS) {
    return errorResponse(TOO_LONG, 413);
  }

  return NextResponse.json(await runWithAudit(text));
}
