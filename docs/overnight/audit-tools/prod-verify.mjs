// Boot-verify a deployed SEAM build headlessly: menu → picture select →
// AI round with keyboard, then report __seamDebug + HP/card checks.
// Usage: bun prod-verify.mjs <base-url>
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "https://nickwfraser.dev";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--mute-audio", `--user-data-dir=${process.env.TEMP}\\seam-prodverify`],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForSelector(".seam-btn", { timeout: 15000 });

  const menu = await page.evaluate(() => ({
    machineBtn: [...document.querySelectorAll(".seam-btn")].some((b) => b.textContent.includes("machine")),
    portfolioBtn: [...document.querySelectorAll(".seam-btn")].some((b) => b.textContent.includes("portfolio")),
  }));
  console.log("menu:", JSON.stringify(menu));

  await page.evaluate(() => {
    [...document.querySelectorAll(".seam-btn")].find((b) => b.textContent.includes("machine")).click();
  });
  await page.waitForSelector(".seam-card--pic", { timeout: 5000 });
  const select = await page.evaluate(() => ({
    picCards: document.querySelectorAll(".seam-card--pic").length,
    svgs: document.querySelectorAll(".seam-card-ship").length,
    textLines: document.querySelectorAll(".seam-card-line").length, // should be 0
  }));
  console.log("select:", JSON.stringify(select));

  await page.click('.seam-card[data-fighter="dart"]');
  await page.click(".seam-lock");
  await page.waitForFunction(() => window.__seamDebug?.phase === "round", { timeout: 15000 });

  // fire a quick shot with Space, then read state
  await page.keyboard.down("Space");
  await sleep(60);
  await page.keyboard.up("Space");
  await sleep(1200);
  const d = await page.evaluate(() => ({ ...window.__seamDebug }));
  console.log("round:", JSON.stringify(d));
  const canvas = await page.evaluate(() => {
    const c = document.querySelector(".seam-canvas");
    return { backing: [c.width, c.height], css: Math.round(c.getBoundingClientRect().width), pixelated: c.style.imageRendering || "none" };
  });
  console.log("canvas:", JSON.stringify(canvas));

  const ok =
    menu.machineBtn && menu.portfolioBtn &&
    select.picCards === 3 && select.textLines === 0 &&
    d.phase === "round" && d.bulletsSpawned >= 1 &&
    d.hp === 3 && canvas.pixelated === "none"; // HP_MAX halved 2026-08-14
  console.log(ok ? "PROD VERIFY: ALL PASS" : "PROD VERIFY: FAILURES — see above");
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close().catch(() => {});
}
