import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SHOTS = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-shots";
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-first-run", "--mute-audio", `--user-data-dir=${process.env.TEMP}\\hero-shot-udd`],
});
const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${SHOTS}\\hero-mobile-after.png`, clip: { x: 0, y: 0, width: 390, height: 400 } });
const m = await page.evaluate(() => {
  const nav = document.querySelector("nav, header");
  const comp = document.querySelector(".hero-computer");
  const scene = document.querySelector(".rc-scene");
  return {
    nav: nav ? nav.getBoundingClientRect().toJSON() : null,
    comp: comp ? comp.getBoundingClientRect().toJSON() : null,
    scene: scene ? scene.getBoundingClientRect().toJSON() : null,
  };
});
console.log(JSON.stringify(m, null, 1));
await browser.close();
