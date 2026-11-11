import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { OFFICIAL_DOMAINS, OFFICIAL_LABELS, baseDomain, isOfficialHost } from "@/lib/officialDomains";
import { scoreFindings } from "../scoring";
import { MAX_OFFER_CHARS } from "../types";
import { HOLDOUT_OFFERS } from "./eval/holdout";
import { HOLDOUT_2_OFFERS } from "./eval/holdout2";
import { EVAL_OFFERS } from "./eval/offers";
import { LEGIT_OFFER, SCAM_OFFER } from "./fixtures";
import { authorityMentions, companyClaims, emails, links, lookalikeOf, messagingAsks, noFeeClaims, salaryCurrencies } from "./extract";
import { cleanOfferText } from "./intake";
import { runManager } from "./manager";
import { runRedFlagWorker } from "./redFlag";
import { CROSS_CHECKS, matchedIds, runVerification } from "./verification";

// Verification v1 (2026-11-11): text-only, score-neutral cross-checks V-01 to V-05.

const check = (text: string) => {
  const cleaned = cleanOfferText(text).text;
  return runVerification(cleaned, runRedFlagWorker(cleaned));
};
const ids = (text: string) => matchedIds(check(text));
const names = (text: string) => check(text).map((c) => c.check);

describe("the official domain list comes from the existing data files", () => {
  it("is the registrable domains of the URLs in uaeContacts.ts, authorities.ts and warningSigns.ts", () => {
    expect(OFFICIAL_DOMAINS).toEqual(["dubaipolice.gov.ae", "gdrfad.gov.ae", "icp.gov.ae", "mohre.gov.ae", "u.ae"]);
    expect(OFFICIAL_LABELS).toEqual(["dubaipolice", "gdrfad", "icp", "mohre"]);
  });

  it("types no domain by hand", () => {
    const code = readFileSync("src/lib/officialDomains.ts", "utf8").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/gov\.ae|"u\.ae"|https?:\/\//);
  });

  it("takes the registrable part of a host", () => {
    expect(baseDomain("receipts.mohre.gov.ae")).toBe("mohre.gov.ae");
    expect(baseDomain("www.u.ae")).toBe("u.ae");
    expect(baseDomain("a.b.example.co.uk")).toBe("example.co.uk");
    expect(isOfficialHost("smartservices.icp.gov.ae")).toBe(true);
    expect(isOfficialHost("dubai.gov.ae")).toBe(false);
  });
});

describe("extractors", () => {
  it("emails: address and lower-case domain", () => {
    expect(emails("Write to HR.Jobs@Gmail.com or hr@acme.ae")).toEqual([
      { address: "HR.Jobs@Gmail.com", domain: "gmail.com", index: 9 },
      { address: "hr@acme.ae", domain: "acme.ae", index: 30 },
    ]);
  });

  it("links: with a scheme, with www, or a bare host with a known ending; never an email's parts", () => {
    expect(links("Go to https://www.mohre.gov.ae/en/x, www.acme.ae, bit.ly/abc and http://203.0.113.9/a").map((l) => [l.host, l.rawIp])).toEqual([
      ["mohre.gov.ae", false],
      ["acme.ae", false],
      ["bit.ly", false],
      ["203.0.113.9", true],
    ]);
    expect(links("Write to john.co@acme.com today")).toEqual([]);
    expect(links("We are a company.Please reply. Mr.Smith will call.")).toEqual([]);
  });

  it("authority names: MoHRE, ICP (capitals), GDRFA, Dubai Police; not Amer the first name", () => {
    expect(authorityMentions("Registered with MOHRE and the Ministry of Human Resources & Emiratisation").map((m) => m.id)).toEqual(["mohre", "mohre"]);
    expect(authorityMentions("ICP, GDRFA-D, an Amer centre and Dubai Police").map((m) => m.id).sort()).toEqual(["dubai_police", "gdrfa", "gdrfa", "icp"]);
    expect(authorityMentions("Call Amer on Sunday. The icp team is nice.")).toEqual([]);
    // A name inside an address is part of the address, not a mention.
    expect(authorityMentions("Apply at mohre-careers.com or write to jobs@mohre.example.com")).toEqual([]);
    expect(authorityMentions("A MoHRE-approved agency (MoHRE).").map((m) => m.quote)).toEqual(["MoHRE", "MoHRE"]);
  });

  it("company claims: a capitalised name with a legal or trade suffix, or a government body", () => {
    expect(companyClaims("Welcome to Falcon Crest Hospitality.")).toEqual(["Falcon Crest Hospitality"]);
    expect(companyClaims("Desert Star Trading LLC")).toEqual(["Desert Star Trading LLC"]);
    expect(companyClaims("Sent by the Ministry of Interior")).toContain("Ministry of Interior");
    expect(companyClaims("we are a small team of friends")).toEqual([]);
  });

  it("messaging asks: the ask, a messaging link, and whether it says only", () => {
    expect(messagingAsks("Contact us only on WhatsApp")).toEqual({ quotes: ["only on WhatsApp", "Contact us only on WhatsApp"], exclusive: true });
    expect(messagingAsks("Message HR on Telegram").exclusive).toBe(false);
    expect(messagingAsks("Chat here: wa.me/971500000000").quotes).toEqual(["wa.me/"]);
    expect(messagingAsks("Never share anything on WhatsApp")).toEqual({ quotes: [], exclusive: false });
  });

  it("no-fee claims and salary currencies", () => {
    expect(noFeeClaims("There are no fees. Recruitment is free of charge. We do not charge candidates.")).toEqual([
      "no fees",
      "free of charge",
      "do not charge candidates",
    ]);
    expect(salaryCurrencies("Salary AED 9,000 per month (USD 2,450).")).toEqual([
      { code: "AED", quote: "AED 9,000" },
      { code: "USD", quote: "USD 2,450" },
    ]);
    expect(salaryCurrencies("Salary USD 3,000 per month. Pay the visa fee of AED 500.")).toEqual([{ code: "USD", quote: "USD 3,000" }]);
  });

  it("look-alikes of official names, never an official host or an unrelated word", () => {
    for (const host of ["mohre-jobs.com", "mohre.gov.ae.example.net", "moher.gov.ae", "mohree.com", "icp-visa.com", "gdrfa.com", "dubaipolice-jobs.ae"]) {
      expect(lookalikeOf(host), host).not.toBeNull();
    }
    for (const host of ["www.mohre.gov.ae", "receipts.mohre.gov.ae", "smartservices.icp.gov.ae", "u.ae", "icpartners.com", "dubai.gov.ae", "gmail.com"]) {
      expect(lookalikeOf(host), host).toBeNull();
    }
  });
});

describe("V-01: free email address while the text names a company or government body", () => {
  it.each([
    "From: Falcon Crest Hospitality HR <falconcrest.hr.jobs@gmail.com>",
    "Desert Star Trading LLC. Send your CV to deserstar.jobs@yahoo.com",
    "Ministry of Interior recruitment desk: moi.recruit@outlook.com",
    "Approved by MoHRE. Contact hr.mohre.jobs@gmail.com",
  ])("fires: %s", (text) => expect(ids(text)).toContain("V-01"));

  it.each([
    "Write to amir.k@gmail.com about the driver job",
    "Desert Star Trading LLC. Send your CV to careers@desertstar.ae",
  ])("does not fire: %s", (text) => expect(ids(text)).not.toContain("V-01"));

  it("quotes the address and the name", () => {
    expect(check("From: Falcon Crest Hospitality HR <falconcrest.hr.jobs@gmail.com>")[0].evidence).toEqual([
      "falconcrest.hr.jobs@gmail.com",
      "Falcon Crest Hospitality",
    ]);
  });
});

describe("V-02: presents itself as a UAE authority, with no official address (narrowed 2026-11-11)", () => {
  const genuineLetter = SAMPLE_OFFERS.find((offer) => offer.id === "genuine-letter")?.text ?? "";

  // A plain mention of an authority is not a cross-check.
  it.each([
    ["the Standard offer letter sample", genuineLetter],
    ["issued through MoHRE", "Your official offer letter will be issued through MoHRE for your signature."],
    ["through the Ministry", "You will receive the official job offer through the Ministry of Human Resources and Emiratisation to sign."],
    ["work permit approved, no payment", "Your work permit is approved by MoHRE. The company pays all visa costs."],
    ["clearance mentioned", "Dubai Police clearance is included"],
    ["permit mentioned", "ICP has issued your permit"],
    ["thanks, then a mention", "Thank you for applying. Your offer letter will be issued through MoHRE."],
    ["mention, address in the next sentence", "Your MoHRE offer letter will be issued. Please reply to careers@example.ae"],
    ["an official address", "Check the offer on MoHRE: https://www.mohre.gov.ae"],
    ["an official address for ICP", "Apply through ICP at smartservices.icp.gov.ae"],
    ["official address, speaking for", "This is MoHRE. Write to us at enquiries@mohre.gov.ae"],
    ["official sender address", "Write to recruitment@dubaipolice.gov.ae about Dubai Police roles"],
    ["Amer as a name", "Contact Amer at amer@acme.ae"],
    ["no authority", "A plain offer with no authority named"],
    ["the authority only in an address", "Apply at mohre-careers.com"],
  ])("does not fire: %s", (_name, text) => expect(ids(text)).not.toContain("V-02"));

  // Impersonation: speaks as the authority, or gives an address it presents as the authority's.
  it.each([
    ["speaks as, free email", "Dear candidate, this is MoHRE. Send your documents to mohre.jobs.desk@gmail.com"],
    ["from the Ministry, no address", "Greetings from the Ministry of Human Resources and Emiratisation. Your visa is ready."],
    ["officer of the authority", "I am an officer from MoHRE. Call me on +971 50 000 0000."],
    ["role after the name", "Our MoHRE recruitment officer will call you today."],
    ["approved, pay", "Your visa is approved by MoHRE, pay the visa fee of AED 900 today."],
    ["sender line", "From: MoHRE Recruitment <offers@uae-jobs-desk.com>\nYou are selected."],
    ["signature", "You are selected for the role.\nRegards,\nMinistry of Human Resources and Emiratisation\nRecruitment Desk"],
    ["address tied to the name", "This is the GDRFA. Pay at www.gdrfa-pay.com"],
    ["portal of the authority", "Complete the form on the MoHRE portal www.uae-offer-portal.com"],
    ["address, then the name", "Visit www.uae-offer-portal.com, the official MoHRE portal."],
    ["tied address beside an official one", "MoHRE: hr.mohre.desk@gmail.com (see also www.mohre.gov.ae)"],
  ])("fires: %s", (_name, text) => expect(ids(text)).toContain("V-02"));

  it("quotes the words that speak for the authority and the address, never the whole text", () => {
    const evidence = check("Dear candidate, this is MoHRE. Send your documents to mohre.jobs.desk@gmail.com")
      .find((c) => c.id === "V-02")?.evidence;
    expect(evidence).toEqual(["this is MoHRE"]);
    expect(check("Complete the form on the MoHRE portal www.uae-offer-portal.com").find((c) => c.id === "V-02")?.evidence).toEqual([
      "www.uae-offer-portal.com",
    ]);
  });

  it("a plain mention still shows the authority's official step, with no cross-check", () => {
    const result = runManager("Your official offer letter will be issued through MoHRE for your signature.");
    expect(result.crossChecks).toEqual([]);
    expect(result.officialSteps).toEqual([{ key: "authority:mohre_verify", forIds: ["mention:mohre"] }]);
    const step = result.trace.find((s) => s.agent === "official_channel");
    expect(step?.summary).toBe("1 official step for a UAE authority named in the text");
    expect(step?.checkIds).toEqual([]);
    expect(step?.count).toBe(1);
  });

  it("the Standard offer letter sample: no cross-check, the MoHRE offer enquiry step only", () => {
    const result = runManager(genuineLetter);
    expect(result.crossChecks).toEqual([]);
    expect(result.officialSteps).toEqual([{ key: "authority:mohre_verify", forIds: ["mention:mohre"] }]);
  });
});

describe("V-03: shortened links, numeric links and look-alike addresses", () => {
  it.each([
    ["Apply at bit.ly/3xYz", "link_shortener"],
    ["Form: https://tinyurl.com/abc123", "link_shortener"],
    ["Open http://203.0.113.9/apply now", "raw_ip_link"],
    ["Pay at https://mohre-payments.com/visa", "lookalike_domain"],
    ["Write to visa@moher.gov.ae", "lookalike_domain"],
    ["Check mohre.gov.ae.secure-check.net", "lookalike_domain"],
  ])("fires: %s", (text, name) => expect(names(text)).toContain(name));

  it.each([
    "See https://www.mohre.gov.ae/en and https://receipts.mohre.gov.ae/OfferInquiry",
    "Our site is www.desertstar.ae",
    "Version 2.10.3 of the app",
    "No links at all",
  ])("does not fire: %s", (text) => expect(ids(text)).not.toContain("V-03"));
});

describe("V-04: asks to continue only on a messaging app", () => {
  it.each([
    "Contact us only on WhatsApp +971 50 000 0000",
    "Telegram only. Reply today.",
    "Message HR on WhatsApp to continue",
    "Join our Telegram channel for the next step",
    "Chat with us: wa.me/971500000000",
    "Send us your passport copy via WhatsApp",
  ])("fires: %s", (text) => expect(ids(text)).toContain("V-04"));

  it.each([
    "Never send documents to anyone on WhatsApp",
    "Message us on WhatsApp or email careers@desertstar.ae",
    "Our WhatsApp group has 200 members",
    "Apply at https://www.desertstar.ae/careers or chat on WhatsApp",
  ])("does not fire: %s", (text) => expect(ids(text)).not.toContain("V-04"));
});

describe("V-05: contradictions inside the offer", () => {
  it("a payment asked for while the text says there are no fees", () => {
    const text = "There are no fees for this job.\nPay the visa fee of AED 900 today.";
    expect(names(text)).toContain("fee_and_no_fee_claim");
    expect(check(text).find((c) => c.check === "fee_and_no_fee_claim")?.evidence).toEqual([
      runRedFlagWorker(cleanOfferText(text).text).find((f) => f.source === "RF-001")?.evidence[0],
      "no fees",
    ]);
  });

  it("the salary in two currencies", () => {
    expect(names("Salary AED 9,000 per month (USD 2,450).")).toContain("salary_in_two_currencies");
    expect(names("Monthly salary: 50,000 INR or 2,200 AED")).toContain("salary_in_two_currencies");
  });

  it.each([
    "Pay the visa fee of AED 900 today.",
    "There are no fees. The employer pays the visa.",
    "Salary AED 9,000 per month, paid in AED.",
    "Salary USD 3,000 per month. Pay the visa fee of AED 500.",
  ])("does not fire: %s", (text) => expect(ids(text)).not.toContain("V-05"));
});

describe("score-neutral: the score, bands and findings are what they were before", () => {
  const texts: [string, string][] = [
    ["scam fixture", SCAM_OFFER],
    ["legit fixture", LEGIT_OFFER],
    ...SAMPLE_OFFERS.map((offer): [string, string] => [`sample: ${offer.name}`, offer.text]),
    ...[...EVAL_OFFERS, ...HOLDOUT_OFFERS, ...HOLDOUT_2_OFFERS].map((offer): [string, string] => [offer.id, offer.text]),
  ];

  it("covers the 4 samples and all 77 eval cases", () => {
    expect(texts.length).toBe(2 + 4 + 77);
  });

  it.each(texts)("%s", (_name, text) => {
    const cleaned = cleanOfferText(text).text;
    const before = runRedFlagWorker(cleaned);
    const result = runManager(text);
    expect(result.findings).toEqual(before);
    expect(result.risk).toEqual(scoreFindings(before));
    // Nothing from Verification is a finding, and no finding comes from it.
    expect(result.findings.some((f) => f.agent === "verification")).toBe(false);
  });

  it("redFlag.ts and scoring.ts import nothing from the new steps", () => {
    for (const file of ["src/lib/agents/redFlag.ts", "src/lib/scoring.ts"]) {
      const imports = readFileSync(file, "utf8").split(/\r?\n/).filter((line) => /^import\b/.test(line));
      expect(imports.join("\n")).not.toMatch(/verification|officialSteps|crossCheck|extract/);
    }
  });
});

describe("evidence is quoted from the text, and runs are deterministic", () => {
  it.each(SAMPLE_OFFERS.map((offer) => [offer.name, offer.text]))("%s", (_name, text) => {
    const flat = cleanOfferText(text).text.replace(/\s+/g, " ");
    const first = check(text);
    expect(check(text)).toEqual(first);
    for (const quote of first.flatMap((c) => c.evidence)) expect(flat).toContain(quote.replace(/…$/, ""));
  });

  it("every check name belongs to its id", () => {
    for (const result of [check("Apply at bit.ly/x. Salary AED 9,000 per month (USD 2,450). Contact us only on WhatsApp.")]) {
      for (const c of result) {
        expect(CROSS_CHECKS.find((entry) => entry.id === c.id)?.checks as readonly string[]).toContain(c.check);
        expect(c.evidence.length).toBeGreaterThan(0);
        expect(c.evidence.length).toBeLessThanOrEqual(3);
        for (const quote of c.evidence) expect(quote.length).toBeLessThanOrEqual(200);
      }
    }
  });
});

// A small seeded generator, so a failure can be replayed.
function generator(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

const PIECES = [
  "a", "Z", "0", "9", " ", "\n", ".", ",", "@", "-", "/", ":", "_", "(", ")", "$", "₹", "​",
  "http://", "https://", "www.", "bit.ly/", "wa.me/", "gmail.com", "mohre", ".gov.ae", "MoHRE", "ICP", "Dubai Police",
  "WhatsApp", "Telegram", "only", "on", "contact us", "no fees", "pay the fee of AED 500", "Salary", "AED ", "USD ",
  "per month", "LLC", "Trading", "Ministry of ", "203.0.113.9", "never", "not",
];

describe("fuzz: never throws, stays bounded", () => {
  it("500 random texts", () => {
    const random = generator(20261111);
    for (let n = 0; n < 500; n++) {
      const length = Math.floor(random() * 120);
      const text = Array.from({ length }, () => PIECES[Math.floor(random() * PIECES.length)]).join("");
      const result = check(text);
      for (const c of result) {
        expect(c.evidence.length).toBeGreaterThan(0);
        for (const quote of c.evidence) expect(quote.length).toBeLessThanOrEqual(200);
      }
    }
  });

  it("handles maximum-size input quickly", () => {
    const inputs = [
      "a".repeat(MAX_OFFER_CHARS),
      "a.".repeat(MAX_OFFER_CHARS / 2),
      "a@".repeat(MAX_OFFER_CHARS / 2),
      "a-".repeat(MAX_OFFER_CHARS / 2),
      "www.".repeat(MAX_OFFER_CHARS / 4),
      "http://a.".repeat(MAX_OFFER_CHARS / 9),
      "1.".repeat(MAX_OFFER_CHARS / 2),
      "Abc ".repeat(MAX_OFFER_CHARS / 4),
      "Ministry of ".repeat(MAX_OFFER_CHARS / 12),
      "contact ".repeat(MAX_OFFER_CHARS / 8),
      "only whatsapp ".repeat(MAX_OFFER_CHARS / 14),
      "salary AED 1 ".repeat(MAX_OFFER_CHARS / 13),
      "no a b fees ".repeat(MAX_OFFER_CHARS / 12),
      "x@y.com ".repeat(MAX_OFFER_CHARS / 8),
      "MoHRE ".repeat(MAX_OFFER_CHARS / 6),
      "MoHRE portal ".repeat(MAX_OFFER_CHARS / 13),
      "mohre-".repeat(MAX_OFFER_CHARS / 6),
      "this is the ".repeat(MAX_OFFER_CHARS / 12),
      "officer of the ".repeat(MAX_OFFER_CHARS / 15),
      "Regards,\n".repeat(MAX_OFFER_CHARS / 9),
      "From: MoHRE ".repeat(MAX_OFFER_CHARS / 12),
      "approved by MoHRE ".repeat(MAX_OFFER_CHARS / 18),
      "MoHRE x@y.com ".repeat(MAX_OFFER_CHARS / 14),
    ];
    for (const input of inputs) {
      const start = performance.now();
      check(input);
      expect(performance.now() - start, input.slice(0, 20)).toBeLessThan(1000);
    }
  });
});
