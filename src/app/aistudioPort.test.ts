import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CHECKING_PANEL_DELAY_MS, checkingSteps } from "@/components/OfferChecker";
import { COPIED_MS, DIMENSIONS, ResultCard } from "@/components/ResultCard";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import { mainChannels } from "@/lib/authorities";
import { WARNING_SIGNS } from "@/lib/warningSigns";
import { contact, MOHRE_INQUIRY_URL, UAE_CONTACTS } from "@/data/uaeContacts";
import { THREAT_SAMPLES } from "@/data/threatSamples";
import { EncryptedVault } from "@/components/EncryptedVault";
import LegalPage from "@/app/legal/page";
import PortalsPage from "@/app/portals/page";
import RadarPage from "@/app/radar/page";

// Phase 3 checks for the AI Studio UI/UX port (docs/reference/aistudio-ui-inventory.md): the port is
// visual only, adds no dependency, loads nothing from outside, moves only when motion is allowed,
// mirrors in Arabic and never states a verdict.
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const css = read("src/app/globals.css");

const walk = (dir: string): string[] =>
  readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
  );
const UI_SOURCES = [...walk("src/app"), ...walk("src/components"), ...walk("src/data")].filter(
  (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && !file.startsWith("src/app/api/"),
);

// The block of an at-rule, by brace matching.
const block = (head: string) => {
  const start = css.indexOf(`${head} {`);
  expect(start, head).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}" && --depth === 0) return { start, end: i, text: css.slice(start, i + 1) };
  }
  throw new Error(head);
};

describe("AI Studio port: no new dependency", () => {
  it("package.json lists exactly the dependencies it had before the port", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["lucide-react", "next", "react", "react-dom"]);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual([
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "eslint",
      "eslint-config-next",
      "typescript",
      "vitest",
    ]);
  });

  it("no source imports a library the export used", () => {
    for (const file of UI_SOURCES) {
      expect(read(file), file).not.toMatch(/from ["'](?:motion|framer-motion|canvas-confetti|@google\/genai|express|dotenv|vite|tailwindcss)[/"']/);
    }
  });
});

describe("AI Studio port: nothing loaded from outside", () => {
  it("the stylesheet has no external URL, @import or font file", () => {
    expect(css).not.toMatch(/https?:\/\//);
    expect(css).not.toMatch(/@import|@font-face|url\(/);
  });

  it("the new hero component and the check page load only local files", () => {
    for (const file of ["src/components/HeroBackdrop.tsx", "src/components/HeroStage.tsx", "src/app/check/page.tsx"]) {
      expect(read(file), file).not.toMatch(/https?:\/\//);
    }
    expect(read("src/components/HeroBackdrop.tsx")).toMatch(/src="\/hero\/loop\.webm"[\s\S]*src="\/hero\/loop\.mp4"/);
  });

  it("no page or component injects HTML", () => {
    for (const file of UI_SOURCES) expect(read(file), file).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("AI Studio port: motion only when allowed", () => {
  const motion = block("@media (prefers-reduced-motion: no-preference)");

  it("every transition and animation declaration is inside the one no-preference block", () => {
    const reduce = block("@media (prefers-reduced-motion: reduce)");
    for (const m of css.matchAll(/\b(?:transition|animation)(?:-[a-z]+)?\s*:/g)) {
      const at = m.index!;
      const inMotion = at > motion.start && at < motion.end;
      const inReduce = at > reduce.start && at < reduce.end;
      expect(inMotion || inReduce, `${m[0]} at ${at}`).toBe(true);
    }
  });

  it("a reduce block sets every duration to 0s", () => {
    const reduce = block("@media (prefers-reduced-motion: reduce)").text;
    expect(reduce).toMatch(/animation-duration: 0s !important;/);
    expect(reduce).toMatch(/transition-duration: 0s !important;/);
    expect(reduce).toMatch(/animation-iteration-count: 1 !important;/);
  });

  it("every keyframe is used, and only inside the no-preference block", () => {
    const names = [...css.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
    expect(names).toEqual(
      expect.arrayContaining(["aurora-flow", "drop-in", "rise-in", "pop-in", "orb-drift", "progress-sweep", "gauge-fill", "ping", "ribbon-drift", "blip", "orb-pulse"]),
    );
    for (const name of names) {
      const uses = [...css.matchAll(new RegExp(`animation: ${name}\\b`, "g"))];
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) expect(use.index! > motion.start && use.index! < motion.end, name).toBe(true);
    }
  });

  it("each ported effect has its rule in the block", () => {
    for (const selector of [
      ".site-header",
      ".brand:hover .brand-badge",
      ".dropdown-panel",
      ".page > .stack",
      ".hero-orb",
      ".sample-card:hover",
      ".progress::after",
      ".gauge-value",
      ".modal",
      ".success-tick",
      "details[open] > :not(summary)",
      // Part 2: header and hero radar.
      ".brand-ping::after",
      ".status-dot",
      ".flag-ribbon",
      ".hero-backdrop::after",
      ".ping-icon::after",
      ".radar-sweep",
      ".radar-blip",
      ".radar-orb",
      ".hud-crosshair",
      // Part 2, phase 2: analyzer and result card.
      ".checking-ring",
      ".checking",
      ".findings > .flag-card",
      ".findings > .flag-card:nth-child(2)",
      ".meter-fill",
    ]) {
      expect(motion.text, selector).toContain(`${selector} {`);
    }
    // Blocked buttons do not move: hover and press scale apply only to buttons that work.
    expect(motion.text).toMatch(/\.btn:not\(\[aria-disabled="true"\]\):not\(:disabled\):hover \{\s*scale: 1\.02;/);
    expect(motion.text).toMatch(/\.btn:not\(\[aria-disabled="true"\]\):not\(:disabled\):active \{\s*scale: 0\.98;/);
    // No scroll-driven reveal: it leaves findings at opacity 0 outside the viewport, so print,
    // Export PDF and full-page captures came out blank. Content is never hidden by motion.
    expect(css).not.toMatch(/animation-timeline|\.reveal\b/);
    for (const file of UI_SOURCES) expect(read(file), file).not.toMatch(/\breveal\b/);
  });

  it("the radar sweep turns with transform rotate only, every 8s; the blips follow it", () => {
    expect(motion.text).toMatch(/\.radar-sweep \{\s*animation: spin 8s linear infinite;/);
    expect(css).toMatch(/@keyframes spin \{\s*to \{\s*transform: rotate\(360deg\);/);
    expect(motion.text).toMatch(/\.radar-blip \{\s*animation: blip 8s linear infinite;/);
    expect(motion.text).toMatch(/\.radar-orb \{\s*animation: orb-pulse 6s/);
    expect(motion.text).toMatch(/\.radar-orb \+ \.radar-orb \{\s*animation-duration: 4s;/);
    expect(motion.text).toMatch(/\.brand-ping::after \{\s*animation: ping 1\.6s/);
    expect(css).toMatch(/@keyframes ping \{\s*from \{\s*opacity: 0\.8;\s*scale: 1;\s*\}\s*to \{\s*opacity: 0;\s*scale: 2\.4;/);
    // Still (reduced motion): the ping ring is hidden, so only the dot shows.
    expect(css).toMatch(/\.brand-ping::after,\s*\.ping-icon::after \{[^}]*opacity: 0;/);
  });

  it("decorative layers are aria-hidden and take no pointer events", () => {
    const stage = read("src/components/HeroStage.tsx");
    expect(stage).toContain('<div className="radar" aria-hidden="true">');
    expect(read("src/components/shell/site.tsx")).toContain('<span className="brand-ping" aria-hidden="true" />');
    for (const selector of [".radar", ".brand-ping", ".brand-ping::after,\n.ping-icon::after", ".hero-backdrop"]) {
      const at = css.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      expect(css.slice(at, css.indexOf("}", at)), selector).toMatch(/pointer-events: none;/);
    }
  });

  it("the hero video starts only from script and only when motion is allowed", () => {
    const source = read("src/components/HeroBackdrop.tsx");
    expect(source).not.toMatch(/autoPlay/);
    expect(source.indexOf("prefers-reduced-motion: reduce")).toBeLessThan(source.indexOf(".play()"));
  });
});

describe("AI Studio port: right-to-left", () => {
  it("the new direction-dependent pieces mirror under dir=rtl", () => {
    expect(css).toMatch(/\[dir="rtl"\] \.hero-backdrop::before \{\s*background:\s*linear-gradient\(270deg/);
    expect(css).toMatch(/\[dir="rtl"\] \.gauge \{\s*scale: 1 -1;/);
    expect(css).toMatch(/\[dir="rtl"\] \.sample-arrow \{\s*scale: -1 1;/);
    expect(css).toMatch(/\.sample-card:hover \.sample-arrow \{\s*translate: 4px 0;/);
    expect(css).toMatch(/\[dir="rtl"\] \.sample-card:hover \.sample-arrow \{\s*translate: -4px 0;/);
    // The radar sweep turns the other way in Arabic.
    expect(css).toMatch(/\[dir="rtl"\] \.radar-sweep \{\s*scale: -1 1;/);
  });

  it("new layout rules use logical properties, not left and right", () => {
    for (const selector of [
      ".hero-orb",
      ".hero-orb + .hero-orb",
      ".hero-backdrop",
      ".gauge-wrap",
      ".gauge",
      ".progress::after",
      ".brand-ping",
      ".hero-radar-col",
      ".radar-orb",
      ".radar-orb + .radar-orb",
      ".radar-blip",
      ".radar-blip-1",
      ".radar-blip-2",
      ".radar-blip-3",
      ".hud-tag",
      ".hud-foot",
      ".checking-steps",
      ".dimension-fill",
      ".meter-fill",
      ".link-btn",
      ".eyebrow-pill",
      ".verify-steps li",
      ".report-links",
      ".accordion-toggle",
      ".pass-wrap input",
      ".pass-toggle",
      ".key-ring",
    ]) {
      const at = css.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      const body = css.slice(at, css.indexOf("}", at));
      expect(body, selector).not.toMatch(/(?:^|\s)(?:left|right|margin-left|margin-right|padding-left|padding-right):/m);
    }
  });
});

describe("AI Studio port: risk, not verdict", () => {
  it("no page or component states a verdict, celebrates, or shows a model or trust score", () => {
    for (const file of UI_SOURCES) {
      expect(read(file), file).not.toMatch(
        /offer is safe|safe (?:job )?offer|verified (?:offer|job)|offer (?:is )?verified|\blegit\b|scam confirmed|probable recruitment scam|confetti|celebrat|trust score|scam probability|gemini/i,
      );
    }
  });

  // AI Studio port, part 2: none of the export's claims come across. The only allowed uses are the
  // audit trail's "chain verified" (its hash chain checks out) and a code comment ("Server-safe").
  it("uses none of the export's claim words: probability, reliability, safe, verified, legit, Online AI, 60FPS", () => {
    const ALLOWED = /chain verified|Server-safe/g;
    for (const file of UI_SOURCES) {
      expect(read(file).replace(ALLOWED, ""), file).not.toMatch(
        /probabilit|reliabilit|trust score|\bsafe\b|\bverified\b|\blegit|genuine baseline|online ai|gemini|ai-powered|60 ?fps|live threat|threat acquisition/i,
      );
    }
  });

  it("the score ring shows the engine's score only, and nothing when the text was not checked", () => {
    const source = read("src/components/ResultCard.tsx");
    expect(source).toContain('{notice !== "most" && (');
    expect(source).toContain("strokeDashoffset={100 - Math.min(100, Math.max(0, risk.score))}");
  });
});

describe("AI Studio port: analyzer card", () => {
  const source = read("src/components/OfferChecker.tsx");

  it("the checking panel lists the three steps with the real rule count, and only after 300ms", () => {
    expect(checkingSteps(RULES.length)).toEqual(["Cleaning the text", `Running ${RULES.length} fixed rules`, "Building the score"]);
    expect(CHECKING_PANEL_DELAY_MS).toBe(300);
    // Shown only for a slow check, hidden from screen readers (the status region speaks), and the
    // timer only shows the panel: nothing waits before the request or before the result.
    expect(source).toContain("{loading && slowCheck && (");
    expect(source).toMatch(/<div className="progress checking" aria-hidden="true">/);
    expect(source).toContain("slowTimer.current = setTimeout(() => setSlowCheck(true), CHECKING_PANEL_DELAY_MS);");
    expect(source.match(/setTimeout\(/g)).toHaveLength(1);
  });

  it("the channel tabs are one segmented group; Clear text is a 44px link-style button", () => {
    expect(source).toContain('className="tabs tabs-boxed channel-tabs" role="group"');
    expect(source).toContain('<button type="button" className="link-btn" onClick={() => editText("")}>');
    expect(css).toMatch(/\.link-btn \{[^}]*min-height: var\(--target\);/);
  });

  it("the primary button is an emerald-to-cyan gradient that goes flat and dim when blocked", () => {
    expect(css).toMatch(/\.btn-primary \{[^}]*background-image: linear-gradient\(90deg, var\(--green-action\), var\(--cyan-action\)\);/);
    expect(css).toMatch(/\.btn-primary\[aria-disabled="true"\],\n\.btn-primary:disabled \{\s*background-image: none;\s*box-shadow: none;/);
  });

  it("text inputs keep the 3px focus ring and add a glow", () => {
    expect(css).toMatch(/textarea:focus-visible,\ninput:focus-visible,\nselect:focus-visible \{[^}]*outline: 3px solid var\(--focus\);[^}]*box-shadow:/);
  });
});

describe("AI Studio port: result card", () => {
  const render = (text: string, coverage: "full" | "unchecked" | "partial" = "full") =>
    renderToStaticMarkup(
      createElement(ResultCard, { result: runManager(text), ruleCount: RULES.length, coverage, onReport: () => {} }),
    );
  const tile = (html: string, title: string) =>
    html.match(new RegExp(`<li class="dimension[^"]*"><span class="dimension-title">${title.replace(/'/g, "&#x27;")}</span>.*?</li>`))?.[0] ?? "";

  it("the four dimension tiles cover every rule exactly once", () => {
    expect(DIMENSIONS.flatMap((d) => d.rules).sort()).toEqual(RULES.map((rule) => rule.id).sort());
  });

  it("a tile says found or not found, from the engine's findings only", () => {
    const scam = render(SCAM_OFFER);
    const found = new Set(runManager(SCAM_OFFER).findings.filter((f) => f.severity !== "info").map((f) => f.source));
    for (const dimension of DIMENSIONS) {
      const hit = dimension.rules.some((id) => found.has(id));
      expect(tile(scam, dimension.title)).toContain(hit ? "Indicator found" : "No indicator found");
    }
    const legit = render(LEGIT_OFFER);
    for (const dimension of DIMENSIONS) expect(tile(legit, dimension.title)).toContain("No indicator found");
  });

  it("unchecked text: tiles say Not checked, and there is no evidence count, number or Low", () => {
    const html = render(SCAM_OFFER, "unchecked");
    for (const dimension of DIMENSIONS) expect(tile(html, dimension.title)).toContain("Not checked");
    expect(html).not.toContain("evidence-basis");
    const head = html.slice(html.indexOf("score-card"), html.indexOf('role="tablist"'));
    expect(head).not.toMatch(/\bLow\b/);
  });

  it("the evidence basis counts matched rules, never a percentage", () => {
    const html = render(SCAM_OFFER);
    const basis = html.match(/<p class="evidence-basis small">.*?<\/p>/)?.[0] ?? "";
    expect(basis).toMatch(/\d+ matched rules?, each with the exact words quoted from the text\./);
    expect(basis).not.toContain("%");
  });

  it("findings are numbered, with Copy quote (Copied for 1.5s) and Report signal", () => {
    const html = render(SCAM_OFFER);
    const count = runManager(SCAM_OFFER).findings.filter((f) => f.severity !== "info").length;
    for (let n = 1; n <= count; n += 1) expect(html).toContain(`aria-hidden="true">${n}</span>`);
    expect(html).toContain("Copy quote");
    expect(html).toContain("Report signal");
    expect(COPIED_MS).toBe(1500);
    expect(html).toContain(`Documented red flags (${count})`);
    expect(html).toContain("Highlights in your text");
  });

  it("Check it yourself lists only the warning-sign actions, with a counter for those only", () => {
    const html = render(SCAM_OFFER);
    const checklist = html.slice(html.indexOf('id="checklist-heading"'), html.indexOf('id="report-heading"'));
    expect(checklist).toContain(`0 / ${WARNING_SIGNS.length} done`);
    expect(checklist.match(/type="checkbox"/g)).toHaveLength(WARNING_SIGNS.length);
    for (const sign of WARNING_SIGNS) expect(checklist).toContain(sign.whatToDo.replace(/'/g, "&#x27;"));
    expect(checklist).not.toContain("report it:");
    expect(checklist).toMatch(/<span class="meter" aria-hidden="true"><span class="meter-fill" style="inline-size:0%"><\/span><\/span>/);
  });

  it("the report block has the eCrime button, the 901 hotline and the other channels, with no ticks or counter", () => {
    const html = render(SCAM_OFFER);
    const report = html.slice(html.indexOf('id="report-heading"'), html.indexOf('id="portals-heading"'));
    expect(report).toContain("If it looks like a scam, report it");
    expect(report).toContain(`href="${contact("ecrime").url}"`);
    expect(report).toContain(`href="tel:${contact("ecrime").hotline}"`);
    for (const channel of mainChannels().filter((c) => c.url !== contact("ecrime").url)) expect(report).toContain(channel.name);
    expect(report).not.toMatch(/type="checkbox"|done<|meter/);
  });

  it("the portals are the MoHRE offer enquiry, the MoHRE website and ICP", () => {
    const html = render(SCAM_OFFER);
    const portals = html.slice(html.indexOf('id="portals-heading"'));
    for (const label of ["MoHRE offer enquiry", "MoHRE website", "ICP Smart Services"]) expect(portals).toContain(label);
  });
});

describe("AI Studio port: Phase 3 pages", () => {
  const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

  it("the MoHRE enquiry link is the receipts.mohre.gov.ae offer enquiry", () => {
    expect(MOHRE_INQUIRY_URL).toBe("https://receipts.mohre.gov.ae/OfferInquiry/Index?langid=2");
  });

  it("no portal URL anywhere ends in /services/inquiry.aspx (MoHRE's dead page)", () => {
    const files = [...UI_SOURCES, "src/lib/authorities.ts", "src/lib/warningSigns.ts"];
    const urls = files.flatMap((file) => [...read(file).matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map((m) => m[0]));
    urls.push(...UAE_CONTACTS.map((entry) => entry.url), MOHRE_INQUIRY_URL);
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls) expect(url, url).not.toMatch(/\/services\/inquiry\.aspx$/i);
    const rendered =
      html(createElement(PortalsPage)) + html(createElement(ResultCard, { result: runManager(SCAM_OFFER), ruleCount: RULES.length }));
    expect(rendered).not.toContain("inquiry.aspx");
    expect(rendered).toContain(`href="${MOHRE_INQUIRY_URL.replace("&", "&amp;")}"`);
  });

  it("Threat Radar: red banner, pulsing demo pill, red-glow Add a report, every card tagged Demo data, no votes or dates", () => {
    const page = html(createElement(RadarPage));
    expect(page).toContain('aria-labelledby="page-title" data-tint="red"');
    expect(page).toMatch(/<p class="eyebrow-pill eyebrow-red"><span class="dot dot-high pulse" aria-hidden="true"><\/span>/);
    expect(page).toMatch(/<button type="button" class="btn btn-danger glow-red">[\s\S]*?Add a report<\/button>/);
    expect(page.match(/radar-card/g)).toHaveLength(THREAT_SAMPLES.length);
    expect(page.match(/>Demo data</g)).toHaveLength(THREAT_SAMPLES.length);
    expect(page).not.toMatch(/upvote|\bvotes?\b|\d{4}-\d{2}-\d{2}|\bago\b/i);
  });

  it("Gov Portals Hub: each directory card has a category, a level, the Arabic name, its purpose, two verify actions, the hotline and Open portal", () => {
    const page = html(createElement(PortalsPage));
    expect(page).toContain('aria-labelledby="page-title" data-tint="green"');
    expect(page).toContain("Offer Check cannot tell whether a reference is real.");
    const cards = [...page.matchAll(/<li class="card stack-sm card-fill directory-card">([\s\S]*?)<\/li><\/ol>[\s\S]*?<\/li>/g)];
    expect(cards).toHaveLength(UAE_CONTACTS.length);
    UAE_CONTACTS.forEach((entry, i) => {
      const card = cards[i][0];
      expect(card).toMatch(/class="chip chip-green chip-upper"/);
      expect(card).toMatch(/>(Federal|Dubai)<\/span>/);
      expect(card).toContain(entry.arabicName);
      // What the channel is for sits above the steps, in the data's own words; the numbered steps
      // are actions only.
      expect(card).toContain(`<p class="small">${entry.purpose}.</p><p class="label-caps">How to verify</p>`);
      expect(card.match(/<span class="num-tile" aria-hidden="true">\d<\/span>/g)).toHaveLength(2);
      const steps = card.slice(card.indexOf('<ol class="verify-steps'), card.indexOf("</ol>"));
      expect(steps).not.toContain("What it is for");
      expect(steps).not.toContain(entry.purpose);
      expect(card).toContain(`href="tel:${entry.hotline}"`);
      expect(card).toMatch(new RegExp(`<a href="${entry.url.replace(/[.?]/g, "\$&")}" class="btn btn-primary"[^>]*>Open portal`));
    });
  });

  it("Legal Guidelines: each sign folds its own warningSigns.ts text under one button, nothing added", () => {
    const page = html(createElement(LegalPage));
    expect(page).toContain('aria-labelledby="page-title" data-tint="green"');
    const accordions = [...page.matchAll(/<div class="accordion">([\s\S]*?)<\/div><\/div><\/div>/g)].map((m) => m[0]);
    expect(accordions).toHaveLength(WARNING_SIGNS.length);
    WARNING_SIGNS.forEach((sign, i) => {
      const acc = accordions[i];
      const controls = acc.match(/aria-expanded="false" aria-controls="([^"]+)"/)?.[1];
      expect(controls).toBeTruthy();
      expect(acc).toContain(`id="${controls}" class="accordion-panel"`);
      const words = acc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().replaceAll("&#x27;", "'");
      expect(words).toBe(`Why it matters ${sign.why}`);
    });
    expect(css).toMatch(/\.accordion-panel \{\s*display: grid;\s*grid-template-rows: 0fr;\s*visibility: hidden;/);
    expect(css).toMatch(/\.accordion\[data-open="true"\] \.accordion-panel \{\s*grid-template-rows: 1fr;/);
    expect(css).toMatch(/\.accordion\[data-open="true"\] \.accordion-chevron \{\s*rotate: 180deg;/);
    expect(block("@media (prefers-reduced-motion: no-preference)").text).toMatch(/\.accordion-panel \{\s*transition: grid-template-rows/);
    // Printed, every sign is open.
    expect(block("@media print").text).toMatch(/\.accordion-panel \{\s*grid-template-rows: 1fr !important;\s*visibility: visible !important;/);
  });

  it("Encrypted Vault: the existing wording as a pill, a ringed key, show/hide passphrase and a full-width button", () => {
    const page = html(createElement(EncryptedVault));
    expect(page).toContain('<p class="eyebrow-pill">');
    expect(page).toContain("AES-256-GCM, in this browser only");
    expect(page).toMatch(/<span class="key-ring" aria-hidden="true">/);
    expect(page).toMatch(/<input id="vault-open-pass" type="password"/);
    expect(page).toMatch(/<button type="button" class="pass-toggle" aria-pressed="false" aria-controls="vault-open-pass">[\s\S]*?Show passphrase<\/span><\/button>/);
    expect(page).toMatch(/<button type="submit" class="btn btn-primary btn-block btn-lg"/);
    expect(page).not.toMatch(/zero server footprint/i);
  });

  it("route change: the page fades in over 200ms with an 8px rise", () => {
    expect(block("@media (prefers-reduced-motion: no-preference)").text).toMatch(/\.page > \.stack \{\s*animation: page-in 200ms/);
    expect(css).toMatch(/@keyframes page-in \{\s*from \{\s*opacity: 0;\s*translate: 0 8px;/);
  });
});

// Header layout: at 1280 to 1920 px (content capped at 1280) the tab row was drawn over
// "Offer Check UAE", in English and Arabic. From 1200px the brand and the actions never shrink; the tab row
// takes what is left, may shrink to nothing and then scrolls sideways. Flex order follows the
// writing direction, so the same rules hold under dir="rtl". Browser check: docs/test-report.md.
describe("Header: the brand stays fully visible", () => {
  const rule = (selector: string) => {
    const at = css.indexOf(`\n${selector} {`);
    expect(at, selector).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  };

  it("from 1200px (tabs on the header row) the brand and the header actions do not shrink", () => {
    const desktop = css.slice(css.indexOf("@media (min-width: 1200px)"));
    expect(desktop.slice(0, desktop.indexOf(".nav-desktop {"))).toMatch(/\.brand \{\s*flex-shrink: 0;\s*\}/);
    expect(rule(".header-actions")).toMatch(/flex-shrink: 0;/);
    expect(rule(".brand-name")).toMatch(/white-space: nowrap;/);
  });

  it("the desktop tab row shrinks and scrolls instead of overlapping, with room for the focus ring", () => {
    const desktop = css.slice(css.indexOf("@media (min-width: 1200px)"));
    const nav = desktop.slice(desktop.indexOf(".nav-desktop {"), desktop.indexOf("}", desktop.indexOf(".nav-desktop {")));
    expect(nav).toMatch(/flex: 1 1 0;/);
    expect(nav).toMatch(/min-width: 0;/);
    expect(nav).toMatch(/overflow-x: auto;/);
    expect(nav).toMatch(/padding: 6px;/);
    expect(desktop).toMatch(/\.nav-desktop \.tab \{\s*flex-shrink: 0;/);
    // Without the decorative tab icons all five labels fit in the capped header (measured 1280 to
    // 1920 px, English and Arabic); the scroll is only a fallback.
    expect(desktop).toMatch(/\.nav-desktop \.tab \.icon \{\s*display: none;/);
  });
});
