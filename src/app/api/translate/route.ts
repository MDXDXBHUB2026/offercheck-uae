import { NextResponse } from "next/server";
import { readCapped, TooLarge } from "@/lib/readCapped";
import { clientAddress, isSameSiteRequest, translateThrottle, translateWithGoogle } from "@/lib/translateServer";
import { TRANSLATE_ERRORS, TRANSLATE_MAX_CHARS, type TranslateErrorCode } from "@/lib/translation";

// BATCHB-2: POST only. After the user agreed on the page, sends the text to Google Cloud Translation
// (Basic, v2) and returns only the English text and a source language code from a fixed list.
// It logs, stores and caches nothing. Errors are fixed codes, never the provider's reply. The key is
// read here, on the server, and goes only into the provider request's header.

// Room for TRANSLATE_MAX_CHARS at the worst case of JSON escaping, 6 bytes a character, plus 2,048.
const MAX_BODY_BYTES = TRANSLATE_MAX_CHARS * 6 + 2048;
const NO_STORE = { "Cache-Control": "no-store" };

function fail(code: TranslateErrorCode) {
  return NextResponse.json({ error: code }, { status: TRANSLATE_ERRORS[code], headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return fail("cross_site");

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return fail("translation_unavailable");

  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return fail("text_too_long");
  let body: unknown;
  try {
    body = JSON.parse(await readCapped(request, MAX_BODY_BYTES));
  } catch (error) {
    return fail(error instanceof TooLarge ? "text_too_long" : "invalid_request");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("invalid_request");
  const { text, consent } = body as { text?: unknown; consent?: unknown };
  if (typeof text !== "string" || text.trim().length === 0) return fail("invalid_request");
  if (text.length > TRANSLATE_MAX_CHARS) return fail("text_too_long");
  // The page sends this only from the consent box's confirm button.
  if (consent !== true) return fail("consent_required");

  if (!translateThrottle.allow(clientAddress(request.headers))) return fail("rate_limited");

  const result = await translateWithGoogle(text, apiKey);
  if (!result.ok) return fail(result.code);
  return NextResponse.json(
    { translatedText: result.translatedText, detectedSourceLanguage: result.detectedSourceLanguage },
    { headers: NO_STORE },
  );
}
