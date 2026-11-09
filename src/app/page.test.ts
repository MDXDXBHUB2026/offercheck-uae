import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NoticeStrip, SiteFooter } from "@/components/shell/site";
import Home from "./page";

const NOTICE =
  "Prototype. Use synthetic or redacted offers only. The app does not store offer text. If you choose translation, Google Cloud Translation receives it.";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("home page", () => {
  // Phase 1: the notice moved from the page into the shared layout (the strip under the header and
  // the footer), so every route shows it. These are the two components the layout renders.
  it("shows the prototype notice in the site-wide strip and footer", () => {
    expect(renderToStaticMarkup(createElement(NoticeStrip))).toContain(NOTICE);
    expect(renderToStaticMarkup(createElement(SiteFooter))).toContain(NOTICE);
  });

  it("is the Check workspace", () => {
    expect(renderToStaticMarkup(createElement(Home))).toContain('<textarea id="offer"');
  });
});

// The notice says the app does not store offer text. These checks keep that true.
describe("no logging or storage of offer text", () => {
  const files = [...sourceFiles(join(process.cwd(), "src")), join(process.cwd(), "next.config.ts")];

  it("finds the source files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((file) => [file.slice(process.cwd().length + 1)]))(
    "%s has no console call, logger, file write or browser storage",
    (file) => {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toMatch(
        /\bconsole\.\w+|\b(?:pino|winston|morgan)\b|\b(?:writeFile|appendFile|createWriteStream)\w*\(|localStorage|sessionStorage|indexedDB|document\.cookie/,
      );
    },
  );
});
