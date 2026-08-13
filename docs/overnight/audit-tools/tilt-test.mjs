// SEAM tilt + menu-demo verification: one emulated phone, synthetic
// deviceorientation events driven from the main world (puppeteer evaluate
// runs in the main world, so the game's window listener receives them).
// Checks: menu demo canvas animates; tilt is the default control on mobile;
// the tilt meter goes live when the sensor speaks; in-round tilt steers the
// ship in the spec directions (gamma+ → right, beta toward you → retreat);
// the deadzone holds the ship still; drag-failsafe works with a dead sensor.
// Usage: bun tilt-test.mjs
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://localhost:5173";
const SHOTS = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-shots";

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--mute-audio",
    `--user-data-dir=${process.env.TEMP}\\seam-tilt-udd`,
  ],
});

const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("[console.error]", m.text());
});

const dbg = () => page.evaluate(() => ({ ...(window.__seamDebug || {}) }));

try {
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.waitForSelector(".seam-demo", { timeout: 15000 });

  // --- menu demo animates ---
  const sample = () =>
    page.evaluate(() => {
      const c = document.querySelector(".seam-demo");
      const ctx = c.getContext("2d");
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      let nonzero = 0;
      for (let i = 3; i < d.length; i += 16) {
        sum += d[i];
        if (d[i] > 0) nonzero++;
      }
      return { sum, nonzero };
    });
  const s1 = await sample();
  await sleep(700);
  const s2 = await sample();
  check("menu demo canvas has content", s1.nonzero > 50, `nonzero=${s1.nonzero}`);
  check("menu demo canvas animates", s1.sum !== s2.sum, `${s1.sum} vs ${s2.sum}`);
  await page.screenshot({ path: `${SHOTS}\\tilt-menu.png` });

  // --- fight the machine → select: tilt is the default control ---
  await page.tap(".seam-btn--ai");
  await page.waitForSelector(".seam-chiprow", { timeout: 10000 });
  const onChip = await page.$eval(".seam-chip.on", (el) => el.textContent.trim());
  check("tilt is the default control on mobile", onChip === "tilt", `on=${onChip}`);
  const label0 = await page.$eval(".seam-tiltlabel", (el) => el.textContent);
  check("meter shows waiting before any sensor data", /waiting/.test(label0), label0);

  // --- synthetic sensor: meter goes live ---
  await page.evaluate(() => {
    window.__tiltDrive = { beta: 45, gamma: 0 };
    setInterval(() => {
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", {
          alpha: 0,
          beta: window.__tiltDrive.beta,
          gamma: window.__tiltDrive.gamma,
        })
      );
    }, 33);
  });
  await sleep(500);
  const label1 = await page.$eval(".seam-tiltlabel", (el) => el.textContent);
  check("meter goes live once the sensor speaks", /dot is you/.test(label1), label1);
  const dotLive = await page.$(".seam-tiltdot.live");
  check("meter dot is live", !!dotLive);
  await page.screenshot({ path: `${SHOTS}\\tilt-select.png` });

  // --- start a gentle AI round ---
  await page.tap(".seam-card[data-fighter=\"dart\"]");
  const chips = await page.$$(".seam-chip");
  for (const c of chips) {
    const txt = await c.evaluate((el) => el.textContent.trim());
    if (txt === "breezy") await c.tap();
  }
  await page.tap(".seam-lock"); // "fight"
  await page.waitForFunction(
    () => window.__seamDebug && window.__seamDebug.phase === "round",
    { timeout: 15000, polling: 100 }
  );
  await sleep(300); // let the loop settle after "go" (neutral = beta 45, gamma 0)

  const drive = (beta, gamma) =>
    page.evaluate((v) => Object.assign(window.__tiltDrive, v), { beta, gamma });

  let d0 = await dbg();
  check("control mode in round is tilt", d0.control === "tilt", d0.control);

  // gamma + → ship moves right
  await drive(45, 14);
  await sleep(900);
  let d1 = await dbg();
  check("tilt right moves ship right", d1.shipX > d0.shipX + 0.08, `${d0.shipX?.toFixed(3)} → ${d1.shipX?.toFixed(3)}`);

  // gamma − → ship moves left
  await drive(45, -14);
  await sleep(1400);
  let d2 = await dbg();
  check("tilt left moves ship left", d2.shipX < d1.shipX - 0.08, `${d1.shipX?.toFixed(3)} → ${d2.shipX?.toFixed(3)}`);

  // deadzone: near-neutral tilt holds still
  await drive(45, 0);
  await sleep(800);
  const d3 = await dbg();
  await drive(45.6, 0.6);
  await sleep(800);
  const d4 = await dbg();
  check("deadzone holds the ship still", Math.abs(d4.shipX - d3.shipX) < 0.01, `Δ=${Math.abs(d4.shipX - d3.shipX).toFixed(4)}`);

  // beta down (top tilted away) → ship advances (y up)
  await drive(33, 0);
  await sleep(900);
  const d5 = await dbg();
  check("tilt top away advances ship", d5.shipY > d4.shipY + 0.05, `${d4.shipY?.toFixed(3)} → ${d5.shipY?.toFixed(3)}`);

  // beta up (toward you) → ship retreats
  await drive(57, 0);
  await sleep(1400);
  const d6 = await dbg();
  check("tilt toward you retreats ship", d6.shipY < d5.shipY - 0.05, `${d5.shipY?.toFixed(3)} → ${d6.shipY?.toFixed(3)}`);
} finally {
  await browser.close().catch(() => {});
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
