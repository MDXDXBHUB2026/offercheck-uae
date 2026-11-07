import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./page";

const NOTICE = "Prototype. Use synthetic or redacted offers only. The app does not store offer text.";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("home page", () => {
  it("shows the prototype notice", () => {
    expect(renderToStaticMarkup(createElement(Home))).toContain(NOTICE);
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
