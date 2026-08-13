// Desktop regression: arrows steer, space fires, after the async
// startAiMatch change. Usage: bun desk-keys-test.mjs [baseUrl]
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://localhost:5173";
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-first-run", "--mute-audio", `--user-data-dir=${process.env.TEMP}\\seam-keys-udd`],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

const dbg = () => page.evaluate(() => ({ ...(window.__seamDebug || {}) }));

try {
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.waitForSelector(".seam-btn--ai", { timeout: 15000 });
  await page.click(".seam-btn--ai");
  await page.waitForSelector(".seam-card[data-fighter=\"dart\"]", { timeout: 10000 });
  await page.click(".seam-card[data-fighter=\"dart\"]");
  // pick breezy so the bot leaves us alone
  for (const c of await page.$$(".seam-chip")) {
    const t = await c.evaluate((el) => el.textContent.trim());
    if (t === "breezy") await c.click();
  }
  await page.click(".seam-lock");
  await page.waitForFunction(() => window.__seamDebug?.phase === "round", { timeout: 15000, polling: 100 });
  await sleep(200);
  const d0 = await dbg();
  check("desktop control is keys", d0.control === "keys", d0.control);
  await page.keyboard.down("ArrowRight");
  await sleep(700);
  await page.keyboard.up("ArrowRight");
  const d1 = await dbg();
  check("arrow steers ship right", d1.shipX > d0.shipX + 0.08, `${d0.shipX?.toFixed(3)} → ${d1.shipX?.toFixed(3)}`);
  await page.keyboard.down("Space");
  await sleep(120);
  await page.keyboard.up("Space");
  await sleep(300);
  const d2 = await dbg();
  check("space fires", (d2.bulletsSpawned || 0) > 0, `spawned=${d2.bulletsSpawned}`);
} finally {
  await browser.close().catch(() => {});
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
