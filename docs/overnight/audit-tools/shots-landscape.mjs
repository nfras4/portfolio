// Screenshots: menu with join UI, host screen with code, rotated fight
// (mobile portrait viewport), desktop wide fight.
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://localhost:5173";
const SHOTS = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-shots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-first-run", "--mute-audio", `--user-data-dir=${process.env.TEMP}\\seam-shots-udd`],
});

// mobile: menu → host (code) → back → AI fight rotated
{
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.screenshot({ path: `${SHOTS}\\ls-menu.png` });
  await page.tap(".seam-btn--primary");
  await page.waitForSelector(".seam-code", { timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}\\ls-host-code.png` });
  await page.evaluate(() => {
    [...document.querySelectorAll(".seam-btn")].find((b) => b.textContent === "cancel").click();
  });
  await page.waitForSelector(".seam-btn--ai", { timeout: 5000 });
  await page.tap(".seam-btn--ai");
  await page.waitForSelector(".seam-card[data-fighter=\"dart\"]", { timeout: 5000 });
  await page.tap(".seam-card[data-fighter=\"dart\"]");
  await page.tap(".seam-lock");
  await page.waitForFunction(() => window.__seamDebug?.phase === "round", { timeout: 15000 });
  await sleep(600);
  await page.screenshot({ path: `${SHOTS}\\ls-fight-rotated.png` });
  await page.close();
}

// desktop: wide fight arena
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.click(".seam-btn--ai");
  await page.waitForSelector(".seam-card[data-fighter=\"dart\"]", { timeout: 5000 });
  await page.click(".seam-card[data-fighter=\"dart\"]");
  await page.click(".seam-lock");
  await page.waitForFunction(() => window.__seamDebug?.phase === "round", { timeout: 15000 });
  await sleep(600);
  await page.screenshot({ path: `${SHOTS}\\ls-fight-desktop.png` });
  await page.close();
}

await browser.close();
console.log("done");
