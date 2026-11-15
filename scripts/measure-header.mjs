// Measures the desktop header in a real Chrome, at 1280, 1440, 1568 and 1920 px, in English and
// Arabic, and writes the numbers to docs/header-measurements.json (src/app/headerMeasurements.test.ts
// checks them). No dependency: Chrome's DevTools protocol over Node's built-in WebSocket.
//
// Usage, with a production build running (npm run build && npx next start -p 3230):
//   node scripts/measure-header.mjs http://127.0.0.1:3230 "C:/Program Files/Google/Chrome/Application/chrome.exe" [out.json]
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [BASE, CHROME, OUT = "docs/header-measurements.json"] = process.argv.slice(2);
if (!BASE || !CHROME) {
  console.error("usage: node scripts/measure-header.mjs <baseUrl> <chrome executable> [out.json]");
  process.exit(2);
}
const WIDTHS = [1280, 1440, 1568, 1920];
const PORT = 9334;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = mkdtempSync(join(tmpdir(), "oc-measure-"));
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) {
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl;
  } catch {
    await sleep(250);
  }
}
const ws = new WebSocket(wsUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const s = (method, params) => send(method, params, sessionId);
const evaluate = async (expression) => {
  const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
  return r.result.value;
};
await s("Page.enable");
await s("Runtime.enable");

// Everything is measured from the DOM: rectangles, and scroll versus client widths.
const MEASURE = `(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { left: Math.round(b.left * 10) / 10, right: Math.round(b.right * 10) / 10, width: Math.round(b.width * 10) / 10 }; };
  const row = document.querySelector(".header-row");
  const brand = document.querySelector(".header-row .brand");
  const nav = document.querySelector("nav.nav-desktop");
  const actions = document.querySelector(".header-actions");
  const text = [...brand.querySelectorAll(".brand-name, .brand-caption")].map((el) => ({ cls: el.className, scroll: el.scrollWidth, client: el.clientWidth }));
  const tabs = [...nav.querySelectorAll(".tab")].map((el) => ({ label: el.innerText.trim(), ...r(el) }));
  const groups = [...nav.querySelectorAll(".nav-group")].map(r);
  const divider = nav.querySelector(".nav-divider");
  return {
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    viewport: innerWidth,
    row: r(row),
    brand: r(brand),
    brandText: text,
    nav: { ...r(nav), scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth },
    actions: r(actions),
    tabs,
    groups,
    divider: divider ? r(divider) : null,
  };
})()`;

const results = [];
try {
  for (const lang of ["en", "ar"]) {
    for (const width of WIDTHS) {
      await s("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await s("Page.navigate", { url: `${BASE}/check` });
      await sleep(400);
      await evaluate(`new Promise((done) => { const check = () => document.readyState === "complete" ? done() : setTimeout(check, 50); check(); })`);
      await evaluate(`localStorage.setItem("offercheck_lang", ${JSON.stringify(lang)}); localStorage.setItem("offercheck_motion", "paused"); 0`);
      await s("Page.reload");
      await sleep(400);
      await evaluate(`new Promise((done) => { const check = () => document.readyState === "complete" && document.querySelector("header button[lang]") ? done() : setTimeout(check, 50); check(); })`);
      await evaluate(`document.fonts ? document.fonts.ready.then(() => 0) : 0`);
      await sleep(600);
      results.push(await evaluate(MEASURE));
    }
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}

writeFileSync(OUT, `${JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), base: "next start (production build)", results }, null, 2)}\n`);
for (const m of results) {
  const used = m.tabs.length ? Math.max(...m.tabs.map((t) => t.right)) - Math.min(...m.tabs.map((t) => t.left)) : 0;
  console.log(
    `${m.lang} ${m.viewport}px: row ${m.row.width}, brand ${m.brand.width}, nav ${m.nav.clientWidth} (content ${Math.round(used)}, overflow ${m.nav.scrollWidth - m.nav.clientWidth}), actions ${m.actions.width}; tabs: ${m.tabs.map((t) => `${t.label} ${t.width}`).join(" | ")}`,
  );
}
