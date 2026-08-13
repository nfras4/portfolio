// SEAM live demo: two VISIBLE Chrome windows side by side, paired into one
// duel, so a single human can watch and play both phones with the mouse
// (mouse input is converted to touch via CDP). Adapted from e2e.mjs.
// Usage: bun seam-live.mjs   (leave running; Ctrl-C to close both windows)
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:5173";

const COMMON_ARGS = [
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--mute-audio",
];

async function launch(port, x) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    defaultViewport: null,
    args: [
      ...COMMON_ARGS,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${process.env.TEMP}\\seam-live-${port}`,
      `--window-size=460,960`,
      `--window-position=${x},30`,
      "--app=data:text/html,<title>seam</title>", // no tab strip chrome
    ],
  });
}

const iphone = {
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

async function mobilePage(browser, label) {
  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());
  await page.emulate(iphone);
  // Real mouse drags/clicks become touch events — the human can play.
  const client = await page.createCDPSession();
  await client.send("Emulation.setEmitTouchEventsForMouse", { enabled: true, configuration: "mobile" });
  page.on("pageerror", (e) => console.log(`[${label} pageerror]`, e.message));
  return page;
}

const dbg = (page) => page.evaluate(() => ({ ...(window.__seamDebug || {}) })).catch(() => ({}));

async function waitPhase(page, phases, timeout, label) {
  try {
    await page.waitForFunction(
      (ps) => window.__seamDebug && ps.includes(window.__seamDebug.phase),
      { timeout, polling: 150 },
      phases
    );
    return true;
  } catch {
    const d = await dbg(page);
    console.log(`(${label} stuck in phase=${d.phase}, kind=${d.kind})`);
    return false;
  }
}

async function tapCanvas(page, fx = 0.5, fy = 0.62) {
  const el = await page.$(".seam-canvas");
  if (!el) return;
  const box = await el.boundingBox();
  await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
}

async function dragCanvas(page, dx) {
  const el = await page.$(".seam-canvas");
  if (!el) return;
  const box = await el.boundingBox();
  const y = box.y + box.height * 0.6;
  let x = box.x + box.width / 2;
  await page.touchscreen.touchStart(x, y);
  for (let i = 0; i < 6; i++) {
    x += dx / 6;
    await page.touchscreen.touchMove(x, y);
    await new Promise((r) => setTimeout(r, 28));
  }
  await page.touchscreen.touchEnd();
}

const browserA = await launch(9464, 30);
const browserB = await launch(9465, 520);
const a = await mobilePage(browserA, "A");
const b = await mobilePage(browserB, "B");

// --- pair ---
await a.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
await a.waitForSelector(".seam-btn--primary", { timeout: 15000 });
await a.tap(".seam-btn--primary");
await a.waitForSelector("[data-room-url]", { timeout: 15000 });
const roomUrl = await a.$eval("[data-room-url]", (el) => el.getAttribute("data-room-url"));
console.log("room:", roomUrl);
await b.goto(roomUrl, { waitUntil: "networkidle2" });

// fighter select: A takes dart, B takes orb — human can rematch to try others
async function pickAndLock(page, fighter) {
  await page.waitForSelector(`.seam-card[data-fighter="${fighter}"]`, { timeout: 20000 });
  await page.tap(`.seam-card[data-fighter="${fighter}"]`);
  await page.waitForSelector(".seam-lock:not([disabled])", { timeout: 5000 });
  await page.tap(".seam-lock");
}
await pickAndLock(a, "dart");
await pickAndLock(b, "orb");

const okA = await waitPhase(a, ["round"], 40000, "A");
const okB = await waitPhase(b, ["round"], 40000, "B");
if (!okA || !okB) {
  console.log("pairing failed — windows left open for inspection");
} else {
  const [da, db] = await Promise.all([dbg(a), dbg(b)]);
  console.log(`connected — transport A=${da.kind} B=${db.kind}`);

  // --- short scripted demo so bullets visibly cross the seam ---
  console.log("demo: 12s of automated movement + fire...");
  const until = Date.now() + 12000;
  let flip = 1;
  while (Date.now() < until) {
    await dragCanvas(b, 70 * flip).catch(() => {});
    await tapCanvas(a, 0.35 + 0.3 * Math.random()).catch(() => {});
    await tapCanvas(b, 0.35 + 0.3 * Math.random()).catch(() => {});
    flip = -flip;
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log("demo over — the two windows are YOURS now.");
  console.log("drag anywhere to move, click to shoot, hold to charge. first to 5.");
}

// keep alive; report the score line every 15s until Ctrl-C / window close
setInterval(async () => {
  const [da, db] = await Promise.all([dbg(a), dbg(b)]);
  if (da.phase || db.phase) {
    console.log(
      `A ${da.scoreMe ?? 0}-${da.scoreThem ?? 0} (${da.phase}) | B ${db.scoreMe ?? 0}-${db.scoreThem ?? 0} (${db.phase})`
    );
  }
}, 15000);
