import { NextResponse } from "next/server";
import { runWithAudit } from "@/lib/auditRun";
import { readCapped, TooLarge } from "@/lib/readCapped";
import { parseTranslationRecord } from "@/lib/translation";
import { MAX_OFFER_CHARS } from "@/lib/types";

// 122,048 bytes: room for MAX_OFFER_CHARS at the worst case of JSON escaping, 6 bytes a character
// (a control character or lone surrogate is sent as \uXXXX), plus 2,048 bytes for the JSON around
// it. Any offer within the character limit fits; the character limit is checked after parsing.
const MAX_BODY_BYTES = MAX_OFFER_CHARS * 6 + 2048;
const TOO_LONG = `Offer text must be ${MAX_OFFER_CHARS.toLocaleString("en-US")} characters or fewer.`;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  // A declared size over the cap is refused before anything is read. A request with no
  // Content-Length is read, and refused only if the body passes the cap.
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return errorResponse(TOO_LONG, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(await readCapped(request, MAX_BODY_BYTES));
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

  // BATCHB-2: after a translation the page sends a fixed-value record (the result and a language
  // code from a fixed list) for the audit trail. It never changes the score or the findings.
  const translation = parseTranslationRecord((body as { translation?: unknown } | null)?.translation);
  return NextResponse.json(await runWithAudit(text, translation));
}
