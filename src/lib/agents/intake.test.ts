import { describe, expect, it } from "vitest";
import { cleanOfferText } from "./intake";
import { runRedFlagWorker } from "./redFlag";

describe("cleanOfferText", () => {
  it("removes hidden characters and counts them", () => {
    expect(cleanOfferText("visa\u200B fee\uFEFF")).toEqual({ text: "visa fee", hiddenCharsRemoved: 2 });
  });

  it.each([
    ["C0 control", "\u0007"],
    ["DEL", "\u007F"],
    ["C1 control", "\u0085"],
    ["soft hyphen", "\u00AD"],
    ["zero-width space", "\u200B"],
    ["zero-width non-joiner", "\u200C"],
    ["zero-width joiner", "\u200D"],
    ["left-to-right mark", "\u200E"],
    ["right-to-left mark", "\u200F"],
    ["left-to-right embedding", "\u202A"],
    ["right-to-left override", "\u202E"],
    ["word joiner", "\u2060"],
    ["left-to-right isolate", "\u2066"],
    ["pop directional isolate", "\u2069"],
    ["byte order mark", "\uFEFF"],
  ])("removes a %s", (_name, char) => {
    expect(cleanOfferText(`vi${char}sa`)).toEqual({ text: "visa", hiddenCharsRemoved: 1 });
  });

  it("removes a right-to-left override and a byte order mark together", () => {
    expect(cleanOfferText("\uFEFFPay\u202E the fee")).toEqual({
      text: "Pay the fee",
      hiddenCharsRemoved: 2,
    });
  });

  it("keeps tabs and blank lines", () => {
    const text = "one\ttwo\n\nthree";
    expect(cleanOfferText(text)).toEqual({ text, hiddenCharsRemoved: 0 });
  });

  it("normalizes line endings and non-breaking spaces", () => {
    expect(cleanOfferText("  one two\r\n\r\nthree\u00A0four\r\rfive\u202Fsix  ").text).toBe(
      "one two\n\nthree four\n\nfive six",
    );
  });

  it("leaves ordinary text unchanged", () => {
    const text = "Salary AED 12,000 per month. The role is based in Dubai.";
    expect(cleanOfferText(text)).toEqual({ text, hiddenCharsRemoved: 0 });
  });

  it("joins a hard-wrapped line and keeps paragraphs", () => {
    expect(cleanOfferText("Salary AED 12,000\nper month.\n \nThe role is\nin Dubai.").text).toBe(
      "Salary AED 12,000 per month.\n\nThe role is in Dubai.",
    );
  });

  it.each([
    "Visa fee: paid by employer\nTraining fee: AED 500",
    "- Visa is covered\n- Pay AED 500 to our agent",
    "1. Visa is covered\n2. Pay AED 500 to our agent",
    "URGENT\nSend your CV",
    "Visa is covered\nPay AED 500 to our agent",
  ])("keeps the line break in %j", (text) => {
    expect(cleanOfferText(text).text).toBe(text);
  });

  it.each([
    ["Please pay the visa\nprocessing fee today", "fee_requested"],
    ["Please send us the\nOTP from your bank", "credentials_requested"],
    ["Visa fee: paid by employer\nTraining fee: AED 500", "fee_requested"],
    ["URGENT\nSend your CV", "urgency_pressure"],
    ["Visa is covered\nPay AED 500 to our agent", "fee_requested"],
  ])("lets a rule match across lines in %j", (raw, check) => {
    const { text } = cleanOfferText(raw);
    expect(runRedFlagWorker(text).map((finding) => finding.check)).toContain(check);
  });

  it("lets a rule match a phrase split by a hidden character", () => {
    const { text } = cleanOfferText("Pay the visa\u200B fee today");
    expect(runRedFlagWorker(text).map((finding) => finding.check)).toContain("fee_requested");
  });
});
