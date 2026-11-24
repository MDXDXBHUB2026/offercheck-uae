import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTHORITIES, mainChannels } from "@/lib/authorities";
import { MOHRE_INQUIRY_URL, UAE_CONTACTS } from "@/data/uaeContacts";
import { hasArabic } from "@/lib/i18n";
import {
  CANNOT_KNOW,
  checkSender,
  emailParts,
  FIELD_NAMES,
  hostFromAddress,
  isFreeMail,
  isOfficialHost,
  lookalikeOf,
  NEXT_STEPS,
  NOTHING_FLAGGED,
  officialBases,
  officialHosts,
  readPhone,
  SENDER_TEMPLATES,
  type SenderInput,
} from "@/lib/senderCheck";

// Production Phase 7 (2026-11-24): the Sender check logic. Pure text in, plain facts out.

const BLANK: SenderInput = { email: "", phone: "", web: "", company: "" };
const run = (partial: Partial<SenderInput>) => {
  const result = checkSender({ ...BLANK, ...partial });
  return result.kind === "checked" ? result.findings : [];
};
const ids = (partial: Partial<SenderInput>) => run(partial).map((finding) => finding.id);

afterEach(() => vi.restoreAllMocks());

describe("official addresses are read from authorities.ts and uaeContacts.ts, never copied", () => {
  it("every official host comes from a URL in those two files", () => {
    const urls = [
      ...AUTHORITIES.flatMap((entry) => [entry.sourceUrl, entry.alsoSee?.url ?? ""]),
      ...UAE_CONTACTS.map((entry) => entry.url),
      MOHRE_INQUIRY_URL,
    ];
    for (const host of officialHosts()) expect(urls.some((url) => url.includes(`//${host}`) || url.includes(`//www.${host}`)), host).toBe(true);
    expect(officialHosts()).toEqual(expect.arrayContaining(["mohre.gov.ae", "u.ae", "gdrfad.gov.ae", "dubaipolice.gov.ae"]));
    expect(officialBases()).toEqual(expect.arrayContaining(["mohre.gov.ae", "icp.gov.ae", "u.ae"]));
  });

  it("the main reporting channels are all official hosts", () => {
    for (const channel of mainChannels()) expect(isOfficialHost(new URL(channel.url).hostname.replace(/^www\./, "")), channel.id).toBe(true);
  });

  it("the module has no web address of its own and imports the two source files", () => {
    const source = readFileSync("src/lib/senderCheck.ts", "utf8");
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).toContain('from "@/lib/authorities"');
    expect(source).toContain('from "@/data/uaeContacts"');
  });
});

describe("b: a domain that looks like an official one but is not the same", () => {
  it.each([
    ["rnohre.gov.ae", "swapped", "mohre.gov.ae"],
    ["m0hre.gov.ae", "swapped", "mohre.gov.ae"],
    ["mohre.gov.ae".replace("o", "о"), "swapped", "mohre.gov.ae"],
    ["mo-hre.gov.ae", "hyphens", "mohre.gov.ae"],
    ["mohre.gov.ae.example.com", "added", "mohre.gov.ae"],
    ["mohre-jobs.com", "added", "mohre.gov.ae"],
    ["dubaipolice-ecrime.net", "added", "dubaipolice.gov.ae"],
    ["mohrre.gov.ae", "close", "mohre.gov.ae"],
    ["gdrfa.gov.ae", "close", "gdrfad.gov.ae"],
  ])("%s is %s: looks like %s", (host, how, official) => {
    const found = lookalikeOf(host);
    expect(found?.how, host).toBe(how);
    expect(found?.official, host).toBe(official);
  });

  it.each(["mohre.gov.ae", "jobs.mohre.gov.ae", "receipts.mohre.gov.ae", "u.ae", "x.u.ae", "dubaipolice.gov.ae"])(
    "%s is an official address, so it is not flagged",
    (host) => {
      expect(isOfficialHost(host)).toBe(true);
      expect(lookalikeOf(host)).toBeNull();
    },
  );

  it.each(["example.com", "desertstar.ae", "acme-trading.ae", "company.co.uk", "x.ae", "bright-path-staffing.com", "gmail.com"])(
    "%s resembles no official address",
    (host) => {
      expect(lookalikeOf(host)).toBeNull();
    },
  );

  it("a mix of official-looking and unrelated domains: only the look-alikes are flagged, naming the official one", () => {
    const flagged = ["example.com", "rnohre.gov.ae", "acme.ae", "mohre-careers.com", "mohre.gov.ae"].filter((host) => lookalikeOf(host));
    expect(flagged).toEqual(["rnohre.gov.ae", "mohre-careers.com"]);
    const finding = run({ web: "https://rnohre.gov.ae/apply" })[0];
    expect(finding.args).toEqual(["web address", "rnohre.gov.ae", "mohre.gov.ae"]);
  });

  it("works for the email domain and the web address, with the field named", () => {
    expect(ids({ email: "hr@rnohre.gov.ae" })).toContain("email-lookalike-swapped");
    expect(ids({ web: "rnohre.gov.ae" })).toContain("web-lookalike-swapped");
  });
});

describe("a: free-mail providers", () => {
  it.each(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.ae", "icloud.com", "proton.me", "live.com.au"])(
    "%s is a free-mail provider",
    (host) => {
      expect(isFreeMail(host)).toBe(true);
    },
  );

  it.each(["gmail.com.example.net", "mygmail.com", "example.com", "company.ae", "yahoo.example.com"])("%s is not", (host) => {
    expect(isFreeMail(host)).toBe(false);
  });

  it("states the provider and what to do next, and skips the other domain checks for it", () => {
    const [finding, ...rest] = run({ email: "Jobs@Gmail.com", company: "Desert Star" });
    expect(finding.id).toBe("email-free-mail");
    expect(finding.args).toEqual(["gmail.com"]);
    expect(finding.next).toContain("official channels");
    expect(rest).toEqual([]);
  });

  it("does not own the red-flag rules' list: this module never imports redFlag.ts", () => {
    const imports = (file: string) =>
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter((line) => /^import /.test(line))
        .join(" ");
    expect(imports("src/lib/senderCheck.ts")).not.toMatch(/redFlag|agents\/|scoring|manager/);
    expect(imports("src/components/SenderCheck.tsx")).not.toMatch(/redFlag|agents\/|scoring|manager/);
    expect(imports("src/app/sender/page.tsx")).not.toMatch(/redFlag|agents\/|scoring|manager/);
  });
});

describe("c: international (punycode) and mixed-script domains", () => {
  it("flags an xn-- label", () => {
    expect(ids({ web: "xn--mhre-9ua.gov.ae" })).toContain("web-international");
    expect(ids({ email: "hr@xn--80ak6aa92e.com" })).toContain("email-international");
  });

  it("flags a name that mixes Latin and Cyrillic letters, and says so as a fact", () => {
    const found = run({ web: "mоhre.gov.ae" });
    expect(found.map((f) => f.id)).toEqual(expect.arrayContaining(["web-mixed-script", "web-lookalike-swapped"]));
    expect(found.find((f) => f.id === "web-mixed-script")?.fact).toContain("mixes letters from more than one writing system");
  });

  it("a name wholly in one other script is international, not mixed", () => {
    expect(ids({ web: "مثال.امارات" })).toEqual(["web-international"]);
  });

  it("an ordinary a-to-z name is neither", () => {
    expect(ids({ web: "example.com" })).toEqual([]);
  });
});

describe("d: the email domain against the company name", () => {
  it("says the domain does not contain any word from the name, never that anything is fake", () => {
    const found = run({ email: "hr@acme-trading.ae", company: "Desert Star Recruitment" });
    expect(found.map((f) => f.id)).toEqual(["email-no-company-name"]);
    expect(found[0].fact).toBe("The email domain ({0}) does not contain any word from the company name you typed ({1}). A company's own domain often does, but not always.");
    expect(found[0].args).toEqual(["acme-trading.ae", "Desert Star Recruitment"]);
    expect(JSON.stringify(found)).not.toMatch(/fake|scam|fraud/i);
  });

  it.each([
    ["hr@desertstar.ae", "Desert Star Recruitment"],
    ["jobs@desert-star-group.com", "Desert Star LLC"],
    ["hr@falconcrest.ae", "Falcon Crest Hospitality"],
  ])("%s contains a word from %s, so nothing is flagged", (email, company) => {
    expect(ids({ email, company })).toEqual([]);
  });

  it("is skipped when no company name was typed, for a name in another script, and for an official domain", () => {
    expect(ids({ email: "hr@acme-trading.ae" })).toEqual([]);
    expect(ids({ email: "hr@acme-trading.ae", company: "شركة النجم" })).toEqual([]);
    expect(ids({ email: "hr@mohre.gov.ae", company: "Desert Star" })).toEqual([]);
  });

  it("only compares with the email domain, not with the web address", () => {
    expect(ids({ web: "acme-trading.ae", company: "Desert Star" })).toEqual([]);
  });
});

describe("e: phone numbers against UAE numbering (ITU-T filing, TRA, 2006; owner's mobile prefixes)", () => {
  it.each([
    "+971 50 123 4567",
    "+971501234567",
    "00971 52 123 4567",
    "050 123 4567",
    "0551234567",
    "+971 54 123 4567",
    "+971 (0)56 123 4567",
    "+971 58 123 4567",
    "+971 4 123 4567",
    "04 123 4567",
    "+971 2 123 4567",
    "+971 3 123 4567",
    "+971 6 123 4567",
    "+971 7 123 4567",
    "+971 9 123 4567",
    "+971 800 5111",
    "800 5111",
    "+971 800 4444 5555",
  ])("%s has a UAE format: nothing is flagged", (phone) => {
    expect(ids({ phone })).toEqual([]);
  });

  it.each([
    ["+971 50 123 456", "phone-mobile-length", ["50", "8"]],
    ["+971 50 123 45678", "phone-length", ["10"]],
    ["+971 4 123 456", "phone-length", ["7"]],
    ["+971 4 1234 5678", "phone-landline-length", ["4", "9"]],
    ["+971 4 123 45", "phone-length", ["6"]],
    ["+971 53 123 4567", "phone-unknown-start", ["53"]],
    ["+971 1 234 5678", "phone-unknown-start", ["12"]],
  ])("%s is flagged as %s", (phone, id, args) => {
    const [finding] = run({ phone });
    expect(finding.id).toBe(id);
    expect(finding.args).toEqual(args);
  });

  it.each(["+44 7700 900123", "0044 7700 900123", "+1 415 555 0100", "+91 98765 43210"])("%s has a country code other than +971", (phone) => {
    expect(ids({ phone })).toEqual(["phone-other-country"]);
  });

  it("does not say which country, and does not call the number anything", () => {
    const [finding] = run({ phone: "+44 7700 900123" });
    expect(finding.fact).toContain("Offer Check does not look up which country it belongs to");
    expect(finding.fact).not.toMatch(/United Kingdom|\bUK\b|fake|scam|VoIP|registered/i);
  });

  it("flags letters and a number with no country code and no leading 0", () => {
    expect(ids({ phone: "05O1234567" })).toEqual(["phone-letters"]);
    expect(ids({ phone: "501234567" })).toEqual(["phone-no-country"]);
    expect(ids({ phone: "+" })).toEqual(["phone-no-country"]);
  });

  it("reads separators of every kind the same way", () => {
    for (const phone of ["+971-50-123-4567", "+971 (50) 123.4567", "  +971 50 123 4567  ", "00971501234567"]) {
      expect(readPhone(phone), phone).toEqual({ kind: "uae", national: "501234567" });
    }
  });
});

describe("reading what was typed", () => {
  it("keeps only the host name of a pasted web address and opens nothing", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(hostFromAddress("https://user:pw@WWW.Example.com:8443/path/a?b=c#d")).toBe("example.com");
    expect(hostFromAddress("//mohre.gov.ae/x")).toBe("mohre.gov.ae");
    expect(hostFromAddress("Example.COM.")).toBe("example.com");
    expect(hostFromAddress("hr@example.com")).toBe("example.com");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "localhost", "not a host", "http://", "a b.com", "...", "-"])("%j is not a host", (text) => {
    expect(hostFromAddress(text)).toBeNull();
  });

  it("reads an email address, and says when it cannot", () => {
    expect(emailParts("Name@Example.COM")).toEqual({ host: "example.com" });
    for (const bad of ["name", "name@", "@example.com", "a@b@example.com", "name@localhost", "Name <a@b.com>"]) expect(emailParts(bad), bad).toBeNull();
    expect(ids({ email: "name@" })).toEqual(["email-unreadable"]);
    expect(ids({ web: "not a host" })).toEqual(["web-unreadable"]);
  });
});

describe("the whole check", () => {
  it("needs at least one of the email, phone and web address; a company name alone is not enough", () => {
    expect(checkSender(BLANK)).toEqual({ kind: "empty" });
    expect(checkSender({ ...BLANK, company: "Desert Star" })).toEqual({ kind: "empty" });
    expect(checkSender({ ...BLANK, email: "   " })).toEqual({ kind: "empty" });
  });

  it("an ordinary-looking set of inputs flags nothing", () => {
    const result = checkSender({ email: "hr@desertstar.ae", phone: "+971 4 123 4567", web: "https://desertstar.ae/careers", company: "Desert Star LLC" });
    expect(result).toEqual({ kind: "checked", findings: [], fieldsChecked: ["email", "web", "phone"] });
  });

  it("each finding is a fact and a next step, with its field", () => {
    const findings = run({ email: "x@gmail.com", phone: "+44 7700 900123", web: "rnohre.gov.ae" });
    expect(findings.map((f) => f.field).sort()).toEqual(["email", "phone", "web"]);
    for (const finding of findings) {
      expect(finding.fact.length).toBeGreaterThan(20);
      expect(finding.next.length).toBeGreaterThan(20);
    }
  });

  it("makes no network call and touches no browser storage, whatever is typed", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in the Sender check"));
    const sendBeacon = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon });
    const xhr = vi.fn();
    vi.stubGlobal("XMLHttpRequest", xhr);
    for (const input of [
      { email: "hr@rnohre.gov.ae", phone: "+971 50 123 4567", web: "https://mohre.gov.ae/x", company: "Desert Star" },
      { email: "a@gmail.com", phone: "bad", web: "xn--mhre-9ua.gov.ae", company: "" },
      { email: "", phone: "", web: "", company: "x" },
    ]) {
      checkSender(input);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("is deterministic: the same input gives the same findings", () => {
    const input = { email: "hr@mohre-careers.com", phone: "+44 7700 900123", web: "https://rnohre.gov.ae/x", company: "Desert Star" };
    expect(JSON.stringify(checkSender(input))).toBe(JSON.stringify(checkSender({ ...input })));
  });
});

describe("wording", () => {
  const BANNED = /probabilit|reliab|trust score|\bsafe\b|\bsafely\b|verified|\blegit|genuine baseline|live threat|zero-knowledge|military-grade/i;
  const CLAIMS = /fake|scam|fraud|registered|real company|VoIP/i;

  it("the empty-result sentence is exactly the owner's wording", () => {
    expect(NOTHING_FLAGGED).toBe(
      "These checks found nothing to flag. This is not a clearance: confirm the employer through official channels before you pay a fee or send documents.",
    );
  });

  it("no banned word in any sentence the checks can produce, in English", () => {
    for (const text of [...SENDER_TEMPLATES, ...NEXT_STEPS, ...FIELD_NAMES]) expect(text).not.toMatch(BANNED);
  });

  it("no banned word in any finding built from a wide set of inputs", () => {
    const inputs: Partial<SenderInput>[] = [
      { email: "x@gmail.com" },
      { email: "hr@rnohre.gov.ae", company: "Desert Star" },
      { email: "hr@acme.ae", company: "Desert Star" },
      { web: "xn--mhre-9ua.gov.ae" },
      { web: "mohre.gov.ae.example.com" },
      { phone: "+44 7700 900123" },
      { phone: "+971 50 123 456" },
      { phone: "+971 53 123 4567" },
      { phone: "abc" },
      { phone: "12345" },
      { email: "bad", web: "bad host" },
    ];
    for (const input of inputs) {
      for (const finding of run(input)) {
        expect(`${finding.fact} ${finding.args.join(" ")} ${finding.next}`).not.toMatch(BANNED);
      }
    }
  });

  it("never says a number or an address is a VoIP line, a scam, fake or a registered company; only the limits line mentions them", () => {
    for (const text of [...SENDER_TEMPLATES, ...NEXT_STEPS]) {
      if (text === CANNOT_KNOW) continue;
      expect(text, text).not.toMatch(CLAIMS);
    }
    expect(CANNOT_KNOW).toContain("cannot tell whether a number is a VoIP line, who owns an address, or whether a company is registered");
  });

  it("no banned word in the Arabic of any of these sentences", () => {
    const source = readFileSync("src/lib/i18nAr.ts", "utf8");
    const block = source.slice(source.indexOf("[review] Phase 7"), source.indexOf("// Official names"));
    expect(block).not.toMatch(/آمن تمامًا|العرض آمن|عرض حقيقي مؤكد|تم التحقق من|مضمون|موثّق رسميًا|احتمال|مزيف|احتيال/);
  });
});

describe("Arabic: every sentence has an entry, listed [review] in the Phase 7 block", () => {
  const source = readFileSync("src/lib/i18nAr.ts", "utf8").replace(/\r\n/g, "\n");
  const start = source.indexOf("// [review] Phase 7 (2026-11-24)");
  const block = source.slice(start, source.indexOf("// Official names"));

  it("has the marker", () => {
    expect(start).toBeGreaterThan(0);
  });

  it.each([...SENDER_TEMPLATES, ...NEXT_STEPS, ...FIELD_NAMES].map((text) => [text]))("%s", (text) => {
    expect(hasArabic(text)).toBe(true);
    expect(block).toContain(JSON.stringify(text));
  });
});
