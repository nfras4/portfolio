// SEAM two-phone e2e: drives two headless Chrome instances (separate browsers
// so neither tab gets background-throttled), hosts on page A, joins on page B
// via the QR's data-room-url, plays until a score registers on BOTH pages.
// Usage: bun e2e.mjs [--relay]
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:5173";
const SHOTS = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-shots";
const RELAY = process.argv.includes("--relay");
const TAG = RELAY ? "relay" : "p2p";

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} [${TAG}] ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}

const COMMON_ARGS = [
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--mute-audio",
];

async function launch(port) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      ...COMMON_ARGS,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${process.env.TEMP}\\seam-udd-${TAG}-${port}`,
    ],
  });
}

const iphone = {
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

async function mobilePage(browser, label) {
  const page = await browser.newPage();
  await page.emulate(iphone);
  page.on("pageerror", (e) => console.log(`[${label} pageerror]`, e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`[${label} console.error]`, m.text());
  });
  return page;
}

const dbg = (page) => page.evaluate(() => ({ ...(window.__seamDebug || {}) }));

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
    console.log(`  (${label} stuck in phase=${d.phase}, kind=${d.kind})`);
    return false;
  }
}

async function tapCanvas(page) {
  const box = await (await page.$(".seam-canvas")).boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.62);
}

async function dragCanvas(page, dx) {
  const box = await (await page.$(".seam-canvas")).boundingBox();
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

mkdirSync(SHOTS, { recursive: true });

const browserA = await launch(9444);
const browserB = await launch(9445);
const a = await mobilePage(browserA, "A");
const b = await mobilePage(browserB, "B");

try {
  // --- pairing ---
  await a.goto(`${BASE}/seam${RELAY ? "?forcerelay=1" : ""}`, { waitUntil: "networkidle2" });
  await a.waitForSelector(".seam-btn--primary", { timeout: 15000 });
  await a.tap(".seam-btn--primary");
  await a.waitForSelector("[data-room-url]", { timeout: 15000 });
  const roomUrl = await a.$eval("[data-room-url]", (el) => el.getAttribute("data-room-url"));
  check("host renders QR with room url", !!roomUrl, roomUrl);

  const joinUrl = RELAY ? roomUrl.replace("/seam#", "/seam?forcerelay=1#") : roomUrl;
  await b.goto(joinUrl, { waitUntil: "networkidle2" });

  // --- countdown → round ---
  const aCount = await waitPhase(a, ["countdown", "round"], 40000, "A");
  const bCount = await waitPhase(b, ["countdown", "round"], 40000, "B");
  check("both reach countdown", aCount && bCount);
  const aRound = await waitPhase(a, ["round"], 15000, "A");
  const bRound = await waitPhase(b, ["round"], 15000, "B");
  check("both reach round", aRound && bRound);

  let [da, db] = await Promise.all([dbg(a), dbg(b)]);
  console.log(`  transport A=${da.kind} B=${db.kind}`);
  check("transport connected", !!da.kind && !!db.kind, `A=${da.kind} B=${db.kind}`);
  if (RELAY) check("forced relay uses relay transport", da.kind === "relay" && db.kind === "relay");

  // --- screenshots at round phase (p2p run only) ---
  if (!RELAY && aRound && bRound) {
    await a.screenshot({ path: `${SHOTS}\\seam-a.png` });
    await b.screenshot({ path: `${SHOTS}\\seam-b.png` });
    console.log("  screenshots saved: seam-a.png, seam-b.png");
  }

  // --- movement + fire until someone scores on BOTH pages ---
  await dragCanvas(b, 60).catch(() => {});
  await dragCanvas(b, -60).catch(() => {});

  const deadline = Date.now() + 120000;
  let scored = false;
  while (Date.now() < deadline) {
    [da, db] = await Promise.all([dbg(a), dbg(b)]);
    const aTot = (da.scoreMe || 0) + (da.scoreThem || 0);
    const bTot = (db.scoreMe || 0) + (db.scoreThem || 0);
    if (aTot >= 1 && bTot >= 1) {
      scored = true;
      break;
    }
    if (da.phase === "round") await tapCanvas(a).catch(() => {});
    if (db.phase === "round") await tapCanvas(b).catch(() => {});
    await new Promise((r) => setTimeout(r, 360));
  }

  [da, db] = await Promise.all([dbg(a), dbg(b)]);
  console.log("  A:", JSON.stringify(da));
  console.log("  B:", JSON.stringify(db));

  check("A fired bullets", (da.bulletsSpawned || 0) > 0, `spawned=${da.bulletsSpawned}`);
  check("B fired bullets", (db.bulletsSpawned || 0) > 0, `spawned=${db.bulletsSpawned}`);
  check("A received B's spawn events", (da.remoteBullets || 0) > 0, `remote=${da.remoteBullets}`);
  check("B received A's spawn events", (db.remoteBullets || 0) > 0, `remote=${db.remoteBullets}`);
  check("state packets flow A", da.packetsIn > 0 && da.packetsOut > 0, `in=${da.packetsIn} out=${da.packetsOut}`);
  check("state packets flow B", db.packetsIn > 0 && db.packetsOut > 0, `in=${db.packetsIn} out=${db.packetsOut}`);
  check(
    "a hit registered and score incremented on BOTH pages",
    scored,
    `A=${da.scoreMe}-${da.scoreThem} B=${db.scoreMe}-${db.scoreThem}`
  );
  check(
    "scores agree across phones",
    scored && da.scoreMe === db.scoreThem && da.scoreThem === db.scoreMe
  );
} finally {
  await browserA.close().catch(() => {});
  await browserB.close().catch(() => {});
}

console.log(failures === 0 ? `ALL PASS [${TAG}]` : `${failures} FAILURES [${TAG}]`);
process.exit(failures === 0 ? 0 : 1);
