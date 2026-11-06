import { NextResponse } from "next/server";
import { runManager } from "@/lib/agents/manager";
import { MAX_OFFER_CHARS } from "@/lib/types";

const MAX_BODY_BYTES = MAX_OFFER_CHARS * 4 + 1024;
const TOO_LONG = `Offer text must be ${MAX_OFFER_CHARS.toLocaleString("en-US")} characters or fewer.`;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return errorResponse(TOO_LONG, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return errorResponse("Paste an offer to check.", 400);
  }
  if (text.length > MAX_OFFER_CHARS) {
    return errorResponse(TOO_LONG, 413);
  }

  return NextResponse.json(runManager(text));
}
