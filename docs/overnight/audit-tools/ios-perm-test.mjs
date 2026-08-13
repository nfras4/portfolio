// iOS motion-permission flow: stub DeviceOrientationEvent.requestPermission
// before the app loads and check both outcomes on the "fight the machine" tap
// (the gesture that triggers ensureTiltReady).
//   denied  → control falls back to touch + a visible note
//   granted → tilt stays selected
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://localhost:5173";
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-first-run", "--mute-audio", `--user-data-dir=${process.env.TEMP}\\seam-perm-udd`],
});

async function run(result) {
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await page.evaluateOnNewDocument((res) => {
    window.__permCalls = 0;
    DeviceOrientationEvent.requestPermission = async () => {
      window.__permCalls++;
      return res;
    };
  }, result);
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.tap(".seam-btn--ai");
  await page.waitForSelector(".seam-chiprow", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600)); // let the async permission settle
  const calls = await page.evaluate(() => window.__permCalls);
  const onChip = await page.$eval(".seam-chip.on", (el) => el.textContent.trim());
  const note = await page.evaluate(
    () => document.querySelector(".seam-hint--warn")?.textContent || null
  );
  await page.close();
  return { calls, onChip, note };
}

try {
  const denied = await run("denied");
  check("denied: permission was requested on the tap", denied.calls > 0, `calls=${denied.calls}`);
  check("denied: control falls back to touch", denied.onChip === "touch", `on=${denied.onChip}`);
  check("denied: warning note shown", /denied/.test(denied.note || ""), String(denied.note));

  const granted = await run("granted");
  check("granted: permission was requested on the tap", granted.calls > 0, `calls=${granted.calls}`);
  check("granted: tilt stays selected", granted.onChip === "tilt", `on=${granted.onChip}`);
  check("granted: no warning note", granted.note === null, String(granted.note));
} finally {
  await browser.close().catch(() => {});
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
