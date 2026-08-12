// Verifies the SEAM discovery gesture: 5 quick taps on the nav brand on an
// emulated touch device navigates to /seam; also confirms desktop is immune.
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-first-run", `--user-data-dir=${process.env.TEMP}\\seam-tap-udd`],
});

// --- mobile: gesture works ---
const page = await browser.newPage();
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
});
await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
check("emulated viewport reports pointer:coarse", coarse);
for (let i = 0; i < 5; i++) {
  await page.tap(".nav-brand");
  await new Promise((r) => setTimeout(r, 120));
}
await new Promise((r) => setTimeout(r, 600));
const path = await page.evaluate(() => location.pathname);
check("5 taps on brand → /seam", path === "/seam", `pathname=${path}`);
const menuVisible = await page.evaluate(
  () => !!document.querySelector(".seam-root") && document.body.innerText.toLowerCase().includes("host a duel")
);
check("seam menu rendered", menuVisible);
await page.close();

// --- desktop: gesture must NOT fire ---
const d = await browser.newPage();
await d.setViewport({ width: 1440, height: 900 });
await d.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
for (let i = 0; i < 5; i++) {
  await d.click(".nav-brand");
  await new Promise((r) => setTimeout(r, 120));
}
await new Promise((r) => setTimeout(r, 500));
const dpath = await d.evaluate(() => location.pathname);
check("desktop 5 clicks stay on /", dpath === "/", `pathname=${dpath}`);

await browser.close();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
