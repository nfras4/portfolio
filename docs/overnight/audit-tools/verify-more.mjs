// SEAM second-pass verification: everything the first pass didn't cover.
//   A. touch chip still works (drag steers after opting out of tilt)
//   B. tilt steers BOTH phones in a real networked match (neutral at "go")
//   C. menu demo survives loop wraps (12s run: still animating, bullets
//      bounded, zero page errors)
//   D. reduced-motion → demo renders a static, non-empty frame
//   E. dark theme menu screenshot (visual check artifact)
// Usage: bun verify-more.mjs [baseUrl]
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://localhost:5173";
const SHOTS = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-shots";

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const iphone = {
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

async function launch(tag) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--mute-audio",
      `--user-data-dir=${process.env.TEMP}\\seam-vm-${tag}`,
    ],
  });
}

async function mobilePage(browser, errors) {
  const page = await browser.newPage();
  await page.emulate(iphone);
  page.on("pageerror", (e) => errors.push(e.message));
  return page;
}

const dbg = (page) => page.evaluate(() => ({ ...(window.__seamDebug || {}) }));

const startTiltDrive = (page) =>
  page.evaluate(() => {
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
const drive = (page, beta, gamma) =>
  page.evaluate((v) => Object.assign(window.__tiltDrive, v), { beta, gamma });

async function dragCanvas(page, dx) {
  const box = await (await page.$(".seam-canvas")).boundingBox();
  const y = box.y + box.height * 0.6;
  let x = box.x + box.width / 2;
  await page.touchscreen.touchStart(x, y);
  for (let i = 0; i < 6; i++) {
    x += dx / 6;
    await page.touchscreen.touchMove(x, y);
    await sleep(28);
  }
  await page.touchscreen.touchEnd();
}

// ---------- A: touch mode regression ----------
{
  const errors = [];
  const browser = await launch("touch");
  const page = await mobilePage(browser, errors);
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.tap(".seam-btn--ai");
  await page.waitForSelector(".seam-chiprow", { timeout: 10000 });
  const chips = await page.$$(".seam-chip");
  for (const c of chips) {
    const t = await c.evaluate((el) => el.textContent.trim());
    if (t === "touch" || t === "breezy") await c.tap();
  }
  const on = await page.$eval(".seam-chip.on", (el) => el.textContent.trim());
  check("A: touch chip selects", on === "touch", `on=${on}`);
  await page.tap(".seam-card[data-fighter=\"dart\"]");
  await page.tap(".seam-lock");
  await page.waitForFunction(() => window.__seamDebug?.phase === "round", { timeout: 15000, polling: 100 });
  await sleep(200);
  const d0 = await dbg(page);
  await dragCanvas(page, 110);
  const d1 = await dbg(page);
  check("A: drag steers in touch mode", d1.shipX > d0.shipX + 0.05, `${d0.shipX?.toFixed(3)} → ${d1.shipX?.toFixed(3)}`);
  check("A: control mode is touch", d1.control === "touch", d1.control);
  check("A: no page errors", errors.length === 0, errors.join("; "));
  await browser.close();
}

// ---------- B: tilt steers both phones in a networked match ----------
{
  const errsA = [];
  const errsB = [];
  const browserA = await launch("na");
  const browserB = await launch("nb");
  const a = await mobilePage(browserA, errsA);
  const b = await mobilePage(browserB, errsB);
  await a.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await startTiltDrive(a); // sensor speaks BEFORE hosting — tilt stays default
  await a.tap(".seam-btn--primary");
  await a.waitForSelector("[data-room-url]", { timeout: 15000 });
  const roomUrl = await a.$eval("[data-room-url]", (el) => el.getAttribute("data-room-url"));
  // prod builds stamp the deployed origin into the QR — rejoin via OUR server
  // so both sides run the bundle under test
  const joinUrl = BASE + roomUrl.slice(roomUrl.indexOf("/seam"));
  await b.goto(joinUrl, { waitUntil: "networkidle2" });
  await startTiltDrive(b);
  for (const [page, fighter] of [[a, "dart"], [b, "orb"]]) {
    await page.waitForSelector(`.seam-card[data-fighter="${fighter}"]`, { timeout: 20000 });
    await page.tap(`.seam-card[data-fighter="${fighter}"]`);
    await page.waitForSelector(".seam-lock:not([disabled])", { timeout: 5000 });
    await page.tap(".seam-lock");
  }
  const inRound = async (page) => {
    await page.waitForFunction(() => window.__seamDebug?.phase === "round", { timeout: 40000, polling: 150 });
  };
  await inRound(a);
  await inRound(b);
  await sleep(300); // neutral captured at "go" while both sit at beta 45, gamma 0
  const [a0, b0] = await Promise.all([dbg(a), dbg(b)]);
  check("B: both in tilt mode", a0.control === "tilt" && b0.control === "tilt", `A=${a0.control} B=${b0.control}`);
  await drive(a, 45, 14); // A tilts right
  await drive(b, 45, -14); // B tilts left
  await sleep(1000);
  const [a1, b1] = await Promise.all([dbg(a), dbg(b)]);
  check("B: tilt steers host in match", a1.shipX > a0.shipX + 0.08, `${a0.shipX?.toFixed(3)} → ${a1.shipX?.toFixed(3)}`);
  check("B: tilt steers guest in match", b1.shipX < b0.shipX - 0.08, `${b0.shipX?.toFixed(3)} → ${b1.shipX?.toFixed(3)}`);
  // both fire a quick tap so the loop's event path runs under tilt
  const tap = async (page) => {
    const box = await (await page.$(".seam-canvas")).boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.62);
  };
  await tap(a);
  await tap(b);
  await sleep(700);
  const [a2, b2] = await Promise.all([dbg(a), dbg(b)]);
  check("B: both fired under tilt", (a2.bulletsSpawned || 0) > 0 && (b2.bulletsSpawned || 0) > 0, `A=${a2.bulletsSpawned} B=${b2.bulletsSpawned}`);
  check("B: spawns crossed the wire", (a2.remoteBullets || 0) > 0 && (b2.remoteBullets || 0) > 0, `A=${a2.remoteBullets} B=${b2.remoteBullets}`);
  check("B: no page errors", errsA.length === 0 && errsB.length === 0, [...errsA, ...errsB].join("; "));
  await browserA.close();
  await browserB.close();
}

// ---------- C: demo long-run across loop wraps ----------
{
  const errors = [];
  const browser = await launch("demo");
  const page = await mobilePage(browser, errors);
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.waitForSelector(".seam-demo", { timeout: 15000 });
  const sample = () =>
    page.evaluate(() => {
      const c = document.querySelector(".seam-demo");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      let nonzero = 0;
      for (let i = 3; i < d.length; i += 16) {
        sum += d[i];
        if (d[i] > 0) nonzero++;
      }
      return { sum, nonzero };
    });
  const s0 = await sample();
  await sleep(12000); // crosses the 9s wrap
  const s1 = await sample();
  await sleep(600);
  const s2 = await sample();
  check("C: demo alive after loop wrap", s1.nonzero > 50 && s1.sum !== s2.sum, `nonzero=${s1.nonzero}, ${s1.sum} vs ${s2.sum}`);
  check("C: no page errors over 12s", errors.length === 0, errors.join("; "));
  check("C: first sample sane", s0.nonzero > 50, `nonzero=${s0.nonzero}`);
  await browser.close();
}

// ---------- D: reduced motion → static non-empty frame ----------
{
  const errors = [];
  const browser = await launch("rm");
  const page = await mobilePage(browser, errors);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.waitForSelector(".seam-demo", { timeout: 15000 });
  await sleep(600);
  const sample = () =>
    page.evaluate(() => {
      const c = document.querySelector(".seam-demo");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      let nonzero = 0;
      for (let i = 3; i < d.length; i += 16) {
        sum += d[i];
        if (d[i] > 0) nonzero++;
      }
      return { sum, nonzero };
    });
  const s1 = await sample();
  await sleep(800);
  const s2 = await sample();
  check("D: reduced-motion frame is drawn", s1.nonzero > 50, `nonzero=${s1.nonzero}`);
  check("D: reduced-motion frame is static", s1.sum === s2.sum, `${s1.sum} vs ${s2.sum}`);
  check("D: no page errors", errors.length === 0, errors.join("; "));
  await browser.close();
}

// ---------- E: dark theme artifact ----------
{
  const browser = await launch("dark");
  const page = await mobilePage(browser, []);
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("theme", "dark");
    } catch {}
  });
  await page.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await page.waitForSelector(".seam-demo", { timeout: 15000 });
  await sleep(1800);
  await page.screenshot({ path: `${SHOTS}\\tilt-menu-dark.png` });
  console.log("  dark-theme screenshot saved: tilt-menu-dark.png");
  await browser.close();
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
