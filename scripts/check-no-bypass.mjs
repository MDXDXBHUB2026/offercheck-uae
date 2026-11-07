// Fails if a test or a check has been switched off instead of fixed.
//
// Scans the source and test folders (default: src, plus test, tests and e2e if present, or the
// folders given as arguments) and the scripts in package.json (in the current folder).
// Usage: node scripts/check-no-bypass.mjs [folder ...]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

const RULES = [
  { name: ".skip or .only on a test", pattern: /\.(?:skip|only)\b/ },
  { name: "xit, xdescribe or xtest", pattern: /\bx(?:it|describe|test)\b/ },
  { name: "eslint-disable", pattern: /eslint-disable/ },
  { name: "@ts-ignore", pattern: /@ts-ignore/ },
  // Allowed only with a reason on the same line: // @ts-expect-error -- why
  { name: "@ts-expect-error without a comment", pattern: /@ts-expect-error(?!\s*(?:--|:)?\s*[A-Za-z])/ },
];

function files(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...files(path));
    else if (CODE_FILE.test(name)) found.push(path);
  }
  return found;
}

export function findBypasses(dirs, root = process.cwd()) {
  const problems = [];
  for (const dir of dirs) {
    for (const file of files(dir)) {
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, index) => {
          for (const rule of RULES) {
            if (rule.pattern.test(line)) {
              problems.push(`${relative(root, file)}:${index + 1}: ${rule.name}`);
            }
          }
        });
    }
  }
  const pkgPath = join(root, "package.json");
  if (existsSync(pkgPath)) {
    const scripts = JSON.parse(readFileSync(pkgPath, "utf8")).scripts ?? {};
    for (const [name, command] of Object.entries(scripts)) {
      if (String(command).includes("--no-verify")) {
        problems.push(`package.json: script "${name}" uses --no-verify`);
      }
    }
  }
  return problems;
}

const args = process.argv.slice(2);
const dirs = (args.length > 0 ? args : ["src", "test", "tests", "e2e"]).filter((dir) => existsSync(dir));
const problems = findBypasses(dirs);
if (problems.length > 0) {
  console.error(`check:no-bypass failed (${problems.length}):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`check:no-bypass passed: ${dirs.join(", ")} and package.json scripts`);
