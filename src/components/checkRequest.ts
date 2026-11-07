import { MAX_OFFER_CHARS } from "@/lib/types";

// What the page says when a check does not complete. Every message is fixed text chosen here: the
// page never shows a string it did not write, so offer text can never be echoed back in an error,
// even if a proxy or a changed server put it in a reply.

export type CheckFailureKind = "offline" | "network" | "too_long" | "rejected" | "server" | "unreadable";

export type CheckFailure = {
  kind: CheckFailureKind;
  title: string;
  message: string;
  // Whether trying the same text again could work.
  retry: boolean;
};

const TOO_LONG = `Offer text must be ${MAX_OFFER_CHARS.toLocaleString("en-US")} characters or fewer.`;

// The server's own 400 messages (src/app/api/analyze/route.ts). Shown only on an exact match.
const KNOWN_REJECTIONS = new Set(["Request body must be JSON.", "Paste an offer to check."]);

const KEEP_TEXT = "Your text is still in the box.";

export function networkFailure(online: boolean): CheckFailure {
  return online
    ? {
        kind: "network",
        title: "Could not reach the server",
        message: `The check did not complete. ${KEEP_TEXT} Try again.`,
        retry: true,
      }
    : {
        kind: "offline",
        title: "You appear to be offline",
        message: `The check needs a connection. ${KEEP_TEXT} Reconnect, then try again.`,
        retry: true,
      };
}

export function responseFailure(status: number, body: unknown): CheckFailure {
  if (status === 413) {
    return { kind: "too_long", title: "Offer text is too long", message: TOO_LONG, retry: false };
  }
  const serverText =
    body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : null;
  if (status >= 400 && status < 500) {
    return {
      kind: "rejected",
      title: "The check could not run",
      message: serverText && KNOWN_REJECTIONS.has(serverText) ? serverText : "The server could not read the request. Try again.",
      retry: false,
    };
  }
  if (status >= 500) {
    return {
      kind: "server",
      title: "Something went wrong on the server",
      message: `The check did not complete. ${KEEP_TEXT} Try again in a moment.`,
      retry: true,
    };
  }
  return {
    kind: "unreadable",
    title: "The reply could not be read",
    message: `The server sent a reply this page cannot read. ${KEEP_TEXT} Try again.`,
    retry: true,
  };
}
